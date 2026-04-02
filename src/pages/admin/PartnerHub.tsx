import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Building2, Users, UserCog, Target, CalendarDays, Clock, Loader2,
  Plus, Edit2, Trash2, MapPin, Film, MessageSquare, Search, Filter,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getCompanyTypeBadge } from "@/lib/companyTypes";
import { ScheduleCalendar } from "@/components/schedule/ScheduleCalendar";

interface PartnerCompany {
  id: string;
  name: string;
  company_type: string | null;
  scopes: string[];
}

interface ArtistWithCompany {
  id: string;
  name: string;
  stage_name: string | null;
  bio: string | null;
  agency: string | null;
  tenant_id: string;
  companyName: string;
}

interface ScheduleWithCompany {
  id: string;
  artist_id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  schedule_type: string;
  location: string | null;
  artist?: { id: string; name: string; stage_name: string | null };
  companyName: string;
}

interface ProjectWithCompany {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: string;
  start_date: string | null;
  tenant_id: string;
  companyName: string;
}

const SCHEDULE_TYPES = [
  { value: "schedule", label: "일반 일정" },
  { value: "filming", label: "촬영" },
  { value: "meeting", label: "미팅" },
  { value: "event", label: "행사" },
  { value: "rehearsal", label: "리허설" },
  { value: "interview", label: "인터뷰" },
  { value: "travel", label: "이동" },
  { value: "rest", label: "휴식" },
];

const PartnerHub = () => {
  const { currentTenant, user } = useAuth();
  const navigate = useNavigate();
  const myTenantId = currentTenant?.tenant_id;

  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<PartnerCompany[]>([]);
  const [artists, setArtists] = useState<ArtistWithCompany[]>([]);
  const [schedules, setSchedules] = useState<ScheduleWithCompany[]>([]);
  const [projects, setProjects] = useState<ProjectWithCompany[]>([]);

  const [activeTab, setActiveTab] = useState("artists");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Schedule form
  const [isScheduleDialog, setIsScheduleDialog] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    artist_id: "", tenant_id: "", title: "", description: "",
    start_time: "", end_time: "", is_all_day: false,
    schedule_type: "schedule", location: "",
  });
  const [processing, setProcessing] = useState(false);

  // Memo dialog
  const [isMemoDialog, setIsMemoDialog] = useState(false);
  const [memoTarget, setMemoTarget] = useState<ArtistWithCompany | null>(null);
  const [memoText, setMemoText] = useState("");

  useEffect(() => {
    if (myTenantId) fetchAllData();
  }, [myTenantId]);

  const fetchAllData = async () => {
    if (!myTenantId) return;
    setLoading(true);
    try {
      // 1. Get active partnerships
      const { data: pData } = await supabase
        .from("tenant_partnerships")
        .select(`*, requester_tenant:requester_tenant_id(id,name,company_type), target_tenant:target_tenant_id(id,name,company_type)` as any)
        .eq("status", "active")
        .or(`requester_tenant_id.eq.${myTenantId},target_tenant_id.eq.${myTenantId}`);

      const partnerList: PartnerCompany[] = ((pData || []) as any[]).map((p: any) => {
        const isRequester = p.requester_tenant_id === myTenantId;
        const other = isRequester ? p.target_tenant : p.requester_tenant;
        return {
          id: other?.id,
          name: other?.name || "알 수 없음",
          company_type: other?.company_type,
          scopes: p.data_scopes || [],
        };
      }).filter(p => p.id); // filter out nulls

      setPartners(partnerList);

      // 2. Fetch data from all partners in parallel
      const artistPromises: Promise<ArtistWithCompany[]>[] = [];
      const schedulePromises: Promise<ScheduleWithCompany[]>[] = [];
      const projectPromises: Promise<ProjectWithCompany[]>[] = [];

      for (const partner of partnerList) {
        if (partner.scopes.includes("artists")) {
          artistPromises.push(
            supabase.from("artists").select("*").eq("tenant_id", partner.id).eq("is_active", true)
              .then(({ data }) => (data || []).map((a: any) => ({ ...a, companyName: partner.name })))
          );
        }
        if (partner.scopes.includes("schedules") || partner.scopes.includes("artists")) {
          schedulePromises.push(
            supabase.from("artist_schedules").select("*, artist:artist_id(id,name,stage_name)")
              .eq("tenant_id", partner.id).gte("end_time", new Date().toISOString())
              .order("start_time", { ascending: true })
              .then(({ data }) => (data || []).map((s: any) => ({ ...s, companyName: partner.name })))
          );
        }
        if (partner.scopes.includes("projects")) {
          projectPromises.push(
            supabase.from("projects").select("*").eq("tenant_id", partner.id).eq("is_active", true)
              .then(({ data }) => (data || []).map((p: any) => ({ ...p, companyName: partner.name })))
          );
        }
      }

      const [allArtists, allSchedules, allProjects] = await Promise.all([
        Promise.all(artistPromises).then(r => r.flat()),
        Promise.all(schedulePromises).then(r => r.flat()),
        Promise.all(projectPromises).then(r => r.flat()),
      ]);

      setArtists(allArtists);
      setSchedules(allSchedules);
      setProjects(allProjects);
    } catch (err) {
      console.error("Partner Hub fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered data
  const filteredArtists = useMemo(() => {
    let list = artists;
    if (companyFilter !== "all") list = list.filter(a => a.tenant_id === companyFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(q) || a.stage_name?.toLowerCase().includes(q));
    }
    return list;
  }, [artists, companyFilter, searchQuery]);

  const filteredSchedules = useMemo(() => {
    let list = schedules;
    if (companyFilter !== "all") list = list.filter(s => s.tenant_id === companyFilter);
    return list;
  }, [schedules, companyFilter]);

  const filteredProjects = useMemo(() => {
    let list = projects;
    if (companyFilter !== "all") list = list.filter(p => p.tenant_id === companyFilter);
    return list;
  }, [projects, companyFilter]);

  // Schedule CRUD
  const openNewSchedule = (artist?: ArtistWithCompany) => {
    setScheduleForm({
      artist_id: artist?.id || "",
      tenant_id: artist?.tenant_id || "",
      title: "", description: "",
      start_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      end_time: format(new Date(Date.now() + 3600000), "yyyy-MM-dd'T'HH:mm"),
      is_all_day: false, schedule_type: "schedule", location: "",
    });
    setIsScheduleDialog(true);
  };

  const handleSaveSchedule = async () => {
    if (!scheduleForm.artist_id || !scheduleForm.title || !scheduleForm.start_time || !scheduleForm.end_time) {
      toast.error("필수 항목을 입력해주세요");
      return;
    }
    setProcessing(true);
    try {
      const { error } = await supabase.from("artist_schedules").insert({
        artist_id: scheduleForm.artist_id,
        tenant_id: scheduleForm.tenant_id,
        title: scheduleForm.title,
        description: scheduleForm.description || null,
        start_time: new Date(scheduleForm.start_time).toISOString(),
        end_time: new Date(scheduleForm.end_time).toISOString(),
        is_all_day: scheduleForm.is_all_day,
        schedule_type: scheduleForm.schedule_type,
        location: scheduleForm.location || null,
        created_by: user?.id,
      } as any);

      if (error) throw error;
      toast.success("스케줄이 등록되었습니다");
      setIsScheduleDialog(false);
      fetchAllData();
    } catch (err: any) {
      toast.error("스케줄 등록 실패: " + err.message);
    } finally {
      setProcessing(false);
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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1">
              <Building2 className="w-5 h-5" /> Partner Hub
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">파트너 허브</h1>
            <p className="text-slate-500 mt-1">
              연결된 매니지먼트사 {partners.length}곳의 데이터를 통합 관리합니다.
            </p>
          </div>
          <Button variant="ghost" onClick={() => navigate("/admin")} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> 관리 시스템
          </Button>
        </div>

        {partners.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-slate-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-lg">연결된 매니지먼트사가 없습니다.</p>
              <p className="text-sm mt-1">파트너사 관리에서 매니지먼트사를 연결하세요.</p>
              <Button className="mt-4" onClick={() => navigate("/admin/partnerships")}>파트너사 관리로 이동</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Company filter & search bar */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <Select value={companyFilter} onValueChange={setCompanyFilter}>
                  <SelectTrigger className="w-52 bg-white">
                    <SelectValue placeholder="전체 매니지먼트사" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 매니지먼트사 ({partners.length})</SelectItem>
                    {partners.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {p.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="배우 이름 검색..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
              {/* Stats badges */}
              <div className="flex gap-2 ml-auto">
                <Badge variant="secondary" className="gap-1">
                  <UserCog className="w-3 h-3" /> 배우 {artists.length}명
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <CalendarDays className="w-3 h-3" /> 스케줄 {schedules.length}건
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Target className="w-3 h-3" /> 프로젝트 {projects.length}개
                </Badge>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="artists" className="gap-2">
                  <UserCog className="w-4 h-4" /> 배우 목록
                </TabsTrigger>
                <TabsTrigger value="schedules" className="gap-2">
                  <CalendarDays className="w-4 h-4" /> 통합 스케줄러
                </TabsTrigger>
                <TabsTrigger value="projects" className="gap-2">
                  <Target className="w-4 h-4" /> 프로젝트
                </TabsTrigger>
              </TabsList>

              {/* Artists Tab */}
              <TabsContent value="artists">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">전체 배우 ({filteredArtists.length})</h2>
                </div>
                {filteredArtists.length === 0 ? (
                  <Card><CardContent className="py-12 text-center text-slate-400">
                    <UserCog className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>등록된 배우가 없습니다.</p>
                  </CardContent></Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredArtists.map(a => (
                      <Card key={a.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                              {a.name?.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-base">{a.name}</p>
                              {a.stage_name && <p className="text-xs text-slate-500">{a.stage_name}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs gap-1">
                              <Building2 className="w-3 h-3" />{a.companyName}
                            </Badge>
                          </div>
                          {a.bio && <p className="text-xs text-slate-500 line-clamp-2 mb-3">{a.bio}</p>}
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="gap-1 text-xs flex-1"
                              onClick={() => openNewSchedule(a)}>
                              <Plus className="w-3 h-3" /> 스케줄 등록
                            </Button>
                            <Button size="sm" variant="ghost" className="gap-1 text-xs"
                              onClick={() => { setMemoTarget(a); setMemoText(""); setIsMemoDialog(true); }}>
                              <MessageSquare className="w-3 h-3" /> 메모
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Schedules Tab */}
              <TabsContent value="schedules">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">통합 스케줄러 ({filteredSchedules.length}건)</h2>
                  <Button size="sm" className="gap-1" onClick={() => openNewSchedule()}>
                    <Plus className="w-4 h-4" /> 스케줄 등록
                  </Button>
                </div>
                <ScheduleCalendar
                  schedules={filteredSchedules.map(s => ({
                    ...s,
                    artist: s.artist ? { ...s.artist, stage_name: s.artist.stage_name || null } : undefined,
                  }))}
                />
              </TabsContent>

              {/* Projects Tab */}
              <TabsContent value="projects">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">프로젝트 ({filteredProjects.length}개)</h2>
                </div>
                {filteredProjects.length === 0 ? (
                  <Card><CardContent className="py-12 text-center text-slate-400">
                    <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>등록된 프로젝트가 없습니다.</p>
                  </CardContent></Card>
                ) : (
                  <div className="space-y-3">
                    {filteredProjects.map(p => (
                      <Card key={p.id} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold">{p.name}</p>
                              <Badge variant="outline" className="text-xs gap-1">
                                <Building2 className="w-3 h-3" />{p.companyName}
                              </Badge>
                            </div>
                            {p.code && <p className="text-xs text-slate-500">코드: {p.code}</p>}
                            {p.description && <p className="text-sm text-slate-600 mt-1 line-clamp-1">{p.description}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-4">
                            <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-xs">
                              {p.status === "active" ? "진행중" : p.status}
                            </Badge>
                            {p.start_date && <span className="text-xs text-slate-400">{p.start_date}</span>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Schedule Creation Dialog */}
        <Dialog open={isScheduleDialog} onOpenChange={setIsScheduleDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>스케줄 등록</DialogTitle>
              <DialogDescription>파트너사 배우의 스케줄을 등록합니다.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Artist selection */}
              <div>
                <Label>배우 선택 *</Label>
                <Select value={scheduleForm.artist_id} onValueChange={v => {
                  const artist = artists.find(a => a.id === v);
                  setScheduleForm(f => ({ ...f, artist_id: v, tenant_id: artist?.tenant_id || "" }));
                }}>
                  <SelectTrigger><SelectValue placeholder="배우를 선택하세요" /></SelectTrigger>
                  <SelectContent>
                    {artists.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.companyName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>일정 유형</Label>
                <Select value={scheduleForm.schedule_type} onValueChange={v => setScheduleForm(f => ({ ...f, schedule_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>제목 *</Label>
                <Input value={scheduleForm.title} onChange={e => setScheduleForm(f => ({ ...f, title: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>시작</Label>
                  <Input type="datetime-local" value={scheduleForm.start_time}
                    onChange={e => setScheduleForm(f => ({ ...f, start_time: e.target.value }))} />
                </div>
                <div>
                  <Label>종료</Label>
                  <Input type="datetime-local" value={scheduleForm.end_time}
                    onChange={e => setScheduleForm(f => ({ ...f, end_time: e.target.value }))} />
                </div>
              </div>

              <div>
                <Label>장소</Label>
                <Input value={scheduleForm.location} onChange={e => setScheduleForm(f => ({ ...f, location: e.target.value }))} />
              </div>

              <div>
                <Label>설명</Label>
                <Textarea value={scheduleForm.description} onChange={e => setScheduleForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsScheduleDialog(false)}>취소</Button>
              <Button onClick={handleSaveSchedule} disabled={processing}>
                {processing && <Loader2 className="w-4 h-4 animate-spin mr-1" />} 등록
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Memo Dialog */}
        <Dialog open={isMemoDialog} onOpenChange={setIsMemoDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{memoTarget?.name} 메모</DialogTitle>
              <DialogDescription>{memoTarget?.companyName} 소속</DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="배우에 대한 메모를 작성하세요..."
              value={memoText}
              onChange={e => setMemoText(e.target.value)}
              rows={5}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMemoDialog(false)}>취소</Button>
              <Button onClick={() => {
                toast.success("메모가 저장되었습니다 (추후 DB 연동 예정)");
                setIsMemoDialog(false);
              }}>저장</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default PartnerHub;
