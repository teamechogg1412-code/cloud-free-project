import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Car, Route, Loader2, Plus, Trash2, MapPin, Calendar,
  Calculator, FileText, Download, ChevronRight, Building, Home,
  Navigation, ArrowRight, RefreshCw, Save, CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

interface TripItem {
  id?: string;
  trip_date: string;
  trip_order: number;
  departure_name: string;
  departure_address: string;
  departure_lat: number | null;
  departure_lng: number | null;
  arrival_name: string;
  arrival_address: string;
  arrival_lat: number | null;
  arrival_lng: number | null;
  distance_km: number;
  purpose: string;
  schedule_id: string | null;
  trip_type: string; // commute_to_office, commute_from_office, schedule, manual
  isNew?: boolean;
}

interface CommuteLocation {
  home_address: string;
  home_lat: number | null;
  home_lng: number | null;
  office_address: string;
  office_lat: number | null;
  office_lng: number | null;
  distance_km: number | null;
}

interface VehicleInfo {
  id: string;
  vehicle_number: string;
  model_name: string | null;
  manufacturer: string | null;
}

const TRIP_TYPE_LABELS: Record<string, string> = {
  commute_to_office: "출근",
  commute_from_office: "퇴근",
  schedule: "일정",
  manual: "수동",
};

const TRIP_TYPE_COLORS: Record<string, string> = {
  commute_to_office: "bg-blue-100 text-blue-700",
  commute_from_office: "bg-indigo-100 text-indigo-700",
  schedule: "bg-emerald-100 text-emerald-700",
  manual: "bg-amber-100 text-amber-700",
};

const DrivingSettlement = () => {
  const { user, currentTenant } = useAuth();
  const tenantId = currentTenant?.tenant_id;

  const [yearMonth, setYearMonth] = useState(format(new Date(), "yyyy-MM"));
  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null);
  const [commute, setCommute] = useState<CommuteLocation | null>(null);
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [costPerKm, setCostPerKm] = useState<number>(0);
  const [addDialog, setAddDialog] = useState(false);
  const [manualForm, setManualForm] = useState({
    trip_date: format(new Date(), "yyyy-MM-dd"),
    departure_name: "",
    departure_address: "",
    arrival_name: "",
    arrival_address: "",
    purpose: "",
  });

  // Load vehicle & commute info
  useEffect(() => {
    if (!user?.id || !tenantId) return;

    const fetchBasicInfo = async () => {
      const [vRes, cRes, sRes] = await Promise.all([
        supabase
          .from("vehicles")
          .select("id, vehicle_number, model_name, manufacturer")
          .eq("tenant_id", tenantId)
          .eq("primary_driver", user.id)
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("commute_locations")
          .select("*")
          .eq("user_id", user.id)
          .eq("tenant_id", tenantId)
          .maybeSingle(),
        supabase
          .from("driving_settlement_reports")
          .select("*, items:driving_settlement_items(*)")
          .eq("user_id", user.id)
          .eq("tenant_id", tenantId)
          .eq("year_month", yearMonth)
          .maybeSingle(),
      ]);

      if (vRes.data) setVehicle(vRes.data as any);
      if (cRes.data) {
        const c = cRes.data as any;
        setCommute({
          home_address: c.home_address || "",
          home_lat: c.home_lat,
          home_lng: c.home_lng,
          office_address: c.office_address || "",
          office_lat: c.office_lat,
          office_lng: c.office_lng,
          distance_km: c.distance_km,
        });
      }

      if (sRes.data) {
        const report = sRes.data as any;
        setCostPerKm(report.cost_per_km || 0);
        if (report.items && report.items.length > 0) {
          setTrips(
            report.items
              .sort((a: any, b: any) => {
                if (a.trip_date !== b.trip_date) return a.trip_date.localeCompare(b.trip_date);
                return a.trip_order - b.trip_order;
              })
              .map((item: any) => ({
                id: item.id,
                trip_date: item.trip_date,
                trip_order: item.trip_order,
                departure_name: item.departure_name || "",
                departure_address: item.departure_address || "",
                departure_lat: item.departure_lat,
                departure_lng: item.departure_lng,
                arrival_name: item.arrival_name || "",
                arrival_address: item.arrival_address || "",
                arrival_lat: item.arrival_lat,
                arrival_lng: item.arrival_lng,
                distance_km: item.distance_km || 0,
                purpose: item.purpose || "",
                schedule_id: item.schedule_id,
                trip_type: item.trip_type || "manual",
              }))
          );
        }
      }
    };

    fetchBasicInfo();
  }, [user?.id, tenantId, yearMonth]);

  // Generate trips automatically
  const generateTrips = useCallback(async () => {
    if (!user?.id || !tenantId || !commute) {
      toast.error("출퇴근지 정보가 등록되어 있어야 합니다.");
      return;
    }

    setGenerating(true);
    try {
      const [year, month] = yearMonth.split("-").map(Number);
      const monthStart = startOfMonth(new Date(year, month - 1));
      const monthEnd = endOfMonth(new Date(year, month - 1));

      // 1. Fetch attendance records
      const { data: attendance } = await supabase
        .from("attendance_records")
        .select("date, clock_in, clock_out")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantId)
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"));

      // 2. Fetch approved leave requests
      const { data: leaves } = await supabase
        .from("leave_requests")
        .select("start_date, end_date")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantId)
        .eq("status", "approved")
        .or(
          `and(start_date.lte.${format(monthEnd, "yyyy-MM-dd")},end_date.gte.${format(monthStart, "yyyy-MM-dd")})`
        );

      // Build leave date set
      const leaveDates = new Set<string>();
      (leaves || []).forEach((l: any) => {
        const s = parseISO(l.start_date);
        const e = parseISO(l.end_date);
        eachDayOfInterval({ start: s, end: e }).forEach((d) => {
          leaveDates.add(format(d, "yyyy-MM-dd"));
        });
      });

      // 3. Fetch schedules for the month
      const { data: schedules } = await supabase
        .from("artist_schedules")
        .select("id, title, start_time, end_time, location, schedule_type, location_address, location_lat, location_lng")
        .eq("tenant_id", tenantId)
        .gte("start_time", monthStart.toISOString())
        .lte("start_time", monthEnd.toISOString())
        .order("start_time", { ascending: true });

      // Group schedules by date
      const schedulesByDate = new Map<string, any[]>();
      (schedules || []).forEach((s: any) => {
        const dateKey = format(new Date(s.start_time), "yyyy-MM-dd");
        if (!schedulesByDate.has(dateKey)) schedulesByDate.set(dateKey, []);
        schedulesByDate.get(dateKey)!.push(s);
      });

      // Build workdays from attendance (only days with clock_in)
      const workDates = new Set<string>();
      (attendance || []).forEach((a: any) => {
        if (a.clock_in && !leaveDates.has(a.date)) {
          workDates.add(a.date);
        }
      });

      // Also add weekday dates that aren't leave days (for months with incomplete attendance)
      const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd > new Date() ? new Date() : monthEnd });
      allDays.forEach((d) => {
        const dateStr = format(d, "yyyy-MM-dd");
        if (!isWeekend(d) && !leaveDates.has(dateStr)) {
          // If we have attendance data, only include days with records
          if (attendance && attendance.length > 0) {
            // already handled above
          } else {
            workDates.add(dateStr);
          }
        }
      });

      // 4. Build trip items
      const newTrips: TripItem[] = [];
      const routesToCalculate: { origin: { lat: number; lng: number }; destination: { lat: number; lng: number }; tripIndex: number }[] = [];

      const sortedDates = Array.from(workDates).sort();

      for (const dateStr of sortedDates) {
        const daySchedules = schedulesByDate.get(dateStr) || [];
        let tripOrder = 1;

        // Morning commute: Home → Office
        const morningTrip: TripItem = {
          trip_date: dateStr,
          trip_order: tripOrder++,
          departure_name: "자택",
          departure_address: commute.home_address,
          departure_lat: commute.home_lat,
          departure_lng: commute.home_lng,
          arrival_name: "사무실",
          arrival_address: commute.office_address,
          arrival_lat: commute.office_lat,
          arrival_lng: commute.office_lng,
          distance_km: commute.distance_km || 0,
          purpose: "출근",
          schedule_id: null,
          trip_type: "commute_to_office",
        };
        newTrips.push(morningTrip);

        if (commute.home_lat && commute.home_lng && commute.office_lat && commute.office_lng) {
          routesToCalculate.push({
            origin: { lat: commute.home_lat, lng: commute.home_lng },
            destination: { lat: commute.office_lat, lng: commute.office_lng },
            tripIndex: newTrips.length - 1,
          });
        }

        // Schedule trips: Office → Schedule1 → Schedule2 → ...
        let lastLat = commute.office_lat;
        let lastLng = commute.office_lng;
        let lastAddress = commute.office_address;
        let lastLabel = "사무실";

        for (const sch of daySchedules) {
          const schLat = sch.location_lat;
          const schLng = sch.location_lng;
          const schAddress = sch.location_address || sch.location || "";
          const schLabel = sch.location || sch.title;

          const scheduleTrip: TripItem = {
            trip_date: dateStr,
            trip_order: tripOrder++,
            departure_name: lastLabel,
            departure_address: lastAddress,
            departure_lat: lastLat,
            departure_lng: lastLng,
            arrival_name: schLabel,
            arrival_address: schAddress,
            arrival_lat: schLat,
            arrival_lng: schLng,
            distance_km: 0,
            purpose: `${sch.title} (${sch.schedule_type || "일정"})`,
            schedule_id: sch.id,
            trip_type: "schedule",
          };
          newTrips.push(scheduleTrip);

          if (lastLat && lastLng && schLat && schLng) {
            routesToCalculate.push({
              origin: { lat: lastLat, lng: lastLng },
              destination: { lat: schLat, lng: schLng },
              tripIndex: newTrips.length - 1,
            });
          }

          lastLat = schLat;
          lastLng = schLng;
          lastAddress = schAddress;
          lastLabel = schLabel;
        }

        // Return home: last location → Home
        const eveningTrip: TripItem = {
          trip_date: dateStr,
          trip_order: tripOrder++,
          departure_name: lastLabel,
          departure_address: lastAddress,
          departure_lat: lastLat,
          departure_lng: lastLng,
          arrival_name: "자택",
          arrival_address: commute.home_address,
          arrival_lat: commute.home_lat,
          arrival_lng: commute.home_lng,
          distance_km: daySchedules.length === 0 ? (commute.distance_km || 0) : 0,
          purpose: "퇴근",
          schedule_id: null,
          trip_type: "commute_from_office",
        };
        newTrips.push(eveningTrip);

        if (lastLat && lastLng && commute.home_lat && commute.home_lng) {
          // Only calculate if last location is NOT the office (schedule-based return)
          if (daySchedules.length > 0) {
            routesToCalculate.push({
              origin: { lat: lastLat, lng: lastLng },
              destination: { lat: commute.home_lat, lng: commute.home_lng },
              tripIndex: newTrips.length - 1,
            });
          }
        }
      }

      // 5. Calculate distances via Kakao API (batch)
      if (routesToCalculate.length > 0) {
        // Process in batches of 10 to avoid rate limits
        const batchSize = 10;
        for (let i = 0; i < routesToCalculate.length; i += batchSize) {
          const batch = routesToCalculate.slice(i, i + batchSize);
          const { data, error } = await invokeEdgeFunction("calculate-driving-distance", {
            body: {
              routes: batch.map((r) => ({
                origin: r.origin,
                destination: r.destination,
              })),
            },
          });

          if (data?.results) {
            data.results.forEach((result: any, idx: number) => {
              const tripIdx = batch[idx].tripIndex;
              if (result.distance_km > 0) {
                newTrips[tripIdx].distance_km = result.distance_km;
              }
            });
          }

          // Small delay between batches
          if (i + batchSize < routesToCalculate.length) {
            await new Promise((r) => setTimeout(r, 300));
          }
        }
      }

      setTrips(newTrips);
      toast.success(`${sortedDates.length}일간 ${newTrips.length}개 운행 구간이 생성되었습니다.`);
    } catch (e: any) {
      console.error(e);
      toast.error("자동 생성 실패: " + e.message);
    } finally {
      setGenerating(false);
    }
  }, [user?.id, tenantId, commute, yearMonth]);

  // Save report
  const saveReport = async () => {
    if (!user?.id || !tenantId || !vehicle) return;
    setSaving(true);

    try {
      const totalDistance = trips.reduce((sum, t) => sum + t.distance_km, 0);
      const totalAmount = Math.round(totalDistance * costPerKm);

      // Upsert report
      const { data: existingReport } = await supabase
        .from("driving_settlement_reports")
        .select("id")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantId)
        .eq("year_month", yearMonth)
        .maybeSingle();

      let reportId: string;

      if (existingReport) {
        reportId = existingReport.id;
        await supabase
          .from("driving_settlement_reports")
          .update({
            vehicle_id: vehicle.id,
            total_distance_km: totalDistance,
            total_trips: trips.length,
            cost_per_km: costPerKm,
            total_amount: totalAmount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", reportId);

        // Delete old items
        await supabase.from("driving_settlement_items").delete().eq("report_id", reportId);
      } else {
        const { data: newReport, error } = await supabase
          .from("driving_settlement_reports")
          .insert({
            tenant_id: tenantId,
            user_id: user.id,
            vehicle_id: vehicle.id,
            year_month: yearMonth,
            status: "draft",
            total_distance_km: totalDistance,
            total_trips: trips.length,
            cost_per_km: costPerKm,
            total_amount: totalAmount,
          })
          .select("id")
          .single();

        if (error) throw error;
        reportId = newReport.id;
      }

      // Insert items
      const items = trips.map((t) => ({
        report_id: reportId,
        trip_date: t.trip_date,
        trip_order: t.trip_order,
        departure_name: t.departure_name,
        departure_address: t.departure_address,
        departure_lat: t.departure_lat,
        departure_lng: t.departure_lng,
        arrival_name: t.arrival_name,
        arrival_address: t.arrival_address,
        arrival_lat: t.arrival_lat,
        arrival_lng: t.arrival_lng,
        distance_km: t.distance_km,
        purpose: t.purpose,
        schedule_id: t.schedule_id,
        trip_type: t.trip_type,
      }));

      const { error: itemError } = await supabase.from("driving_settlement_items").insert(items);
      if (itemError) throw itemError;

      toast.success("차량운행정산서가 저장되었습니다.");
    } catch (e: any) {
      toast.error("저장 실패: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const addManualTrip = () => {
    const newTrip: TripItem = {
      trip_date: manualForm.trip_date,
      trip_order: trips.filter((t) => t.trip_date === manualForm.trip_date).length + 1,
      departure_name: manualForm.departure_name,
      departure_address: manualForm.departure_address,
      departure_lat: null,
      departure_lng: null,
      arrival_name: manualForm.arrival_name,
      arrival_address: manualForm.arrival_address,
      arrival_lat: null,
      arrival_lng: null,
      distance_km: 0,
      purpose: manualForm.purpose,
      schedule_id: null,
      trip_type: "manual",
      isNew: true,
    };

    setTrips((prev) =>
      [...prev, newTrip].sort((a, b) => {
        if (a.trip_date !== b.trip_date) return a.trip_date.localeCompare(b.trip_date);
        return a.trip_order - b.trip_order;
      })
    );
    setAddDialog(false);
    setManualForm({ trip_date: format(new Date(), "yyyy-MM-dd"), departure_name: "", departure_address: "", arrival_name: "", arrival_address: "", purpose: "" });
    toast.success("수동 구간이 추가되었습니다.");
  };

  const removeTrip = (index: number) => {
    setTrips((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTripDistance = (index: number, distance: number) => {
    setTrips((prev) => prev.map((t, i) => (i === index ? { ...t, distance_km: distance } : t)));
  };

  const totalDistance = trips.reduce((sum, t) => sum + t.distance_km, 0);
  const totalAmount = Math.round(totalDistance * costPerKm);

  // Group trips by date
  const tripsByDate = trips.reduce<Record<string, TripItem[]>>((acc, trip) => {
    if (!acc[trip.trip_date]) acc[trip.trip_date] = [];
    acc[trip.trip_date].push(trip);
    return acc;
  }, {});

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return format(d, "yyyy-MM");
  });

  if (!vehicle) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-none shadow-lg rounded-2xl">
          <CardContent className="p-12 text-center">
            <Car className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-bold mb-2">배정된 차량이 없습니다</h2>
            <p className="text-sm text-muted-foreground">
              마이페이지에서 차량이 배정되어 있어야 운행정산서를 작성할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            차량운행정산서
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            근태·일정 연동 자동 주행거리 산출 및 정산
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={yearMonth} onValueChange={setYearMonth}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m} value={m}>
                  {format(parseISO(m + "-01"), "yyyy년 M월", { locale: ko })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Vehicle & Commute Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Car className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">배정 차량</p>
                <p className="font-bold text-sm">{vehicle.vehicle_number}</p>
                <p className="text-xs text-muted-foreground">{vehicle.manufacturer} {vehicle.model_name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Route className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">출퇴근 편도</p>
                <p className="font-bold text-sm">{commute?.distance_km || "-"} km</p>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {commute?.home_address ? `${commute.home_address.slice(0, 15)}...` : "미등록"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">km당 단가</p>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={costPerKm || ""}
                    onChange={(e) => setCostPerKm(Number(e.target.value))}
                    className="w-20 h-7 text-sm font-bold"
                    placeholder="0"
                  />
                  <span className="text-xs text-muted-foreground">원</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            onClick={generateTrips}
            disabled={generating || !commute}
            className="gap-2"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            자동 생성
          </Button>
          <Button variant="outline" onClick={() => setAddDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" /> 수동 추가
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={saveReport} disabled={saving || trips.length === 0} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </Button>
        </div>
      </div>

      {/* Summary */}
      {trips.length > 0 && (
        <Card className="border-none shadow-sm rounded-xl bg-gradient-to-r from-primary/5 to-emerald-50">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">총 운행일</p>
                <p className="text-xl font-bold">{Object.keys(tripsByDate).length}일</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">총 구간</p>
                <p className="text-xl font-bold">{trips.length}건</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">총 주행거리</p>
                <p className="text-xl font-bold text-primary">{totalDistance.toFixed(1)} km</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">정산 예상금액</p>
                <p className="text-xl font-bold text-emerald-600">
                  {totalAmount > 0 ? `₩${totalAmount.toLocaleString()}` : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trip Details by Date */}
      {trips.length === 0 ? (
        <Card className="border-none shadow-sm rounded-xl">
          <CardContent className="p-12 text-center">
            <Navigation className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground text-sm">
              운행 기록이 없습니다. <strong>자동 생성</strong> 버튼을 눌러 근태/일정 기반으로 생성하세요.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {Object.entries(tripsByDate).map(([date, dayTrips]) => {
            const dayTotal = dayTrips.reduce((s, t) => s + t.distance_km, 0);
            const dayOfWeek = format(parseISO(date), "EEEE", { locale: ko });

            return (
              <Card key={date} className="border-none shadow-sm rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">
                      {format(parseISO(date), "M월 d일", { locale: ko })} ({dayOfWeek})
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {dayTrips.length}구간
                    </Badge>
                  </div>
                  <span className="text-sm font-bold text-primary">{dayTotal.toFixed(1)} km</span>
                </div>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[60px] text-xs">유형</TableHead>
                        <TableHead className="text-xs">출발</TableHead>
                        <TableHead className="w-[30px]" />
                        <TableHead className="text-xs">도착</TableHead>
                        <TableHead className="text-xs">용도/일정</TableHead>
                        <TableHead className="w-[100px] text-xs text-right">거리(km)</TableHead>
                        <TableHead className="w-[40px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dayTrips.map((trip, idx) => {
                        const globalIdx = trips.indexOf(trip);
                        return (
                          <TableRow key={idx} className="group">
                            <TableCell>
                              <Badge variant="secondary" className={`text-[10px] ${TRIP_TYPE_COLORS[trip.trip_type] || ""}`}>
                                {TRIP_TYPE_LABELS[trip.trip_type] || trip.trip_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {trip.trip_type === "commute_to_office" ? (
                                  <Home className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                ) : trip.departure_name === "사무실" ? (
                                  <Building className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                ) : (
                                  <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                )}
                                <span className="text-xs truncate max-w-[120px]">{trip.departure_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {trip.trip_type === "commute_from_office" ? (
                                  <Home className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                                ) : trip.arrival_name === "사무실" ? (
                                  <Building className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                ) : (
                                  <MapPin className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                )}
                                <span className="text-xs truncate max-w-[120px]">{trip.arrival_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground truncate max-w-[150px] block">
                                {trip.purpose}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="0.1"
                                value={trip.distance_km || ""}
                                onChange={(e) => updateTripDistance(globalIdx, Number(e.target.value))}
                                className="w-20 h-7 text-xs text-right ml-auto"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeTrip(globalIdx)}
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Manual Trip Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" /> 수동 구간 추가
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">날짜</Label>
              <Input
                type="date"
                value={manualForm.trip_date}
                onChange={(e) => setManualForm({ ...manualForm, trip_date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">출발지 이름</Label>
                <Input
                  value={manualForm.departure_name}
                  onChange={(e) => setManualForm({ ...manualForm, departure_name: e.target.value })}
                  placeholder="예: 사무실"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">도착지 이름</Label>
                <Input
                  value={manualForm.arrival_name}
                  onChange={(e) => setManualForm({ ...manualForm, arrival_name: e.target.value })}
                  placeholder="예: SBS 본사"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">출발지 주소</Label>
                <Input
                  value={manualForm.departure_address}
                  onChange={(e) => setManualForm({ ...manualForm, departure_address: e.target.value })}
                  placeholder="서울시 강남구..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">도착지 주소</Label>
                <Input
                  value={manualForm.arrival_address}
                  onChange={(e) => setManualForm({ ...manualForm, arrival_address: e.target.value })}
                  placeholder="서울시 양천구..."
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">용도/목적</Label>
              <Textarea
                value={manualForm.purpose}
                onChange={(e) => setManualForm({ ...manualForm, purpose: e.target.value })}
                placeholder="미팅, 촬영 현장 방문 등"
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>취소</Button>
            <Button onClick={addManualTrip} disabled={!manualForm.departure_name || !manualForm.arrival_name}>
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DrivingSettlement;
