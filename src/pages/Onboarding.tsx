import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Briefcase, ShieldCheck, Landmark, UploadCloud, Heart, 
  CheckCircle2, Loader2, Sparkles, Smartphone, MapPin, Globe, Mail, Hash, CreditCard,
  FileImage, SmartphoneIcon, UserCheck, Plus, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sendFileToTelegram } from "@/lib/telegramApi";
import { generateOnboardingPdf } from "@/lib/generateOnboardingPdf";

interface DeptOption { id: string; name: string; }
interface JobOption { id: string; name: string; }

const Onboarding = () => {
  const { user, profile, currentTenant, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const idCardRef = useRef<HTMLInputElement>(null);
  const bankbookRef = useRef<HTMLInputElement>(null);

  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [jobTitles, setJobTitles] = useState<JobOption[]>([]);

  const [formData, setFormData] = useState({
    hire_date: "", resignation_date: "", department: "", job_title: "",
    resident_number: "", is_foreigner: "내국인", nationality: "대한민국", address: "",
    phone_mobile: "", phone_tel: "", email: profile?.email || "",
    bank_name: "", account_number: "", account_holder: profile?.full_name || "",
  });

  const [emergencyContacts, setEmergencyContacts] = useState([{ relation: "", name: "", phone: "" }]);
  const [bankType, setBankType] = useState<string>("");
  const [manualBankName, setManualBankName] = useState<string>("");
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [bankbookFile, setBankbookFile] = useState<File | null>(null);

  // 부서 및 직급 동적 로드
  useEffect(() => {
    const fetchOrgData = async () => {
      if (!currentTenant?.tenant_id) return;
      const [deptRes, jobRes] = await Promise.all([
        supabase.from("departments").select("id, name").eq("tenant_id", currentTenant.tenant_id).eq("is_active", true).order("sort_order"),
        supabase.from("job_titles").select("id, name").eq("tenant_id", currentTenant.tenant_id).eq("is_active", true).order("level"),
      ]);
      if (deptRes.data) setDepartments(deptRes.data);
      if (jobRes.data) {
        setJobTitles(jobRes.data);
        if (jobRes.data.length > 0 && !formData.job_title) {
          setFormData(prev => ({ ...prev, job_title: jobRes.data[0].name }));
        }
      }
    };
    fetchOrgData();
  }, [currentTenant?.tenant_id]);

  const addContact = () => setEmergencyContacts([...emergencyContacts, { relation: "", name: "", phone: "" }]);
  const removeContact = (index: number) => {
    if (emergencyContacts.length > 1) setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));
  };
  const updateContact = (index: number, field: string, value: string) => {
    const newContacts = [...emergencyContacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setEmergencyContacts(newContacts);
  };

  // 파일을 Supabase Storage에 업로드
  const uploadToStorage = async (file: File, subfolder: string): Promise<string | null> => {
    if (!user || !currentTenant) return null;
    try {
      const ext = file.name.split(".").pop() || "file";
      const filePath = `${currentTenant.tenant_id}/onboarding/${user.id}/${subfolder}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("artist-assets")
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: signedData, error: signedError } = await supabase.storage
        .from("artist-assets")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year for onboarding docs
      if (signedError) throw signedError;
      return signedData.signedUrl;
    } catch (err) {
      console.error(`Storage upload failed (${subfolder}):`, err);
      return null;
    }
  };

  // --- 저장 및 업로드 핵심 로직 ---
  const handleSave = async () => {
    if (!formData.hire_date || !formData.department || !formData.resident_number || !formData.address || !formData.account_number) {
      toast.error("필수 항목(*)을 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const tenantId = currentTenant?.tenant_id;
      if (!tenantId || !user) throw new Error("회사 정보를 찾을 수 없습니다.");

      const finalBankName = bankType === "manual" ? manualBankName : bankType;

      // 1. 파일 업로드 (Supabase Storage - 항상 동작)
      let idCardUrl: string | null = null;
      let bankbookUrl: string | null = null;

      if (idCardFile) {
        idCardUrl = await uploadToStorage(idCardFile, "id-card");
        if (!idCardUrl) toast.warning("신분증 파일 저장에 실패했습니다.");
      }

      if (bankbookFile) {
        bankbookUrl = await uploadToStorage(bankbookFile, "bankbook");
        if (!bankbookUrl) toast.warning("통장사본 파일 저장에 실패했습니다.");
      }

      // 2. 텔레그램 봇으로 파일 백업 (설정된 경우에만, 실패해도 진행)
      if (idCardFile) {
        sendFileToTelegram(tenantId, idCardFile, `🪪 신분증 - ${profile?.full_name || user.email}`).catch(() => {});
      }
      if (bankbookFile) {
        sendFileToTelegram(tenantId, bankbookFile, `🏦 통장사본 - ${profile?.full_name || user.email}`).catch(() => {});
      }

      // 3. employee_details에 모든 개인정보 저장 (upsert)
      const { error: detailError } = await supabase
        .from("employee_details")
        .upsert({
          user_id: user.id,
          tenant_id: tenantId,
          hire_date: formData.hire_date || null,
          resignation_date: formData.resignation_date || null,
          resident_number: formData.resident_number,
          is_foreigner: formData.is_foreigner,
          nationality: formData.nationality,
          address: formData.address,
          phone_mobile: formData.phone_mobile,
          phone_tel: formData.phone_tel,
          email: formData.email,
          bank_name: finalBankName,
          account_number: formData.account_number,
          account_holder: formData.account_holder,
          emergency_contacts: emergencyContacts.filter(c => c.name || c.phone),
          id_card_url: idCardUrl,
          bankbook_url: bankbookUrl,
        }, { onConflict: "user_id,tenant_id" });

      if (detailError) {
        console.error("employee_details save error:", detailError);
        throw detailError;
      }

      // 4. tenant_memberships 업데이트 (부서, 직급) - SECURITY DEFINER 함수 사용
      const { error: memberError } = await supabase.rpc("complete_onboarding", {
        _tenant_id: tenantId,
        _department: formData.department,
        _job_title: formData.job_title,
      });

      if (memberError) throw memberError;

      // 5. profiles에 전화번호 업데이트
      if (formData.phone_mobile) {
        await supabase.from("profiles").update({ phone: formData.phone_mobile }).eq("id", user.id);
      }

      // 6. PDF 생성 후 텔레그램으로 전송
      try {
        const pdfFile = await generateOnboardingPdf({
          fullName: profile?.full_name || user.email || "",
          email: formData.email,
          tenantName: currentTenant?.tenant?.name || "",
          hire_date: formData.hire_date,
          resignation_date: formData.resignation_date,
          department: formData.department,
          job_title: formData.job_title,
          resident_number: formData.resident_number,
          is_foreigner: formData.is_foreigner,
          nationality: formData.nationality,
          address: formData.address,
          phone_mobile: formData.phone_mobile,
          phone_tel: formData.phone_tel,
          bank_name: finalBankName,
          account_number: formData.account_number,
          account_holder: formData.account_holder,
          emergency_contacts: emergencyContacts.filter(c => c.name || c.phone),
        });
        sendFileToTelegram(
          tenantId,
          pdfFile,
          `📋 인사정보 등록서 - ${profile?.full_name || user.email}\n🏢 ${currentTenant?.tenant?.name}\n📅 ${new Date().toISOString().split("T")[0]}`
        ).catch(() => {});
      } catch (pdfErr) {
        console.error("PDF generation error:", pdfErr);
      }

      toast.success("인사 정보 및 증빙 서류 등록이 완료되었습니다!");
      
      // 대시보드로 이동 (전체 페이지 리로드로 auth 상태 갱신)
      setTimeout(() => {
        window.location.replace("/dashboard");
      }, 800);

    } catch (error: any) {
      console.error("Onboarding Error:", error);
      toast.error("정보 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans antialiased text-slate-900">
      <div className="w-full max-w-4xl bg-white rounded-[1.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col h-[90vh]">
        
        {/* 헤더 섹션 */}
        <div className="p-7 bg-[#0F172A] text-white shrink-0 relative">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-400 font-bold text-[11px] tracking-widest uppercase mb-1">
                <Sparkles className="w-3 h-3" /> Step 1. Onboarding
              </div>
              <h1 className="text-2xl font-black tracking-tight">
                정보 등록 <span className="text-blue-400">시작하기</span>
              </h1>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 px-8 py-6 text-slate-800">
          <div className="max-w-3xl mx-auto space-y-10">
            
            {/* 01. 인사 정보 */}
            <section className="space-y-4">
              <div className="space-y-0.5 border-l-4 border-blue-600 pl-3">
                <h4 className="text-lg font-bold">소속 및 직무</h4>
                <p className="text-[13px] text-slate-500 font-medium">회사 내에서의 역할과 입사일을 지정합니다.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                <div className="space-y-1">
                  <Label className="text-[12px] font-bold text-slate-600">입사일자 *</Label>
                  <Input type="date" className="h-10 rounded-lg" value={formData.hire_date} onChange={e => setFormData({...formData, hire_date: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[12px] font-bold text-slate-600">퇴사일자</Label>
                  <Input type="date" className="h-10 rounded-lg" value={formData.resignation_date} onChange={e => setFormData({...formData, resignation_date: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[12px] font-bold text-slate-600">부서 *</Label>
                  <Select value={formData.department} onValueChange={val => setFormData({...formData, department: val})}>
                    <SelectTrigger className="h-10 rounded-lg"><SelectValue placeholder="부서 선택" /></SelectTrigger>
                    <SelectContent>
                      {departments.length > 0 ? (
                        departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)
                      ) : (
                        <SelectItem value="__none" disabled>등록된 부서가 없습니다</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[12px] font-bold text-slate-600">직급 *</Label>
                  <Select value={formData.job_title} onValueChange={val => setFormData({...formData, job_title: val})}>
                    <SelectTrigger className="h-10 rounded-lg"><SelectValue placeholder="직급 선택" /></SelectTrigger>
                    <SelectContent>
                      {jobTitles.length > 0 ? (
                        jobTitles.map(j => <SelectItem key={j.id} value={j.name}>{j.name}</SelectItem>)
                      ) : (
                        <SelectItem value="__none" disabled>등록된 직급이 없습니다</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <Separator className="bg-slate-100" />

            {/* 02. 개인 정보 */}
            <section className="space-y-5">
              <div className="space-y-0.5 border-l-4 border-blue-600 pl-3">
                <h4 className="text-lg font-bold">인적 사항</h4>
                <p className="text-[13px] text-slate-500 font-medium">급여 신고 및 본인 확인을 위한 정보입니다.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                <div className="space-y-1">
                  <Label className="text-[12px] font-bold text-slate-600">주민등록번호 *</Label>
                  <Input type="password" placeholder="000000-0000000" className="h-10 rounded-lg" value={formData.resident_number} onChange={e => setFormData({...formData, resident_number: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[12px] font-bold text-slate-600">구분 *</Label>
                    <Select value={formData.is_foreigner} onValueChange={val => setFormData({...formData, is_foreigner: val})}>
                      <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="내국인">내국인</SelectItem><SelectItem value="외국인">외국인</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[12px] font-bold text-slate-600">국적 *</Label>
                    <Input className="h-10 rounded-lg" value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[12px] font-bold text-slate-600">휴대폰번호 *</Label>
                  <Input placeholder="010-0000-0000" className="h-10 rounded-lg" value={formData.phone_mobile} onChange={e => setFormData({...formData, phone_mobile: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[12px] font-bold text-slate-600">이메일 *</Label>
                  <Input className="h-10 rounded-lg" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-[12px] font-bold text-slate-600">현재 거주지 주소 *</Label>
                  <Input placeholder="상세 주소를 정확히 입력하세요" className="h-10 rounded-lg" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
              </div>

              {/* 비상연락처 리스트 */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[13px] font-extrabold flex items-center gap-2 text-rose-600">
                    <Heart className="w-3.5 h-3.5 fill-rose-600" /> 비상 연락처 (가족)
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={addContact} className="h-7 text-[11px] px-2 rounded-md border-blue-200 text-blue-600">
                    + 추가하기
                  </Button>
                </div>
                <div className="space-y-2">
                  {emergencyContacts.map((contact, index) => (
                    <div key={index} className="flex gap-2 animate-in fade-in slide-in-from-top-1">
                      <Input placeholder="관계" className="h-9 rounded-lg bg-white w-20 text-sm" value={contact.relation} onChange={(e) => updateContact(index, "relation", e.target.value)} />
                      <Input placeholder="성함" className="h-9 rounded-lg bg-white w-24 text-sm" value={contact.name} onChange={(e) => updateContact(index, "name", e.target.value)} />
                      <Input placeholder="연락처" className="h-9 rounded-lg bg-white flex-1 text-sm" value={contact.phone} onChange={(e) => updateContact(index, "phone", e.target.value)} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeContact(index)} className="h-9 w-9 text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <Separator className="bg-slate-100" />

            {/* 03. 계좌 정보 */}
            <section className="space-y-4">
              <div className="space-y-0.5 border-l-4 border-blue-600 pl-3">
                <h4 className="text-lg font-bold">급여 계좌</h4>
                <p className="text-[13px] text-slate-500 font-medium">급여가 정산될 본인 명의의 계좌입니다.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                <div className="space-y-1">
                  <Label className="text-[12px] font-bold text-slate-600">입금 은행 *</Label>
                  <Select value={bankType} onValueChange={setBankType}>
                    <SelectTrigger className="h-10 rounded-lg text-sm"><SelectValue placeholder="은행 선택" /></SelectTrigger>
                    <SelectContent>
                      {["국민은행", "신한은행", "우리은행", "하나은행", "manual"].map(b => (
                        <SelectItem key={b} value={b}>{b === "manual" ? "직접 입력" : b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {bankType === "manual" && <Input placeholder="은행명 입력" className="h-9 rounded-lg mt-1 text-sm" value={manualBankName} onChange={e => setManualBankName(e.target.value)} />}
                </div>
                <div className="space-y-1">
                  <Label className="text-[12px] font-bold text-slate-600">예금주 *</Label>
                  <Input className="h-10 rounded-lg bg-slate-50 font-bold" value={formData.account_holder} readOnly />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-[12px] font-bold text-slate-600">계좌번호 *</Label>
                  <Input placeholder="숫자만 입력" className="h-10 rounded-lg tabular-nums" value={formData.account_number} onChange={e => setFormData({...formData, account_number: e.target.value})} />
                </div>
              </div>
            </section>

            <Separator className="bg-slate-100" />

            {/* 04. 서류 업로드 */}
            <section className="space-y-4 pb-6">
              <div className="space-y-0.5 border-l-4 border-blue-600 pl-3">
                <h4 className="text-lg font-bold">증빙 서류</h4>
                <p className="text-[13px] text-slate-500 font-medium">보안 폴더에 안전하게 보관됩니다.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[ { label: "신분증 사본", ref: idCardRef, file: idCardFile, set: setIdCardFile, Icon: SmartphoneIcon },
                   { label: "통장 사본", ref: bankbookRef, file: bankbookFile, set: setBankbookFile, Icon: FileImage }
                ].map((item, idx) => (
                  <div key={idx} onClick={() => item.ref.current?.click()} className={`p-6 border-2 border-dashed rounded-2xl text-center hover:bg-blue-50/50 transition-all cursor-pointer ${item.file ? 'border-green-500 bg-green-50/30' : 'border-slate-200'}`}>
                    <input type="file" ref={item.ref} className="hidden" onChange={e => item.set(e.target.files?.[0] || null)} />
                    {item.file ? (
                      <div className="text-green-600 font-bold animate-in zoom-in-95">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-1" />
                        <p className="text-[11px] truncate">{item.file.name}</p>
                      </div>
                    ) : (
                      <div className="text-slate-400 group-hover:text-blue-500 transition-colors">
                        <item.Icon className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-700">{item.label}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </ScrollArea>

        {/* 하단 바 */}
        <div className="px-8 py-5 border-t bg-white flex items-center justify-between shrink-0">
          <Button variant="ghost" className="text-slate-400 text-sm font-bold" onClick={signOut}>나중에 등록</Button>
          <Button variant="hero" size="lg" className="px-12 text-md font-black rounded-xl shadow-lg min-w-[160px]" onClick={handleSave} disabled={loading}>
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>처리 중...</span>
              </div>
            ) : "정보 등록 완료"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
