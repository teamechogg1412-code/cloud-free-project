import { useState, useEffect } from "react";
import { Header } from "@/components/landing/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  FolderTree, 
  ArrowLeft, 
  Plus, 
  Pencil, 
  Trash2, 
  Building2,
  Briefcase,
  GripVertical,
  ChevronRight,
  ChevronDown,
  Download
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Department {
  id: string;
  name: string;
  parent_id: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  children?: Department[];
}

interface JobTitle {
  id: string;
  name: string;
  level: number;
  description: string | null;
  is_active: boolean;
}

const OrgManagement = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Department dialog
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({ name: "", description: "", parent_id: "" });
  
  // JobTitle dialog
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobTitle | null>(null);
  const [jobForm, setJobForm] = useState({ name: "", level: 0, description: "" });
  
  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: "dept" | "job"; id: string; name: string } | null>(null);
  
  // Expanded departments
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [importingDefaults, setImportingDefaults] = useState(false);

  useEffect(() => {
    if (currentTenant) {
      fetchData();
    }
  }, [currentTenant]);

  const fetchData = async () => {
    if (!currentTenant) return;
    setLoading(true);
    
    const [deptRes, jobRes] = await Promise.all([
      supabase
        .from("departments")
        .select("*")
        .eq("tenant_id", currentTenant.tenant_id)
        .order("sort_order"),
      supabase
        .from("job_titles")
        .select("*")
        .eq("tenant_id", currentTenant.tenant_id)
        .order("level"),
    ]);
    
    if (deptRes.data) setDepartments(deptRes.data);
    if (jobRes.data) setJobTitles(jobRes.data);
    setLoading(false);
  };

  // Build tree structure for departments
  const buildDeptTree = (depts: Department[], parentId: string | null = null): Department[] => {
    return depts
      .filter(d => d.parent_id === parentId)
      .map(d => ({
        ...d,
        children: buildDeptTree(depts, d.id),
      }));
  };

  const deptTree = buildDeptTree(departments);

  const toggleExpand = (id: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Department CRUD
  const openDeptDialog = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept);
      setDeptForm({ name: dept.name, description: dept.description || "", parent_id: dept.parent_id || "" });
    } else {
      setEditingDept(null);
      setDeptForm({ name: "", description: "", parent_id: "" });
    }
    setDeptDialogOpen(true);
  };

  const saveDepartment = async () => {
    if (!currentTenant || !deptForm.name.trim()) return;
    
    const payload = {
      tenant_id: currentTenant.tenant_id,
      name: deptForm.name.trim(),
      description: deptForm.description.trim() || null,
      parent_id: deptForm.parent_id || null,
      sort_order: departments.length,
    };
    
    if (editingDept) {
      const { error } = await supabase
        .from("departments")
        .update(payload)
        .eq("id", editingDept.id);
      if (error) toast.error("수정 실패: " + error.message);
      else toast.success("부서가 수정되었습니다");
    } else {
      const { error } = await supabase.from("departments").insert(payload);
      if (error) toast.error("등록 실패: " + error.message);
      else toast.success("부서가 등록되었습니다");
    }
    
    setDeptDialogOpen(false);
    fetchData();
  };

  // JobTitle CRUD
  const openJobDialog = (job?: JobTitle) => {
    if (job) {
      setEditingJob(job);
      setJobForm({ name: job.name, level: job.level, description: job.description || "" });
    } else {
      setEditingJob(null);
      setJobForm({ name: "", level: jobTitles.length, description: "" });
    }
    setJobDialogOpen(true);
  };

  const saveJobTitle = async () => {
    if (!currentTenant || !jobForm.name.trim()) return;
    
    const payload = {
      tenant_id: currentTenant.tenant_id,
      name: jobForm.name.trim(),
      level: jobForm.level,
      description: jobForm.description.trim() || null,
    };
    
    if (editingJob) {
      const { error } = await supabase
        .from("job_titles")
        .update(payload)
        .eq("id", editingJob.id);
      if (error) toast.error("수정 실패: " + error.message);
      else toast.success("직급이 수정되었습니다");
    } else {
      const { error } = await supabase.from("job_titles").insert(payload);
      if (error) toast.error("등록 실패: " + error.message);
      else toast.success("직급이 등록되었습니다");
    }
    
    setJobDialogOpen(false);
    fetchData();
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    const table = deleteTarget.type === "dept" ? "departments" : "job_titles";
    const { error } = await supabase.from(table).delete().eq("id", deleteTarget.id);
    
    if (error) toast.error("삭제 실패: " + error.message);
    else toast.success(`${deleteTarget.name}이(가) 삭제되었습니다`);
    
    setDeleteTarget(null);
    fetchData();
  };

  // Import system defaults
  const importDefaults = async (type: "dept" | "job") => {
    if (!currentTenant) return;
    setImportingDefaults(true);
    try {
      if (type === "dept") {
        const { data: defaults } = await supabase
          .from("departments")
          .select("name, description, parent_id, sort_order")
          .is("tenant_id", null);
        if (!defaults || defaults.length === 0) {
          toast.info("등록된 기본 부서가 없습니다.");
          return;
        }
        // Insert defaults with current tenant_id, skip duplicates
        const existingNames = new Set(departments.map(d => d.name));
        const newDepts = defaults.filter(d => !existingNames.has(d.name));
        if (newDepts.length === 0) {
          toast.info("이미 모든 기본 부서가 등록되어 있습니다.");
          return;
        }
        const { error } = await supabase.from("departments").insert(
          newDepts.map((d, i) => ({
            tenant_id: currentTenant.tenant_id,
            name: d.name,
            description: d.description,
            parent_id: null,
            sort_order: departments.length + i,
          }))
        );
        if (error) throw error;
        toast.success(`${newDepts.length}개 기본 부서를 불러왔습니다.`);
      } else {
        const { data: defaults } = await supabase
          .from("job_titles")
          .select("name, level, description")
          .is("tenant_id", null);
        if (!defaults || defaults.length === 0) {
          toast.info("등록된 기본 직급이 없습니다.");
          return;
        }
        const existingNames = new Set(jobTitles.map(j => j.name));
        const newJobs = defaults.filter(d => !existingNames.has(d.name));
        if (newJobs.length === 0) {
          toast.info("이미 모든 기본 직급이 등록되어 있습니다.");
          return;
        }
        const { error } = await supabase.from("job_titles").insert(
          newJobs.map(j => ({
            tenant_id: currentTenant.tenant_id,
            name: j.name,
            level: j.level,
            description: j.description,
          }))
        );
        if (error) throw error;
        toast.success(`${newJobs.length}개 기본 직급을 불러왔습니다.`);
      }
      fetchData();
    } catch (error: any) {
      toast.error("불러오기 실패: " + error.message);
    } finally {
      setImportingDefaults(false);
    }
  };

  // Render department tree item
  const renderDeptItem = (dept: Department, level: number = 0) => {
    const hasChildren = dept.children && dept.children.length > 0;
    const isExpanded = expandedDepts.has(dept.id);
    
    return (
      <div key={dept.id}>
        <div 
          className="flex items-center gap-2 p-3 rounded-lg hover:bg-slate-50 group"
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
          {hasChildren ? (
            <button onClick={() => toggleExpand(dept.id)} className="p-0.5">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-5" />
          )}
          <Building2 className="w-4 h-4 text-emerald-500" />
          <span className="flex-1 font-medium">{dept.name}</span>
          {dept.description && (
            <span className="text-sm text-slate-400 hidden md:block">{dept.description}</span>
          )}
          <div className="opacity-0 group-hover:opacity-100 flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDeptDialog(dept)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-red-500 hover:text-red-600"
              onClick={() => setDeleteTarget({ type: "dept", id: dept.id, name: dept.name })}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {hasChildren && isExpanded && dept.children?.map(child => renderDeptItem(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="pt-28 pb-16 px-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FolderTree className="w-8 h-8 text-emerald-600" /> 부서 및 직급 관리
            </h1>
            <p className="text-slate-500 mt-1">
              {currentTenant?.tenant.name || "회사"} 조직도 및 직급 체계 설정
            </p>
          </div>
        </div>

        <Tabs defaultValue="departments" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="departments" className="gap-2">
              <Building2 className="w-4 h-4" /> 부서 관리
            </TabsTrigger>
            <TabsTrigger value="jobtitles" className="gap-2">
              <Briefcase className="w-4 h-4" /> 직급 관리
            </TabsTrigger>
          </TabsList>

          {/* 부서 탭 */}
          <TabsContent value="departments">
            <Card className="border-none shadow-xl bg-white rounded-3xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>부서 목록</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => importDefaults("dept")} disabled={importingDefaults} className="gap-2">
                    <Download className="w-4 h-4" /> 기본값 불러오기
                  </Button>
                  <Button onClick={() => openDeptDialog()} className="gap-2">
                    <Plus className="w-4 h-4" /> 부서 추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12 text-slate-400">로딩 중...</div>
                ) : deptTree.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    등록된 부서가 없습니다. 첫 부서를 추가해보세요.
                  </div>
                ) : (
                  <div className="divide-y">
                    {deptTree.map(dept => renderDeptItem(dept))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 직급 탭 */}
          <TabsContent value="jobtitles">
            <Card className="border-none shadow-xl bg-white rounded-3xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>직급 목록</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => importDefaults("job")} disabled={importingDefaults} className="gap-2">
                    <Download className="w-4 h-4" /> 기본값 불러오기
                  </Button>
                  <Button onClick={() => openJobDialog()} className="gap-2">
                    <Plus className="w-4 h-4" /> 직급 추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12 text-slate-400">로딩 중...</div>
                ) : jobTitles.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    등록된 직급이 없습니다. 첫 직급을 추가해보세요.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {jobTitles.map((job, idx) => (
                      <div 
                        key={job.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 group"
                      >
                        <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm">
                          {idx + 1}
                        </div>
                        <Briefcase className="w-4 h-4 text-violet-500" />
                        <span className="flex-1 font-medium">{job.name}</span>
                        {job.description && (
                          <span className="text-sm text-slate-400 hidden md:block">{job.description}</span>
                        )}
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openJobDialog(job)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={() => setDeleteTarget({ type: "job", id: job.id, name: job.name })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Department Dialog */}
      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent aria-describedby="dept-dialog-description">
          <DialogHeader>
            <DialogTitle>{editingDept ? "부서 수정" : "부서 추가"}</DialogTitle>
          </DialogHeader>
          <p id="dept-dialog-description" className="sr-only">
            부서 정보를 입력하세요
          </p>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dept-name">부서명 *</Label>
              <Input 
                id="dept-name"
                value={deptForm.name}
                onChange={(e) => setDeptForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="예: 경영지원팀"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label>상위 부서</Label>
              <Select 
                value={deptForm.parent_id} 
                onValueChange={v => setDeptForm(f => ({ ...f, parent_id: v === "none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="상위 부서 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">없음 (최상위)</SelectItem>
                  {departments
                    .filter(d => d.id !== editingDept?.id)
                    .map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea 
                value={deptForm.description}
                onChange={e => setDeptForm(f => ({ ...f, description: e.target.value }))}
                placeholder="부서에 대한 간단한 설명"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptDialogOpen(false)}>취소</Button>
            <Button 
              onClick={saveDepartment} 
              disabled={!deptForm.name.trim() || !currentTenant}
            >
              저장
            </Button>
          </DialogFooter>
          {!currentTenant && (
            <p className="text-sm text-red-500 mt-2">회사가 선택되지 않았습니다. 다시 로그인해주세요.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* JobTitle Dialog */}
      <Dialog open={jobDialogOpen} onOpenChange={setJobDialogOpen}>
        <DialogContent aria-describedby="job-dialog-description">
          <DialogHeader>
            <DialogTitle>{editingJob ? "직급 수정" : "직급 추가"}</DialogTitle>
          </DialogHeader>
          <p id="job-dialog-description" className="sr-only">
            직급 정보를 입력하세요
          </p>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="job-name">직급명 *</Label>
              <Input 
                id="job-name"
                value={jobForm.name}
                onChange={(e) => setJobForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="예: 대리"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label>레벨 (순서)</Label>
              <Input 
                type="number"
                value={jobForm.level}
                onChange={e => setJobForm(f => ({ ...f, level: parseInt(e.target.value) || 0 }))}
                placeholder="숫자가 낮을수록 높은 직급"
              />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea 
                value={jobForm.description}
                onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))}
                placeholder="직급에 대한 간단한 설명"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJobDialogOpen(false)}>취소</Button>
            <Button 
              onClick={saveJobTitle} 
              disabled={!jobForm.name.trim() || !currentTenant}
            >
              저장
            </Button>
          </DialogFooter>
          {!currentTenant && (
            <p className="text-sm text-red-500 mt-2">회사가 선택되지 않았습니다. 다시 로그인해주세요.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}"을(를) 삭제합니다. 이 작업은 되돌릴 수 없습니다.
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

export default OrgManagement;
