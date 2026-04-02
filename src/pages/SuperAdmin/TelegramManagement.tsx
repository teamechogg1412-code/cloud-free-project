import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, MessageCircle, RefreshCw, Loader2, CheckCircle2, XCircle,
  Calendar, FileWarning, Banknote, Settings2,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const ROOM_TYPES: Record<string, string> = {
  general: "전체",
  finance: "재무",
  artist: "아티스트",
  hr: "인사",
};

const TelegramManagement = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [alertRoom, setAlertRoom] = useState<any | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: roomsData }, { data: tenantsData }] = await Promise.all([
        supabase
          .from("telegram_rooms")
          .select("*, tenants(name)")
          .order("created_at", { ascending: false }),
        supabase.from("tenants").select("id, name").order("name"),
      ]);
      setRooms(roomsData || []);
      setTenants(tenantsData || []);
    } catch {
      toast.error("데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const updateRoom = async (roomId: string, updates: Record<string, any>) => {
    setSaving((prev) => ({ ...prev, [roomId]: true }));
    try {
      const { error } = await supabase.from("telegram_rooms").update(updates).eq("id", roomId);
      if (error) throw error;
      toast.success("저장됐습니다");
      await fetchData();
      if (alertRoom?.id === roomId) {
        setAlertRoom((prev: any) => ({ ...prev, ...updates }));
      }
    } catch {
      toast.error("저장 실패");
    } finally {
      setSaving((prev) => ({ ...prev, [roomId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/super-admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">텔레그램</h1>
              <p className="text-sm text-gray-500">봇 연동 채널 관리</p>
            </div>
          </div>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              새로고침
            </Button>
          </div>
        </div>

        {/* 안내 */}
        <Card className="mb-6 border-cyan-200 bg-cyan-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-cyan-800">
              텔레그램 방에서 <code className="bg-cyan-100 px-1 rounded">/register</code> 를 입력하면 자동으로 추가됩니다.
              고객사 연결 후 알림 설정을 조정하세요.
            </p>
          </CardContent>
        </Card>

        {/* 방 목록 */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">등록된 텔레그램 방이 없습니다</p>
                <p className="text-xs mt-1">텔레그램 방에 봇을 초대하고 /register를 입력하세요</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>채널명</TableHead>
                    <TableHead>채널 ID</TableHead>
                    <TableHead>고객사 연결</TableHead>
                    <TableHead>방 유형</TableHead>
                    <TableHead>알림 설정</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>등록일</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-cyan-500" />
                          {room.chat_title || "이름 없음"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{room.chat_id}</code>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={room.tenant_id || "none"}
                          onValueChange={(val) =>
                            updateRoom(room.id, { tenant_id: val === "none" ? null : val })
                          }
                          disabled={saving[room.id]}
                        >
                          <SelectTrigger className="w-44 h-8 text-sm">
                            <SelectValue placeholder="고객사 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              <span className="text-gray-400">연결 안 함</span>
                            </SelectItem>
                            {tenants.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={room.room_type || "general"}
                          onValueChange={(val) => updateRoom(room.id, { room_type: val })}
                          disabled={saving[room.id]}
                        >
                          <SelectTrigger className="w-28 h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROOM_TYPES).map(([val, label]) => (
                              <SelectItem key={val} value={val}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {room.alert_schedule_enabled && (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                              <Calendar className="w-3 h-3 mr-1" />D-{room.alert_schedule_days}
                            </Badge>
                          )}
                          {room.alert_contract_enabled && (
                            <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
                              <FileWarning className="w-3 h-3 mr-1" />D-{room.alert_contract_days}
                            </Badge>
                          )}
                          {room.alert_settlement_enabled && (
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                              <Banknote className="w-3 h-3 mr-1" />정산
                            </Badge>
                          )}
                          {!room.alert_schedule_enabled && !room.alert_contract_enabled && !room.alert_settlement_enabled && (
                            <span className="text-xs text-gray-400">알림 없음</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {room.tenant_id ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                            <CheckCircle2 className="w-3 h-3" /> 연동됨
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-400 gap-1">
                            <XCircle className="w-3 h-3" /> 미연동
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-400">
                        {new Date(room.created_at).toLocaleDateString("ko-KR")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => setAlertRoom(room)}
                        >
                          <Settings2 className="w-4 h-4 text-gray-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 알림 설정 다이얼로그 */}
      <Dialog open={!!alertRoom} onOpenChange={(o) => !o && setAlertRoom(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-cyan-500" />
              {alertRoom?.chat_title} 알림 설정
            </DialogTitle>
          </DialogHeader>
          {alertRoom && (
            <div className="space-y-6 pt-2">

              {/* 일정 D-N 알림 */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      일정 D-N 알림
                    </div>
                    <Switch
                      checked={alertRoom.alert_schedule_enabled ?? true}
                      onCheckedChange={(v) => {
                        setAlertRoom((p: any) => ({ ...p, alert_schedule_enabled: v }));
                        updateRoom(alertRoom.id, { alert_schedule_enabled: v });
                      }}
                    />
                  </CardTitle>
                </CardHeader>
                {alertRoom.alert_schedule_enabled && (
                  <CardContent className="px-4 pb-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-gray-500 whitespace-nowrap">며칠 전</Label>
                      <Input
                        type="number" min={1} max={30}
                        value={alertRoom.alert_schedule_days ?? 3}
                        className="w-20 h-8 text-sm"
                        onChange={(e) => setAlertRoom((p: any) => ({ ...p, alert_schedule_days: Number(e.target.value) }))}
                        onBlur={() => updateRoom(alertRoom.id, { alert_schedule_days: alertRoom.alert_schedule_days })}
                      />
                      <span className="text-sm text-gray-500">일 전 알림</span>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* 계약 만료 알림 */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileWarning className="w-4 h-4 text-orange-500" />
                      계약 만료 알림
                    </div>
                    <Switch
                      checked={alertRoom.alert_contract_enabled ?? true}
                      onCheckedChange={(v) => {
                        setAlertRoom((p: any) => ({ ...p, alert_contract_enabled: v }));
                        updateRoom(alertRoom.id, { alert_contract_enabled: v });
                      }}
                    />
                  </CardTitle>
                </CardHeader>
                {alertRoom.alert_contract_enabled && (
                  <CardContent className="px-4 pb-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-gray-500 whitespace-nowrap">만료</Label>
                      <Input
                        type="number" min={1} max={90}
                        value={alertRoom.alert_contract_days ?? 30}
                        className="w-20 h-8 text-sm"
                        onChange={(e) => setAlertRoom((p: any) => ({ ...p, alert_contract_days: Number(e.target.value) }))}
                        onBlur={() => updateRoom(alertRoom.id, { alert_contract_days: alertRoom.alert_contract_days })}
                      />
                      <span className="text-sm text-gray-500">일 전 알림</span>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* 정산 완료 알림 */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-green-500" />
                      정산 완료 알림
                    </div>
                    <Switch
                      checked={alertRoom.alert_settlement_enabled ?? true}
                      onCheckedChange={(v) => {
                        setAlertRoom((p: any) => ({ ...p, alert_settlement_enabled: v }));
                        updateRoom(alertRoom.id, { alert_settlement_enabled: v });
                      }}
                    />
                  </CardTitle>
                </CardHeader>
              </Card>

            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TelegramManagement;
