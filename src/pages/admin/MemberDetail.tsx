import { useState, useEffect } from "react";
import { Header } from "@/components/landing/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  UserCircle,
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  History,
  Edit,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  UserCog,
  FileText,
  Ban,
  UserCheck,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

interface Membership {
  id: string;
  user_id: string;
  tenant_id: string;
  role: "company_admin" | "manager" | "employee";
  department: string | null;
  job_title: string | null;
  created_at: string;
  is_suspended: boolean;
  suspended_at: string | null;
  suspended_by: string | null;
  suspension_reason: string | null;
}

interface HRRecord {
  id: string;
  tenant_id: string;
  user_id: string;
  record_type: string;
  title: string;
  description: string | null;
  effective_date: string;
  old_department: string | null;
  new_department: string | null;
  old_job_title: string | null;
  new_job_title: string | null;
  old_role: string | null;
  new_role: string | null;
  created_at: string;
  created_by: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface JobTitle {
  id: string;
  name: string;
}

const recordTypeLabels: Record<string, { label: string; color: string }> = {
  hire: { label: "입사", color: "bg-emerald-500" },
  promotion: { label: "승진", color: "bg-blue-500" },
  transfer: { label: "부서 이동", color: "bg-violet-500" },
  leave: { label: "휴직", color: "bg-amber-500" },
  return: { label: "복직", color: "bg-teal-500" },
  resignation: { label: "퇴사", color: "bg-red-500" },
  suspension: { label: "정지", color: "bg-red-600" },
  reactivation: { label: "복원", color: "bg-green-500" },
  note: { label: "기타", color: "bg-slate-500" },
};

const roleLabels: Record<string, string> = {
  company_admin: "관리자",
  manager: "매니저",
  employee: "직원",
};

const MemberDetail = () => {
  const navigate = useNavigate();
  const { id: memberId } = useParams<{ id: string }>();
  const { currentTenant, isCompanyAdmin, user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [hrRecords, setHRRecords] = useState<HRRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit membership dialog
  const [editMembershipDialog, setEditMembershipDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    department: "",
    job_title: "",
    role: "employee" as "company_admin" | "manager" | "employee",
  });

  // Add HR record dialog
  const [addRecordDialog, setAddRecordDialog] = useState(false);
  const [recordForm, setRecordForm] = useState({
    record_type: "note",
    title: "",
    description: "",
    effective_date: format(new Date(), "yyyy-MM-dd"),
  });

  // Fetch member data
  useEffect(() => {
    const fetchData = async () => {
      if (!currentTenant?.tenant_id || !memberId) return;

      setLoading(true);
      try {
        // Fetch membership
        const { data: membershipData, error: membershipError } = await supabase
          .from("tenant_memberships")
          .select("*")
          .eq("tenant_id", currentTenant.tenant_id)
          .eq("user_id", memberId) // <--- "id"를 "user_id"로 변경
          .single();

        if (membershipError) throw membershipError;
        setMembership(membershipData);

        // 2. 프로필 정보 가져오기 (이건 그대로 둠)
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", memberId) // memberId가 user_id이므로 정상 작동함
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Fetch HR records
        const { data: recordsData } = await supabase
          .from("hr_records")
          .select("*")
          .eq("tenant_id", currentTenant.tenant_id)
          .eq("user_id", memberId)
          .order("effective_date", { ascending: false });

        setHRRecords(recordsData || []);

        // Fetch departments
        const { data: deptData } = await supabase
          .from("departments")
          .select("id, name")
          .eq("tenant_id", currentTenant.tenant_id)
          .eq("is_active", true)
          .order("name");

        setDepartments(deptData || []);

        // Fetch job titles
        const { data: titleData } = await supabase
          .from("job_titles")
          .select("id, name")
          .eq("tenant_id", currentTenant.tenant_id)
          .eq("is_active", true)
          .order("level");

        setJobTitles(titleData || []);
      } catch (error) {
        console.error(error);
        toast({ title: "직원 정보 조회 실패", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentTenant?.tenant_id, memberId]);

  const openEditMembership = () => {
    if (!membership) return;
    setEditForm({
      department: membership.department || "",
      job_title: membership.job_title || "",
      role: membership.role,
    });
    setEditMembershipDialog(true);
  };

  const handleUpdateMembership = async () => {
    if (!membership || !currentTenant?.tenant_id) return;

    const oldDept = membership.department;
    const oldTitle = membership.job_title;
    const oldRole = membership.role;

    try {
      // Update membership
      const { error } = await supabase
        .from("tenant_memberships")
        .update({
          department: editForm.department || null,
          job_title: editForm.job_title || null,
          role: editForm.role,
        })
        .eq("id", membership.id);

      if (error) throw error;

      // Create HR record for the change
      const changes: string[] = [];
      if (oldDept !== editForm.department) {
        changes.push(`부서: ${oldDept || "없음"} → ${editForm.department || "없음"}`);
      }
      if (oldTitle !== editForm.job_title) {
        changes.push(`직급: ${oldTitle || "없음"} → ${editForm.job_title || "없음"}`);
      }
      if (oldRole !== editForm.role) {
        changes.push(`권한: ${roleLabels[oldRole]} → ${roleLabels[editForm.role]}`);
      }

      if (changes.length > 0) {
        await supabase.from("hr_records").insert({
          tenant_id: currentTenant.tenant_id,
          user_id: memberId,
          record_type: oldDept !== editForm.department ? "transfer" : "promotion",
          title: "인사 정보 변경",
          description: changes.join("\n"),
          effective_date: new Date().toISOString().split("T")[0],
          old_department: oldDept,
          new_department: editForm.department || null,
          old_job_title: oldTitle,
          new_job_title: editForm.job_title || null,
          old_role: oldRole,
          new_role: editForm.role,
          created_by: user?.id,
        });
      }

      // Refresh data
      setMembership({
        ...membership,
        department: editForm.department || null,
        job_title: editForm.job_title || null,
        role: editForm.role,
      });

      const { data: refreshedRecords } = await supabase
        .from("hr_records")
        .select("*")
        .eq("tenant_id", currentTenant.tenant_id)
        .eq("user_id", memberId)
        .order("effective_date", { ascending: false });

      setHRRecords(refreshedRecords || []);
      setEditMembershipDialog(false);
      toast({ title: "인사 정보가 수정되었습니다" });
    } catch (error) {
      console.error(error);
      toast({ title: "수정 실패", variant: "destructive" });
    }
  };

  const handleAddRecord = async () => {
    if (!currentTenant?.tenant_id || !memberId) return;

    try {
      const { error } = await supabase.from("hr_records").insert({
        tenant_id: currentTenant.tenant_id,
        user_id: memberId,
        record_type: recordForm.record_type,
        title: recordForm.title,
        description: recordForm.description || null,
        effective_date: recordForm.effective_date,
        created_by: user?.id,
      });

      if (error) throw error;

      // Refresh records
      const { data: refreshedRecords } = await supabase
        .from("hr_records")
        .select("*")
        .eq("tenant_id", currentTenant.tenant_id)
        .eq("user_id", memberId)
        .order("effective_date", { ascending: false });

      setHRRecords(refreshedRecords || []);
      setAddRecordDialog(false);
      setRecordForm({
        record_type: "note",
        title: "",
        description: "",
        effective_date: format(new Date(), "yyyy-MM-dd"),
      });
      toast({ title: "인사 기록이 추가되었습니다" });
    } catch (error) {
      console.error(error);
      toast({ title: "추가 실패", variant: "destructive" });
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm("이 인사 기록을 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase.from("hr_records").delete().eq("id", recordId);
      if (error) throw error;

      setHRRecords(hrRecords.filter((r) => r.id !== recordId));
      toast({ title: "인사 기록이 삭제되었습니다" });
    } catch (error) {
      console.error(error);
      toast({ title: "삭제 실패", variant: "destructive" });
    }
  };

  const handleToggleSuspension = async () => {
    if (!membership || !currentTenant?.tenant_id || !memberId) return;

    const isSuspending = !membership.is_suspended;
    const confirmMsg = isSuspending
      ? "이 직원의 계정을 정지하시겠습니까? 정지된 직원은 시스템에 접근할 수 없습니다."
      : "이 직원의 계정을 재활성화하시겠습니까?";

    if (!confirm(confirmMsg)) return;

    try {
      const { error } = await supabase
        .from("tenant_memberships")
        .update({
          is_suspended: isSuspending,
          suspended_at: isSuspending ? new Date().toISOString() : null,
          suspended_by: isSuspending ? user?.id : null,
          suspension_reason: null,
        })
        .eq("id", membership.id);

      if (error) throw error;

      // HR 기록 남기기
      await supabase.from("hr_records").insert({
        tenant_id: currentTenant.tenant_id,
        user_id: memberId,
        record_type: isSuspending ? "suspension" : "reactivation",
        title: isSuspending ? "계정 정지" : "계정 재활성화",
        description: isSuspending
          ? `관리자에 의해 계정이 정지되었습니다.`
          : `관리자에 의해 계정이 재활성화되었습니다.`,
        effective_date: new Date().toISOString().split("T")[0],
        created_by: user?.id,
      });

      setMembership({
        ...membership,
        is_suspended: isSuspending,
        suspended_at: isSuspending ? new Date().toISOString() : null,
        suspended_by: isSuspending ? user?.id || null : null,
      });

      // Refresh HR records
      const { data: refreshedRecords } = await supabase
        .from("hr_records")
        .select("*")
        .eq("tenant_id", currentTenant.tenant_id)
        .eq("user_id", memberId)
        .order("effective_date", { ascending: false });

      setHRRecords(refreshedRecords || []);
      toast({
        title: isSuspending ? "계정이 정지되었습니다" : "계정이 재활성화되었습니다",
      });
    } catch (error) {
      console.error(error);
      toast({ title: "처리 실패", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile || !membership) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="pt-28 pb-16 px-6 max-w-4xl mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800">직원을 찾을 수 없습니다</h1>
          <Button className="mt-6" onClick={() => navigate("/admin/hr")}>
            인사 관리로 돌아가기
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="pt-28 pb-16 px-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/hr")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <UserCircle className="w-8 h-8 text-primary" /> 직원 상세 정보
            </h1>
            <p className="text-muted-foreground mt-1">인사 기록 및 부서 배정 관리</p>
          </div>
        </div>

        {/* Profile Header Card */}
        <Card className="border-none shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {profile.full_name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{profile.full_name || "이름 없음"}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        className={`${
                          membership.role === "company_admin"
                            ? "bg-violet-500"
                            : membership.role === "manager"
                              ? "bg-blue-500"
                              : "bg-slate-500"
                        }`}
                      >
                        {roleLabels[membership.role]}
                      </Badge>
                      {membership.is_suspended && (
                        <Badge className="bg-red-600">정지됨</Badge>
                      )}
                      {membership.department && <Badge variant="outline">{membership.department}</Badge>}
                      {membership.job_title && <Badge variant="secondary">{membership.job_title}</Badge>}
                    </div>
                  </div>
                  {isCompanyAdmin && (
                    <div className="flex gap-2">
                      <Button onClick={openEditMembership} size="sm" variant="outline">
                        <Edit className="w-4 h-4 mr-2" /> 수정
                      </Button>
                      <Button
                        onClick={handleToggleSuspension}
                        size="sm"
                        variant={membership.is_suspended ? "default" : "destructive"}
                      >
                        {membership.is_suspended ? (
                          <><UserCheck className="w-4 h-4 mr-2" /> 재활성화</>
                        ) : (
                          <><Ban className="w-4 h-4 mr-2" /> 정지</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{profile.email}</span>
                  </div>
                  {profile.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>입사: {format(new Date(membership.created_at), "yyyy.MM.dd", { locale: ko })}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different sections */}
        <Tabs defaultValue="hr-records" className="space-y-4">
          <TabsList>
            <TabsTrigger value="hr-records">
              <History className="w-4 h-4 mr-2" /> 인사 기록
            </TabsTrigger>
            <TabsTrigger value="info">
              <FileText className="w-4 h-4 mr-2" /> 기본 정보
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hr-records">
            <Card className="border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" /> 인사 이력
                </CardTitle>
                {isCompanyAdmin && (
                  <Button onClick={() => setAddRecordDialog(true)} size="sm">
                    <Plus className="w-4 h-4 mr-2" /> 기록 추가
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {hrRecords.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">인사 기록이 없습니다</div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                    <div className="space-y-6">
                      {hrRecords.map((record) => {
                        const typeInfo = recordTypeLabels[record.record_type] || recordTypeLabels.note;
                        return (
                          <div key={record.id} className="relative pl-10">
                            {/* Timeline dot */}
                            <div
                              className={`absolute left-2 w-5 h-5 rounded-full ${typeInfo.color} flex items-center justify-center`}
                            >
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>

                            <Card className="bg-muted/30">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                                      <span className="text-sm text-muted-foreground">
                                        {format(new Date(record.effective_date), "yyyy.MM.dd", { locale: ko })}
                                      </span>
                                    </div>
                                    <h4 className="font-semibold">{record.title}</h4>
                                    {record.description && (
                                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                                        {record.description}
                                      </p>
                                    )}
                                  </div>
                                  {isCompanyAdmin && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => handleDeleteRecord(record.id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="info">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="w-5 h-5" /> 기본 정보
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground">이름</Label>
                      <p className="font-medium">{profile.full_name || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">이메일</Label>
                      <p className="font-medium">{profile.email}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">연락처</Label>
                      <p className="font-medium">{profile.phone || "-"}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground">부서</Label>
                      <p className="font-medium">{membership.department || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">직급</Label>
                      <p className="font-medium">{membership.job_title || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">권한</Label>
                      <p className="font-medium">{roleLabels[membership.role]}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Membership Dialog */}
        <Dialog open={editMembershipDialog} onOpenChange={setEditMembershipDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>인사 정보 수정</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>부서</Label>
                <Select value={editForm.department} onValueChange={(v) => setEditForm({ ...editForm, department: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="부서 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">없음</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.name}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>직급</Label>
                <Select value={editForm.job_title} onValueChange={(v) => setEditForm({ ...editForm, job_title: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="직급 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">없음</SelectItem>
                    {jobTitles.map((j) => (
                      <SelectItem key={j.id} value={j.name}>
                        {j.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>권한</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, role: v as "company_admin" | "manager" | "employee" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">직원</SelectItem>
                    <SelectItem value="manager">매니저</SelectItem>
                    <SelectItem value="company_admin">관리자</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditMembershipDialog(false)}>
                취소
              </Button>
              <Button onClick={handleUpdateMembership}>저장</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add HR Record Dialog */}
        <Dialog open={addRecordDialog} onOpenChange={setAddRecordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>인사 기록 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>유형</Label>
                <Select
                  value={recordForm.record_type}
                  onValueChange={(v) => setRecordForm({ ...recordForm, record_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(recordTypeLabels).map(([key, val]) => (
                      <SelectItem key={key} value={key}>
                        {val.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>제목</Label>
                <Input
                  value={recordForm.title}
                  onChange={(e) => setRecordForm({ ...recordForm, title: e.target.value })}
                  placeholder="예: 마케팅팀 이동"
                />
              </div>
              <div>
                <Label>발효일</Label>
                <Input
                  type="date"
                  value={recordForm.effective_date}
                  onChange={(e) => setRecordForm({ ...recordForm, effective_date: e.target.value })}
                />
              </div>
              <div>
                <Label>상세 내용 (선택)</Label>
                <Textarea
                  value={recordForm.description}
                  onChange={(e) => setRecordForm({ ...recordForm, description: e.target.value })}
                  placeholder="추가 설명을 입력하세요"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddRecordDialog(false)}>
                취소
              </Button>
              <Button onClick={handleAddRecord} disabled={!recordForm.title}>
                추가
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default MemberDetail;
