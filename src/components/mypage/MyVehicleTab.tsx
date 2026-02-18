import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Car, MapPin, Save, Loader2, PenTool, Home, Building,
  Fuel, Calendar, FileText, Route,
} from "lucide-react";
import { toast } from "sonner";

interface VehicleInfo {
  id: string;
  vehicle_number: string | null;
  model_name: string | null;
  manufacturer: string | null;
  fuel_type: string | null;
  ownership_type: string | null;
  lease_company: string | null;
  insurance_company: string | null;
  insurance_end_date: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  initial_mileage: number | null;
  is_active: boolean | null;
}

interface CommuteLocation {
  id?: string;
  home_address: string;
  home_lat: number | null;
  home_lng: number | null;
  office_address: string;
  office_lat: number | null;
  office_lng: number | null;
  distance_km: number | null;
}

interface MyVehicleTabProps {
  userId: string;
  tenantId: string;
}

export const MyVehicleTab = ({ userId, tenantId }: MyVehicleTabProps) => {
  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null);
  const [commute, setCommute] = useState<CommuteLocation | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CommuteLocation>({
    home_address: "",
    home_lat: null,
    home_lng: null,
    office_address: "",
    office_lat: null,
    office_lng: null,
    distance_km: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId, tenantId]);

  const fetchData = async () => {
    setLoading(true);
    const [vehicleRes, commuteRes] = await Promise.all([
      supabase
        .from("vehicles")
        .select("id, vehicle_number, model_name, manufacturer, fuel_type, ownership_type, lease_company, insurance_company, insurance_end_date, contract_start_date, contract_end_date, initial_mileage, is_active")
        .eq("tenant_id", tenantId)
        .eq("primary_driver", userId)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("commute_locations")
        .select("*")
        .eq("user_id", userId)
        .eq("tenant_id", tenantId)
        .maybeSingle(),
    ]);

    if (vehicleRes.data) setVehicle(vehicleRes.data as VehicleInfo);
    if (commuteRes.data) {
      const c = commuteRes.data as any;
      setCommute({
        id: c.id,
        home_address: c.home_address || "",
        home_lat: c.home_lat,
        home_lng: c.home_lng,
        office_address: c.office_address || "",
        office_lat: c.office_lat,
        office_lng: c.office_lng,
        distance_km: c.distance_km,
      });
    }
    setLoading(false);
  };

  const startEdit = () => {
    setForm(
      commute || {
        home_address: "",
        home_lat: null,
        home_lng: null,
        office_address: "",
        office_lat: null,
        office_lng: null,
        distance_km: null,
      }
    );
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const saveCommute = async () => {
    if (!form.home_address && !form.office_address) {
      toast.error("출근지 또는 퇴근지를 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      if (commute?.id) {
        const { error } = await supabase
          .from("commute_locations")
          .update({
            home_address: form.home_address || null,
            home_lat: form.home_lat,
            home_lng: form.home_lng,
            office_address: form.office_address || null,
            office_lat: form.office_lat,
            office_lng: form.office_lng,
            distance_km: form.distance_km,
          })
          .eq("id", commute.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("commute_locations")
          .insert({
            user_id: userId,
            tenant_id: tenantId,
            home_address: form.home_address || null,
            home_lat: form.home_lat,
            home_lng: form.home_lng,
            office_address: form.office_address || null,
            office_lat: form.office_lat,
            office_lng: form.office_lng,
            distance_km: form.distance_km,
          });
        if (error) throw error;
      }
      toast.success("출퇴근지 정보가 저장되었습니다.");
      setEditing(false);
      await fetchData();
    } catch (e: any) {
      toast.error("저장 실패: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const InfoRow = ({ label, value, icon }: { label: string; value: string | null | undefined; icon?: React.ReactNode }) => (
    <div className="flex justify-between items-center py-2.5 border-b border-border/50 last:border-0">
      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="text-sm text-right">{value || "-"}</span>
    </div>
  );

  if (loading) {
    return (
      <Card className="border-none shadow-lg rounded-2xl">
        <CardContent className="p-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!vehicle) {
    return (
      <Card className="border-none shadow-lg rounded-2xl">
        <CardContent className="p-12 text-center">
          <Car className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">배정된 차량이 없습니다.</p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            차량 관리 대장에서 운행자로 지정되면 여기에 표시됩니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 배정 차량 정보 */}
      <Card className="border-none shadow-lg rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" /> 배정 차량 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Car className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">
                {vehicle.manufacturer} {vehicle.model_name}
              </p>
              <p className="text-xs text-muted-foreground">{vehicle.vehicle_number}</p>
            </div>
            <Badge variant={vehicle.is_active ? "default" : "secondary"}>
              {vehicle.is_active ? "운행중" : "미사용"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <div>
              <InfoRow label="차량번호" value={vehicle.vehicle_number} />
              <InfoRow label="차종" value={`${vehicle.manufacturer || ""} ${vehicle.model_name || ""}`} icon={<Car className="w-3 h-3" />} />
              <InfoRow label="유류" value={vehicle.fuel_type} icon={<Fuel className="w-3 h-3" />} />
              <InfoRow label="소유형태" value={vehicle.ownership_type} />
            </div>
            <div>
              <InfoRow label="리스사" value={vehicle.lease_company} />
              <InfoRow label="보험사" value={vehicle.insurance_company} />
              <InfoRow label="보험 만기" value={vehicle.insurance_end_date} icon={<Calendar className="w-3 h-3" />} />
              <InfoRow label="계약기간" value={
                vehicle.contract_start_date && vehicle.contract_end_date
                  ? `${vehicle.contract_start_date} ~ ${vehicle.contract_end_date}`
                  : null
              } />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 출퇴근지 등록 */}
      <Card className="border-none shadow-lg rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Route className="w-4 h-4 text-primary" /> 출퇴근지 정보
            </CardTitle>
            {!editing && (
              <Button variant="outline" size="sm" onClick={startEdit}>
                <PenTool className="w-3.5 h-3.5 mr-1" /> {commute ? "수정" : "등록"}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            차량 운행 정산서 자동 생성 시 출퇴근 경로 계산에 사용됩니다.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Home className="w-4 h-4 text-primary" /> 자택 (출근지)
                  </div>
                  <div>
                    <Label className="text-xs">주소</Label>
                    <Input
                      value={form.home_address}
                      onChange={(e) => setForm({ ...form, home_address: e.target.value })}
                      placeholder="자택 주소 입력"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">위도</Label>
                      <Input
                        type="number"
                        step="any"
                        value={form.home_lat ?? ""}
                        onChange={(e) => setForm({ ...form, home_lat: e.target.value ? Number(e.target.value) : null })}
                        placeholder="37.xxx"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">경도</Label>
                      <Input
                        type="number"
                        step="any"
                        value={form.home_lng ?? ""}
                        onChange={(e) => setForm({ ...form, home_lng: e.target.value ? Number(e.target.value) : null })}
                        placeholder="127.xxx"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Building className="w-4 h-4 text-primary" /> 사무실 (퇴근지)
                  </div>
                  <div>
                    <Label className="text-xs">주소</Label>
                    <Input
                      value={form.office_address}
                      onChange={(e) => setForm({ ...form, office_address: e.target.value })}
                      placeholder="사무실 주소 입력"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">위도</Label>
                      <Input
                        type="number"
                        step="any"
                        value={form.office_lat ?? ""}
                        onChange={(e) => setForm({ ...form, office_lat: e.target.value ? Number(e.target.value) : null })}
                        placeholder="37.xxx"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">경도</Label>
                      <Input
                        type="number"
                        step="any"
                        value={form.office_lng ?? ""}
                        onChange={(e) => setForm({ ...form, office_lng: e.target.value ? Number(e.target.value) : null })}
                        placeholder="127.xxx"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="max-w-xs">
                <Label className="text-xs">편도 거리 (km)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.distance_km ?? ""}
                  onChange={(e) => setForm({ ...form, distance_km: e.target.value ? Number(e.target.value) : null })}
                  placeholder="편도 출퇴근 거리"
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" size="sm" onClick={cancelEdit}>취소</Button>
                <Button size="sm" onClick={saveCommute} disabled={saving}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                  저장
                </Button>
              </div>
            </div>
          ) : commute ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <div>
                <InfoRow label="자택 주소" value={commute.home_address} icon={<Home className="w-3 h-3" />} />
                {commute.home_lat && commute.home_lng && (
                  <InfoRow label="좌표" value={`${commute.home_lat}, ${commute.home_lng}`} icon={<MapPin className="w-3 h-3" />} />
                )}
              </div>
              <div>
                <InfoRow label="사무실 주소" value={commute.office_address} icon={<Building className="w-3 h-3" />} />
                {commute.office_lat && commute.office_lng && (
                  <InfoRow label="좌표" value={`${commute.office_lat}, ${commute.office_lng}`} icon={<MapPin className="w-3 h-3" />} />
                )}
              </div>
              {commute.distance_km && (
                <div className="col-span-full mt-2">
                  <InfoRow label="편도 거리" value={`${commute.distance_km} km`} icon={<Route className="w-3 h-3" />} />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <MapPin className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">등록된 출퇴근지가 없습니다.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                출퇴근지를 등록하면 차량 운행 정산서 자동 생성에 활용됩니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
