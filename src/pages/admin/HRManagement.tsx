import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserPlus, Search, Loader2, ChevronRight, Navigation, ArrowLeft, ShieldCheck, Zap, Ban, UserCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const HRManagement = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchMembers = async () => {
    if (!currentTenant) return;
    setLoading(true);

    // 쿼리문에서 주석(//)을 모두 제거한 깨끗한 상태여야 합니다.
    const { data, error } = await supabase
      .from("tenant_memberships")
      .select(
        `
        user_id,
        id,
        role,
        department,
        job_title,
        is_suspended,
        suspended_at,
        profiles:user_id ( id, full_name, email, avatar_url )
      `,
      )
      .eq("tenant_id", currentTenant.tenant_id);

    if (error) {
      console.error("멤버 로드 에러:", error);
    } else {
      setMembers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [currentTenant]);

  const activeMembers = members.filter((m) => !m.is_suspended);
  const suspendedMembers = members.filter((m) => m.is_suspended);

  const filteredMembers = activeMembers.filter(
    (m) =>
      m.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredSuspended = suspendedMembers.filter(
    (m) =>
      m.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Header />
      <main className="pt-24 pb-16 px-6 max-w-7xl mx-auto">
        {/* 1. 상단 헤더 & 액션 바 - 사이즈 축소 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg bg-white shadow-sm border border-slate-300 w-9 h-9 hover:bg-slate-50 transition-all"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </Button>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-black tracking-tight text-slate-900">인사 관리</h1>
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 text-[10px] h-4">
                  ADMIN
                </Badge>
              </div>
              <p className="text-slate-500 text-[11px] font-bold">임직원 데이터 및 시스템 권한 통합 관리</p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/onboarding")}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 h-9 px-4 rounded-lg font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <UserPlus className="mr-1.5 w-3.5 h-3.5" /> 직원 등록
          </Button>
        </div>

        {/* 2. 인사 통계 요약 (Dashboard Cards) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        
          <Card className="border border-slate-300 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Users size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">활성 인원</p>
                <p className="text-lg font-black text-slate-800">
                  {activeMembers.length} <span className="text-[10px] font-medium text-slate-400">명</span>
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-300 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Zap size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">부서 수</p>
                <p className="text-lg font-black text-slate-800">
                  {new Set(members.map((m) => m.department).filter(Boolean)).size}{" "}
                  <span className="text-[10px] font-medium text-slate-400">개</span>
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-300 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">관리자</p>
                <p className="text-lg font-black text-slate-800">
                  {activeMembers.filter((m) => m.role === "company_admin").length}{" "}
                  <span className="text-[10px] font-medium text-slate-400">명</span>
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-300 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                <Ban size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">정지 인원</p>
                <p className="text-lg font-black text-slate-800">
                  {suspendedMembers.length}{" "}
                  <span className="text-[10px] font-medium text-slate-400">명</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. 검색 영역 - 슬림화 (h-10) */}
        <div className="mb-6 relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <Input
            placeholder="이름, 부서 또는 이메일 검색..."
            className="pl-10 h-10 rounded-lg border border-slate-300 shadow-sm bg-white text-xs font-medium placeholder:text-slate-300 focus:ring-1 focus:ring-blue-200 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 4. 직원 테이블 리스트 - 타이틀 레이블 등 정보 밀도 상향 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-300">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-[300px] py-3 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Employee
                </TableHead>
                <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Team / Pos
                </TableHead>
                <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Role</TableHead>
                <TableHead className="text-right px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Mgt
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-40 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-600 w-6 h-6" />
                  </TableCell>
                </TableRow>
              ) : filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <TableRow
                    key={member.id}
                    className="cursor-pointer hover:bg-slate-50 transition-all group border-b border-slate-200 last:border-none"
                    onClick={() => navigate(`/admin/hr/${member.user_id}`)}
                  >
                    <TableCell className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 border border-slate-200 shadow-sm">
                          <AvatarImage src={member.profiles?.avatar_url} />
                          <AvatarFallback className="bg-slate-100 text-slate-600 font-bold text-xs">
                            {member.profiles?.full_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-slate-900 text-sm tracking-tight">
                            {member.profiles?.full_name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">{member.profiles?.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="text-xs font-bold text-slate-700">{member.job_title || "미지정"}</div>
                        <div className="text-[9px] font-bold text-blue-500 uppercase">{member.department || "N/A"}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] font-black px-2 py-0">
                        {member.role === "company_admin" ? "관리자" : member.role === "manager" ? "매니저" : "사원"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-40 text-center">
                    <p className="text-slate-300 font-bold text-sm">데이터가 없습니다.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* 5. 정지된 직원 리스트 */}
        {suspendedMembers.length > 0 && (
          <>
            <h2 className="text-sm font-black text-red-600 mt-8 mb-3 flex items-center gap-2">
              <Ban className="w-4 h-4" /> 정지된 직원 ({filteredSuspended.length}명)
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden mb-6">
              <Table>
                <TableHeader className="bg-red-50 border-b border-red-200">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="w-[300px] py-3 px-6 text-[9px] font-black text-red-400 uppercase tracking-widest">
                      Employee
                    </TableHead>
                    <TableHead className="text-[9px] font-black text-red-400 uppercase tracking-widest">
                      Team / Pos
                    </TableHead>
                    <TableHead className="text-[9px] font-black text-red-400 uppercase tracking-widest">상태</TableHead>
                    <TableHead className="text-right px-6 text-[9px] font-black text-red-400 uppercase tracking-widest">
                      Mgt
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuspended.map((member) => (
                    <TableRow
                      key={member.id}
                      className="cursor-pointer hover:bg-red-50/50 transition-all group border-b border-red-100 last:border-none opacity-70"
                      onClick={() => navigate(`/admin/hr/${member.user_id}`)}
                    >
                      <TableCell className="py-3 px-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9 border border-red-200 shadow-sm grayscale">
                            <AvatarImage src={member.profiles?.avatar_url} />
                            <AvatarFallback className="bg-red-50 text-red-400 font-bold text-xs">
                              {member.profiles?.full_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold text-slate-600 text-sm tracking-tight line-through">
                              {member.profiles?.full_name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">{member.profiles?.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="text-xs font-bold text-slate-500">{member.job_title || "미지정"}</div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase">{member.department || "N/A"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-red-600 text-[9px] font-black px-2 py-0">
                          정지됨
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 border border-red-200 text-red-400 group-hover:bg-red-600 group-hover:text-white group-hover:border-red-600 transition-all">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default HRManagement;
