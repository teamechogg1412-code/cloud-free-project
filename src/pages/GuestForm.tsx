import { useState } from "react";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  Sparkles,
  Building2,
  CreditCard,
  User,
  Phone,
  Mail
} from "lucide-react";
import { toast } from "sonner";

// Mock data for demonstration
const mockEmployees = [
  { id: "1", name: "김수연", department: "재무팀", phone: "010-1234-5678", email: "sooyeon@company.com" },
  { id: "2", name: "이준혁", department: "영업팀", phone: "010-2345-6789", email: "junhyuk@company.com" },
  { id: "3", name: "박민서", department: "마케팅팀", phone: "010-3456-7890", email: "minseo@company.com" },
];

const GuestForm = () => {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [extractedData, setExtractedData] = useState({
    amount: "",
    businessNumber: "",
    accountNumber: "",
  });
  const [formData, setFormData] = useState({
    companyName: "",
    description: "",
    amount: "",
    bankName: "",
    accountNumber: "",
    accountHolder: "",
    assignedEmployee: "",
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploadedFiles(Array.from(files));
    setIsProcessing(true);

    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock extracted data
    setExtractedData({
      amount: "3,500,000",
      businessNumber: "123-45-67890",
      accountNumber: "110-123-456789",
    });

    setFormData(prev => ({
      ...prev,
      amount: "3,500,000",
      accountNumber: "110-123-456789",
    }));

    setIsProcessing(false);
    toast.success("AI가 문서에서 정보를 추출했습니다!", {
      description: "금액, 계좌번호가 자동으로 입력되었습니다.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsProcessing(false);
    setStep(3);
    toast.success("청구서가 성공적으로 제출되었습니다!", {
      description: "담당자에게 알림이 발송됩니다.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">외부 거래처 청구 폼</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              청구서 <span className="gradient-text">간편 제출</span>
            </h1>
            <p className="text-muted-foreground">
              견적서, 통장사본을 업로드하면 AI가 자동으로 정보를 추출합니다.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-10">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  s < step ? 'bg-success text-success-foreground' :
                  s === step ? 'bg-primary text-primary-foreground' :
                  'bg-secondary text-muted-foreground'
                }`}>
                  {s < step ? <CheckCircle2 className="w-5 h-5" /> : s}
                </div>
                <span className={`text-sm hidden sm:inline ${s === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {s === 1 ? '파일 업로드' : s === 2 ? '정보 입력' : '완료'}
                </span>
                {s < 3 && <div className={`w-8 h-0.5 ${s < step ? 'bg-success' : 'bg-border'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: File Upload */}
          {step === 1 && (
            <div className="glass-card p-8">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold mb-2">증빙 서류 업로드</h2>
                <p className="text-sm text-muted-foreground">
                  견적서, 통장사본, 사업자등록증 등을 업로드해주세요
                </p>
              </div>

              {/* Upload Area */}
              <label className="block cursor-pointer">
                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  isProcessing 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50 hover:bg-secondary/30'
                }`}>
                  {isProcessing ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      </div>
                      <div>
                        <p className="font-medium mb-1">AI가 문서를 분석하고 있습니다...</p>
                        <p className="text-sm text-muted-foreground">금액, 계좌정보 등을 자동 추출합니다</p>
                      </div>
                    </div>
                  ) : uploadedFiles.length > 0 ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-success" />
                      </div>
                      <div>
                        <p className="font-medium mb-2">{uploadedFiles.length}개 파일 업로드됨</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {uploadedFiles.map((file, i) => (
                            <span key={i} className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                              {file.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium mb-1">클릭하여 파일 선택</p>
                        <p className="text-sm text-muted-foreground">PDF, Word, 한글, 이미지 (JPG, PNG)</p>
                      </div>
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  multiple 
                  accept=".pdf,.doc,.docx,.hwp,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                />
              </label>

              {/* AI Extract Info */}
              {extractedData.amount && (
                <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">AI 추출 정보</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">금액:</span>
                      <span className="ml-2 font-medium">₩{extractedData.amount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">계좌번호:</span>
                      <span className="ml-2 font-medium">{extractedData.accountNumber}</span>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                className="w-full mt-6" 
                size="lg"
                disabled={uploadedFiles.length === 0 || isProcessing}
                onClick={() => setStep(2)}
              >
                다음 단계로
              </Button>
            </div>
          )}

          {/* Step 2: Form Input */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">
              {/* Company Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  거래처 정보
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">회사명</Label>
                    <Input 
                      id="companyName" 
                      placeholder="(주)거래처회사" 
                      value={formData.companyName}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">청구 금액</Label>
                    <Input 
                      id="amount" 
                      placeholder="₩ 0" 
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">청구 내용</Label>
                  <Textarea 
                    id="description" 
                    placeholder="청구 내용을 상세히 입력해주세요"
                    className="min-h-[100px]"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Bank Info */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CreditCard className="w-4 h-4" />
                  지급 계좌 정보
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">은행명</Label>
                    <Select 
                      value={formData.bankName}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, bankName: value }))}
                    >
                      <SelectTrigger id="bankName" className="bg-background">
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kb">국민은행</SelectItem>
                        <SelectItem value="shinhan">신한은행</SelectItem>
                        <SelectItem value="woori">우리은행</SelectItem>
                        <SelectItem value="hana">하나은행</SelectItem>
                        <SelectItem value="nh">농협은행</SelectItem>
                        <SelectItem value="ibk">기업은행</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">계좌번호</Label>
                    <Input 
                      id="accountNumber" 
                      placeholder="계좌번호"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountHolder">예금주</Label>
                    <Input 
                      id="accountHolder" 
                      placeholder="예금주명"
                      value={formData.accountHolder}
                      onChange={(e) => setFormData(prev => ({ ...prev, accountHolder: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Assign Employee */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="w-4 h-4" />
                  내부 담당자 지정
                </div>
                <Select 
                  value={formData.assignedEmployee}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, assignedEmployee: value }))}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="담당자를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-medium">
                            {emp.name.charAt(0)}
                          </div>
                          <div className="text-left">
                            <div className="font-medium">{emp.name}</div>
                            <div className="text-xs text-muted-foreground">{emp.department}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {formData.assignedEmployee && (
                  <div className="p-3 rounded-lg bg-secondary/50 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">
                        {mockEmployees.find(e => e.id === formData.assignedEmployee)?.name}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {mockEmployees.find(e => e.id === formData.assignedEmployee)?.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {mockEmployees.find(e => e.id === formData.assignedEmployee)?.email}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                  이전
                </Button>
                <Button type="submit" variant="hero" className="flex-1" disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      제출 중...
                    </>
                  ) : (
                    '청구서 제출'
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Complete */}
          {step === 3 && (
            <div className="glass-card p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>
              <h2 className="text-2xl font-bold mb-2">청구서 제출 완료!</h2>
              <p className="text-muted-foreground mb-6">
                담당자 {mockEmployees.find(e => e.id === formData.assignedEmployee)?.name}님에게
                <br />카카오톡/이메일 알림이 발송되었습니다.
              </p>
              <div className="p-4 rounded-lg bg-secondary/50 text-left mb-6">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">청구 금액</span>
                    <span className="font-medium">₩{formData.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">접수 번호</span>
                    <span className="font-mono text-primary">#INV-2025-0042</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">상태</span>
                    <span className="status-badge status-pending">승인 대기</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" onClick={() => { setStep(1); setUploadedFiles([]); setFormData({ companyName: "", description: "", amount: "", bankName: "", accountNumber: "", accountHolder: "", assignedEmployee: "" }); }}>
                새 청구서 작성
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default GuestForm;
