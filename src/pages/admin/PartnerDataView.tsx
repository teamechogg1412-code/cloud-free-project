import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Building2, Users, UserCog, Target, Key, CreditCard, Loader2, Eye, Lock, Film, CalendarDays, Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { getCompanyTypeBadge } from "@/lib/companyTypes";

interface PartnerTenant {
  id: string;
  name: string;
  company_type: string | null;
  scopes: string[];
}

const SCOPE_META: Record<string, { label: string; icon: any; key: string }> = {
  artists: { label: "배우/아티스트", icon: UserCog, key: "artists" },
  schedules: { label: "스케줄", icon: CalendarDays, key: "schedules" },
  projects: { label: "프로젝트", icon: Target, key: "projects" },
  production: { label: "제작", icon: Film, key: "production" },
  hr: { label: "인사 정보", icon: Users, key: "hr" },
  finance: { label: "재무 정보", icon: CreditCard, key: "finance" },
  keywords: { label: "키워드/미디어", icon: Key, key: "keywords" },
};

const PartnerDataView = () => {
  const { currentTenant } = useAuth();
  const navigate = useNavigate();
  const [partners, setPartners] = useState<PartnerTenant[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("artists");

  // Data states
  const [artists, setArtists] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const myTenantId = currentTenant?.tenant_id;

  useEffect(() => {
    if (!myTenantId) return;
    fetchPartners();
  }, [myTenantId]);

  const fetchPartners = async () => {
    if (!myTenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tenant_partnerships")
        .select(`
          *,
          requester_tenant:requester_tenant_id ( id, name, company_type ),
          target_tenant:target_tenant_id ( id, name, company_type )
        ` as any)
        .eq("status", "active")
        .or(`requester_tenant_id.eq.${myTenantId},target_tenant_id.eq.${myTenantId}`);

      if (error) throw error;

      const partnerList: PartnerTenant[] = ((data || []) as any[]).map((p: any) => {
        const isRequester = p.requester_tenant_id === myTenantId;
        const other = isRequester ? p.target_tenant : p.requester_tenant;
        return {
          id: other?.id,
          name: other?.name || "알 수 없음",
          company_type: other?.company_type,
          scopes: p.data_scopes || [],
        };
      });

      setPartners(partnerList);
      if (partnerList.length > 0) {
        setSelectedPartner(partnerList[0].id);
      }
    } catch (error) {
      console.error("Partner fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentPartner = partners.find(p => p.id === selectedPartner);
  const allowedScopes = currentPartner?.scopes || [];

  useEffect(() => {
    if (!selectedPartner || !currentPartner) return;
    // Set active tab to first allowed scope
    if (allowedScopes.length > 0 && !allowedScopes.includes(activeTab)) {
      setActiveTab(allowedScopes[0]);
    }
    fetchPartnerData();
  }, [selectedPartner]);

  const fetchPartnerData = async () => {
    if (!selectedPartner) return;
    setDataLoading(true);
    try {
      const partner = partners.find(p => p.id === selectedPartner);
      if (!partner) return;
      const scopes = partner.scopes;

      const promises: Promise<void>[] = [];

      if (scopes.includes("artists")) {
        promises.push(
          supabase.from("artists").select("*").eq("tenant_id", selectedPartner).eq("is_active", true)
            .then(({ data }) => { setArtists(data || []); }) as any
        );
        // Also fetch schedule availability for artists scope
        promises.push(
          supabase.from("artist_schedule_availability" as any).select("*").eq("tenant_id", selectedPartner)
            .gte("end_time", new Date().toISOString())
            .order("start_time", { ascending: true })
            .then(({ data }) => { setSchedules((data || []) as any[]); }) as any
        );
      } else { setArtists([]); setSchedules([]); }

      if (scopes.includes("projects")) {
        promises.push(
          supabase.from("projects").select("*").eq("tenant_id", selectedPartner).eq("is_active", true)
            .then(({ data }) => { setProjects(data || []); }) as any
        );
      } else { setProjects([]); }

      if (scopes.includes("hr")) {
        promises.push(
          supabase.from("tenant_memberships").select(`
            id, role, department, job_title,
            profile:user_id ( id, full_name, email )
          ` as any).eq("tenant_id", selectedPartner)
            .then(({ data }) => { setMembers((data || []) as any[]); }) as any
        );
      } else { setMembers([]); }

      if (scopes.includes("keywords")) {
        promises.push(
          supabase.from("keywords").select("*").eq("tenant_id", selectedPartner).eq("is_active", true)
            .then(({ data }) => { setKeywords(data || []); }) as any
        );
      } else { setKeywords([]); }

      await Promise.all(promises);
    } catch (error) {
      console.error("Data fetch error:", error);
    } finally {
      setDataLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="pt-28 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="pt-28 pb-16 px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1">
              <Eye className="w-5 h-5" /> Partner Data Hub
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">파트너사 데이터 열람</h1>
            <p className="text-slate-500 mt-1">연결된 파트너 회사의 공유 데이터를 열람합니다.</p>
          </div>
          <Button variant="ghost" onClick={() => navigate("/admin")} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> 관리 시스템
          </Button>
        </div>

        {partners.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-slate-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-lg">연결된 파트너사가 없습니다.</p>
              <p className="text-sm mt-1">파트너사 관리에서 파트너를 초대하고 연결하세요.</p>
              <Button className="mt-4" onClick={() => navigate("/admin/partnerships")}>파트너사 관리로 이동</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Partner selector */}
            <div className="mb-6">
              <Select value={selectedPartner} onValueChange={setSelectedPartner}>
                <SelectTrigger className="w-full max-w-md bg-white">
                  <SelectValue placeholder="파트너사를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {partners.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        {p.name}
                        <Badge variant="outline" className="text-xs ml-1">{getCompanyTypeBadge(p.company_type || "talent_agency")}</Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Scope tabs */}
            {currentPartner && (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                  {Object.entries(SCOPE_META).map(([key, meta]) => {
                    const allowed = allowedScopes.includes(key);
                    const Icon = meta.icon;
                    return (
                      <TabsTrigger key={key} value={key} disabled={!allowed} className="gap-2">
                        {allowed ? <Icon className="w-4 h-4" /> : <Lock className="w-4 h-4 opacity-40" />}
                        {meta.label}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {dataLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : (
                  <>
                    <TabsContent value="artists">
                      <ArtistList data={artists} />
                    </TabsContent>
                    <TabsContent value="schedules">
                      <ScheduleAvailability data={schedules} artists={artists} />
                    </TabsContent>
                    <TabsContent value="projects">
                      <ProjectList data={projects} />
                    </TabsContent>
                    <TabsContent value="production">
                      <Card><CardContent className="py-12 text-center text-slate-400">
                        <Film className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>제작 데이터 열람은 추후 지원 예정입니다.</p>
                      </CardContent></Card>
                    </TabsContent>
                    <TabsContent value="hr">
                      <MemberList data={members} />
                    </TabsContent>
                    <TabsContent value="finance">
                      <Card><CardContent className="py-12 text-center text-slate-400">
                        <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>재무 데이터 열람은 추후 지원 예정입니다.</p>
                      </CardContent></Card>
                    </TabsContent>
                    <TabsContent value="keywords">
                      <KeywordList data={keywords} />
                    </TabsContent>
                  </>
                )}
              </Tabs>
            )}
          </>
        )}
      </main>
    </div>
  );
};

// Schedule Availability (partner view - no content details)
const ScheduleAvailability = ({ data, artists }: { data: any[]; artists: any[] }) => {
  const artistMap = Object.fromEntries(artists.map(a => [a.id, a]));
  const typeLabels: Record<string, string> = {
    schedule: "일정",
    shooting: "촬영",
    meeting: "미팅",
    event: "행사",
    rehearsal: "리허설",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarDays className="w-5 h-5" />
          스케줄 현황 ({data.length})
        </CardTitle>
        <CardDescription>파트너사 배우들의 일정 유무를 확인할 수 있습니다. 상세 내용은 비공개입니다.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-slate-400 text-center py-8">등록된 스케줄이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {data.map(s => {
              const artist = artistMap[s.artist_id];
              const startDate = new Date(s.start_time);
              const endDate = new Date(s.end_time);
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border bg-white hover:shadow-sm transition-shadow">
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm">
                    {artist?.name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{artist?.name || "배우"}</p>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {s.is_all_day
                        ? format(startDate, "yyyy.MM.dd (eee)", { locale: ko }) + " 종일"
                        : `${format(startDate, "yyyy.MM.dd (eee) HH:mm", { locale: ko })} ~ ${format(endDate, "HH:mm")}`
                      }
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {typeLabels[s.schedule_type] || "일정"}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Sub-components
const ArtistList = ({ data }: { data: any[] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">배우/아티스트 ({data.length})</CardTitle>
      <CardDescription>파트너사에 등록된 활성 아티스트 목록입니다.</CardDescription>
    </CardHeader>
    <CardContent>
      {data.length === 0 ? (
        <p className="text-slate-400 text-center py-8">등록된 아티스트가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(a => (
            <div key={a.id} className="p-4 rounded-xl border bg-white hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                  {a.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-bold">{a.name}</p>
                  {a.stage_name && <p className="text-xs text-slate-500">{a.stage_name}</p>}
                </div>
              </div>
              {a.agency && <Badge variant="secondary" className="text-xs">{a.agency}</Badge>}
              {a.bio && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{a.bio}</p>}
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

const ProjectList = ({ data }: { data: any[] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">프로젝트 ({data.length})</CardTitle>
      <CardDescription>파트너사의 진행 중인 프로젝트 목록입니다.</CardDescription>
    </CardHeader>
    <CardContent>
      {data.length === 0 ? (
        <p className="text-slate-400 text-center py-8">등록된 프로젝트가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {data.map(p => (
            <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border bg-white hover:shadow-sm transition-shadow">
              <div>
                <p className="font-bold">{p.name}</p>
                {p.code && <p className="text-xs text-slate-500">코드: {p.code}</p>}
                {p.description && <p className="text-sm text-slate-600 mt-1 line-clamp-1">{p.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-xs">
                  {p.status === "active" ? "진행중" : p.status}
                </Badge>
                {p.start_date && <span className="text-xs text-slate-400">{p.start_date}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

const MemberList = ({ data }: { data: any[] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">직원 정보 ({data.length})</CardTitle>
      <CardDescription>파트너사의 조직 구성원 목록입니다.</CardDescription>
    </CardHeader>
    <CardContent>
      {data.length === 0 ? (
        <p className="text-slate-400 text-center py-8">열람 가능한 직원 정보가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.map((m: any) => (
            <div key={m.id} className="flex items-center gap-3 p-4 rounded-xl border bg-white">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                {(m.profile?.full_name || "?").charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{m.profile?.full_name || "이름 없음"}</p>
                <p className="text-xs text-slate-500">{m.department || "부서 미지정"} · {m.job_title || "직급 미지정"}</p>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">
                {m.role === "company_admin" ? "관리자" : m.role === "manager" ? "매니저" : "직원"}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

const KeywordList = ({ data }: { data: any[] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">키워드 ({data.length})</CardTitle>
      <CardDescription>파트너사의 모니터링 키워드 목록입니다.</CardDescription>
    </CardHeader>
    <CardContent>
      {data.length === 0 ? (
        <p className="text-slate-400 text-center py-8">등록된 키워드가 없습니다.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {data.map(k => (
            <Badge key={k.id} className="px-3 py-1.5 text-sm bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200">
              {k.keyword}
              {k.category && <span className="ml-1 text-xs opacity-60">({k.category})</span>}
            </Badge>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

export default PartnerDataView;
