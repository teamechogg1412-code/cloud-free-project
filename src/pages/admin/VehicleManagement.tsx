import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/landing/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CarFront,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  Fuel,
  Loader2,
  Save,
  ShieldCheck,
  Building,
  CalendarClock,
  Briefcase,
  Search,
  Zap,
  AlertCircle,
  Phone,
  Landmark,
  Gauge,
  Route,
  CreditCard,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { differenceInDays, parseISO } from "date-fns";

const VehicleManagement = () => {
  const { currentTenant } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 모든 필드를 포함한 초기 상태
  const initialFormState = {
    vehicle_number: "",
    model_name: "",
    fuel_type: "휘발유",
    initial_mileage: 0,
    usage_category: "비영업용승용차",
    ownership_type: "리스",
    vendor_name: "",
    contract_manager: "",
    contact_number: "",
    monthly_fee: 0,
    payment_day: 1,
    payment_method: "카드 결제",
    primary_driver: "",
    requires_log: false,
    insurance_company: "",
    insurance_start_date: "",
    insurance_end_date: "",
    insurance_driver_age: "만 26세 이상",
    contract_start_date: "",
    contract_end_date: "",
    annual_contract_mileage: 20000,
    excess_mileage_fee: 0,
  };

  const [formData, setFormData] = useState<any>(initialFormState);

  useEffect(() => {
    if (currentTenant) fetchInitialData();
  }, [currentTenant]);

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: empData } = await supabase
      .from("tenant_memberships")
      .select(`user_id, profiles:user_id ( full_name, email )`)
      .eq("tenant_id", currentTenant.tenant_id);
    if (empData) setEmployees(empData);
    await fetchVehicles();
    setLoading(false);
  };

  const fetchVehicles = async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select(`*`)
      .eq("tenant_id", currentTenant.tenant_id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("차량 조회 오류:", error);
      return;
    }
    if (data) setVehicles(data);
  };

  const handleEditClick = (v: any) => {
    const sanitizedData = { ...initialFormState };
    Object.keys(initialFormState).forEach((key) => {
      sanitizedData[key] = v[key] ?? (initialFormState as any)[key];
    });
    setFormData(sanitizedData);
    setEditingId(v.id);
    setIsAddDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.vehicle_number) return toast.error("차량 번호를 입력해주세요.");
    setIsSaving(true);
    try {
      const submitData = {
        ...formData,
        plate_number: formData.vehicle_number,
        tenant_id: currentTenant.tenant_id,
        primary_driver: formData.primary_driver === "none" || !formData.primary_driver ? null : formData.primary_driver,
        insurance_start_date: formData.insurance_start_date || null,
        insurance_end_date: formData.insurance_end_date || null,
        contract_start_date: formData.contract_start_date || null,
        contract_end_date: formData.contract_end_date || null,
      };

      let result;
      if (editingId) {
        result = await supabase.from("vehicles").update(submitData).eq("id", editingId);
      } else {
        result = await supabase.from("vehicles").insert([submitData]);
      }

      if (result.error) {
        throw result.error;
      }

      toast.success("차량 마스터 정보가 저장되었습니다.");
      setIsAddDialogOpen(false);
      resetForm();
      await fetchVehicles();
    } catch (error: any) {
      toast.error(`저장 실패: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingId(null);
  };

  const getDDay = (dateStr: string) => {
    if (!dateStr) return null;
    try {
      return differenceInDays(parseISO(dateStr), new Date());
    } catch (e) {
      return null;
    }
  };

  const filteredVehicles = vehicles.filter(
    (v) => v.vehicle_number.includes(searchQuery) || v.model_name?.includes(searchQuery),
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Header />
      <main className="pt-24 pb-16 px-6 max-w-[1600px] mx-auto">
        {/* 1. 상단 헤더 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg bg-white shadow-sm border border-slate-300 w-9 h-9"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </Button>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-black tracking-tight text-slate-900">차량 관리 대장</h1>
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-600 border-blue-100 text-[10px] h-4 uppercase font-black"
                >
                  법인 자산
                </Badge>
              </div>
              <p className="text-slate-500 text-[11px] font-bold">전사 법인 차량 계약, 금융, 보험 마스터 데이터 관리</p>
            </div>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsAddDialogOpen(true);
            }}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 h-9 px-4 rounded-lg font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <Plus className="mr-1.5 w-3.5 h-3.5" /> 차량 신규 등록
          </Button>
        </div>

        {/* 2. 요약 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border border-slate-300 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <CarFront size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">전체 보유 차량</p>
                <p className="text-lg font-black text-slate-800">{vehicles.length} 대</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-300 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">보험 상태</p>
                <p className="text-lg font-black text-slate-800 uppercase tracking-tighter">검증 완료</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-300 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                <CalendarClock size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">60일내 계약만료</p>
                <p className="text-lg font-black text-slate-800">
                  {
                    vehicles.filter((v) => {
                      const d = getDDay(v.contract_end_date);
                      return d !== null && d <= 60;
                    }).length
                  }{" "}
                  대
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-300 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Zap size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">운행일지 대상</p>
                <p className="text-lg font-black text-slate-800">{vehicles.filter((v) => v.requires_log).length} 대</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. 검색 영역 */}
        <div className="mb-6 relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <Input
            placeholder="차량 번호 또는 모델명 검색..."
            className="pl-10 h-10 rounded-lg border border-slate-300 shadow-sm bg-white text-xs font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 4. 차량 리스트 테이블 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-300">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="py-3 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  차량 식별 정보
                </TableHead>
                <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  계약처 (업체명)
                </TableHead>
                <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  운행자 / 보험
                </TableHead>
                <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  금융 (월 이용료)
                </TableHead>
                <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  운행 / 세무 설정
                </TableHead>
                <TableHead className="text-right px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  관리
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-600" />
                  </TableCell>
                </TableRow>
              ) : filteredVehicles.length > 0 ? (
                filteredVehicles.map((v) => {
                  const insDDay = getDDay(v.insurance_end_date);
                  const conDDay = getDDay(v.contract_end_date);
                  return (
                    <TableRow
                      key={v.id}
                      className="hover:bg-slate-50 transition-all border-b border-slate-200 last:border-none group"
                    >
                      <TableCell className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900 tracking-tighter">{v.vehicle_number}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {v.model_name || "미지정"}
                          </span>
                          <div className="flex gap-1 mt-1">
                            <Badge
                              variant="outline"
                              className="h-4 text-[8px] px-1 border-slate-200 text-slate-500 font-bold uppercase"
                            >
                              {v.fuel_type}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="h-4 text-[8px] px-1 border-slate-200 text-blue-600 font-bold uppercase"
                            >
                              {v.ownership_type}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700">{v.vendor_name || "-"}</span>
                          <span className="text-[10px] text-slate-400">
                            {v.contract_manager} | {v.contact_number}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 mb-1">
                            <User size={12} className="text-slate-300" />
                            <span className="text-xs font-bold text-slate-700">
                              {employees.find(e => e.user_id === v.primary_driver)?.profiles?.full_name || "미지정"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ShieldCheck
                              size={12}
                              className={insDDay !== null && insDDay <= 30 ? "text-rose-500" : "text-emerald-500"}
                            />
                            <span className="text-[10px] font-bold text-slate-600">{v.insurance_company || "-"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-blue-600">
                            {Number(v.monthly_fee || 0).toLocaleString()}원
                          </span>
                          <span className="text-[10px] text-slate-400">
                            매월 {v.payment_day}일 ({v.payment_method})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-600">
                            연 {Number(v.annual_contract_mileage || 0).toLocaleString()}km
                          </span>
                          <div className="mt-1.5">
                            {v.requires_log ? (
                              <Badge className="bg-orange-50 text-orange-600 border-orange-100 text-[9px] font-black h-4 px-1.5 uppercase">
                                세무일지 대상
                              </Badge>
                            ) : (
                              <span className="text-[9px] text-slate-300 uppercase italic">수동 관리</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all"
                            onClick={() => handleEditClick(v)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-all"
                            onClick={() => {
                              setDeleteId(v.id);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-slate-300 font-bold">
                    등록된 차량 정보가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* 등록 및 수정 다이얼로그 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-7xl w-[95vw] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <DialogHeader className="p-6 bg-slate-50 border-b">
            <DialogTitle className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CarFront className="w-5 h-5 text-blue-600" />
              {editingId ? "차량 정보 마스터 수정" : "신규 법인 차량 마스터 등록"}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold text-slate-400 uppercase">
              차량 자산 및 계약 마스터 데이터 관리
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 h-[65vh] overflow-y-auto">
            {/* 컬럼 1: 기초 제원 */}
            <div className="p-8 border-r border-slate-100 space-y-6">
              <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-1 flex items-center gap-2">
                <Gauge size={14} /> 01. 기초 제원 및 운행자
              </h4>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black text-slate-400 uppercase">차량 번호 *</Label>
                  <Input
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                    className="h-10 rounded-xl font-bold"
                    placeholder="예: 12가 3456"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black text-slate-400 uppercase">모델명</Label>
                  <Input
                    value={formData.model_name}
                    onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                    className="h-10 rounded-xl"
                    placeholder="예: 제네시스 G80"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black text-slate-400 uppercase">유종</Label>
                    <Select
                      value={formData.fuel_type}
                      onValueChange={(v) => setFormData({ ...formData, fuel_type: v })}
                    >
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["휘발유", "경유", "LPG", "전기", "하이브리드"].map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black text-slate-400 uppercase">초기 적산(km)</Label>
                    <Input
                      type="number"
                      value={formData.initial_mileage}
                      onChange={(e) => setFormData({ ...formData, initial_mileage: Number(e.target.value) })}
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black text-slate-400 uppercase">전담 운행자</Label>
                  <Select
                    value={formData.primary_driver || "none"}
                    onValueChange={(v) => setFormData({ ...formData, primary_driver: v === "none" ? "" : v })}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder="직원 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">전담자 미지정</SelectItem>
                      {employees.map((e) => (
                        <SelectItem key={e.user_id} value={e.user_id}>
                          {e.profiles.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black text-slate-400 uppercase">차량 용도 구분</Label>
                  <Select
                    value={formData.usage_category}
                    onValueChange={(v) => setFormData({ ...formData, usage_category: v })}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["비영업용승용차", "영업용승용차", "승합차", "화물차"].map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 컬럼 2: 계약 및 금융 */}
            <div className="p-8 border-r border-slate-100 space-y-6">
              <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest border-b pb-1 flex items-center gap-2">
                <Building size={14} /> 02. 계약 및 금융 정보
              </h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black text-slate-400 uppercase">소유 형태</Label>
                    <Select
                      value={formData.ownership_type}
                      onValueChange={(v) => setFormData({ ...formData, ownership_type: v })}
                    >
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["리스", "렌트", "법인자산", "개인소유"].map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black text-slate-400 uppercase">월 이용료(원)</Label>
                    <Input
                      type="number"
                      value={formData.monthly_fee}
                      onChange={(e) => setFormData({ ...formData, monthly_fee: Number(e.target.value) })}
                      className="h-10 rounded-xl font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black text-slate-400 uppercase">계약 업체명</Label>
                  <Input
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                    className="h-10 rounded-xl"
                    placeholder="예: 현대캐피탈"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black text-slate-400 uppercase">담당자</Label>
                    <Input
                      value={formData.contract_manager}
                      onChange={(e) => setFormData({ ...formData, contract_manager: e.target.value })}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black text-slate-400 uppercase">연락처</Label>
                    <Input
                      value={formData.contact_number}
                      onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black text-slate-400 uppercase">계약 시작일</Label>
                    <Input
                      type="date"
                      value={formData.contract_start_date}
                      onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black text-slate-400 uppercase">계약 종료일</Label>
                    <Input
                      type="date"
                      value={formData.contract_end_date}
                      onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
                      className="h-10 rounded-xl font-bold"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black text-slate-400 uppercase">납부일</Label>
                    <Input
                      type="number"
                      placeholder="일"
                      value={formData.payment_day}
                      onChange={(e) => setFormData({ ...formData, payment_day: Number(e.target.value) })}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black text-slate-400 uppercase">결제 수단</Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={(v) => setFormData({ ...formData, payment_method: v })}
                    >
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["카드 결제", "자동 이체", "가상 계좌"].map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* 컬럼 3: 보험 및 세무 */}
            <div className="p-8 space-y-6">
              <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest border-b pb-1 flex items-center gap-2">
                <ShieldCheck size={14} /> 03. 보험 및 세무 설정
              </h4>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black text-slate-400 uppercase">보험사명</Label>
                  <Input
                    value={formData.insurance_company}
                    onChange={(e) => setFormData({ ...formData, insurance_company: e.target.value })}
                    className="h-10 rounded-xl"
                    placeholder="예: 삼성화재"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black text-slate-400 uppercase">운전자 한정 연령</Label>
                  <Select
                    value={formData.insurance_driver_age}
                    onValueChange={(v) => setFormData({ ...formData, insurance_driver_age: v })}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["전연령", "만 21세 이상", "만 26세 이상", "만 30세 이상"].map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black text-slate-400 uppercase">보험 시작일</Label>
                    <Input
                      type="date"
                      value={formData.insurance_start_date}
                      onChange={(e) => setFormData({ ...formData, insurance_start_date: e.target.value })}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black text-slate-400 uppercase">보험 만료일</Label>
                    <Input
                      type="date"
                      value={formData.insurance_end_date}
                      onChange={(e) => setFormData({ ...formData, insurance_end_date: e.target.value })}
                      className="h-10 rounded-xl font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black text-slate-400 uppercase">연간 약정 거리 (km)</Label>
                  <Input
                    type="number"
                    value={formData.annual_contract_mileage}
                    onChange={(e) => setFormData({ ...formData, annual_contract_mileage: Number(e.target.value) })}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black text-slate-400 uppercase">초과 시 km당 수수료 (원)</Label>
                  <Input
                    type="number"
                    value={formData.excess_mileage_fee}
                    onChange={(e) => setFormData({ ...formData, excess_mileage_fee: Number(e.target.value) })}
                    className="h-10 rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-between p-5 bg-[#F8FAFC] rounded-2xl border border-slate-100">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">운행일지 작성 대상</Label>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">
                      세무 신고용 기록 필수
                    </p>
                  </div>
                  <Switch
                    checked={formData.requires_log}
                    onCheckedChange={(val) => setFormData({ ...formData, requires_log: val })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 border-t bg-white">
            <div className="flex gap-2 w-full">
              <Button
                variant="ghost"
                onClick={() => setIsAddDialogOpen(false)}
                className="flex-1 font-bold text-slate-400"
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-[2] bg-blue-600 font-bold h-11 rounded-xl shadow-lg shadow-blue-100"
              >
                {isSaving ? <Loader2 className="animate-spin mr-2" /> : "마스터 정보 저장 완료"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 AlertDialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-none p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600 font-black flex items-center gap-2 text-xl">
              <AlertCircle className="w-5 h-5" /> 법인 자산 삭제 확정
            </AlertDialogTitle>
            <AlertDialogDescription className="py-4 font-bold text-slate-500 leading-relaxed italic">
              이 차량의 모든 데이터와 운행 기록 정보가 시스템에서 영구 삭제됩니다. 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel className="flex-1 rounded-xl font-bold border-slate-200">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await supabase.from("vehicles").delete().eq("id", deleteId);
                toast.success("삭제되었습니다.");
                fetchVehicles();
                setIsDeleteDialogOpen(false);
              }}
              className="flex-1 bg-rose-600 hover:bg-rose-700 rounded-xl font-bold"
            >
              삭제 확정
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VehicleManagement;
