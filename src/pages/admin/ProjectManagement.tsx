import { useState, useEffect } from "react";
import { Header } from "@/components/landing/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Target, ArrowLeft, Plus, Pencil, Trash2, Calendar, DollarSign, Search, Filter,
  Building2, User, Phone, Mail, Film, Clapperboard, TrendingUp, TrendingDown,
  ExternalLink, Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface Project {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  client_company: string | null;
  client_contact_name: string | null;
  client_contact_phone: string | null;
  client_contact_email: string | null;
  is_active: boolean;
  created_at: string;
  // new fields
  source_work_id: string | null;
  source_offer_id: string | null;
  project_type: string | null;
  purpose: string | null;
  shooting_start_date: string | null;
  shooting_end_date: string | null;
  release_date: string | null;
  director: string | null;
  writer: string | null;
  artist_name: string | null;
  role_name: string | null;
  channel: string | null;
  notes: string | null;
  contract_amount: number | null;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  active: "진행중",
  pending: "대기",
  completed: "완료",
  cancelled: "취소",
};

const PROJECT_TYPES = ["드라마", "영화", "광고", "예능", "뮤직비디오", "화보", "행사", "기타"];

const ProjectManagement = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState({
    name: "", code: "", description: "", status: "active",
    start_date: "", end_date: "", budget: "",
    client_company: "", client_contact_name: "", client_contact_phone: "", client_contact_email: "",
    project_type: "드라마", purpose: "",
    shooting_start_date: "", shooting_end_date: "", release_date: "",
    director: "", writer: "", artist_name: "", role_name: "", channel: "",
    notes: "", contract_amount: "",
  });
  
  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  // Detail view
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectExpenses, setProjectExpenses] = useState<any[]>([]);
  const [expenseLoading, setExpenseLoading] = useState(false);

  useEffect(() => {
    if (currentTenant) fetchData();
  }, [currentTenant]);

  const fetchData = async () => {
    if (!currentTenant) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("tenant_id", currentTenant.tenant_id)
      .order("created_at", { ascending: false });
    if (error) toast.error("데이터 로드 실패");
    else setProjects(data || []);
    setLoading(false);
  };

  const fetchProjectExpenses = async (projectId: string) => {
    setExpenseLoading(true);
    const { data } = await supabase
      .from("expense_reports")
      .select("id, title, total_amount, status, category, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setProjectExpenses(data || []);
    setExpenseLoading(false);
  };

  const openDetail = (project: Project) => {
    setSelectedProject(project);
    fetchProjectExpenses(project.id);
  };

  const openDialog = (project?: Project) => {
    if (project) {
      setEditing(project);
      setForm({
        name: project.name, code: project.code || "", description: project.description || "",
        status: project.status, start_date: project.start_date || "", end_date: project.end_date || "",
        budget: project.budget?.toString() || "",
        client_company: project.client_company || "", client_contact_name: project.client_contact_name || "",
        client_contact_phone: project.client_contact_phone || "", client_contact_email: project.client_contact_email || "",
        project_type: project.project_type || "드라마", purpose: project.purpose || "",
        shooting_start_date: project.shooting_start_date || "", shooting_end_date: project.shooting_end_date || "",
        release_date: project.release_date || "",
        director: project.director || "", writer: project.writer || "",
        artist_name: project.artist_name || "", role_name: project.role_name || "",
        channel: project.channel || "", notes: project.notes || "",
        contract_amount: project.contract_amount?.toString() || "",
      });
    } else {
      setEditing(null);
      setForm({
        name: "", code: "", description: "", status: "active",
        start_date: "", end_date: "", budget: "",
        client_company: "", client_contact_name: "", client_contact_phone: "", client_contact_email: "",
        project_type: "드라마", purpose: "",
        shooting_start_date: "", shooting_end_date: "", release_date: "",
        director: "", writer: "", artist_name: "", role_name: "", channel: "",
        notes: "", contract_amount: "",
      });
    }
    setDialogOpen(true);
  };

  const saveProject = async () => {
    if (!currentTenant || !form.name.trim()) return;
    const payload: any = {
      tenant_id: currentTenant.tenant_id,
      name: form.name.trim(),
      code: form.code.trim() || null,
      description: form.description.trim() || null,
      status: form.status,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      budget: form.budget ? parseFloat(form.budget) : null,
      client_company: form.client_company.trim() || null,
      client_contact_name: form.client_contact_name.trim() || null,
      client_contact_phone: form.client_contact_phone.trim() || null,
      client_contact_email: form.client_contact_email.trim() || null,
      project_type: form.project_type || null,
      purpose: form.purpose.trim() || null,
      shooting_start_date: form.shooting_start_date || null,
      shooting_end_date: form.shooting_end_date || null,
      release_date: form.release_date || null,
      director: form.director.trim() || null,
      writer: form.writer.trim() || null,
      artist_name: form.artist_name.trim() || null,
      role_name: form.role_name.trim() || null,
      channel: form.channel.trim() || null,
      notes: form.notes.trim() || null,
      contract_amount: form.contract_amount ? parseFloat(form.contract_amount) : null,
    };
    
    if (editing) {
      const { error } = await supabase.from("projects").update(payload).eq("id", editing.id);
      if (error) toast.error("수정 실패: " + error.message);
      else toast.success("프로젝트가 수정되었습니다");
    } else {
      const { error } = await supabase.from("projects").insert(payload);
      if (error) toast.error("등록 실패: " + error.message);
      else toast.success("프로젝트가 등록되었습니다");
    }
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("projects").delete().eq("id", deleteTarget.id);
    if (error) toast.error("삭제 실패: " + error.message);
    else toast.success("프로젝트가 삭제되었습니다");
    setDeleteTarget(null);
    if (selectedProject?.id === deleteTarget.id) setSelectedProject(null);
    fetchData();
  };

  const filteredProjects = projects.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(q) || (p.code?.toLowerCase().includes(q)) || (p.client_company?.toLowerCase().includes(q));
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" }).format(amount);

  const formatDate = (d: string | null) => d ? format(new Date(d), "yy.MM.dd", { locale: ko }) : "-";

  // Summary stats
  const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);
  const totalContract = projects.reduce((s, p) => s + (p.contract_amount || 0), 0);
  const totalExpenseAmount = projectExpenses.filter(e => e.status === "approved").reduce((s, e) => s + (e.total_amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="pt-28 pb-16 px-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Target className="w-8 h-8 text-violet-600" /> 프로젝트 정보
            </h1>
            <p className="text-muted-foreground mt-1">
              진행 프로젝트 관리 · 작품 연동 · 비용 추적
            </p>
          </div>
          <Button onClick={() => openDialog()} className="gap-2">
            <Plus className="w-4 h-4" /> 프로젝트 추가
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">전체 프로젝트</p>
                <p className="text-xl font-bold">{projects.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">진행중</p>
                <p className="text-xl font-bold">{projects.filter(p => p.status === "active").length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">총 예산</p>
                <p className="text-lg font-bold">{formatCurrency(totalBudget)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">총 계약금</p>
                <p className="text-lg font-bold">{formatCurrency(totalContract)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="프로젝트명, 코드, 거래처 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="active">진행중</SelectItem>
              <SelectItem value="pending">대기</SelectItem>
              <SelectItem value="completed">완료</SelectItem>
              <SelectItem value="cancelled">취소</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Project List */}
          <div className={selectedProject ? "col-span-5" : "col-span-12"}>
            <Card className="border-none shadow-xl bg-white rounded-2xl">
              <CardContent className="p-0">
                {loading ? (
                  <div className="text-center py-12 text-muted-foreground">로딩 중...</div>
                ) : filteredProjects.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {searchQuery || statusFilter !== "all" ? "검색 결과가 없습니다" : "등록된 프로젝트가 없습니다"}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredProjects.map(project => (
                      <div 
                        key={project.id} 
                        className={`p-4 hover:bg-accent/50 cursor-pointer group transition-colors ${selectedProject?.id === project.id ? "bg-accent" : ""}`}
                        onClick={() => openDetail(project)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                            {project.source_work_id ? <Film className="w-5 h-5 text-violet-600" /> : <Target className="w-5 h-5 text-violet-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="font-semibold truncate">{project.name}</h3>
                              <Badge className={`text-[10px] ${statusColors[project.status] || "bg-muted"}`}>
                                {statusLabels[project.status] || project.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {project.project_type && <span>{project.project_type}</span>}
                              {project.client_company && <span>· {project.client_company}</span>}
                              {project.code && <span className="font-mono">· {project.code}</span>}
                            </div>
                            {project.source_work_id && (
                              <Badge variant="outline" className="text-[10px] mt-1 border-violet-300 text-violet-600">
                                <Film className="w-3 h-3 mr-1" /> 작품 연동
                              </Badge>
                            )}
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openDialog(project); }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(project); }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detail Panel */}
          {selectedProject && (
            <div className="col-span-7">
              <Card className="border-none shadow-xl bg-white rounded-2xl sticky top-28">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        {selectedProject.name}
                        <Badge className={`text-xs ${statusColors[selectedProject.status]}`}>
                          {statusLabels[selectedProject.status]}
                        </Badge>
                      </CardTitle>
                      {selectedProject.code && <p className="text-sm font-mono text-muted-foreground mt-1">{selectedProject.code}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => openDialog(selectedProject)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" /> 수정
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedProject(null)}>
                        ✕
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="info">
                    <TabsList className="mb-4">
                      <TabsTrigger value="info">프로젝트 정보</TabsTrigger>
                      <TabsTrigger value="client">거래처 정보</TabsTrigger>
                      <TabsTrigger value="finance">수익/비용</TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="space-y-4">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        <div><span className="text-muted-foreground">유형:</span> <span className="font-medium ml-2">{selectedProject.project_type || "-"}</span></div>
                        <div><span className="text-muted-foreground">목적:</span> <span className="font-medium ml-2">{selectedProject.purpose || "-"}</span></div>
                        <div><span className="text-muted-foreground">채널:</span> <span className="font-medium ml-2">{selectedProject.channel || "-"}</span></div>
                        <div><span className="text-muted-foreground">감독:</span> <span className="font-medium ml-2">{selectedProject.director || "-"}</span></div>
                        <div><span className="text-muted-foreground">작가:</span> <span className="font-medium ml-2">{selectedProject.writer || "-"}</span></div>
                        <div><span className="text-muted-foreground">아티스트:</span> <span className="font-medium ml-2">{selectedProject.artist_name || "-"}</span></div>
                        <div><span className="text-muted-foreground">배역:</span> <span className="font-medium ml-2">{selectedProject.role_name || "-"}</span></div>
                      </div>
                      <div className="border-t pt-3">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1"><Calendar className="w-4 h-4" /> 일정</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><span className="text-muted-foreground">프로젝트 기간:</span> <span className="ml-2">{formatDate(selectedProject.start_date)} ~ {formatDate(selectedProject.end_date)}</span></div>
                          <div><span className="text-muted-foreground">촬영일:</span> <span className="ml-2">{formatDate(selectedProject.shooting_start_date)} ~ {formatDate(selectedProject.shooting_end_date)}</span></div>
                          <div><span className="text-muted-foreground">릴리즈일:</span> <span className="ml-2">{formatDate(selectedProject.release_date)}</span></div>
                        </div>
                      </div>
                      {selectedProject.description && (
                        <div className="border-t pt-3">
                          <h4 className="text-sm font-semibold mb-1">설명</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedProject.description}</p>
                        </div>
                      )}
                      {selectedProject.notes && (
                        <div className="border-t pt-3">
                          <h4 className="text-sm font-semibold mb-1">비고</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedProject.notes}</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="client" className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground w-24">거래처/제작사:</span>
                          <span className="font-medium">{selectedProject.client_company || "-"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground w-24">담당자:</span>
                          <span className="font-medium">{selectedProject.client_contact_name || "-"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground w-24">연락처:</span>
                          <span className="font-medium">{selectedProject.client_contact_phone || "-"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground w-24">이메일:</span>
                          <span className="font-medium">{selectedProject.client_contact_email || "-"}</span>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="finance" className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <Card className="bg-emerald-50 border-emerald-200">
                          <CardContent className="p-3 text-center">
                            <p className="text-xs text-emerald-600">계약금</p>
                            <p className="text-lg font-bold text-emerald-700">{formatCurrency(selectedProject.contract_amount || 0)}</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-blue-50 border-blue-200">
                          <CardContent className="p-3 text-center">
                            <p className="text-xs text-blue-600">예산</p>
                            <p className="text-lg font-bold text-blue-700">{formatCurrency(selectedProject.budget || 0)}</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-red-50 border-red-200">
                          <CardContent className="p-3 text-center">
                            <p className="text-xs text-red-600">승인 지출</p>
                            <p className="text-lg font-bold text-red-700">{formatCurrency(totalExpenseAmount)}</p>
                          </CardContent>
                        </Card>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold mb-2">연결된 지출결의서</h4>
                        {expenseLoading ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">로딩 중...</p>
                        ) : projectExpenses.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">연결된 지출결의서가 없습니다</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">제목</TableHead>
                                <TableHead className="text-xs">금액</TableHead>
                                <TableHead className="text-xs">상태</TableHead>
                                <TableHead className="text-xs">일자</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {projectExpenses.map(e => (
                                <TableRow key={e.id} className="text-xs">
                                  <TableCell className="py-2">{e.title}</TableCell>
                                  <TableCell className="py-2">{formatCurrency(e.total_amount)}</TableCell>
                                  <TableCell className="py-2">
                                    <Badge variant={e.status === "approved" ? "default" : "outline"} className="text-[10px]">
                                      {e.status === "approved" ? "승인" : e.status === "pending" ? "대기" : e.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="py-2">{formatDate(e.created_at)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "프로젝트 수정" : "프로젝트 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Basic */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">프로젝트명 *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="예: 2024 신규 캠페인" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">프로젝트 코드</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="PRJ-2024-001" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">상태</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">진행중</SelectItem>
                    <SelectItem value="pending">대기</SelectItem>
                    <SelectItem value="completed">완료</SelectItem>
                    <SelectItem value="cancelled">취소</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Type & Purpose */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">프로젝트 유형</Label>
                <Select value={form.project_type} onValueChange={v => setForm(f => ({ ...f, project_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">프로젝트 목적</Label>
                <Input value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="예: 브랜드 광고 출연" />
              </div>
            </div>

            {/* Creative Team */}
            <div className="border-t pt-3">
              <Label className="text-xs font-semibold block mb-2">제작진 / 아티스트</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">감독</Label>
                  <Input value={form.director} onChange={e => setForm(f => ({ ...f, director: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">작가</Label>
                  <Input value={form.writer} onChange={e => setForm(f => ({ ...f, writer: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">아티스트 / 출연자</Label>
                  <Input value={form.artist_name} onChange={e => setForm(f => ({ ...f, artist_name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">배역 / 역할</Label>
                  <Input value={form.role_name} onChange={e => setForm(f => ({ ...f, role_name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">채널 / 매체</Label>
                  <Input value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} placeholder="예: tvN, Netflix" />
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="border-t pt-3">
              <Label className="text-xs font-semibold block mb-2">일정</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1"><Label className="text-xs">프로젝트 시작일</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">프로젝트 종료일</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">릴리즈일</Label><Input type="date" value={form.release_date} onChange={e => setForm(f => ({ ...f, release_date: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">촬영 시작일</Label><Input type="date" value={form.shooting_start_date} onChange={e => setForm(f => ({ ...f, shooting_start_date: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">촬영 종료일</Label><Input type="date" value={form.shooting_end_date} onChange={e => setForm(f => ({ ...f, shooting_end_date: e.target.value }))} /></div>
              </div>
            </div>

            {/* Finance */}
            <div className="border-t pt-3">
              <Label className="text-xs font-semibold block mb-2">금액</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label className="text-xs">계약금 (원)</Label><Input type="number" value={form.contract_amount} onChange={e => setForm(f => ({ ...f, contract_amount: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">예산 (원)</Label><Input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} /></div>
              </div>
            </div>

            {/* Client */}
            <div className="border-t pt-3">
              <Label className="text-xs font-semibold block mb-2">거래처 / 제작사 정보</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2"><Label className="text-xs">거래처/제작사명</Label><Input value={form.client_company} onChange={e => setForm(f => ({ ...f, client_company: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">담당자명</Label><Input value={form.client_contact_name} onChange={e => setForm(f => ({ ...f, client_contact_name: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">담당자 연락처</Label><Input value={form.client_contact_phone} onChange={e => setForm(f => ({ ...f, client_contact_phone: e.target.value }))} /></div>
                <div className="space-y-1 col-span-2"><Label className="text-xs">담당자 이메일</Label><Input type="email" value={form.client_contact_email} onChange={e => setForm(f => ({ ...f, client_contact_email: e.target.value }))} /></div>
              </div>
            </div>

            <div className="border-t pt-3 space-y-1">
              <Label className="text-xs">설명</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">비고</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={saveProject} disabled={!form.name.trim()}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>프로젝트 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" 프로젝트를 삭제하시겠습니까? 연결된 지출결의서의 프로젝트 연결도 해제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectManagement;
