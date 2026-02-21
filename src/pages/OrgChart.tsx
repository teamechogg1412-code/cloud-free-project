import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Network, Search, Users, Phone, Mail, Building2 } from "lucide-react";
import { Loader2 } from "lucide-react";

interface Member {
  user_id: string;
  department: string | null;
  job_title: string | null;
  role: string;
  profile?: {
    full_name: string | null;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  };
}

interface Department {
  id: string;
  name: string;
  parent_id: string | null;
  description: string | null;
}

const OrgChart = () => {
  const { currentTenant } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (currentTenant) fetchData();
  }, [currentTenant]);

  const fetchData = async () => {
    if (!currentTenant) return;
    setLoading(true);

    const [memberRes, deptRes] = await Promise.all([
      supabase
        .from("tenant_memberships")
        .select("user_id, department, job_title, role")
        .eq("tenant_id", currentTenant.tenant_id)
        .eq("is_suspended", false),
      supabase
        .from("departments")
        .select("id, name, parent_id, description")
        .eq("tenant_id", currentTenant.tenant_id)
        .eq("is_active", true)
        .order("sort_order"),
    ]);

    const memberships = memberRes.data || [];
    
    // Fetch profiles for all members
    if (memberships.length > 0) {
      const userIds = memberships.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url")
        .in("id", userIds);

      const enriched = memberships.map(m => ({
        ...m,
        profile: profiles?.find(p => p.id === m.user_id) || undefined,
      }));
      setMembers(enriched);
    } else {
      setMembers([]);
    }

    setDepartments(deptRes.data || []);
    setLoading(false);
  };

  // Group members by department
  const groupedMembers = members.reduce<Record<string, Member[]>>((acc, m) => {
    const dept = m.department || "미배정";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(m);
    return acc;
  }, {});

  // Filter by search
  const filteredDepts = Object.entries(groupedMembers).filter(([dept, members]) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return dept.toLowerCase().includes(q) || members.some(m =>
      m.profile?.full_name?.toLowerCase().includes(q) ||
      m.profile?.email?.toLowerCase().includes(q) ||
      m.job_title?.toLowerCase().includes(q)
    );
  });

  // Sort: departments with registered names first, "미배정" last
  const sortedDepts = filteredDepts.sort(([a], [b]) => {
    if (a === "미배정") return 1;
    if (b === "미배정") return -1;
    return a.localeCompare(b);
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "company_admin": return <Badge className="bg-blue-100 text-blue-700 border-blue-200">관리자</Badge>;
      case "manager": return <Badge className="bg-amber-100 text-amber-700 border-amber-200">매니저</Badge>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-amber-500 text-white">
            <Network className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">조직도</h1>
        </div>
        <p className="text-slate-500 font-medium ml-12">
          {currentTenant?.tenant.name || "회사"} 부서별 인원 구성 및 연락처를 확인합니다.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="이름, 부서, 직급으로 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{members.length}</p>
              <p className="text-xs text-slate-500">전체 인원</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Building2 className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{Object.keys(groupedMembers).filter(d => d !== "미배정").length}</p>
              <p className="text-xs text-slate-500">부서 수</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Org Chart by Department */}
      {sortedDepts.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Network className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">조직도 데이터가 없습니다.</p>
          <p className="text-sm mt-1">관리시스템에서 부서와 직원을 등록해주세요.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDepts.map(([deptName, deptMembers]) => (
            <Card key={deptName} className="border-none shadow-md bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <Building2 className="w-5 h-5 text-emerald-500" />
                  {deptName}
                  <Badge variant="secondary" className="ml-2">{deptMembers.length}명</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-50">
                  {deptMembers
                    .sort((a, b) => (a.job_title || "").localeCompare(b.job_title || ""))
                    .map(member => (
                      <div key={member.user_id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={member.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-sm">
                            {(member.profile?.full_name || "?").substring(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">
                              {member.profile?.full_name || "이름 없음"}
                            </span>
                            {member.job_title && (
                              <Badge variant="outline" className="text-xs">{member.job_title}</Badge>
                            )}
                            {getRoleBadge(member.role)}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          {member.profile?.phone && (
                            <a href={`tel:${member.profile.phone}`} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                              <Phone className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">{member.profile.phone}</span>
                            </a>
                          )}
                          {member.profile?.email && (
                            <a href={`mailto:${member.profile.email}`} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                              <Mail className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline">{member.profile.email}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrgChart;
