import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/landing/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, User, Building2, CreditCard, FileText,
  Mail, Phone, Shield, PenTool, GitBranch,
  ClipboardList, Heart, ExternalLink, Car, Loader2,
  MapPin, Briefcase, Globe
} from "lucide-react";

// 마이페이지에서 사용하는 하위 컴포넌트 임포트
import { MyVehicleTab } from "@/components/mypage/MyVehicleTab";
import { MailIntegrationTab } from "@/components/mypage/MailIntegrationTab";
import { toast } from "sonner";

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
  hire: "신규채용"
};

const MemberDetail = () => {
  const navigate = useNavigate();
  const { id: memberId } = useParams<{ id: string }>(); 
  const { currentTenant, isCompanyAdmin } = useAuth();
  
  const [profile, setProfile] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const [hrRecords, setHrRecords] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [approvalLines, setApprovalLines] = useState<any[]>([]);
  const [employeeDetail, setEmployeeDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 데이터 로드 함수를 useCallback으로 감싸 정의 (호출 순서 에러 방지)
  const fetchAllData = useCallback(async () => {
    if (!currentTenant || !memberId) return;

    setLoading(true);
    try {
      const [profRes, membRes, hrRes, cardRes, approvalRes, detailRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", memberId).single(),
        supabase.from("tenant_memberships").select("*").eq("tenant_id", currentTenant.tenant_id).eq("user_id", memberId).single(),
        supabase.from("hr_records").select("*").eq("user_id", memberId).order("effective_date", { ascending: false }),
        supabase.from("corporate_cards").select("*").eq("holder_user_id", memberId),
        supabase.from("approval_lines").select("*, approver:approver_user_id(full_name)").eq("user_id", memberId).order("step_order", { ascending: true }),
        supabase.from("employee_details").select("*").eq("user_id", memberId).maybeSingle(),
      ]);

      if (profRes.data) setProfile(profRes.data);
      if (membRes.data) setMembership(membRes.data);
      if (hrRes.data) setHrRecords(hrRes.data);
      if (cardRes.data) setCards(cardRes.data);
      if (approvalRes.data) setApprovalLines(approvalRes.data);
      if (detailRes.data) setEmployeeDetail(detailRes.data);

    } catch (e) {
      console.error(e);
      toast.error("데이터 로드 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [currentTenant, memberId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const maskCardNumber = (num: string) => {
    if (num.length <= 4) return num;
    return "●●●● ●●●● ●●●● " + num.slice(-4);
  };

  const maskResident = (num: string | null) => {
    if (!num) return "-";
    return num.replace(/(.{6}).+/, "$1-*******");
  };

  const InfoRow = ({ label, value }: { label: string; value: any }) => (
    <div className="flex justify-between items-start py-2.5 border-b border-border/50 last:border-0">
      <span className="text-xs font-semibold text-muted-foreground w-28 shrink-0 uppercase">{label}</span>
      <span className="text-sm font-medium text-slate-700 text-right">{value || "-"}</span>
    </div>
  );

  if (!isCompanyAdmin) return <div className="p-20 text-center font-bold text-slate-400">관리자 권한이 필요합니다.</div>;
  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>;
  if (!profile) return <div className="p-20 text-center">직원 정보를 찾을 수 없습니다.</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header />
      <main className="pt-28 pb-16 px-4 max-w-5xl mx-auto animate-in fade-in duration-500">
        
        {/* 상단 헤더 및 프로필 요약 */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/hr")} className="bg-white border shadow-sm rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">직원 마스터 프로필</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Employee Data Central</p>
          </div>
        </div>

        <Card className="mb-8 border-none shadow-xl rounded-[2rem] overflow-hidden">
          <div className="bg-slate-900 p-8 text-white">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <Avatar className="w-24 h-24 border-4 border-white/10 shadow-2xl">
                <AvatarImage src={profile.avatar_url || ""} />
                <AvatarFallback className="bg-primary/20 text-2xl font-bold">{profile.full_name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
                  <h2 className="text-4xl font-black">{profile.full_name}</h2>
                  <Badge variant="secondary" className="bg-white/10 text-white border-none font-bold">
                    {roleLabel[membership?.role] || "구성원"}
                  </Badge>
                  {membership?.is_suspended && <Badge variant="destructive">정지됨</Badge>}
                </div>
                <div className="flex flex-wrap justify-center md:justify-start gap-5 text-sm text-white/60 font-medium">
                  <span className="flex items-center gap-1.5"><Mail size={16} className="text-blue-400" /> {profile.email}</span>
                  <span className="flex items-center gap-1.5"><Building2 size={16} className="text-emerald-400" /> {membership?.department || "부서 미지정"}</span>
                  <span className="flex items-center gap-1.5"><Briefcase size={16} className="text-orange-400" /> {membership?.job_title || "직급 미지정"}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 메인 탭 영역 (마이페이지 구성 복제) */}
        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className="w-full justify-start h-12 p-1 bg-white border shadow-sm rounded-2xl gap-1">
            <TabsTrigger value="details" className="rounded-xl px-5 font-bold gap-2"><ClipboardList size={16}/> 인사카드</TabsTrigger>
            <TabsTrigger value="hr" className="rounded-xl px-5 font-bold gap-2"><FileText size={16}/> 인사기록</TabsTrigger>
            <TabsTrigger value="cards" className="rounded-xl px-5 font-bold gap-2"><CreditCard size={16}/> 법인카드</TabsTrigger>
            <TabsTrigger value="approval" className="rounded-xl px-5 font-bold gap-2"><GitBranch size={16}/> 결제라인</TabsTrigger>
            <TabsTrigger value="signature" className="rounded-xl px-5 font-bold gap-2"><PenTool size={16}/> 서명</TabsTrigger>
            <TabsTrigger value="vehicle" className="rounded-xl px-5 font-bold gap-2"><Car size={16}/> 차량관리</TabsTrigger>
            <TabsTrigger value="mail" className="rounded-xl px-5 font-bold gap-2"><Mail size={16}/> 메일연동</TabsTrigger>
          </TabsList>

          {/* 1. 인사카드 탭 */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-none shadow-md rounded-2xl">
                <CardHeader className="pb-3"><CardTitle className="text-sm font-black text-blue-600 uppercase">기본 및 연락처</CardTitle></CardHeader>
                <CardContent>
                  <InfoRow label="입사일" value={employeeDetail?.hire_date} />
                  <InfoRow label="주민등록번호" value={maskResident(employeeDetail?.resident_number)} />
                  <InfoRow label="휴대폰" value={employeeDetail?.phone_mobile || profile.phone} />
                  <InfoRow label="이메일" value={employeeDetail?.email || profile.email} />
                  <InfoRow label="거주 주소" value={employeeDetail?.address} />
                  <InfoRow label="국적" value={employeeDetail?.nationality} />
                </CardContent>
              </Card>

              <Card className="border-none shadow-md rounded-2xl">
                <CardHeader className="pb-3"><CardTitle className="text-sm font-black text-emerald-600 uppercase">급여 계좌 정보</CardTitle></CardHeader>
                <CardContent>
                  <InfoRow label="거래 은행" value={employeeDetail?.bank_name} />
                  <InfoRow label="계좌 번호" value={employeeDetail?.account_number} />
                  <InfoRow label="예금주" value={employeeDetail?.account_holder} />
                </CardContent>
              </Card>

              <Card className="md:col-span-2 border-none shadow-md rounded-2xl">
                <CardHeader className="pb-3"><CardTitle className="text-sm font-black text-rose-600 uppercase flex items-center gap-2"><Heart size={16}/> 비상 연락처</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {employeeDetail?.emergency_contacts?.map((c: any, i: number) => (
                      <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{c.relation}</p>
                        <p className="font-bold text-slate-800">{c.name}</p>
                        <p className="text-xs text-blue-600 font-medium">{c.phone}</p>
                      </div>
                    )) || <p className="text-sm text-slate-400 py-4 italic">등록된 비상연락처가 없습니다.</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 2. 인사기록 탭 */}
          <TabsContent value="hr">
            <Card className="border-none shadow-md rounded-2xl overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-24 text-[10px] font-black uppercase">유형</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">제목</TableHead>
                    <TableHead className="w-32 text-[10px] font-black uppercase">발효일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hrRecords.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell><Badge variant="outline" className="text-[10px]">{recordTypeLabel[r.record_type] || r.record_type}</Badge></TableCell>
                      <TableCell className="font-bold text-slate-700">{r.title}</TableCell>
                      <TableCell className="text-xs text-slate-400 font-mono">{r.effective_date}</TableCell>
                    </TableRow>
                  ))}
                  {hrRecords.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-20 text-slate-400">인사 기록이 존재하지 않습니다.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* 3. 법인카드 탭 */}
          <TabsContent value="cards">
            <div className="grid gap-6 sm:grid-cols-2">
              {cards.map((card) => (
                <Card key={card.id} className="border-none shadow-lg bg-slate-900 text-white rounded-3xl overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">{card.card_company || "CORPORATE CARD"}</p>
                        <h4 className="text-lg font-bold">{card.card_name}</h4>
                      </div>
                      <Badge className={card.is_active ? "bg-blue-600" : "bg-slate-700"}>{card.is_active ? "사용중" : "정지"}</Badge>
                    </div>
                    <p className="text-2xl font-mono tracking-[0.2em] mb-4 text-center">{maskCardNumber(card.card_number)}</p>
                    <div className="flex justify-between items-end opacity-60">
                      <p className="text-xs font-bold">{profile.full_name}</p>
                      <p className="text-[10px] font-mono">{card.expiry_date || "00/00"}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {cards.length === 0 && <p className="col-span-full text-center py-20 text-slate-400">배정된 법인카드가 없습니다.</p>}
            </div>
          </TabsContent>

          {/* 4. 결제라인 탭 */}
          <TabsContent value="approval">
            <Card className="border-none shadow-md rounded-2xl">
              <CardHeader><CardTitle className="text-base font-black">설정된 개인 결제라인</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {approvalLines.map((line) => (
                  <div key={line.id} className="flex items-center gap-5 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">{line.step_order}</div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-800">{line.approver?.full_name}</p>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">Approval Step {line.step_order}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">승인자</Badge>
                  </div>
                ))}
                {approvalLines.length === 0 && <p className="text-center py-10 text-slate-400">결제라인이 설정되지 않았습니다.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 5. 서명 탭 */}
          <TabsContent value="signature">
            <Card className="border-none shadow-md rounded-2xl">
              <CardHeader><CardTitle className="text-base font-black">직원 전자 서명</CardTitle></CardHeader>
              <CardContent className="flex justify-center p-12 bg-white rounded-[2rem] m-4 border-2 border-dashed border-slate-100">
                {profile.signature_url ? (
                  <img src={profile.signature_url} alt="Signature" className="max-h-40 object-contain contrast-125" />
                ) : <p className="text-slate-300 font-bold italic">등록된 서명 정보가 없습니다.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 6. 차량관리 (컴포넌트 재사용) */}
          <TabsContent value="vehicle">
            {currentTenant && <MyVehicleTab userId={memberId} tenantId={currentTenant.tenant_id} />}
          </TabsContent>

          {/* 7. 메일연동 (컴포넌트 재사용) */}
          <TabsContent value="mail">
            {currentTenant && <MailIntegrationTab userId={memberId} tenantId={currentTenant.tenant_id} />}
          </TabsContent>

          {/* 8. 증빙서류 (Direct Access) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
            <Card className="border-none shadow-sm rounded-2xl p-5 bg-blue-50/50 border border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-lg"><FileText size={18}/></div>
                  <span className="font-bold text-blue-900">신분증 사본</span>
                </div>
                {employeeDetail?.id_card_url ? (
                  <Button size="sm" variant="outline" className="bg-white" onClick={() => window.open(employeeDetail.id_card_url)}>
                    <ExternalLink size={14} className="mr-1.5"/> 열기
                  </Button>
                ) : <Badge variant="secondary" className="opacity-50">미등록</Badge>}
              </div>
            </Card>
            <Card className="border-none shadow-sm rounded-2xl p-5 bg-emerald-50/50 border border-emerald-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-600 text-white rounded-lg"><Building2 size={18}/></div>
                  <span className="font-bold text-emerald-900">통장 사본</span>
                </div>
                {employeeDetail?.bankbook_url ? (
                  <Button size="sm" variant="outline" className="bg-white" onClick={() => window.open(employeeDetail.bankbook_url)}>
                    <ExternalLink size={14} className="mr-1.5"/> 열기
                  </Button>
                ) : <Badge variant="secondary" className="opacity-50">미등록</Badge>}
              </div>
            </Card>
          </div>
        </Tabs>
      </main>
    </div>
  );
};

export default MemberDetail;