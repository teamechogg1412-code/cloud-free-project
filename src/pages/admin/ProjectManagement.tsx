import { useState, useEffect } from "react";
import { Header } from "@/components/landing/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  ArrowLeft, 
  Plus, 
  Pencil, 
  Trash2,
  Calendar,
  DollarSign,
  Search,
  Filter
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  is_active: boolean;
  created_at: string;
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
    name: "",
    code: "",
    description: "",
    status: "active",
    start_date: "",
    end_date: "",
    budget: "",
  });
  
  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

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

  const openDialog = (project?: Project) => {
    if (project) {
      setEditing(project);
      setForm({
        name: project.name,
        code: project.code || "",
        description: project.description || "",
        status: project.status,
        start_date: project.start_date || "",
        end_date: project.end_date || "",
        budget: project.budget?.toString() || "",
      });
    } else {
      setEditing(null);
      setForm({
        name: "",
        code: "",
        description: "",
        status: "active",
        start_date: "",
        end_date: "",
        budget: "",
      });
    }
    setDialogOpen(true);
  };

  const saveProject = async () => {
    if (!currentTenant || !form.name.trim()) return;
    
    const payload = {
      tenant_id: currentTenant.tenant_id,
      name: form.name.trim(),
      code: form.code.trim() || null,
      description: form.description.trim() || null,
      status: form.status,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      budget: form.budget ? parseFloat(form.budget) : null,
    };
    
    if (editing) {
      const { error } = await supabase
        .from("projects")
        .update(payload)
        .eq("id", editing.id);
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
    fetchData();
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.code?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" }).format(amount);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="pt-28 pb-16 px-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Target className="w-8 h-8 text-violet-600" /> 프로젝트 마스터
            </h1>
            <p className="text-slate-500 mt-1">
              {currentTenant?.tenant.name || "회사"} 진행 사업 관리 및 비용 정산 코드 제어
            </p>
          </div>
          <Button onClick={() => openDialog()} className="gap-2">
            <Plus className="w-4 h-4" /> 프로젝트 추가
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="프로젝트명 또는 코드 검색..."
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

        {/* Project List */}
        <Card className="border-none shadow-xl bg-white rounded-3xl">
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12 text-slate-400">로딩 중...</div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                {searchQuery || statusFilter !== "all" 
                  ? "검색 결과가 없습니다" 
                  : "등록된 프로젝트가 없습니다"}
              </div>
            ) : (
              <div className="divide-y">
                {filteredProjects.map(project => (
                  <div key={project.id} className="p-6 hover:bg-slate-50 group">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                        <Target className="w-6 h-6 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-lg truncate">{project.name}</h3>
                          {project.code && (
                            <Badge variant="outline" className="font-mono text-xs">
                              {project.code}
                            </Badge>
                          )}
                          <Badge className={statusColors[project.status] || "bg-gray-100"}>
                            {statusLabels[project.status] || project.status}
                          </Badge>
                        </div>
                        {project.description && (
                          <p className="text-slate-500 text-sm mb-2 line-clamp-1">{project.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          {(project.start_date || project.end_date) && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {project.start_date && format(new Date(project.start_date), "yy.MM.dd", { locale: ko })}
                              {project.start_date && project.end_date && " ~ "}
                              {project.end_date && format(new Date(project.end_date), "yy.MM.dd", { locale: ko })}
                            </span>
                          )}
                          {project.budget && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              {formatCurrency(project.budget)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openDialog(project)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-600"
                          onClick={() => setDeleteTarget(project)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "프로젝트 수정" : "프로젝트 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>프로젝트명 *</Label>
                <Input 
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="예: 2024 신규 캠페인"
                />
              </div>
              <div className="space-y-2">
                <Label>프로젝트 코드</Label>
                <Input 
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="예: PRJ-2024-001"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>상태</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">진행중</SelectItem>
                  <SelectItem value="pending">대기</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                  <SelectItem value="cancelled">취소</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>시작일</Label>
                <Input 
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>종료일</Label>
                <Input 
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>예산 (원)</Label>
              <Input 
                type="number"
                value={form.budget}
                onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                placeholder="예: 50000000"
              />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea 
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="프로젝트에 대한 설명"
              />
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
              "{deleteTarget?.name}" 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectManagement;
