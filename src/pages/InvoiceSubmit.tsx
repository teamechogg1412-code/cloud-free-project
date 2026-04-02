import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Upload, FileText, CheckCircle2, Loader2, Building2, User, Phone, Mail, X, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface LinkInfo {
  token: string;
  tenant_id: string;
  user_id: string;
  label: string | null;
}

const InvoiceSubmit = () => {
  const { token } = useParams<{ token: string }>();
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [vendorName, setVendorName] = useState("");
  const [vendorCompany, setVendorCompany] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const verify = async () => {
      if (!token) { setInvalid(true); setLoading(false); return; }
      const { data, error } = await supabase
        .from("invoice_links")
        .select("token, tenant_id, user_id, label")
        .eq("token", token)
        .eq("is_active", true)
        .maybeSingle();
      if (error || !data) { setInvalid(true); } else { setLinkInfo(data as LinkInfo); }
      setLoading(false);
    };
    verify();
  }, [token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkInfo) return;
    if (!vendorName.trim()) { toast.error("담당자명을 입력해주세요."); return; }
    if (files.length === 0) { toast.error("청구서 파일을 첨부해주세요."); return; }

    setSubmitting(true);
    try {
      // Upload files
      setUploading(true);
      const fileUrls: string[] = [];
      for (const file of files) {
        const path = `${linkInfo.tenant_id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("invoice-attachments")
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("invoice-attachments").getPublicUrl(path);
        fileUrls.push(urlData.publicUrl);
      }
      setUploading(false);

      // Insert invoice record
      const { error: insertError } = await supabase.from("external_invoices").insert({
        link_token: linkInfo.token,
        tenant_id: linkInfo.tenant_id,
        assigned_to: linkInfo.user_id,
        vendor_name: vendorName.trim(),
        vendor_company: vendorCompany.trim() || null,
        vendor_email: vendorEmail.trim() || null,
        vendor_phone: vendorPhone.trim() || null,
        description: description.trim() || null,
        total_amount: totalAmount ? parseFloat(totalAmount) : 0,
        file_urls: fileUrls,
        status: "pending",
      });
      if (insertError) throw insertError;

      setSubmitted(true);
      toast.success("청구서가 성공적으로 제출되었습니다.");
    } catch (err: any) {
      console.error(err);
      toast.error("제출 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">유효하지 않은 링크</h2>
            <p className="text-muted-foreground">이 청구서 제출 링크는 만료되었거나 존재하지 않습니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">제출 완료</h2>
            <p className="text-muted-foreground">
              청구서가 성공적으로 전달되었습니다.<br />
              담당자가 확인 후 연락드릴 예정입니다.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <FileText className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">청구서 제출</h1>
          <p className="text-muted-foreground mt-1">
            견적서 또는 인보이스를 제출해주세요
          </p>
          {linkInfo?.label && (
            <p className="text-sm text-muted-foreground mt-1">수신: {linkInfo.label}</p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">거래처 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1.5 mb-1.5">
                    <User className="w-3.5 h-3.5" /> 담당자명 <span className="text-destructive">*</span>
                  </Label>
                  <Input value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder="홍길동" maxLength={100} required />
                </div>
                <div>
                  <Label className="flex items-center gap-1.5 mb-1.5">
                    <Building2 className="w-3.5 h-3.5" /> 업체명
                  </Label>
                  <Input value={vendorCompany} onChange={e => setVendorCompany(e.target.value)} placeholder="(주)아무개" maxLength={100} />
                </div>
                <div>
                  <Label className="flex items-center gap-1.5 mb-1.5">
                    <Mail className="w-3.5 h-3.5" /> 이메일
                  </Label>
                  <Input type="email" value={vendorEmail} onChange={e => setVendorEmail(e.target.value)} placeholder="email@company.com" maxLength={255} />
                </div>
                <div>
                  <Label className="flex items-center gap-1.5 mb-1.5">
                    <Phone className="w-3.5 h-3.5" /> 연락처
                  </Label>
                  <Input value={vendorPhone} onChange={e => setVendorPhone(e.target.value)} placeholder="010-0000-0000" maxLength={20} />
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block">청구 금액</Label>
                <Input
                  type="number"
                  value={totalAmount}
                  onChange={e => setTotalAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <Label className="mb-1.5 block">비고 / 메모</Label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="청구 관련 참고사항을 입력해주세요"
                  rows={3}
                  maxLength={1000}
                />
              </div>

              <div>
                <Label className="mb-1.5 block">
                  파일 첨부 <span className="text-destructive">*</span>
                  <span className="text-xs text-muted-foreground ml-2">(최대 5개)</span>
                </Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">견적서, 인보이스, 세금계산서 등</p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span>파일 선택</span>
                    </Button>
                  </label>
                </div>
                {files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 rounded-md px-3 py-2">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate flex-1">{f.name}</span>
                        <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)}KB</span>
                        <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {uploading ? "파일 업로드 중..." : "제출 중..."}
                  </>
                ) : (
                  "청구서 제출"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by BEHIND LAB
        </p>
      </div>
    </div>
  );
};

export default InvoiceSubmit;
