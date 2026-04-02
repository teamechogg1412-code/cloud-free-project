import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, ShieldCheck, Users, Plus, X, Loader2, Save,
  Building, CreditCard, CarFront, UserCog, Target, Navigation, Key,
  Megaphone, Laptop, Mail, Database, Calendar, Handshake, Eye, ShieldAlert, BookOpen
} from "lucide-react";
import { toast } from "sonner";

// 관리 메뉴 정의 (AdminSystem.tsx와 동일한 키 사용)
const ADMIN_MENU_DEFS = [
  { key: "company", title: "회사 정보 관리", icon: <Building className="w-4 h-4" />, category: "회사/운영" },
  { key: "finance-settings", title: "금융 연동 설정", icon: <Database className="w-4 h-4" />, category: "재무/카드" },
  { key: "mail-settings", title: "메일 서버 설정", icon: <Mail className="w-4 h-4" />, category: "시스템/연동" },
  { key: "hr", title: "인사 관리", icon: <Users className="w-4 h-4" />, category: "인사/배우" },
  { key: "artists", title: "배우 관리", icon: <UserCog className="w-4 h-4" />, category: "인사/배우" },
  { key: "cards", title: "법인카드 관리", icon: <CreditCard className="w-4 h-4" />, category: "재무/카드" },
  { key: "vehicles", title: "차량 관리", icon: <CarFront className="w-4 h-4" />, category: "회사/운영" },
  { key: "org-chart", title: "부서 및 직급 관리", icon: <Users className="w-4 h-4" />, category: "인사/배우" },
  { key: "projects", title: "프로젝트 마스터", icon: <Target className="w-4 h-4" />, category: "회사/운영" },
  { key: "driving", title: "실시간 운행 관제", icon: <Navigation className="w-4 h-4" />, category: "회사/운영" },
  { key: "keywords", title: "키워드 관리", icon: <Key className="w-4 h-4" />, category: "시스템/연동" },
  { key: "media-pitching", title: "미디어 피칭", icon: <Megaphone className="w-4 h-4" />, category: "회사/운영" },
  { key: "api-settings", title: "API 설정", icon: <Laptop className="w-4 h-4" />, category: "시스템/연동" },
  { key: "schedules", title: "배우 스케줄 관리", icon: <Calendar className="w-4 h-4" />, category: "인사/배우" },
  { key: "partnerships", title: "파트너사 관리", icon: <Handshake className="w-4 h-4" />, category: "회사/운영" },
  { key: "partner-data", title: "파트너 데이터 열람", icon: <Eye className="w-4 h-4" />, category: "회사/운영" },
  { key: "drive-settings", title: "Drive 설정", icon: <Database className="w-4 h-4" />, category: "시스템/연동" },
  { key: "security", title: "보안관리", icon: <ShieldAlert className="w-4 h-4" />, category: "시스템/연동" },
  { key: "regulations", title: "규정 관리", icon: <BookOpen className="w-4 h-4" />, category: "회사/운영" },
  { key: "leave-management", title: "휴가 관리", icon: <Calendar className="w-4 h-4" />, category: "인사/배우" },
  { key: "attendance", title: "출퇴근 관리", icon: <Calendar className="w-4 h-4" />, category: "인사/배우" },
  { key: "work-rules", title: "근무규칙 관리", icon: <ShieldCheck className="w-4 h-4" />, category: "인사/배우" },
  { key: "audit-logs", title: "감사 로그", icon: <Database className="w-4 h-4" />, category: "시스템/연동" },
];

interface Member {
  user_id: string;
  name: string;
  department: string | null;
  role: string;
}

interface Permission {
  id?: string;
  menu_key: string;
  user_id: string;
}

const AdminPermissions = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [addingMenu, setAddingMenu] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState("");

  const tenantId = currentTenant?.tenant_id;

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    // 직원 목록
    const { data: membersData } = await supabase
      .from("tenant_memberships")
      .select("user_id, department, role, profiles:user_id(full_name)")
      .eq("tenant_id", tenantId)
      .eq("is_suspended", false);

    if (membersData) {
      setMembers(membersData.map((m: any) => ({
        user_id: m.user_id,
        name: m.profiles?.full_name || "이름 없음",
        department: m.department,
        role: m.role,
      })));
    }

    // 권한 목록
    const { data: permsData } = await supabase
      .from("admin_permissions")
      .select("id, menu_key, user_id")
      .eq("tenant_id", tenantId);

    setPermissions(permsData || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getMemberName = (uid: string) => {
    const m = members.find(m => m.user_id === uid);
    return m ? `${m.name}${m.department ? ` (${m.department})` : ""}` : uid.slice(0, 8);
  };

  const getMenuPermissions = (menuKey: string) =>
    permissions.filter(p => p.menu_key === menuKey);

  const handleAddPermission = async (menuKey: string) => {
    if (!selectedUser || !tenantId) return;
    // 중복 체크
    if (permissions.some(p => p.menu_key === menuKey && p.user_id === selectedUser)) {
      toast.error("이미 등록된 직원입니다.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("admin_permissions").insert({
      tenant_id: tenantId,
      menu_key: menuKey,
      user_id: selectedUser,
    });
    if (error) {
      toast.error("등록 실패: " + error.message);
    } else {
      toast.success("권한이 부여되었습니다.");
      setAddingMenu(null);
      setSelectedUser("");
      fetchData();
    }
    setSaving(false);
  };

  const handleRemovePermission = async (permId: string) => {
    const { error } = await supabase.from("admin_permissions").delete().eq("id", permId);
    if (error) {
      toast.error("삭제 실패");
    } else {
      toast.success("권한이 해제되었습니다.");
      fetchData();
    }
  };

  // 카테고리별로 그룹핑
  const categories = [...new Set(ADMIN_MENU_DEFS.map(m => m.category))];

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>;

  return (
    <div className="pb-16 px-6 max-w-5xl mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}><ArrowLeft className="w-5 h-5" /></Button>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-primary" /> 관리 권한 설정
          </h1>
          <p className="text-slate-500 mt-1">각 관리 메뉴에 접근할 수 있는 직원을 지정합니다. <Badge variant="secondary" className="ml-2">관리자(Admin)는 항상 전체 접근</Badge></p>
        </div>
      </div>

      <div className="space-y-8">
        {categories.map(category => (
          <div key={category}>
            <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" /> {category}
            </h2>
            <div className="grid gap-3">
              {ADMIN_MENU_DEFS.filter(m => m.category === category).map(menu => {
                const menuPerms = getMenuPermissions(menu.key);
                return (
                  <Card key={menu.key} className="border-none shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-slate-100 text-slate-600">{menu.icon}</div>
                          <div>
                            <h3 className="font-bold text-sm text-slate-800">{menu.title}</h3>
                            {menuPerms.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {menuPerms.map(p => (
                                  <Badge key={p.id} variant="secondary" className="gap-1 text-xs pr-1">
                                    {getMemberName(p.user_id)}
                                    <button onClick={() => p.id && handleRemovePermission(p.id)} className="ml-0.5 hover:text-red-500">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">관리자만 접근 가능</span>
                            )}
                          </div>
                        </div>

                        {addingMenu === menu.key ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <Select value={selectedUser} onValueChange={setSelectedUser}>
                              <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="직원 선택" /></SelectTrigger>
                              <SelectContent>
                                {members.filter(m => m.role !== "company_admin").map(m => (
                                  <SelectItem key={m.user_id} value={m.user_id}>
                                    {m.name}{m.department ? ` (${m.department})` : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" className="h-8 text-xs" onClick={() => handleAddPermission(menu.key)} disabled={saving || !selectedUser}>추가</Button>
                            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setAddingMenu(null); setSelectedUser(""); }}>취소</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1 shrink-0" onClick={() => { setAddingMenu(menu.key); setSelectedUser(""); }}>
                            <Plus className="w-3 h-3" /> 직원 추가
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPermissions;
