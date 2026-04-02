import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, Trash2, Plus, X } from "lucide-react";
import { formatResidentNumber, formatPhoneNumber, openDaumPostcode } from "@/lib/formatUtils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

interface EmployeeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: any;
  membership: any;
  employeeDetail: any;
  memberId: string;
  tenantId: string;
  onSaved: () => void;
  onDeleted: () => void;
}

export const EmployeeEditDialog = ({
  open, onOpenChange, profile, membership, employeeDetail,
  memberId, tenantId, onSaved, onDeleted
}: EmployeeEditDialogProps) => {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Membership fields
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [role, setRole] = useState("employee");

  // Employee detail fields
  const [hireDate, setHireDate] = useState("");
  const [resignationDate, setResignationDate] = useState("");
  const [residentNumber, setResidentNumber] = useState("");
  const [isForeigner, setIsForeigner] = useState(false);
  const [nationality, setNationality] = useState("");
  const [address, setAddress] = useState("");
  const [phoneMobile, setPhoneMobile] = useState("");
  const [phoneTel, setPhoneTel] = useState("");
  const [detailEmail, setDetailEmail] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [emergencyContacts, setEmergencyContacts] = useState<{ name: string; phone: string; relation: string }[]>([]);

  useEffect(() => {
    if (open) {
      setFullName(profile?.full_name || "");
      setEmail(profile?.email || "");
      setPhone(profile?.phone || "");
      setDepartment(membership?.department || "");
      setJobTitle(membership?.job_title || "");
      setRole(membership?.role || "employee");
      setHireDate(employeeDetail?.hire_date || "");
      setResignationDate(employeeDetail?.resignation_date || "");
      setResidentNumber(employeeDetail?.resident_number || "");
      setIsForeigner(employeeDetail?.is_foreigner || false);
      setNationality(employeeDetail?.nationality || "");
      setAddress(employeeDetail?.address || "");
      setPhoneMobile(employeeDetail?.phone_mobile || "");
      setPhoneTel(employeeDetail?.phone_tel || "");
      setDetailEmail(employeeDetail?.email || profile?.email || "");
      setBankName(employeeDetail?.bank_name || "");
      setAccountNumber(employeeDetail?.account_number || "");
      setAccountHolder(employeeDetail?.account_holder || "");
      setEmergencyContacts(employeeDetail?.emergency_contacts || []);
    }
  }, [open, profile, membership, employeeDetail]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Update profiles
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone })
        .eq("id", memberId);
      if (profErr) throw profErr;

      // 2. Update tenant_memberships
      const { error: memErr } = await supabase
        .from("tenant_memberships")
        .update({ department, job_title: jobTitle, role })
        .eq("tenant_id", tenantId)
        .eq("user_id", memberId);
      if (memErr) throw memErr;

      // 3. Upsert employee_details
      const { error: detErr } = await supabase
        .from("employee_details")
        .upsert({
          user_id: memberId,
          tenant_id: tenantId,
          hire_date: hireDate || null,
          resignation_date: resignationDate || null,
          resident_number: residentNumber || null,
          is_foreigner: isForeigner,
          nationality: nationality || null,
          address: address || null,
          phone_mobile: phoneMobile || null,
          phone_tel: phoneTel || null,
          email: detailEmail || null,
          bank_name: bankName || null,
          account_number: accountNumber || null,
          account_holder: accountHolder || null,
          emergency_contacts: emergencyContacts.filter(c => c.name || c.phone),
        }, { onConflict: "user_id,tenant_id" });
      if (detErr) throw detErr;

      toast.success("직원 정보가 수정되었습니다.");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error("저장 실패: " + (e.message || "알 수 없는 오류"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Delete employee_details, tenant_membership (not the auth user or profile)
      await supabase.from("employee_details").delete().eq("user_id", memberId).eq("tenant_id", tenantId);
      await supabase.from("tenant_memberships").delete().eq("user_id", memberId).eq("tenant_id", tenantId);
      toast.success("직원이 해당 회사에서 삭제되었습니다.");
      onDeleted();
    } catch (e: any) {
      toast.error("삭제 실패: " + (e.message || ""));
    } finally {
      setDeleting(false);
    }
  };

  const addEmergencyContact = () => {
    setEmergencyContacts([...emergencyContacts, { name: "", phone: "", relation: "" }]);
  };

  const updateEmergencyContact = (index: number, field: string, value: string) => {
    const updated = [...emergencyContacts];
    (updated[index] as any)[field] = field === "phone" ? formatPhoneNumber(value) : value;
    setEmergencyContacts(updated);
  };

  const removeEmergencyContact = (index: number) => {
    setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-bold text-muted-foreground uppercase">{label}</Label>
      {children}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-black">직원 정보 수정</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">프로필, 인사정보, 급여 계좌 등 모든 정보를 수정할 수 있습니다.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* 기본 정보 */}
          <div>
            <h3 className="text-xs font-black text-blue-600 uppercase mb-3">기본 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="이름">
                <Input value={fullName} onChange={e => setFullName(e.target.value)} />
              </Field>
              <Field label="이메일">
                <Input value={email} disabled className="bg-muted" />
              </Field>
              <Field label="부서">
                <Input value={department} onChange={e => setDepartment(e.target.value)} />
              </Field>
              <Field label="직급">
                <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
              </Field>
              <Field label="역할">
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company_admin">관리자</SelectItem>
                    <SelectItem value="manager">매니저</SelectItem>
                    <SelectItem value="employee">사원</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="입사일">
                <Input type="date" value={hireDate} onChange={e => setHireDate(e.target.value)} />
              </Field>
              <Field label="퇴사일">
                <Input type="date" value={resignationDate} onChange={e => setResignationDate(e.target.value)} />
              </Field>
            </div>
          </div>

          <Separator />

          {/* 개인 정보 */}
          <div>
            <h3 className="text-xs font-black text-emerald-600 uppercase mb-3">개인 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="주민등록번호">
                <Input value={residentNumber} onChange={e => setResidentNumber(formatResidentNumber(e.target.value))} placeholder="000000-0000000" />
              </Field>
              <Field label="휴대전화">
                <Input value={phoneMobile} onChange={e => setPhoneMobile(formatPhoneNumber(e.target.value))} placeholder="010-0000-0000" />
              </Field>
              <Field label="연락처(유선)">
                <Input value={phoneTel} onChange={e => setPhoneTel(formatPhoneNumber(e.target.value))} placeholder="02-000-0000" />
              </Field>
              <Field label="연락용 이메일">
                <Input value={detailEmail} onChange={e => setDetailEmail(e.target.value)} />
              </Field>
              <div className="col-span-2">
                <Field label="주소">
                  <div className="flex gap-2">
                    <Input value={address} readOnly placeholder="주소 검색을 이용해주세요" className="flex-1" />
                    <Button type="button" variant="outline" size="sm" onClick={() => openDaumPostcode((addr) => setAddress(addr))}>
                      주소 검색
                    </Button>
                  </div>
                </Field>
              </div>
              <Field label="외국인 여부">
                <div className="flex items-center gap-2 pt-1">
                  <Switch checked={isForeigner} onCheckedChange={setIsForeigner} />
                  <span className="text-xs text-muted-foreground">{isForeigner ? "외국인" : "내국인"}</span>
                </div>
              </Field>
              {isForeigner && (
                <Field label="국적">
                  <Input value={nationality} onChange={e => setNationality(e.target.value)} />
                </Field>
              )}
            </div>
          </div>

          <Separator />

          {/* 급여 계좌 */}
          <div>
            <h3 className="text-xs font-black text-orange-600 uppercase mb-3">급여 계좌 정보</h3>
            <div className="grid grid-cols-3 gap-4">
              <Field label="거래 은행">
                <Input value={bankName} onChange={e => setBankName(e.target.value)} />
              </Field>
              <Field label="계좌 번호">
                <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
              </Field>
              <Field label="예금주">
                <Input value={accountHolder} onChange={e => setAccountHolder(e.target.value)} />
              </Field>
            </div>
          </div>

          <Separator />

          {/* 비상 연락처 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black text-rose-600 uppercase">비상 연락처</h3>
              <Button type="button" variant="outline" size="sm" onClick={addEmergencyContact} className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" /> 추가
              </Button>
            </div>
            <div className="space-y-3">
              {emergencyContacts.map((c, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">관계</Label>
                    <Input value={c.relation} onChange={e => updateEmergencyContact(i, "relation", e.target.value)} placeholder="부모 등" className="h-8 text-xs" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">이름</Label>
                    <Input value={c.name} onChange={e => updateEmergencyContact(i, "name", e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">연락처</Label>
                    <Input value={c.phone} onChange={e => updateEmergencyContact(i, "phone", e.target.value)} placeholder="010-0000-0000" className="h-8 text-xs" />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeEmergencyContact(i)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {emergencyContacts.length === 0 && <p className="text-xs text-muted-foreground italic py-2">등록된 비상연락처가 없습니다.</p>}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between gap-2 pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> 직원 삭제
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  {fullName}님의 인사정보 및 멤버십이 이 회사에서 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {deleting ? <Loader2 className="animate-spin w-4 h-4" /> : "삭제 확인"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="animate-spin w-4 h-4" /> : "저장"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
