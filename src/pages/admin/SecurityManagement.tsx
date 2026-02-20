import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  ShieldCheck, Plus, Trash2, Pencil, Eye, EyeOff, ArrowLeft, UserPlus, X, Users, User, Building2
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface SharedCredential {
  id: string;
  service_name: string;
  login_id: string;
  login_password: string;
  domain_url: string | null;
  category: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  access_rules: { access_type: string; target_id: string | null; target_name?: string }[];
}

interface CredentialManager {
  id: string;
  user_id: string;
  full_name?: string;
  job_title?: string;
  department?: string;
}

const CATEGORIES = ["이메일", "소셜미디어", "클라우드", "결제/금융", "업무도구", "기타"];

const SecurityManagement = () => {
  const navigate = useNavigate();
  const { user, currentTenant } = useAuth();
  const [credentials, setCredentials] = useState<SharedCredential[]>([]);
  const [managers, setManagers] = useState<CredentialManager[]>([]);
  const [tenantMembers, setTenantMembers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Form states
  const [editingCredential, setEditingCredential] = useState<SharedCredential | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [managerDialogOpen, setManagerDialogOpen] = useState(false);
  const [form, setForm] = useState({
    service_name: "",
    login_id: "",
    login_password: "",
    domain_url: "",
    category: "기타",
    notes: "",
    access_type: "all" as string,
    selected_departments: [] as string[],
    selected_individuals: [] as string[],
  });

  const tenantId = currentTenant?.tenant_id;

  useEffect(() => {
    if (!tenantId) return;
    fetchAll();
  }, [tenantId]);

  const fetchAll = async () => {
    if (!tenantId) return;
    setLoading(true);

    const [credRes, mgrRes, memberRes, deptRes] = await Promise.all([
      (supabase as any).from("shared_credentials").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      (supabase as any).from("credential_managers").select("*").eq("tenant_id", tenantId),
      supabase.from("tenant_memberships").select("user_id, job_title, department").eq("tenant_id", tenantId),
      supabase.from("departments").select("id, name").eq("tenant_id", tenantId).eq("is_active", true),
    ]);

    // Get profile names
    const memberIds = (memberRes.data || []).map((m: any) => m.user_id);
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", memberIds);
    const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));

    const members = (memberRes.data || []).map((m: any) => ({
      ...m,
      full_name: nameMap.get(m.user_id) || "이름 없음",
    }));
    setTenantMembers(members);
    setDepartments(deptRes.data || []);

    // Managers with names
    const mgrs = (mgrRes.data || []).map((mg: any) => {
      const member = members.find((m: any) => m.user_id === mg.user_id);
      return { ...mg, full_name: member?.full_name, job_title: member?.job_title, department: member?.department };
    });
    setManagers(mgrs);

    // Credentials with access rules
    const creds = credRes.data || [];
    const credIds = creds.map((c: any) => c.id);
    let accessRules: any[] = [];
    if (credIds.length > 0) {
      const { data } = await (supabase as any).from("credential_access").select("*").in("credential_id", credIds);
      accessRules = data || [];
    }

    const enriched = creds.map((c: any) => ({
      ...c,
      access_rules: accessRules
        .filter((a: any) => a.credential_id === c.id)
        .map((a: any) => ({
          access_type: a.access_type,
          target_id: a.target_id,
          target_name:
            a.access_type === "department"
              ? (deptRes.data || []).find((d: any) => d.id === a.target_id)?.name || a.target_id
              : a.access_type === "individual"
              ? nameMap.get(a.target_id) || a.target_id
              : null,
        })),
    }));
    setCredentials(enriched);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ service_name: "", login_id: "", login_password: "", domain_url: "", category: "기타", notes: "", access_type: "all", selected_departments: [], selected_individuals: [] });
    setEditingCredential(null);
  };

  const openEditForm = (cred: SharedCredential) => {
    const accessType = cred.access_rules.length === 0 ? "all" : cred.access_rules[0]?.access_type || "all";
    setForm({
      service_name: cred.service_name,
      login_id: cred.login_id,
      login_password: cred.login_password,
      domain_url: cred.domain_url || "",
      category: cred.category || "기타",
      notes: cred.notes || "",
      access_type: accessType,
      selected_departments: cred.access_rules.filter(a => a.access_type === "department").map(a => a.target_id!),
      selected_individuals: cred.access_rules.filter(a => a.access_type === "individual").map(a => a.target_id!),
    });
    setEditingCredential(cred);
    setFormOpen(true);
  };

  const saveCredential = async () => {
    if (!tenantId || !user) return;
    if (!form.service_name.trim() || !form.login_id.trim() || !form.login_password.trim()) {
      toast.error("서비스명, 아이디, 비밀번호는 필수입니다.");
      return;
    }

    try {
      let credId: string;

      if (editingCredential) {
        const { error } = await (supabase as any).from("shared_credentials").update({
          service_name: form.service_name,
          login_id: form.login_id,
          login_password: form.login_password,
          domain_url: form.domain_url || null,
          category: form.category,
          notes: form.notes || null,
        }).eq("id", editingCredential.id);
        if (error) throw error;
        credId = editingCredential.id;

        // Delete old access rules
        await (supabase as any).from("credential_access").delete().eq("credential_id", credId);
      } else {
        const { data, error } = await (supabase as any).from("shared_credentials").insert({
          tenant_id: tenantId,
          service_name: form.service_name,
          login_id: form.login_id,
          login_password: form.login_password,
          domain_url: form.domain_url || null,
          category: form.category,
          notes: form.notes || null,
          created_by: user.id,
        }).select("id").single();
        if (error) throw error;
        credId = data.id;
      }

      // Insert access rules
      const accessRows: any[] = [];
      if (form.access_type === "all") {
        accessRows.push({ credential_id: credId, access_type: "all", target_id: null });
      } else if (form.access_type === "department") {
        form.selected_departments.forEach(deptId => {
          accessRows.push({ credential_id: credId, access_type: "department", target_id: deptId });
        });
      } else if (form.access_type === "individual") {
        form.selected_individuals.forEach(userId => {
          accessRows.push({ credential_id: credId, access_type: "individual", target_id: userId });
        });
      }

      if (accessRows.length > 0) {
        const { error: accessError } = await (supabase as any).from("credential_access").insert(accessRows);
        if (accessError) throw accessError;
      }

      toast.success(editingCredential ? "수정되었습니다." : "등록되었습니다.");
      setFormOpen(false);
      resetForm();
      fetchAll();
    } catch (e: any) {
      toast.error("저장 실패: " + e.message);
    }
  };

  const deleteCredential = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const { error } = await (supabase as any).from("shared_credentials").delete().eq("id", id);
      if (error) throw error;
      toast.success("삭제되었습니다.");
      fetchAll();
    } catch (e: any) {
      toast.error("삭제 실패: " + e.message);
    }
  };

  const addManager = async (userId: string) => {
    if (!tenantId) return;
    try {
      const { error } = await (supabase as any).from("credential_managers").insert({ tenant_id: tenantId, user_id: userId });
      if (error) throw error;
      toast.success("담당자가 추가되었습니다.");
      fetchAll();
    } catch (e: any) {
      toast.error("추가 실패: " + e.message);
    }
  };

  const removeManager = async (id: string) => {
    try {
      const { error } = await (supabase as any).from("credential_managers").delete().eq("id", id);
      if (error) throw error;
      toast.success("담당자가 삭제되었습니다.");
      fetchAll();
    } catch (e: any) {
      toast.error("삭제 실패: " + e.message);
    }
  };

  const togglePassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const accessLabel = (rules: SharedCredential["access_rules"]) => {
    if (rules.length === 0 || rules.some(r => r.access_type === "all")) return "전체 공개";
    const depts = rules.filter(r => r.access_type === "department");
    const indivs = rules.filter(r => r.access_type === "individual");
    const parts: string[] = [];
    if (depts.length > 0) parts.push(`팀: ${depts.map(d => d.target_name).join(", ")}`);
    if (indivs.length > 0) parts.push(`개인: ${indivs.map(i => i.target_name).join(", ")}`);
    return parts.join(" / ");
  };

  const nonManagerMembers = tenantMembers.filter(m => !managers.some(mg => mg.user_id === m.user_id));

  return (
    <div className="pb-16 px-6 max-w-7xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold mb-1">
            <ShieldCheck className="w-5 h-5" /> 보안관리
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">비밀번호 공유 관리</h1>
          <p className="text-slate-500 mt-1">공유 계정 정보를 등록하고 접근 권한을 관리합니다.</p>
        </div>
        <Button variant="ghost" className="gap-2" onClick={() => navigate("/admin")}>
          <ArrowLeft className="w-4 h-4" /> 돌아가기
        </Button>
      </div>

      {/* 담당자 관리 섹션 */}
      <Card className="mb-8 border-none shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2"><UserPlus className="w-5 h-5" /> 비밀번호 관리 담당자</CardTitle>
          <Dialog open={managerDialogOpen} onOpenChange={setManagerDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> 담당자 추가</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>담당자 추가</DialogTitle></DialogHeader>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {nonManagerMembers.map(m => (
                  <div key={m.user_id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100">
                    <div>
                      <span className="font-medium">{m.full_name}</span>
                      <span className="text-sm text-slate-500 ml-2">{m.department} · {m.job_title}</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => { addManager(m.user_id); setManagerDialogOpen(false); }}>추가</Button>
                  </div>
                ))}
                {nonManagerMembers.length === 0 && <p className="text-slate-400 text-center py-4">추가할 수 있는 멤버가 없습니다.</p>}
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {managers.map(mg => (
              <Badge key={mg.id} variant="secondary" className="px-3 py-2 text-sm gap-2">
                {mg.full_name} ({mg.job_title || "직급 없음"})
                <button onClick={() => removeManager(mg.id)} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
              </Badge>
            ))}
            {managers.length === 0 && <p className="text-sm text-slate-400">등록된 담당자가 없습니다.</p>}
          </div>
        </CardContent>
      </Card>

      {/* 자격증명 목록 */}
      <Card className="border-none shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">공유 계정 목록</CardTitle>
          <Button className="gap-1" onClick={() => { resetForm(); setFormOpen(true); }}>
            <Plus className="w-4 h-4" /> 계정 추가
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-slate-400 py-8">로딩 중...</p>
          ) : credentials.length === 0 ? (
            <p className="text-center text-slate-400 py-8">등록된 공유 계정이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>카테고리</TableHead>
                  <TableHead>서비스명</TableHead>
                  <TableHead>아이디</TableHead>
                  <TableHead>비밀번호</TableHead>
                  <TableHead>도메인</TableHead>
                  <TableHead>공유 범위</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map(cred => (
                  <TableRow key={cred.id}>
                    <TableCell><Badge variant="outline">{cred.category}</Badge></TableCell>
                    <TableCell className="font-semibold">{cred.service_name}</TableCell>
                    <TableCell className="font-mono text-sm">{cred.login_id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {showPasswords[cred.id] ? cred.login_password : "••••••••"}
                        </span>
                        <button onClick={() => togglePassword(cred.id)} className="text-slate-400 hover:text-slate-600">
                          {showPasswords[cred.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {cred.domain_url ? (
                        <a href={cred.domain_url} target="_blank" rel="noreferrer" className="text-primary underline text-sm">{cred.domain_url}</a>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{accessLabel(cred.access_rules)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => openEditForm(cred)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteCredential(cred.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 계정 추가/수정 다이얼로그 */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCredential ? "계정 정보 수정" : "계정 정보 등록"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>카테고리</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>서비스명 *</Label>
              <Input value={form.service_name} onChange={e => setForm(p => ({ ...p, service_name: e.target.value }))} placeholder="예: Naver Works" />
            </div>
            <div>
              <Label>아이디 *</Label>
              <Input value={form.login_id} onChange={e => setForm(p => ({ ...p, login_id: e.target.value }))} placeholder="로그인 아이디" />
            </div>
            <div>
              <Label>비밀번호 *</Label>
              <Input value={form.login_password} onChange={e => setForm(p => ({ ...p, login_password: e.target.value }))} placeholder="비밀번호" />
            </div>
            <div>
              <Label>도메인 URL</Label>
              <Input value={form.domain_url} onChange={e => setForm(p => ({ ...p, domain_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <Label>메모</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="추가 정보" rows={2} />
            </div>

            <div className="border-t pt-4">
              <Label className="text-base font-semibold mb-3 block">공유 범위</Label>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="access" checked={form.access_type === "all"} onChange={() => setForm(p => ({ ...p, access_type: "all" }))} />
                  <Users className="w-4 h-4" /> 전체 공개
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="access" checked={form.access_type === "department"} onChange={() => setForm(p => ({ ...p, access_type: "department" }))} />
                  <Building2 className="w-4 h-4" /> 특정 팀만
                </label>
                {form.access_type === "department" && (
                  <div className="ml-6 space-y-2">
                    {departments.map(dept => (
                      <label key={dept.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={form.selected_departments.includes(dept.id)}
                          onCheckedChange={checked => {
                            setForm(p => ({
                              ...p,
                              selected_departments: checked
                                ? [...p.selected_departments, dept.id]
                                : p.selected_departments.filter(d => d !== dept.id),
                            }));
                          }}
                        />
                        {dept.name}
                      </label>
                    ))}
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="access" checked={form.access_type === "individual"} onChange={() => setForm(p => ({ ...p, access_type: "individual" }))} />
                  <User className="w-4 h-4" /> 특정 사람만
                </label>
                {form.access_type === "individual" && (
                  <div className="ml-6 space-y-2 max-h-40 overflow-y-auto">
                    {tenantMembers.map(m => (
                      <label key={m.user_id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={form.selected_individuals.includes(m.user_id)}
                          onCheckedChange={checked => {
                            setForm(p => ({
                              ...p,
                              selected_individuals: checked
                                ? [...p.selected_individuals, m.user_id]
                                : p.selected_individuals.filter(id => id !== m.user_id),
                            }));
                          }}
                        />
                        {m.full_name} ({m.department || "부서 없음"})
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Button onClick={saveCredential} className="w-full">{editingCredential ? "수정" : "등록"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SecurityManagement;
