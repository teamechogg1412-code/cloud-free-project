import { useState, useEffect, useRef } from "react";
import { 
  Building, Save, Globe, MessageSquare, ShieldCheck, Loader2, ArrowLeft, 
  CreditCard, Landmark, FileText, Image as ImageIcon, 
  User, UploadCloud, Edit2, FileCheck, FileDown, ExternalLink
} from "lucide-react";
import { Header } from "@/components/landing/Header";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const CompanyManagement = () => {
  const { currentTenant } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 파일 업로드 참조용 Ref
  const logoRef = useRef<HTMLInputElement>(null);
  const sealRef = useRef<HTMLInputElement>(null);
  const signatureRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "", rep_name: "", biz_number: "", corp_number: "", address: "", zip_code: "",
    biz_type: "", biz_item: "", pr_intro: "", naver_id: "", daum_id: "", contact_email: "",
    bank_name_kr: "", account_number_kr: "", account_holder_kr: "",
    bank_name_en: "", account_number_en: "", account_name_en: "", swift_code: "",
    branch_name_en: "", bank_address_en: "", rep_home_address: "", rep_resident_number: "",
    // 이미지용 URL (직접 업로드 후 생성됨)
    logo_url: "", seal_url: "", signature_url: "",
    // 서류용 URL (구글 드라이브 링크 입력)
    biz_reg_doc_url: "", bank_copy_kr_url: "", bank_copy_en_url: ""
  });

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!currentTenant) return;
      setLoading(true);
      const { data, error } = await supabase.from("tenants").select("*").eq("id", currentTenant.tenant_id).single();
      if (data) {
        const sanitizedData = Object.keys(data).reduce((acc: any, key) => {
          acc[key] = data[key] === null ? "" : data[key];
          return acc;
        }, {});
        setFormData(prev => ({ ...prev, ...sanitizedData, contact_email: data.tax_email || "" }));
      }
      setLoading(false);
    };
    fetchCompanyData();
  }, [currentTenant]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // --- [핵심] 이미지 직접 업로드 핸들러 ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file || !currentTenant) return;

    setSaving(true);
    try {
      const fileExt = file.name.split('.').pop();
      // 경로를 [테넌트ID/파일명] 구조로 단순화하여 생성
      const filePath = `${currentTenant.tenant_id}/${fieldName}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('tenant-assets') // 버킷 이름 확인
        .upload(filePath, file, {
          upsert: true // 동일 파일이 있어도 덮어쓰기 허용
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tenant-assets')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, [fieldName]: publicUrl }));
      toast.success("파일이 성공적으로 업로드되었습니다.");
    } catch (error: any) {
      console.error("Storage Error:", error);
      toast.error(`업로드 실패: ${error.message}. 버킷이 존재하고 Public으로 설정되어 있는지 확인하세요.`);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!currentTenant) return;
    setSaving(true);
    try {
      // DB 컬럼명과 정확히 일치하는 데이터만 추출하여 전송
      const { error } = await supabase
        .from("tenants")
        .update({
          name: formData.name,
          rep_name: formData.rep_name,
          biz_number: formData.biz_number,
          corp_number: formData.corp_number,
          address: formData.address,
          zip_code: formData.zip_code,
          biz_type: formData.biz_type,
          biz_item: formData.biz_item,
          tax_email: formData.contact_email, // 매핑 주의
          pr_intro: formData.pr_intro,
          naver_id: formData.naver_id,
          daum_id: formData.daum_id,
          bank_name_kr: formData.bank_name_kr,
          account_number_kr: formData.account_number_kr,
          account_holder_kr: formData.account_holder_kr,
          bank_name_en: formData.bank_name_en,
          account_number_en: formData.account_number_en,
          account_name_en: formData.account_name_en,
          swift_code: formData.swift_code,
          branch_name_en: formData.branch_name_en,
          bank_address_en: formData.bank_address_en,
          rep_home_address: formData.rep_home_address,
          rep_resident_number: formData.rep_resident_number,
          logo_url: formData.logo_url,
          seal_url: formData.seal_url,
          signature_url: formData.signature_url,
          biz_reg_doc_url: formData.biz_reg_doc_url,
          bank_copy_kr_url: formData.bank_copy_kr_url,
          bank_copy_en_url: formData.bank_copy_en_url,
          updated_at: new Date().toISOString()
        })
        .eq("id", currentTenant.tenant_id);

      if (error) throw error;
      toast.success("회사 정보가 성공적으로 업데이트되었습니다.");
    } catch (error: any) {
      console.error("Save Error:", error);
      toast.error(`저장 실패: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header />
      <main className="pt-28 pb-16 px-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}><ArrowLeft className="w-5 h-5" /></Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">회사 정보 및 자산 관리</h1>
              <p className="text-slate-500 font-medium">사업자 정보 및 금융/인감 데이터를 통합 관리합니다.</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2 px-10 h-12 text-md font-bold shadow-lg">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            설정 저장하기
          </Button>
        </div>

        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="bg-white border p-1 h-12 shadow-sm inline-flex w-full md:w-auto">
            <TabsTrigger value="basic" className="px-6">사업자 기본정보</TabsTrigger>
            <TabsTrigger value="finance" className="px-6">금융 및 인보이스</TabsTrigger>
            <TabsTrigger value="assets" className="px-6 font-bold text-blue-600">인감 및 증빙서류</TabsTrigger>
            <TabsTrigger value="pr" className="px-6">대외 홍보 설정</TabsTrigger>
          </TabsList>

          {/* 1. 기본 정보 탭 (기존과 동일) */}
          <TabsContent value="basic" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-blue-500" /> 공식 사업자 등록 정보</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2"><Label>법인/상호명</Label><Input id="name" value={formData.name} onChange={handleChange} /></div>
                <div className="space-y-2"><Label>사업자 등록번호</Label><Input id="biz_number" value={formData.biz_number} onChange={handleChange} /></div>
                <div className="space-y-2"><Label>법인 등록번호</Label><Input id="corp_number" value={formData.corp_number} onChange={handleChange} /></div>
                <div className="space-y-2"><Label>업태</Label><Input id="biz_type" value={formData.biz_type} onChange={handleChange} /></div>
                <div className="space-y-2"><Label>종목</Label><Input id="biz_item" value={formData.biz_item} onChange={handleChange} /></div>
                <div className="space-y-2"><Label>우편번호</Label><Input id="zip_code" value={formData.zip_code} onChange={handleChange} /></div>
                <div className="md:col-span-3 space-y-2"><Label>사업장 소재지 (도로명)</Label><Input id="address" value={formData.address} onChange={handleChange} /></div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-blue-50/30">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User className="w-5 h-5 text-blue-600" /> 대표이사 상세 보안 정보</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><Label>대표이사 성명</Label><Input id="rep_name" value={formData.rep_name} onChange={handleChange} /></div>
                <div className="space-y-2"><Label>주민/외국인 등록번호</Label><Input id="rep_resident_number" type="password" value={formData.rep_resident_number} onChange={handleChange} /></div>
                <div className="md:col-span-2 space-y-2"><Label>대표이사 거주지 주소</Label><Input id="rep_home_address" value={formData.rep_home_address} onChange={handleChange} /></div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. 금융 정보 탭 (기존과 동일) */}
          <TabsContent value="finance" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="w-5 h-5 text-green-600" /> 결제 및 인보이스 정보</CardTitle></CardHeader>
              <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2"><Label>거래은행 (국문)</Label><Input id="bank_name_kr" value={formData.bank_name_kr} onChange={handleChange} /></div>
                  <div className="space-y-2"><Label>계좌번호 (국문)</Label><Input id="account_number_kr" value={formData.account_number_kr} onChange={handleChange} /></div>
                  <div className="space-y-2"><Label>예금주 (국문)</Label><Input id="account_holder_kr" value={formData.account_holder_kr} onChange={handleChange} /></div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2"><Label className="text-slate-500 font-bold">BANK NAME (ENG)</Label><Input id="bank_name_en" value={formData.bank_name_en} onChange={handleChange} /></div>
                  <div className="space-y-2"><Label className="text-slate-500 font-bold">ACCOUNT NAME (ENG)</Label><Input id="account_name_en" value={formData.account_name_en} onChange={handleChange} /></div>
                  <div className="space-y-2"><Label className="text-slate-500 font-bold">ACCOUNT NUMBER</Label><Input id="account_number_en" value={formData.account_number_en} onChange={handleChange} /></div>
                  <div className="space-y-2"><Label className="text-slate-500 font-bold">SWIFT CODE</Label><Input id="swift_code" value={formData.swift_code} onChange={handleChange} /></div>
                  <div className="space-y-2"><Label className="text-slate-500 font-bold">BRANCH NAME</Label><Input id="branch_name_en" value={formData.branch_name_en} onChange={handleChange} /></div>
                  <div className="space-y-2"><Label className="text-slate-500 font-bold">BANK ADDRESS</Label><Input id="bank_address_en" value={formData.bank_address_en} onChange={handleChange} /></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. [핵심] 하이브리드 자산 탭 (업로드 + 링크) */}
          <TabsContent value="assets" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 이미지 업로드 영역 (서버 저장) */}
              <ImageAssetCard title="회사 CI / 로고" url={formData.logo_url} inputRef={logoRef} onUpload={(e) => handleImageUpload(e, 'logo_url')} />
              <ImageAssetCard title="법인 인감 (도장)" url={formData.seal_url} inputRef={sealRef} onUpload={(e) => handleImageUpload(e, 'seal_url')} isSquare />
              <ImageAssetCard title="대표자 서명" url={formData.signature_url} inputRef={signatureRef} onUpload={(e) => handleImageUpload(e, 'signature_url')} />

              {/* 문서 링크 영역 (드라이브 저장) */}
              <Card className="md:col-span-3 border-none shadow-sm bg-slate-900 text-white">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-400" /> 외부 서류 보관함 (Google Drive Link)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <Label className="text-slate-400">사업자등록증 사본 (링크)</Label>
                    <div className="flex gap-2"><Input id="biz_reg_doc_url" value={formData.biz_reg_doc_url} onChange={handleChange} className="bg-slate-800 border-slate-700 text-blue-300" />{formData.biz_reg_doc_url && <Button variant="secondary" size="icon" onClick={() => window.open(formData.biz_reg_doc_url)}><ExternalLink className="w-4 h-4" /></Button>}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-400">통장사본 국문 (링크)</Label>
                    <div className="flex gap-2"><Input id="bank_copy_kr_url" value={formData.bank_copy_kr_url} onChange={handleChange} className="bg-slate-800 border-slate-700 text-blue-300" />{formData.bank_copy_kr_url && <Button variant="secondary" size="icon" onClick={() => window.open(formData.bank_copy_kr_url)}><ExternalLink className="w-4 h-4" /></Button>}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-400">통장사본 영문 (링크)</Label>
                    <div className="flex gap-2"><Input id="bank_copy_en_url" value={formData.bank_copy_en_url} onChange={handleChange} className="bg-slate-800 border-slate-700 text-blue-300" />{formData.bank_copy_en_url && <Button variant="secondary" size="icon" onClick={() => window.open(formData.bank_copy_en_url)}><ExternalLink className="w-4 h-4" /></Button>}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="pr" className="space-y-6">
             <Card className="border-none shadow-sm"><CardHeader><CardTitle className="text-lg">보도자료 공식 소개문</CardTitle></CardHeader><CardContent><Textarea id="pr_intro" value={formData.pr_intro} onChange={handleChange} className="min-h-[200px]" placeholder="배포용 회사 소개문을 작성하십시오." /></CardContent></Card>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold">네이버 인물정보 관리자 ID</CardTitle></CardHeader><CardContent><Input id="naver_id" value={formData.naver_id} onChange={handleChange} /></CardContent></Card>
                <Card className="border-none shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold">다음 인물정보 관리자 ID</CardTitle></CardHeader><CardContent><Input id="daum_id" value={formData.daum_id} onChange={handleChange} /></CardContent></Card>
             </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// --- 서브 컴포넌트: 이미지 자산 카드 ---
const ImageAssetCard = ({ title, url, inputRef, onUpload, isSquare = false }: any) => (
  <Card className="border-none shadow-sm text-center bg-white">
    <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-slate-500 uppercase">{title}</CardTitle></CardHeader>
    <CardContent className="flex flex-col items-center gap-4">
      <div className="h-32 w-full border-2 border-dashed rounded-xl bg-slate-50 flex items-center justify-center relative overflow-hidden group hover:border-blue-400 transition-colors">
        {url ? (
          <img src={url} className={`h-full w-full object-contain p-2 ${isSquare ? 'max-w-[100px]' : ''}`} alt={title} />
        ) : (
          <UploadCloud className="text-slate-300 w-10 h-10" />
        )}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => inputRef.current?.click()}>
          <Edit2 className="text-white w-6 h-6" />
        </div>
        <input type="file" ref={inputRef} className="hidden" accept="image/*" onChange={onUpload} />
      </div>
    </CardContent>
  </Card>
);

export default CompanyManagement;