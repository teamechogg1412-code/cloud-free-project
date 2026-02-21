import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/landing/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, User, Building2, CreditCard, FileText,
  Mail, Phone, Shield, PenTool, GitBranch,
  Plus, Trash2, GripVertical, Upload, X, ChevronUp, ChevronDown,
  ClipboardList, Save, Loader2, Heart, ExternalLink, Car,
} from "lucide-react";
import { MyVehicleTab } from "@/components/mypage/MyVehicleTab";
import { MailIntegrationTab } from "@/components/mypage/MailIntegrationTab";
import { toast } from "sonner";

interface HRRecord {
  id: string;
  record_type: string;
  title: string;
  description: string | null;
  effective_date: string;
  old_department: string | null;
  new_department: string | null;
  old_job_title: string | null;
  new_job_title: string | null;
  old_role: string | null;
  new_role: string | null;
  created_at: string;
}

interface CorporateCard {
  id: string;
  card_number: string;
  card_name: string | null;
  card_company: string | null;
  monthly_limit: number | null;
  is_active: boolean | null;
  expiry_date: string | null;
}

interface ApprovalLine {
  id: string;
  step_order: number;
  approver_user_id: string;
  approver_name?: string;
  approver_job_title?: string;
}

interface TenantMember {
  user_id: string;
  full_name: string | null;
  job_title: string | null;
  department: string | null;
}

interface EmployeeDetail {
  id: string;
  hire_date: string | null;
  resignation_date: string | null;
  resident_number: string | null;
  is_foreigner: string | null;
  nationality: string | null;
  address: string | null;
  phone_mobile: string | null;
  phone_tel: string | null;
  email: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_holder: string | null;
  emergency_contacts: { relation: string; name: string; phone: string }[] | null;
  id_card_url: string | null;
  bankbook_url: string | null;
}

const roleLabel: Record<string, string> = {
  company_admin: "대표 관리자",
  manager: "매니저",
  employee: "직원",
};

const recordTypeLabel: Record<string, string> = {
  promotion: "승진",
  transfer: "부서이동",
  role_change: "역할변경",
  note: "메모",
  join: "입사",
  leave: "퇴사",
};

const MyPage = () => {
  const navigate = useNavigate();
  const { user, profile, currentTenant, isSuperAdmin } = useAuth();
  const [hrRecords, setHrRecords] = useState<HRRecord[]>([]);
  const [cards, setCards] = useState<CorporateCard[]>([]);
  const [approvalLines, setApprovalLines] = useState<ApprovalLine[]>([]);
  const [tenantMembers, setTenantMembers] = useState<TenantMember[]>([]);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingApproval, setSavingApproval] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  // Employee details
  const [employeeDetail, setEmployeeDetail] = useState<EmployeeDetail | null>(null);
  const [editingDetail, setEditingDetail] = useState(false);
  const [detailForm, setDetailForm] = useState<Partial<EmployeeDetail>>({});
  const [editContacts, setEditContacts] = useState<{ relation: string; name: string; phone: string }[]>([]);
  const [savingDetail, setSavingDetail] = useState(false);

  // Canvas 서명 관련
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signatureMode, setSignatureMode] = useState<"view" | "draw" | "upload">("view");

  useEffect(() => {
    if (!user || !currentTenant) return;

    const fetchData = async () => {
      setLoading(true);
      const [hrRes, cardRes, approvalRes, membersRes, profileRes, detailRes] = await Promise.all([
        supabase
          .from("hr_records")
          .select("*")
          .eq("user_id", user.id)
          .eq("tenant_id", currentTenant.tenant_id)
          .order("effective_date", { ascending: false }),
        supabase
          .from("corporate_cards")
          .select("id, card_number, card_name, card_company, monthly_limit, is_active, expiry_date")
          .eq("tenant_id", currentTenant.tenant_id)
          .eq("holder_user_id", user.id),
        supabase
          .from("approval_lines")
          .select("id, step_order, approver_user_id")
          .eq("user_id", user.id)
          .eq("tenant_id", currentTenant.tenant_id)
          .order("step_order", { ascending: true }),
        supabase
          .from("tenant_memberships")
          .select("user_id, job_title, department")
          .eq("tenant_id", currentTenant.tenant_id),
        supabase
          .from("profiles")
          .select("signature_url")
          .eq("id", user.id)
          .single(),
        supabase
          .from("employee_details")
          .select("*")
          .eq("user_id", user.id)
          .eq("tenant_id", currentTenant.tenant_id)
          .maybeSingle(),
      ]);

      if (hrRes.data) setHrRecords(hrRes.data as HRRecord[]);
      if (cardRes.data) setCards(cardRes.data as CorporateCard[]);
      if (profileRes.data) setSignatureUrl((profileRes.data as any).signature_url);
      if (detailRes.data) setEmployeeDetail(detailRes.data as unknown as EmployeeDetail);

      // 멤버 목록에 이름 매핑
      if (membersRes.data) {
        const memberIds = (membersRes.data as any[]).map((m: any) => m.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", memberIds);

        const nameMap = new Map((profilesData || []).map((p: any) => [p.id, p.full_name]));
        const members = (membersRes.data as any[]).map((m: any) => ({
          ...m,
          full_name: nameMap.get(m.user_id) || "이름 없음",
        }));
        setTenantMembers(members);

        if (approvalRes.data) {
          setApprovalLines(
            (approvalRes.data as any[]).map((a: any) => ({
              ...a,
              approver_name: nameMap.get(a.approver_user_id) || "이름 없음",
              approver_job_title: members.find((m: any) => m.user_id === a.approver_user_id)?.job_title || "",
            }))
          );
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [user, currentTenant]);

  const maskCardNumber = (num: string) => {
    if (num.length <= 4) return num;
    return "●●●● ●●●● ●●●● " + num.slice(-4);
  };

  const maskResident = (num: string | null) => {
    if (!num) return "-";
    return num.replace(/(.{6}).+/, "$1-*******");
  };

  // === Employee detail editing ===
  const startEditDetail = () => {
    if (employeeDetail) {
      setDetailForm({ ...employeeDetail });
      setEditContacts(
        Array.isArray(employeeDetail.emergency_contacts) && employeeDetail.emergency_contacts.length > 0
          ? [...employeeDetail.emergency_contacts]
          : [{ relation: "", name: "", phone: "" }]
      );
    } else {
      // New record — blank form
      setDetailForm({
        hire_date: null, resignation_date: null, resident_number: null,
        is_foreigner: "내국인", nationality: "대한민국", address: null,
        phone_mobile: profile?.phone || null, phone_tel: null,
        email: profile?.email || null, bank_name: null, account_number: null,
        account_holder: null, id_card_url: null, bankbook_url: null,
      });
      setEditContacts([{ relation: "", name: "", phone: "" }]);
    }
    setEditingDetail(true);
  };

  const cancelEditDetail = () => {
    setEditingDetail(false);
    setDetailForm({});
    setEditContacts([]);
  };

  // File upload helper for 신분증/통장사본
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: "id_card" | "bankbook") => {
    const file = e.target.files?.[0];
    if (!file || !user || !currentTenant) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("이미지 또는 PDF 파일만 업로드 가능합니다.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("파일 크기는 5MB 이하여야 합니다.");
      return;
    }
    setUploadingDoc(docType);
    try {
      const ext = file.name.split(".").pop() || "png";
      const filePath = `employee-docs/${currentTenant.tenant_id}/${user.id}/${docType}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("artist-assets")
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: signedData, error: signedError } = await supabase.storage
        .from("artist-assets")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);
      if (signedError) throw signedError;
      const url = signedData.signedUrl;
      const key = docType === "id_card" ? "id_card_url" : "bankbook_url";
      setDetailForm(prev => ({ ...prev, [key]: url }));
      toast.success(docType === "id_card" ? "신분증이 업로드되었습니다." : "통장사본이 업로드되었습니다.");
    } catch (e: any) {
      toast.error("업로드 실패: " + e.message);
    } finally {
      setUploadingDoc(null);
    }
  };

  const saveDetail = async () => {
    if (!user || !currentTenant) return;
    setSavingDetail(true);
    try {
      const payload = {
        user_id: user.id,
        tenant_id: currentTenant.tenant_id,
        hire_date: detailForm.hire_date || null,
        resignation_date: detailForm.resignation_date || null,
        resident_number: detailForm.resident_number || null,
        is_foreigner: detailForm.is_foreigner || "내국인",
        nationality: detailForm.nationality || "대한민국",
        address: detailForm.address || null,
        phone_mobile: detailForm.phone_mobile || null,
        phone_tel: detailForm.phone_tel || null,
        email: detailForm.email || null,
        bank_name: detailForm.bank_name || null,
        account_number: detailForm.account_number || null,
        account_holder: detailForm.account_holder || null,
        id_card_url: detailForm.id_card_url || null,
        bankbook_url: detailForm.bankbook_url || null,
        emergency_contacts: editContacts.filter(c => c.name || c.phone),
      };

      const { error } = await supabase
        .from("employee_details")
        .upsert(payload, { onConflict: "user_id,tenant_id" });

      if (error) throw error;

      // Update phone in profiles too
      if (detailForm.phone_mobile) {
        await supabase.from("profiles").update({ phone: detailForm.phone_mobile }).eq("id", user.id);
      }

      // Refresh data
      const { data } = await supabase
        .from("employee_details")
        .select("*")
        .eq("user_id", user.id)
        .eq("tenant_id", currentTenant.tenant_id)
        .maybeSingle();
      if (data) setEmployeeDetail(data as unknown as EmployeeDetail);

      setEditingDetail(false);
      toast.success("인사 정보가 저장되었습니다.");
    } catch (e: any) {
      toast.error("저장 실패: " + e.message);
    } finally {
      setSavingDetail(false);
    }
  };

  // === 결제라인 관리 ===
  const addApprovalStep = () => {
    setApprovalLines((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, step_order: prev.length + 1, approver_user_id: "", approver_name: "" },
    ]);
  };

  const removeApprovalStep = (index: number) => {
    setApprovalLines((prev) =>
      prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, step_order: i + 1 }))
    );
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    setApprovalLines((prev) => {
      const arr = [...prev];
      const swapIdx = direction === "up" ? index - 1 : index + 1;
      if (swapIdx < 0 || swapIdx >= arr.length) return arr;
      [arr[index], arr[swapIdx]] = [arr[swapIdx], arr[index]];
      return arr.map((item, i) => ({ ...item, step_order: i + 1 }));
    });
  };

  const updateApprover = (index: number, userId: string) => {
    const member = tenantMembers.find((m) => m.user_id === userId);
    setApprovalLines((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, approver_user_id: userId, approver_name: member?.full_name || "", approver_job_title: member?.job_title || "" }
          : item
      )
    );
  };

  const saveApprovalLines = async () => {
    if (!user || !currentTenant) return;
    const invalid = approvalLines.some((a) => !a.approver_user_id);
    if (invalid) {
      toast.error("모든 단계에 결재자를 선택해주세요.");
      return;
    }

    setSavingApproval(true);
    try {
      await supabase
        .from("approval_lines")
        .delete()
        .eq("user_id", user.id)
        .eq("tenant_id", currentTenant.tenant_id);

      if (approvalLines.length > 0) {
        const { error } = await supabase.from("approval_lines").insert(
          approvalLines.map((a, i) => ({
            tenant_id: currentTenant.tenant_id,
            user_id: user.id,
            step_order: i + 1,
            approver_user_id: a.approver_user_id,
          }))
        );
        if (error) throw error;
      }
      toast.success("결제라인이 저장되었습니다.");
    } catch (e: any) {
      toast.error("저장 실패: " + e.message);
    } finally {
      setSavingApproval(false);
    }
  };

  // === 서명 캔버스 ===
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    if (signatureMode === "draw") {
      setTimeout(initCanvas, 100);
    }
  }, [signatureMode, initCanvas]);

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const endDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const saveSignatureFromCanvas = async () => {
    if (!user || !canvasRef.current || !hasDrawn) return;
    setUploadingSignature(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvasRef.current!.toBlob(resolve, "image/png")
      );
      if (!blob) throw new Error("서명 이미지 생성 실패");

      const filePath = `signatures/${user.id}/signature.png`;
      const { error: uploadError } = await supabase.storage
        .from("artist-assets")
        .upload(filePath, blob, { upsert: true, contentType: "image/png" });
      if (uploadError) throw uploadError;

      const { data: signedData1, error: signedError1 } = await supabase.storage
        .from("artist-assets")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);
      if (signedError1) throw signedError1;
      const url = signedData1.signedUrl;

      await supabase.from("profiles").update({ signature_url: url }).eq("id", user.id);
      setSignatureUrl(url);
      setSignatureMode("view");
      toast.success("서명이 저장되었습니다.");
    } catch (e: any) {
      toast.error("서명 저장 실패: " + e.message);
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("파일 크기는 2MB 이하여야 합니다.");
      return;
    }
    setUploadingSignature(true);
    try {
      const filePath = `signatures/${user.id}/signature.png`;
      const { error: uploadError } = await supabase.storage
        .from("artist-assets")
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: signedData2, error: signedError2 } = await supabase.storage
        .from("artist-assets")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);
      if (signedError2) throw signedError2;
      const url = signedData2.signedUrl;

      await supabase.from("profiles").update({ signature_url: url }).eq("id", user.id);
      setSignatureUrl(url);
      setSignatureMode("view");
      toast.success("서명이 업로드되었습니다.");
    } catch (e: any) {
      toast.error("업로드 실패: " + e.message);
    } finally {
      setUploadingSignature(false);
    }
  };

  const deleteSignature = async () => {
    if (!user) return;
    try {
      await supabase.storage.from("artist-assets").remove([`signatures/${user.id}/signature.png`]);
      await supabase.from("profiles").update({ signature_url: null }).eq("id", user.id);
      setSignatureUrl(null);
      toast.success("서명이 삭제되었습니다.");
    } catch (e: any) {
      toast.error("삭제 실패: " + e.message);
    }
  };

  // Helper for detail info row
  const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div className="flex justify-between items-start py-2.5 border-b border-border/50 last:border-0">
      <span className="text-xs font-semibold text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-sm text-right">{value || "-"}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-28 pb-16 px-4 max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User className="w-6 h-6 text-primary" /> 마이페이지
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">내 정보 및 회사 부여 정보 확인</p>
          </div>
        </div>

        {/* 프로필 카드 */}
        <Card className="mb-6 border-none shadow-lg rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-5">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold">{profile?.full_name || "이름 미등록"}</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {profile?.email}</span>
                  {profile?.phone && (
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {profile.phone}</span>
                  )}
                </div>
                {isSuperAdmin && (
                  <Badge variant="destructive" className="mt-2">
                    <Shield className="w-3 h-3 mr-1" /> Super Admin
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 소속 정보 */}
        {currentTenant && (
          <Card className="mb-6 border-none shadow-lg rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> 소속 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">회사</p>
                  <p className="font-medium text-sm">{currentTenant.tenant.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">부서</p>
                  <p className="font-medium text-sm">{currentTenant.department || "미지정"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">직급</p>
                  <p className="font-medium text-sm">{currentTenant.job_title || "미지정"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">역할</p>
                  <Badge variant="secondary" className="text-xs">
                    {roleLabel[currentTenant.role] || currentTenant.role}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 탭 */}
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="details" className="flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4" /> 내 인사정보
            </TabsTrigger>
            <TabsTrigger value="hr" className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> 인사 기록
            </TabsTrigger>
            <TabsTrigger value="cards" className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4" /> 법인카드
            </TabsTrigger>
            <TabsTrigger value="approval" className="flex items-center gap-1.5">
              <GitBranch className="w-4 h-4" /> 결제라인
            </TabsTrigger>
            <TabsTrigger value="signature" className="flex items-center gap-1.5">
              <PenTool className="w-4 h-4" /> 서명 관리
            </TabsTrigger>
            <TabsTrigger value="vehicle" className="flex items-center gap-1.5">
              <Car className="w-4 h-4" /> 차량 관리
            </TabsTrigger>
            <TabsTrigger value="mail" className="flex items-center gap-1.5">
              <Mail className="w-4 h-4" /> 메일 연동
            </TabsTrigger>
          </TabsList>

          {/* 내 인사정보 탭 */}
          <TabsContent value="details">
            <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-primary" /> 내 인사 카드
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      인사 정보를 등록·수정하면 사내 모든 문서에 자동 반영됩니다.
                    </p>
                  </div>
                  {!editingDetail && (
                    <Button variant={employeeDetail ? "outline" : "default"} size="sm" onClick={startEditDetail}
                      className="rounded-full px-5">
                      <PenTool className="w-3.5 h-3.5 mr-1.5" />
                      {employeeDetail ? "정보 수정" : "정보 등록"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                {loading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />불러오는 중...
                  </div>
                ) : editingDetail ? (
                  /* ─── 편집 모드 ─── */
                  <div className="space-y-8">
                    {/* 기본 정보 */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" /> 기본 정보
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">입사일자</Label>
                          <Input type="date" value={detailForm.hire_date || ""} onChange={e => setDetailForm({...detailForm, hire_date: e.target.value})} className="rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">퇴사일자</Label>
                          <Input type="date" value={detailForm.resignation_date || ""} onChange={e => setDetailForm({...detailForm, resignation_date: e.target.value})} className="rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">주민등록번호</Label>
                          <Input type="password" value={detailForm.resident_number || ""} onChange={e => setDetailForm({...detailForm, resident_number: e.target.value})} placeholder="000000-0000000" className="rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">국적</Label>
                          <Input value={detailForm.nationality || ""} onChange={e => setDetailForm({...detailForm, nationality: e.target.value})} className="rounded-xl" />
                        </div>
                      </div>
                    </div>

                    {/* 연락처 & 주소 */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Phone className="w-4 h-4 text-primary" /> 연락처 & 주소
                      </h3>
                      <div className="grid grid-cols-1 gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">주소</Label>
                          <Input value={detailForm.address || ""} onChange={e => setDetailForm({...detailForm, address: e.target.value})} placeholder="주소를 입력하세요" className="rounded-xl" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">휴대폰번호</Label>
                            <Input value={detailForm.phone_mobile || ""} onChange={e => setDetailForm({...detailForm, phone_mobile: e.target.value})} placeholder="010-0000-0000" className="rounded-xl" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">유선전화</Label>
                            <Input value={detailForm.phone_tel || ""} onChange={e => setDetailForm({...detailForm, phone_tel: e.target.value})} className="rounded-xl" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">이메일</Label>
                            <Input value={detailForm.email || ""} onChange={e => setDetailForm({...detailForm, email: e.target.value})} className="rounded-xl" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 급여 계좌 */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary" /> 급여 계좌
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">은행</Label>
                          <Input value={detailForm.bank_name || ""} onChange={e => setDetailForm({...detailForm, bank_name: e.target.value})} placeholder="은행명" className="rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">계좌번호</Label>
                          <Input value={detailForm.account_number || ""} onChange={e => setDetailForm({...detailForm, account_number: e.target.value})} placeholder="계좌번호" className="rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">예금주</Label>
                          <Input value={detailForm.account_holder || ""} onChange={e => setDetailForm({...detailForm, account_holder: e.target.value})} placeholder="예금주명" className="rounded-xl" />
                        </div>
                      </div>
                    </div>

                    {/* 증빙서류 업로드 */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Upload className="w-4 h-4 text-primary" /> 증빙 서류
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 신분증 */}
                        <div className="p-4 rounded-2xl border border-border/50 bg-muted/30">
                          <Label className="text-xs font-semibold mb-2 block">신분증 사본</Label>
                          {detailForm.id_card_url ? (
                            <div className="flex items-center gap-3">
                              <a href={detailForm.id_card_url} target="_blank" rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline flex items-center gap-1">
                                <ExternalLink className="w-3.5 h-3.5" /> 등록된 파일 보기
                              </a>
                              <label className="cursor-pointer">
                                <input type="file" accept="image/*,application/pdf" className="hidden"
                                  onChange={(e) => handleDocUpload(e, "id_card")} disabled={!!uploadingDoc} />
                                <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                                  <span>{uploadingDoc === "id_card" ? <Loader2 className="w-3 h-3 animate-spin" /> : "변경"}</span>
                                </Button>
                              </label>
                            </div>
                          ) : (
                            <label className="cursor-pointer block">
                              <input type="file" accept="image/*,application/pdf" className="hidden"
                                onChange={(e) => handleDocUpload(e, "id_card")} disabled={!!uploadingDoc} />
                              <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/40 transition-colors">
                                {uploadingDoc === "id_card" ? (
                                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                                ) : (
                                  <>
                                    <Upload className="w-5 h-5 mx-auto text-muted-foreground/40 mb-1" />
                                    <p className="text-xs text-muted-foreground">클릭하여 업로드</p>
                                  </>
                                )}
                              </div>
                            </label>
                          )}
                        </div>
                        {/* 통장사본 */}
                        <div className="p-4 rounded-2xl border border-border/50 bg-muted/30">
                          <Label className="text-xs font-semibold mb-2 block">통장 사본</Label>
                          {detailForm.bankbook_url ? (
                            <div className="flex items-center gap-3">
                              <a href={detailForm.bankbook_url} target="_blank" rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline flex items-center gap-1">
                                <ExternalLink className="w-3.5 h-3.5" /> 등록된 파일 보기
                              </a>
                              <label className="cursor-pointer">
                                <input type="file" accept="image/*,application/pdf" className="hidden"
                                  onChange={(e) => handleDocUpload(e, "bankbook")} disabled={!!uploadingDoc} />
                                <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                                  <span>{uploadingDoc === "bankbook" ? <Loader2 className="w-3 h-3 animate-spin" /> : "변경"}</span>
                                </Button>
                              </label>
                            </div>
                          ) : (
                            <label className="cursor-pointer block">
                              <input type="file" accept="image/*,application/pdf" className="hidden"
                                onChange={(e) => handleDocUpload(e, "bankbook")} disabled={!!uploadingDoc} />
                              <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/40 transition-colors">
                                {uploadingDoc === "bankbook" ? (
                                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                                ) : (
                                  <>
                                    <Upload className="w-5 h-5 mx-auto text-muted-foreground/40 mb-1" />
                                    <p className="text-xs text-muted-foreground">클릭하여 업로드</p>
                                  </>
                                )}
                              </div>
                            </label>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 비상연락처 */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Heart className="w-4 h-4 text-primary" /> 비상 연락처
                        </h3>
                        <Button type="button" variant="outline" size="sm" className="rounded-full h-8 text-xs px-4"
                          onClick={() => setEditContacts([...editContacts, { relation: "", name: "", phone: "" }])}>
                          <Plus className="w-3.5 h-3.5 mr-1" /> 추가
                        </Button>
                      </div>
                      <div className="space-y-2 p-4 rounded-2xl bg-muted/30 border border-border/50">
                        {editContacts.map((c, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <Input placeholder="관계 (예: 부)" className="w-24 rounded-xl" value={c.relation} onChange={e => {
                              const arr = [...editContacts]; arr[i] = {...arr[i], relation: e.target.value}; setEditContacts(arr);
                            }} />
                            <Input placeholder="성함" className="w-28 rounded-xl" value={c.name} onChange={e => {
                              const arr = [...editContacts]; arr[i] = {...arr[i], name: e.target.value}; setEditContacts(arr);
                            }} />
                            <Input placeholder="연락처" className="flex-1 rounded-xl" value={c.phone} onChange={e => {
                              const arr = [...editContacts]; arr[i] = {...arr[i], phone: e.target.value}; setEditContacts(arr);
                            }} />
                            <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0 text-destructive hover:text-destructive"
                              onClick={() => setEditContacts(editContacts.filter((_, idx) => idx !== i))}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                        {editContacts.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-3">"추가" 버튼으로 비상 연락처를 등록하세요.</p>
                        )}
                      </div>
                    </div>

                    {/* 저장/취소 */}
                    <div className="flex justify-end gap-3 pt-2">
                      <Button variant="ghost" onClick={cancelEditDetail} className="rounded-full px-6">취소</Button>
                      <Button onClick={saveDetail} disabled={savingDetail} className="rounded-full px-8">
                        {savingDetail ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                        저장
                      </Button>
                    </div>
                  </div>
                ) : !employeeDetail ? (
                  /* ─── 미등록 상태 ─── */
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <ClipboardList className="w-8 h-8 text-primary/50" />
                    </div>
                    <p className="text-foreground font-medium mb-1">아직 인사 정보가 등록되지 않았습니다</p>
                    <p className="text-xs text-muted-foreground mb-5">
                      "정보 등록" 버튼을 눌러 인사 카드를 작성하세요.
                    </p>
                    <Button onClick={startEditDetail} className="rounded-full px-6">
                      <Plus className="w-4 h-4 mr-1.5" /> 정보 등록하기
                    </Button>
                  </div>
                ) : (
                  /* ─── 조회 모드 ─── */
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> 기본 정보
                      </p>
                      <div className="bg-muted/30 rounded-2xl p-5 border border-border/30">
                        <InfoRow label="입사일" value={employeeDetail.hire_date} />
                        <InfoRow label="퇴사일" value={employeeDetail.resignation_date} />
                        <InfoRow label="구분" value={employeeDetail.is_foreigner} />
                        <InfoRow label="국적" value={employeeDetail.nationality} />
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> 연락처 & 주소
                      </p>
                      <div className="bg-muted/30 rounded-2xl p-5 border border-border/30">
                        <InfoRow label="주민등록번호" value={maskResident(employeeDetail.resident_number)} />
                        <InfoRow label="주소" value={employeeDetail.address} />
                        <InfoRow label="휴대폰" value={employeeDetail.phone_mobile} />
                        <InfoRow label="유선전화" value={employeeDetail.phone_tel} />
                        <InfoRow label="이메일" value={employeeDetail.email} />
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" /> 급여 계좌
                      </p>
                      <div className="bg-muted/30 rounded-2xl p-5 border border-border/30">
                        <InfoRow label="은행" value={employeeDetail.bank_name} />
                        <InfoRow label="계좌번호" value={employeeDetail.account_number} />
                        <InfoRow label="예금주" value={employeeDetail.account_holder} />
                      </div>
                    </div>

                    {/* 비상연락처 */}
                    <div>
                      <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5" /> 비상 연락처
                      </p>
                      {Array.isArray(employeeDetail.emergency_contacts) && employeeDetail.emergency_contacts.length > 0 ? (
                        <div className="bg-muted/30 rounded-2xl p-5 border border-border/30 space-y-2">
                          {employeeDetail.emergency_contacts.map((c: any, i: number) => (
                            <div key={i} className="flex gap-4 text-sm py-1.5 border-b border-border/50 last:border-0">
                              <span className="text-muted-foreground w-16">{c.relation || "-"}</span>
                              <span className="font-medium">{c.name || "-"}</span>
                              <span className="text-muted-foreground">{c.phone || "-"}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-muted/30 rounded-2xl p-5 border border-border/30 text-center">
                          <p className="text-xs text-muted-foreground">등록된 비상 연락처가 없습니다.</p>
                        </div>
                      )}
                    </div>

                    {/* 증빙서류 링크 */}
                    {(employeeDetail.id_card_url || employeeDetail.bankbook_url) && (
                      <div>
                        <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" /> 증빙 서류
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {employeeDetail.id_card_url && (
                            <a href={employeeDetail.id_card_url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-sm text-primary hover:underline bg-primary/5 px-4 py-2 rounded-full">
                              <ExternalLink className="w-3.5 h-3.5" /> 신분증 사본
                            </a>
                          )}
                          {employeeDetail.bankbook_url && (
                            <a href={employeeDetail.bankbook_url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-sm text-primary hover:underline bg-primary/5 px-4 py-2 rounded-full">
                              <ExternalLink className="w-3.5 h-3.5" /> 통장 사본
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 인사 기록 탭 */}
          <TabsContent value="hr">
            <Card className="border-none shadow-lg rounded-2xl">
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">불러오는 중...</div>
                ) : hrRecords.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">등록된 인사 기록이 없습니다.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">유형</TableHead>
                        <TableHead>제목</TableHead>
                        <TableHead className="w-28">시행일</TableHead>
                        <TableHead className="hidden md:table-cell">변경 내용</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hrRecords.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {recordTypeLabel[r.record_type] || r.record_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{r.title}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.effective_date}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {r.old_department && r.new_department && `${r.old_department} → ${r.new_department}`}
                            {r.old_job_title && r.new_job_title && ` | ${r.old_job_title} → ${r.new_job_title}`}
                            {r.description && !r.old_department && !r.old_job_title && r.description}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 법인카드 탭 */}
          <TabsContent value="cards">
            <Card className="border-none shadow-lg rounded-2xl">
              <CardContent className="p-6">
                {loading ? (
                  <div className="text-center text-muted-foreground">불러오는 중...</div>
                ) : cards.length === 0 ? (
                  <div className="text-center text-muted-foreground">부여된 법인카드가 없습니다.</div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {cards.map((card) => (
                      <div
                        key={card.id}
                        className="relative p-5 rounded-xl bg-gradient-to-br from-foreground/90 to-foreground text-background overflow-hidden"
                      >
                        <div className="absolute top-3 right-4 text-xs opacity-60">
                          {card.is_active ? "사용중" : "비활성"}
                        </div>
                        <p className="text-xs opacity-60 mb-1">{card.card_company || "카드사"}</p>
                        <p className="font-mono text-lg tracking-widest mb-3">
                          {maskCardNumber(card.card_number)}
                        </p>
                        <div className="flex justify-between text-xs opacity-70">
                          <span>{card.card_name || "법인카드"}</span>
                          {card.expiry_date && <span>만료: {card.expiry_date}</span>}
                        </div>
                        {card.monthly_limit && (
                          <p className="text-xs opacity-50 mt-2">
                            월 한도: ₩{card.monthly_limit.toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 결제라인 탭 */}
          <TabsContent value="approval">
            <Card className="border-none shadow-lg rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">나의 결제라인</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={addApprovalStep}>
                      <Plus className="w-4 h-4 mr-1" /> 단계 추가
                    </Button>
                    <Button size="sm" onClick={saveApprovalLines} disabled={savingApproval}>
                      {savingApproval ? "저장 중..." : "저장"}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  전자결재 시 사용할 결제라인을 설정하세요. 순서대로 결재가 진행됩니다.
                </p>
              </CardHeader>
              <CardContent>
                {approvalLines.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <GitBranch className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>등록된 결제라인이 없습니다.</p>
                    <p className="text-xs mt-1">"단계 추가" 버튼으로 결재자를 추가하세요.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {approvalLines.map((line, index) => (
                      <div
                        key={line.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30"
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <button onClick={() => moveStep(index, "up")} disabled={index === 0}
                            className="p-0.5 hover:bg-muted rounded disabled:opacity-20">
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-primary w-5 text-center">{line.step_order}</span>
                          <button onClick={() => moveStep(index, "down")} disabled={index === approvalLines.length - 1}
                            className="p-0.5 hover:bg-muted rounded disabled:opacity-20">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex-1">
                          <Select value={line.approver_user_id} onValueChange={(val) => updateApprover(index, val)}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="결재자 선택" /></SelectTrigger>
                            <SelectContent>
                              {tenantMembers.filter((m) => m.user_id !== user?.id).map((m) => (
                                <SelectItem key={m.user_id} value={m.user_id}>
                                  {m.full_name} {m.job_title ? `(${m.job_title})` : ""} {m.department ? `- ${m.department}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {line.approver_name && (
                          <div className="hidden sm:block text-xs text-muted-foreground min-w-[80px]">
                            {line.approver_job_title || ""}
                          </div>
                        )}
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive"
                          onClick={() => removeApprovalStep(index)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-xs font-semibold text-primary mb-2">결재 흐름 미리보기</p>
                      <div className="flex items-center gap-2 flex-wrap text-sm">
                        <Badge variant="outline" className="text-xs">기안자 (나)</Badge>
                        {approvalLines.filter((a) => a.approver_name).map((a) => (
                          <span key={a.id} className="flex items-center gap-2">
                            <span className="text-primary">→</span>
                            <Badge variant="secondary" className="text-xs">{a.step_order}차 {a.approver_name}</Badge>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 서명 관리 탭 */}
          <TabsContent value="signature">
            <Card className="border-none shadow-lg rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">내 서명</CardTitle>
                <p className="text-xs text-muted-foreground">
                  전자결재 및 위임장에 사용할 서명을 등록하세요.
                </p>
              </CardHeader>
              <CardContent>
                {signatureMode === "view" && (
                  <div className="space-y-4">
                    {signatureUrl ? (
                      <div className="border border-border rounded-xl p-6 bg-muted/20 flex flex-col items-center gap-4">
                        <img src={signatureUrl} alt="내 서명" className="max-h-32 object-contain" />
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSignatureMode("draw")}>
                            <PenTool className="w-4 h-4 mr-1" /> 다시 그리기
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setSignatureMode("upload")}>
                            <Upload className="w-4 h-4 mr-1" /> 이미지 변경
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={deleteSignature}>
                            <Trash2 className="w-4 h-4 mr-1" /> 삭제
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-border rounded-xl p-10 text-center">
                        <PenTool className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                        <p className="text-muted-foreground mb-4">등록된 서명이 없습니다.</p>
                        <div className="flex justify-center gap-2">
                          <Button variant="outline" onClick={() => setSignatureMode("draw")}>
                            <PenTool className="w-4 h-4 mr-1" /> 직접 그리기
                          </Button>
                          <Button variant="outline" onClick={() => setSignatureMode("upload")}>
                            <Upload className="w-4 h-4 mr-1" /> 이미지 업로드
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {signatureMode === "draw" && (
                  <div className="space-y-4">
                    <div className="border border-border rounded-xl overflow-hidden bg-background">
                      <canvas
                        ref={canvasRef}
                        className="w-full h-48 cursor-crosshair touch-none"
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={endDraw}
                        onMouseLeave={endDraw}
                        onTouchStart={startDraw}
                        onTouchMove={draw}
                        onTouchEnd={endDraw}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      마우스 또는 터치로 서명을 그려주세요.
                    </p>
                    <div className="flex justify-center gap-2">
                      <Button variant="ghost" onClick={() => { setSignatureMode("view"); setHasDrawn(false); }}>
                        <X className="w-4 h-4 mr-1" /> 취소
                      </Button>
                      <Button variant="outline" onClick={clearCanvas}>지우기</Button>
                      <Button onClick={saveSignatureFromCanvas} disabled={!hasDrawn || uploadingSignature}>
                        {uploadingSignature ? "저장 중..." : "서명 저장"}
                      </Button>
                    </div>
                  </div>
                )}

                {signatureMode === "upload" && (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-primary/30 rounded-xl p-10 text-center">
                      <Upload className="w-10 h-10 mx-auto mb-3 text-primary/40" />
                      <p className="text-sm text-muted-foreground mb-3">
                        서명 이미지를 업로드하세요 (PNG, JPG / 최대 2MB)
                      </p>
                      <label>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={handleSignatureUpload}
                          disabled={uploadingSignature}
                        />
                        <Button variant="outline" asChild disabled={uploadingSignature}>
                          <span>{uploadingSignature ? "업로드 중..." : "파일 선택"}</span>
                        </Button>
                      </label>
                    </div>
                    <div className="flex justify-center">
                      <Button variant="ghost" onClick={() => setSignatureMode("view")}>
                        <X className="w-4 h-4 mr-1" /> 취소
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 차량 관리 탭 */}
          <TabsContent value="vehicle">
            {user && currentTenant && (
              <MyVehicleTab userId={user.id} tenantId={currentTenant.tenant_id} />
            )}
          </TabsContent>

          {/* 메일 연동 탭 */}
          <TabsContent value="mail">
            {user && currentTenant && (
              <MailIntegrationTab userId={user.id} tenantId={currentTenant.tenant_id} />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MyPage;
