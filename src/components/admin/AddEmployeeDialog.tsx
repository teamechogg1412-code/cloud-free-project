import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mail, UserPlus, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { useAuth } from "@/hooks/useAuth";

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface DeptOption { id: string; name: string; }
interface JobOption { id: string; name: string; }

export const AddEmployeeDialog = ({ open, onOpenChange, onSuccess }: AddEmployeeDialogProps) => {
  const { currentTenant, profile } = useAuth();
  const [tab, setTab] = useState("direct");
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [jobTitles, setJobTitles] = useState<JobOption[]>([]);
  const [createdInfo, setCreatedInfo] = useState<{ email: string; password: string } | null>(null);

  // Direct creation form
  const [directForm, setDirectForm] = useState({
    email: "", full_name: "", department: "", job_title: "", role: "employee",
  });

  // Invite form
  const [inviteForm, setInviteForm] = useState({
    email: "", department: "", job_title: "", role: "employee",
  });

  useEffect(() => {
    if (!open || !currentTenant?.tenant_id) return;
    const fetch = async () => {
      const [deptRes, jobRes] = await Promise.all([
        supabase.from("departments").select("id, name").eq("tenant_id", currentTenant.tenant_id).eq("is_active", true).order("sort_order"),
        supabase.from("job_titles").select("id, name").eq("tenant_id", currentTenant.tenant_id).eq("is_active", true).order("level"),
      ]);
      if (deptRes.data) setDepartments(deptRes.data);
      if (jobRes.data) setJobTitles(jobRes.data);
    };
    fetch();
  }, [open, currentTenant?.tenant_id]);

  const resetForms = () => {
    setDirectForm({ email: "", full_name: "", department: "", job_title: "", role: "employee" });
    setInviteForm({ email: "", department: "", job_title: "", role: "employee" });
    setCreatedInfo(null);
  };

  const handleDirectCreate = async () => {
    if (!directForm.email.trim()) { toast.error("이메일을 입력해주세요."); return; }
    if (!currentTenant?.tenant_id) return;

    setLoading(true);
    try {
      const { data, error } = await invokeEdgeFunction("create-employee", {
        body: {
          email: directForm.email.trim(),
          full_name: directForm.full_name.trim(),
          department: directForm.department,
          job_title: directForm.job_title,
          role: directForm.role,
          tenant_id: currentTenant.tenant_id,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "생성 실패");

      if (data.is_existing) {
        toast.success("기존 사용자를 직원으로 등록했습니다.");
        onSuccess();
        onOpenChange(false);
        resetForms();
      } else {
        setCreatedInfo({ email: directForm.email, password: data.temp_password });
        toast.success("직원 계정이 생성되었습니다!");
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || "직원 생성 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.email.trim()) { toast.error("이메일을 입력해주세요."); return; }
    if (!currentTenant?.tenant_id) return;

    setLoading(true);
    try {
      const signupUrl = `${window.location.origin}/auth?tenant=${currentTenant.tenant_id}`;
      const { data, error } = await invokeEdgeFunction("send-invitation-email", {
        body: {
          email: inviteForm.email.trim(),
          companyName: currentTenant.tenant?.name || "",
          role: inviteForm.role,
          department: inviteForm.department,
          jobTitle: inviteForm.job_title,
          inviterName: profile?.full_name,
          signupUrl,
          tenantId: currentTenant.tenant_id,
        },
      });

      if (error) throw error;
      toast.success(`${inviteForm.email}로 초대 이메일을 발송했습니다.`);
      onOpenChange(false);
      resetForms();
    } catch (err: any) {
      toast.error(err.message || "초대 이메일 발송 실패");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("클립보드에 복사되었습니다.");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForms(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-black">직원 등록</DialogTitle>
        </DialogHeader>

        {createdInfo ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-bold text-sm">계정이 생성되었습니다</span>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">이메일</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-800">{createdInfo.email}</p>
                  <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => copyToClipboard(createdInfo.email)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">임시 비밀번호</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{createdInfo.password}</code>
                  <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => copyToClipboard(createdInfo.password)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">직원에게 이 정보를 전달해주세요. 첫 로그인 후 비밀번호를 변경하도록 안내하세요.</p>
            <Button className="w-full" onClick={() => { onOpenChange(false); resetForms(); }}>
              확인
            </Button>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="direct" className="text-xs font-bold gap-1.5">
                <UserPlus className="w-3.5 h-3.5" /> 직접 생성
              </TabsTrigger>
              <TabsTrigger value="invite" className="text-xs font-bold gap-1.5">
                <Mail className="w-3.5 h-3.5" /> 이메일 초대
              </TabsTrigger>
            </TabsList>

            <TabsContent value="direct" className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-500">이메일 *</Label>
                <Input placeholder="employee@company.com" className="h-9 text-sm" value={directForm.email} onChange={e => setDirectForm({...directForm, email: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-500">이름</Label>
                <Input placeholder="홍길동" className="h-9 text-sm" value={directForm.full_name} onChange={e => setDirectForm({...directForm, full_name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-500">부서</Label>
                  <Select value={directForm.department} onValueChange={val => setDirectForm({...directForm, department: val})}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>
                      {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-500">직급</Label>
                  <Select value={directForm.job_title} onValueChange={val => setDirectForm({...directForm, job_title: val})}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>
                      {jobTitles.map(j => <SelectItem key={j.id} value={j.name}>{j.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-500">권한</Label>
                <Select value={directForm.role} onValueChange={val => setDirectForm({...directForm, role: val})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">사원</SelectItem>
                    <SelectItem value="manager">매니저</SelectItem>
                    <SelectItem value="company_admin">관리자</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full h-9 font-bold text-xs" onClick={handleDirectCreate} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <UserPlus className="w-3.5 h-3.5 mr-1" />}
                계정 생성
              </Button>
            </TabsContent>

            <TabsContent value="invite" className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-500">이메일 *</Label>
                <Input placeholder="employee@company.com" className="h-9 text-sm" value={inviteForm.email} onChange={e => setInviteForm({...inviteForm, email: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-500">부서</Label>
                  <Select value={inviteForm.department} onValueChange={val => setInviteForm({...inviteForm, department: val})}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>
                      {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-500">직급</Label>
                  <Select value={inviteForm.job_title} onValueChange={val => setInviteForm({...inviteForm, job_title: val})}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>
                      {jobTitles.map(j => <SelectItem key={j.id} value={j.name}>{j.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-500">권한</Label>
                <Select value={inviteForm.role} onValueChange={val => setInviteForm({...inviteForm, role: val})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">사원</SelectItem>
                    <SelectItem value="manager">매니저</SelectItem>
                    <SelectItem value="company_admin">관리자</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full h-9 font-bold text-xs" onClick={handleInvite} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Mail className="w-3.5 h-3.5 mr-1" />}
                초대 이메일 발송
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
