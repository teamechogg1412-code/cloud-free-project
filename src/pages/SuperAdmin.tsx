import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Building2, Search, Plus, Users, Settings, 
  ShieldCheck, Activity, Database, Server,
  ExternalLink, MoreHorizontal, Check, X, Loader2, Edit2, Trash2, Key,
  MessageSquareShare, Clock, Palmtree, FolderTree, HardDrive 
} from "lucide-react";
import { getCompanyTypeBadge } from "@/lib/companyTypes";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, 
} from "@/components/ui/alert-dialog";

interface SignupRequest {
  id: string;
  user_id: string;
  company_name: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  assigned_tenant_id: string | null;
  user_email?: string;
  user_name?: string;
}

const SuperAdmin = () => {
  const navigate = useNavigate();
  const [signupRequests, setSignupRequests] = useState<SignupRequest[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenants, setSelectedTenants] = useState<Record<string, string>>({});
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [deletingTenantId, setDeletingTenantId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // --- 데이터 Fetching (기존 로직 100% 유지) ---
  const fetchData = async () => {
    try {
      const { data: requests } = await supabase
        .from("signup_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (requests && requests.length > 0) {
        const userIds = requests.map((r) => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds);

        const enrichedRequests = requests.map((request) => {
          const profile = profiles?.find((p) => p.id === request.user_id);
          return { ...request, user_email: profile?.email, user_name: profile?.full_name };
        });
        setSignupRequests(enrichedRequests as SignupRequest[]);
      } else {
        setSignupRequests([]);
      }

      const { data: tenantsData, error: tenantError } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });

      if (tenantError) throw tenantError;
      setTenants(tenantsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const tenantChannel = supabase.channel("tenants-realtime").on("postgres_changes", { event: "*", schema: "public", table: "tenants" }, () => fetchData()).subscribe();
    const requestChannel = supabase.channel("requests-realtime").on("postgres_changes", { event: "*", schema: "public", table: "signup_requests" }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(tenantChannel); supabase.removeChannel(requestChannel); };
  }, []);

  // --- 핸들러들 (기존 로직 100% 유지) ---
  const handleDeleteTenant = async () => {
    if (!deletingTenantId) return;
    try {
      const { error } = await supabase.from("tenants").delete().eq("id", deletingTenantId);
      if (error) throw error;
      toast.success("고객사가 영구적으로 삭제되었습니다.");
      setIsDeleteDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error("삭제 실패: " + error.message);
    }
  };

  const handleApprove = async (request: SignupRequest) => {
    const tenantId = selectedTenants[request.id];
    if (!tenantId) { toast.error("배정할 회사를 선택해주세요"); return; }
    setProcessingIds((prev) => new Set(prev).add(request.id));
    try {
      await supabase.from("signup_requests").update({ status: "approved", assigned_tenant_id: tenantId, reviewed_at: new Date().toISOString() }).eq("id", request.id);
      await supabase.from("tenant_memberships").insert({ user_id: request.user_id, tenant_id: tenantId, role: "employee" });
      toast.success("승인 완료");
      fetchData();
    } catch (error) { toast.error("오류 발생"); } 
    finally { setProcessingIds((prev) => { const next = new Set(prev); next.delete(request.id); return next; }); }
  };

  const handleReject = async (request: SignupRequest) => {
    setProcessingIds((prev) => new Set(prev).add(request.id));
    try {
      await supabase.from("signup_requests").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", request.id);
      toast.success("거절 완료");
      fetchData();
    } catch (error) { toast.error("오류 발생"); }
    finally { setProcessingIds((prev) => { const next = new Set(prev); next.delete(request.id); return next; }); }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-foreground">
      <Header />

      <main className="pt-24 pb-16 px-4 max-w-[1600px] mx-auto space-y-8">
        
        {/* 1. 상단 헤더 & 요약 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-4 mb-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-primary" /> Super Admin Center
            </h1>
            <p className="text-slate-500 mt-1">ArkPort 전체 시스템 상태 및 테넌트 관리 콘솔입니다.</p>
          </div>

          <Card className="shadow-sm border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardDescription>총 고객사 (Tenants)</CardDescription>
              <CardTitle className="text-3xl font-bold flex items-center gap-2">
                {tenants.length} <span className="text-sm font-normal text-muted-foreground">개 사</span>
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardDescription>가입 승인 대기</CardDescription>
              <CardTitle className="text-3xl font-bold flex items-center gap-2 text-amber-600">
                {signupRequests.length} <span className="text-sm font-normal text-muted-foreground">건</span>
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardDescription>시스템 상태</CardDescription>
              <CardTitle className="text-3xl font-bold flex items-center gap-2 text-green-600">
                Healthy <Activity className="w-5 h-5 animate-pulse" />
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-purple-500 bg-purple-50/50">
            <CardHeader className="pb-2">
              <CardDescription>이번 달 신규 가입</CardDescription>
              <CardTitle className="text-3xl font-bold text-purple-700">
                +2 <span className="text-sm font-normal text-muted-foreground">건</span>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Separator />

        {/* 2. 관리 메뉴 그리드 (커뮤니케이션 관리 추가됨) */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" /> 관리 도구 (Management Tools)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {/* 고객사 추가 */}
            <div 
              onClick={() => navigate("/super-admin/tenants/new")}
              className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">새 고객사 등록</h3>
                <p className="text-xs text-slate-500 mt-1">새로운 테넌트를 생성하고 초기 설정을 진행합니다.</p>
              </div>
            </div>

            {/* 미디어 관리 */}
            <div 
              onClick={() => navigate("/super-admin/press-contacts")}
              className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer flex flex-col gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">미디어 연락처 센터</h3>
                <p className="text-xs text-slate-500 mt-1">공용 기자 DB 및 언론사 연락망을 통합 관리합니다.</p>
              </div>
            </div>

            {/* [신규] 커뮤니케이션 관리 (동적 메시지 설정) */}
            <div 
              onClick={() => navigate("/super-admin/messages")}
              className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-orange-500 hover:shadow-md transition-all cursor-pointer flex flex-col gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                <MessageSquareShare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">커뮤니케이션 관리</h3>
                <p className="text-xs text-slate-500 mt-1">SNS 공유 카드, 이메일, 알림 문구를 동적으로 제어합니다.</p>
              </div>
            </div>

            {/* API 관리 */}
            <div 
              onClick={() => navigate("/super-admin/api-management")}
              className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-purple-500 hover:shadow-md transition-all cursor-pointer flex flex-col gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">시스템 API 설정</h3>
                <p className="text-xs text-slate-500 mt-1">AI 토큰, 결제 모듈 등 전역 시스템 키를 관리합니다.</p>
              </div>
            </div>

            {/* 근로규칙 기본값 관리 */}
            <div 
              onClick={() => navigate("/super-admin/work-rules")}
              className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer flex flex-col gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">근로규칙 기본값</h3>
                <p className="text-xs text-slate-500 mt-1">모든 회사에 적용할 소정/최대 근로규칙 기본값을 관리합니다.</p>
              </div>
            </div>

            {/* 부서 및 직급 기본값 관리 */}
            <div 
              onClick={() => navigate("/super-admin/org-defaults")}
              className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex flex-col gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">부서 및 직급 기본값</h3>
                <p className="text-xs text-slate-500 mt-1">모든 회사에 기본으로 적용될 부서와 직급 체계를 관리합니다.</p>
              </div>
            </div>

            {/* 휴가 그룹/유형 기본값 관리 */}
            <div 
              onClick={() => navigate("/super-admin/leave-defaults")}
              className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-green-500 hover:shadow-md transition-all cursor-pointer flex flex-col gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                <Palmtree className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">휴가 그룹/유형 기본값</h3>
                <p className="text-xs text-slate-500 mt-1">모든 회사에 기본으로 적용될 휴가 그룹과 유형을 관리합니다.</p>
              </div>
            </div>

            {/* 서버 로그 (준비 중) */}
            <div className="group bg-slate-50 p-5 rounded-xl border border-dashed border-slate-300 flex flex-col gap-3 opacity-60">
              <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-700">시스템 감사 로그</h3>
                <p className="text-xs text-slate-500 mt-1">준비 중인 기능입니다.</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. 승인 대기 목록 (기존 로직 유지) */}
        {signupRequests.length > 0 && (
          <div className="border-2 border-amber-400 bg-amber-50 rounded-xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="p-4 bg-amber-100 border-b border-amber-200 flex items-center justify-between">
              <h3 className="font-bold text-amber-900 flex items-center gap-2">
                <Users className="w-5 h-5" /> 가입 승인 요청 ({signupRequests.length})
              </h3>
              <Badge className="bg-amber-500 hover:bg-amber-600">Action Required</Badge>
            </div>
            <div className="divide-y divide-amber-200/50">
              {signupRequests.map((request) => (
                <div key={request.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-slate-800">{request.user_name} ({request.user_email})</div>
                    <div className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                      <Building2 className="w-3 h-3" /> 요청 회사명: <span className="font-semibold text-amber-700">{request.company_name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-amber-200">
                    <Select onValueChange={(v) => setSelectedTenants((p) => ({ ...p, [request.id]: v }))}>
                      <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue placeholder="소속 회사 선택" /></SelectTrigger>
                      <SelectContent>
                        {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="h-9 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(request)} disabled={processingIds.has(request.id)}>
                      승인
                    </Button>
                    <Button size="sm" variant="ghost" className="h-9 text-red-500 hover:bg-red-50 hover:text-red-700" onClick={() => handleReject(request)} disabled={processingIds.has(request.id)}>
                      거절
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}



        {/* [추가] 표준 드라이브 구조 설계 카드 */}
        <div 
          onClick={() => navigate("/super-admin/drive-template")}
          className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-600 hover:shadow-md transition-all cursor-pointer flex flex-col gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
            <FolderTree className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">표준 드라이브 구조</h3>
            <p className="text-xs text-slate-500 mt-1">전사 표준 폴더 트리(매니지먼트, 홍보, 재무 등)를 설계합니다.</p>
          </div>
        </div>

        {/* 4. 고객사 목록 테이블 (기존 로직 유지) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-500" /> 등록된 고객사 목록
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="고객사명 또는 도메인 검색" className="pl-9 h-10 bg-slate-50 border-slate-200" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-semibold">고객사 명</th>
                  <th className="px-6 py-4 font-semibold">유형</th>
                  <th className="px-6 py-4 font-semibold">접속 도메인</th>
                  <th className="px-6 py-4 font-semibold text-center">등록일</th>
                  <th className="px-6 py-4 font-semibold text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          {tenant.name.substring(0, 1)}
                        </div>
                        <span className="font-semibold text-slate-700">{tenant.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="text-xs">
                        {getCompanyTypeBadge(tenant.company_type || "talent_agency")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-slate-100 rounded text-slate-600 font-mono text-xs border border-slate-200">
                          {tenant.domain || "-"}
                        </code>
                        {tenant.domain && <ExternalLink className="w-3 h-3 text-slate-400 cursor-pointer hover:text-blue-500" onClick={() => window.open(`https://${tenant.domain}`, "_blank")} />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-500">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/super-admin/tenants/edit/${tenant.id}`)}>
                            <Edit2 className="w-4 h-4 mr-2" /> 정보 수정
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => { setDeletingTenantId(tenant.id); setIsDeleteDialogOpen(true); }}>
                            <Trash2 className="w-4 h-4 mr-2" /> 삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 삭제 확인 Dialog (기존 유지) */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive font-bold">정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              고객사 데이터를 삭제하면 복구할 수 없습니다. 연결된 모든 사용자 계정과 데이터가 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTenant} className="bg-destructive hover:bg-destructive/90">삭제 확정</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SuperAdmin;