import { useState, useEffect } from "react";
import { Header } from "@/components/landing/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Navigation, ArrowLeft, Play, Square, MapPin, Clock, Car, 
  Route, Gauge, AlertCircle, CheckCircle, History, Loader2 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGeolocation } from "@/hooks/useGeolocation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface Vehicle {
  id: string;
  plate_number: string;
  model: string | null;
  manufacturer: string | null;
}

interface DrivingLog {
  id: string;
  vehicle_id: string;
  driver_user_id: string | null;
  start_time: string;
  end_time: string | null;
  start_address: string | null;
  end_address: string | null;
  distance_km: number;
  purpose: string | null;
  memo: string | null;
  status: string;
  vehicle?: Vehicle;
}

const DrivingControl = () => {
  const navigate = useNavigate();
  const { currentTenant, user } = useAuth();
  const geo = useGeolocation({ enableHighAccuracy: true });

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivingLogs, setDrivingLogs] = useState<DrivingLog[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [purpose, setPurpose] = useState("");
  const [activeLog, setActiveLog] = useState<DrivingLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [endTripDialog, setEndTripDialog] = useState(false);
  const [endMemo, setEndMemo] = useState("");

  // Fetch vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
      if (!currentTenant?.tenant_id) return;
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, plate_number, model, manufacturer")
        .eq("tenant_id", currentTenant.tenant_id)
        .eq("is_active", true);
      
      if (error) {
        toast({ title: "차량 목록 조회 실패", variant: "destructive" });
        return;
      }
      setVehicles(data || []);
    };
    fetchVehicles();
  }, [currentTenant?.tenant_id]);

  // Fetch driving logs
  useEffect(() => {
    const fetchLogs = async () => {
      if (!currentTenant?.tenant_id) return;
      const { data, error } = await supabase
        .from("driving_logs")
        .select(`
          *,
          vehicle:vehicles(id, plate_number, model, manufacturer)
        `)
        .eq("tenant_id", currentTenant.tenant_id)
        .order("start_time", { ascending: false })
        .limit(50);
      
      if (error) {
        console.error(error);
        return;
      }
      setDrivingLogs(data || []);
      
      // Check if there's an active log for current user
      const active = data?.find(log => log.status === "in_progress" && log.driver_user_id === user?.id);
      if (active) {
        setActiveLog(active);
        setSelectedVehicle(active.vehicle_id);
        setPurpose(active.purpose || "");
        geo.startTracking();
      }
    };
    fetchLogs();
  }, [currentTenant?.tenant_id, user?.id]);

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    // Simple reverse geocoding using Nominatim (free, no API key needed)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ko`
      );
      const data = await response.json();
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const startTrip = async () => {
    if (!selectedVehicle || !currentTenant?.tenant_id || !user?.id) {
      toast({ title: "차량을 선택해주세요", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const position = await geo.getCurrentPosition();
      const { latitude, longitude } = position.coords;
      const address = await reverseGeocode(latitude, longitude);

      const { data, error } = await supabase
        .from("driving_logs")
        .insert({
          tenant_id: currentTenant.tenant_id,
          vehicle_id: selectedVehicle,
          driver_user_id: user.id,
          start_location_lat: latitude,
          start_location_lng: longitude,
          start_address: address,
          purpose: purpose || null,
          status: "in_progress",
        })
        .select(`*, vehicle:vehicles(id, plate_number, model, manufacturer)`)
        .single();

      if (error) throw error;

      setActiveLog(data);
      geo.startTracking();
      toast({ title: "운행을 시작합니다", description: address });

      // Add first waypoint
      await supabase.from("driving_log_waypoints").insert({
        log_id: data.id,
        latitude,
        longitude,
        speed_kmh: geo.speed,
        heading: geo.heading,
      });
    } catch (error) {
      console.error(error);
      toast({ title: "운행 시작 실패", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const endTrip = async () => {
    if (!activeLog) return;

    setLoading(true);
    try {
      const position = await geo.getCurrentPosition();
      const { latitude, longitude } = position.coords;
      const address = await reverseGeocode(latitude, longitude);
      const distance = geo.getTotalDistance();

      // Add final waypoint
      await supabase.from("driving_log_waypoints").insert({
        log_id: activeLog.id,
        latitude,
        longitude,
        speed_kmh: 0,
        heading: geo.heading,
      });

      const { error } = await supabase
        .from("driving_logs")
        .update({
          end_time: new Date().toISOString(),
          end_location_lat: latitude,
          end_location_lng: longitude,
          end_address: address,
          distance_km: Math.round(distance * 100) / 100,
          memo: endMemo || null,
          status: "completed",
        })
        .eq("id", activeLog.id);

      if (error) throw error;

      geo.stopTracking();
      setActiveLog(null);
      setEndTripDialog(false);
      setEndMemo("");
      setPurpose("");
      setSelectedVehicle("");
      
      toast({ 
        title: "운행이 종료되었습니다", 
        description: `총 ${distance.toFixed(2)}km 주행` 
      });

      // Refresh logs
      const { data: refreshedLogs } = await supabase
        .from("driving_logs")
        .select(`*, vehicle:vehicles(id, plate_number, model, manufacturer)`)
        .eq("tenant_id", currentTenant?.tenant_id)
        .order("start_time", { ascending: false })
        .limit(50);
      
      setDrivingLogs(refreshedLogs || []);
    } catch (error) {
      console.error(error);
      toast({ title: "운행 종료 실패", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Periodically save waypoints during active trip
  useEffect(() => {
    if (!activeLog || !geo.isTracking || !geo.latitude || !geo.longitude) return;

    const interval = setInterval(async () => {
      if (geo.latitude && geo.longitude) {
        await supabase.from("driving_log_waypoints").insert({
          log_id: activeLog.id,
          latitude: geo.latitude,
          longitude: geo.longitude,
          speed_kmh: geo.speed,
          heading: geo.heading,
        });
      }
    }, 30000); // Save every 30 seconds

    return () => clearInterval(interval);
  }, [activeLog, geo.isTracking, geo.latitude, geo.longitude]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_progress":
        return <Badge className="bg-emerald-500">운행 중</Badge>;
      case "completed":
        return <Badge variant="secondary">완료</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Header />
      <main className="pt-28 pb-16 px-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Navigation className="w-8 h-8 text-emerald-400" /> 실시간 운행 관제
            </h1>
            <p className="text-slate-400 mt-1">GPS 기반 주행일지 자동 생성 시스템</p>
          </div>
        </div>

        <Tabs defaultValue="control" className="space-y-6">
          <TabsList className="bg-white/10">
            <TabsTrigger value="control" className="data-[state=active]:bg-emerald-500">
              <Gauge className="w-4 h-4 mr-2" /> 운행 관제
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-emerald-500">
              <History className="w-4 h-4 mr-2" /> 운행 기록
            </TabsTrigger>
          </TabsList>

          <TabsContent value="control" className="space-y-6">
            {/* Active Trip Status */}
            {activeLog ? (
              <Card className="border-emerald-500/50 bg-emerald-500/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-400">
                    <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
                    운행 중
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="text-sm text-slate-400 mb-1">차량</div>
                      <div className="font-bold">
                        {activeLog.vehicle?.plate_number}
                        <span className="text-sm text-slate-400 ml-2">
                          {activeLog.vehicle?.manufacturer} {activeLog.vehicle?.model}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="text-sm text-slate-400 mb-1">출발 시간</div>
                      <div className="font-bold">
                        {format(new Date(activeLog.start_time), "HH:mm", { locale: ko })}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="text-sm text-slate-400 mb-1">주행 거리</div>
                      <div className="font-bold">{geo.getTotalDistance().toFixed(2)} km</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="text-sm text-slate-400 mb-1">현재 속도</div>
                      <div className="font-bold">{geo.speed?.toFixed(0) || 0} km/h</div>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="text-sm text-slate-400 mb-2">출발지</div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                      <span className="text-sm">{activeLog.start_address || "위치 확인 중..."}</span>
                    </div>
                  </div>

                  {geo.latitude && geo.longitude && (
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="text-sm text-slate-400 mb-2">현재 위치</div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                        <span className="text-sm">
                          {geo.latitude.toFixed(6)}, {geo.longitude.toFixed(6)}
                          {geo.accuracy && (
                            <span className="text-slate-500 ml-2">(±{geo.accuracy.toFixed(0)}m)</span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full bg-red-500 hover:bg-red-600 text-white"
                    size="lg"
                    onClick={() => setEndTripDialog(true)}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <Square className="w-5 h-5 mr-2" />
                    )}
                    운행 종료
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-none bg-white/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="w-5 h-5 text-slate-400" />
                    새 운행 시작
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">차량 선택</label>
                    <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue placeholder="차량을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.plate_number} - {v.manufacturer} {v.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">운행 목적 (선택)</label>
                    <Textarea
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="출장, 미팅, 거래처 방문 등"
                      className="bg-white/5 border-white/10 resize-none"
                      rows={2}
                    />
                  </div>

                  {geo.error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {geo.error}
                    </div>
                  )}

                  <Button
                    className="w-full bg-emerald-500 hover:bg-emerald-600"
                    size="lg"
                    onClick={startTrip}
                    disabled={!selectedVehicle || loading}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <Play className="w-5 h-5 mr-2" />
                    )}
                    운행 시작
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            <Card className="border-none bg-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-slate-400" />
                  최근 운행
                </CardTitle>
              </CardHeader>
              <CardContent>
                {drivingLogs.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    운행 기록이 없습니다
                  </div>
                ) : (
                  <div className="space-y-3">
                    {drivingLogs.slice(0, 5).map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <Route className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {log.vehicle?.plate_number}
                            </div>
                            <div className="text-xs text-slate-400">
                              {format(new Date(log.start_time), "MM/dd HH:mm", { locale: ko })}
                              {log.end_time && ` - ${format(new Date(log.end_time), "HH:mm", { locale: ko })}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-300">{log.distance_km} km</span>
                          {getStatusBadge(log.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="border-none bg-white/5">
              <CardHeader>
                <CardTitle>운행 기록</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableHead className="text-slate-400">차량</TableHead>
                      <TableHead className="text-slate-400">출발</TableHead>
                      <TableHead className="text-slate-400">도착</TableHead>
                      <TableHead className="text-slate-400">거리</TableHead>
                      <TableHead className="text-slate-400">목적</TableHead>
                      <TableHead className="text-slate-400">상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivingLogs.map((log) => (
                      <TableRow key={log.id} className="border-white/10 hover:bg-white/5">
                        <TableCell>
                          <div className="font-medium">{log.vehicle?.plate_number}</div>
                          <div className="text-xs text-slate-500">
                            {log.vehicle?.manufacturer} {log.vehicle?.model}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>{format(new Date(log.start_time), "MM/dd HH:mm")}</div>
                          <div className="text-xs text-slate-500 truncate max-w-[150px]">
                            {log.start_address}
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.end_time ? (
                            <>
                              <div>{format(new Date(log.end_time), "MM/dd HH:mm")}</div>
                              <div className="text-xs text-slate-500 truncate max-w-[150px]">
                                {log.end_address}
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>{log.distance_km} km</TableCell>
                        <TableCell>
                          <span className="text-slate-300">{log.purpose || "-"}</span>
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* End Trip Dialog */}
        <Dialog open={endTripDialog} onOpenChange={setEndTripDialog}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                운행 종료
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">메모 (선택)</label>
                <Textarea
                  value={endMemo}
                  onChange={(e) => setEndMemo(e.target.value)}
                  placeholder="특이사항, 주유, 주차 위치 등"
                  className="bg-white/5 border-white/10 resize-none"
                  rows={3}
                />
              </div>
              <div className="bg-white/5 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">총 주행 거리</span>
                  <span className="font-bold text-emerald-400">{geo.getTotalDistance().toFixed(2)} km</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEndTripDialog(false)}>
                취소
              </Button>
              <Button 
                onClick={endTrip} 
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                운행 종료 확인
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default DrivingControl;
