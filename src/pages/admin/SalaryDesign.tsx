import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/landing/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Calculator, FileText, Download, AlertTriangle, CheckCircle2,
  User, Clock, Wallet, ArrowLeft, Briefcase, FileSignature
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  calculateSalary, calculateDeductions, formatKRW,
  DEFAULT_WORK_TYPES, DEFAULT_NON_TAXABLE, MINIMUM_WAGE_2025,
  type WorkType, type SalaryBreakdown, type DeductionBreakdown, type NonTaxableItems
} from "@/lib/salaryEngine";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const SalaryDesign = () => {
  const navigate = useNavigate();
  const { user, currentTenant } = useAuth();
  const contractRef = useRef<HTMLDivElement>(null);

  const [companyInfo, setCompanyInfo] = useState({
    name: "", ceo: "", address: "", phone: "", bizNumber: "",
  });

  const [employeeInfo, setEmployeeInfo] = useState({
    name: "", residentNumber: "", address: "", hireDate: "",
    department: "", jobTitle: "",
  });

  const [selectedWorkType, setSelectedWorkType] = useState<string>("A");
  const [workTypes] = useState<WorkType[]>(DEFAULT_WORK_TYPES);
  const [monthlySalary, setMonthlySalary] = useState<number>(2_500_000);
  const [salaryInput, setSalaryInput] = useState<string>("monthly");
  const [annualSalary, setAnnualSalary] = useState<number>(30_000_000);
  const [nonTaxable, setNonTaxable] = useState<NonTaxableItems>(DEFAULT_NON_TAXABLE);
  const [dependents, setDependents] = useState<number>(1);
  const [salaryResult, setSalaryResult] = useState<SalaryBreakdown | null>(null);
  const [deductionResult, setDeductionResult] = useState<DeductionBreakdown | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");

  useEffect(() => {
    const loadCompanyInfo = async () => {
      if (!currentTenant?.tenant_id) return;
      const { data } = await supabase
        .from("tenants").select("*").eq("id", currentTenant.tenant_id).single() as any;
      if (data) {
        setCompanyInfo({
          name: data.name || "", ceo: data.ceo_name || "", address: data.address || "",
          phone: data.phone || "", bizNumber: data.business_number || "",
        });
      }
    };
    loadCompanyInfo();
  }, [currentTenant?.tenant_id]);

  useEffect(() => {
    const loadEmployees = async () => {
      if (!currentTenant?.tenant_id) return;
      const { data } = await supabase
        .from("tenant_memberships")
        .select("user_id, department, job_title, profiles:user_id(id, full_name, email)")
        .eq("tenant_id", currentTenant.tenant_id) as any;
      if (data) setEmployees(data);
    };
    loadEmployees();
  }, [currentTenant?.tenant_id]);

  useEffect(() => {
    const wt = workTypes.find(w => w.code === selectedWorkType);
    if (!wt) return;
    const effectiveSalary = salaryInput === "annual" ? Math.round(annualSalary / 12) : monthlySalary;
    const result = calculateSalary(effectiveSalary, wt, nonTaxable);
    setSalaryResult(result);
    const deductions = calculateDeductions(result.taxableAmount, effectiveSalary, dependents);
    setDeductionResult(deductions);
  }, [monthlySalary, annualSalary, salaryInput, selectedWorkType, nonTaxable, dependents, workTypes]);

  const handleEmployeeSelect = (userId: string) => {
    setSelectedEmployee(userId);
    const emp = employees.find(e => e.user_id === userId);
    if (emp?.profiles) {
      setEmployeeInfo(prev => ({
        ...prev, name: emp.profiles.full_name || "",
        department: emp.department || "", jobTitle: emp.job_title || "",
      }));
    }
  };

  const handleSalaryInputChange = (value: string) => {
    const num = parseInt(value.replace(/,/g, "")) || 0;
    if (salaryInput === "annual") {
      setAnnualSalary(num);
      setMonthlySalary(Math.round(num / 12));
    } else {
      setMonthlySalary(num);
      setAnnualSalary(num * 12);
    }
  };

  const handleDownloadPDF = async () => {
    if (!contractRef.current) return;
    toast.info("PDF 생성 중...");
    try {
      const canvas = await html2canvas(contractRef.current, {
        scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }
      pdf.save(`근로계약서_${employeeInfo.name || "직원"}_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF가 다운로드되었습니다.");
    } catch {
      toast.error("PDF 생성 실패");
    }
  };

  const currentWorkType = workTypes.find(w => w.code === selectedWorkType)!;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="pt-24 pb-16 px-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="rounded-lg bg-white shadow-sm border border-slate-200">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="p-2.5 rounded-2xl bg-amber-500 text-white"><Calculator className="w-6 h-6" /></div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">임금 설계 & 계약서 생성</h1>
              <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 text-[10px] h-4">ADMIN</Badge>
            </div>
            <p className="text-sm text-slate-500">근무 타입 선택 → 급여 자동 역산 → 근로계약서 PDF 생성</p>
          </div>
        </div>

        <Tabs defaultValue="salary" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 shadow-sm p-1 rounded-xl">
            <TabsTrigger value="salary" className="rounded-lg font-bold text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Calculator className="w-3.5 h-3.5 mr-1.5" /> 임금 설계
            </TabsTrigger>
            <TabsTrigger value="contract" className="rounded-lg font-bold text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <FileText className="w-3.5 h-3.5 mr-1.5" /> 근로계약서
            </TabsTrigger>
          </TabsList>

          {/* ===== 탭 1: 임금 설계 ===== */}
          <TabsContent value="salary" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-5">
                {/* 직원 선택 */}
                <Card className="rounded-2xl border-slate-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" /> 근로자 정보
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {employees.length > 0 && (
                      <div>
                        <Label className="text-xs font-bold text-slate-500">기존 직원 불러오기</Label>
                        <Select value={selectedEmployee} onValueChange={handleEmployeeSelect}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="직원 선택 (선택사항)" /></SelectTrigger>
                          <SelectContent>
                            {employees.map((emp: any) => (
                              <SelectItem key={emp.user_id} value={emp.user_id} className="text-xs">
                                {emp.profiles?.full_name || "이름 없음"} — {emp.department || "부서 미지정"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-bold text-slate-500">성명</Label>
                        <Input className="h-9 text-xs" value={employeeInfo.name}
                          onChange={e => setEmployeeInfo(p => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs font-bold text-slate-500">주민등록번호</Label>
                        <Input className="h-9 text-xs" placeholder="000000-0000000" value={employeeInfo.residentNumber}
                          onChange={e => setEmployeeInfo(p => ({ ...p, residentNumber: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs font-bold text-slate-500">입사일</Label>
                        <Input type="date" className="h-9 text-xs" value={employeeInfo.hireDate}
                          onChange={e => setEmployeeInfo(p => ({ ...p, hireDate: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs font-bold text-slate-500">담당업무</Label>
                        <Input className="h-9 text-xs" value={employeeInfo.department}
                          onChange={e => setEmployeeInfo(p => ({ ...p, department: e.target.value }))} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 근무 타입 */}
                <Card className="rounded-2xl border-slate-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-600" /> 근무 타입
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {workTypes.map(wt => (
                        <button key={wt.code}
                          onClick={() => setSelectedWorkType(wt.code)}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            selectedWorkType === wt.code
                              ? "border-amber-500 bg-amber-50 shadow-md"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}>
                          <div className="text-lg font-black text-slate-900">{wt.code}</div>
                          <div className="text-[10px] font-bold text-slate-500 mt-0.5">{wt.contractType}</div>
                          <div className="text-[10px] text-slate-400">연장 {wt.overtimeHours}h/월</div>
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1">
                      <div className="font-bold">{currentWorkType.label}</div>
                      <div>근무시간: {currentWorkType.workHours} (휴게: {currentWorkType.breakTime})</div>
                      <div>소정근로: 1일 {currentWorkType.dailyHours}h / 월 {currentWorkType.monthlyStdHours}h</div>
                      <div>총 근로시간: {currentWorkType.monthlyStdHours + currentWorkType.overtimeHours}h/월</div>
                    </div>
                  </CardContent>
                </Card>

                {/* 급여 입력 */}
                <Card className="rounded-2xl border-slate-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-emerald-600" /> 급여 설정
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Button variant={salaryInput === "monthly" ? "default" : "outline"} size="sm"
                        className="text-xs rounded-lg" onClick={() => setSalaryInput("monthly")}>월급 입력</Button>
                      <Button variant={salaryInput === "annual" ? "default" : "outline"} size="sm"
                        className="text-xs rounded-lg" onClick={() => setSalaryInput("annual")}>연봉 입력</Button>
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-slate-500">
                        {salaryInput === "monthly" ? "월 급여액" : "연봉"}
                      </Label>
                      <Input className="h-10 text-lg font-bold"
                        value={formatKRW(salaryInput === "monthly" ? monthlySalary : annualSalary)}
                        onChange={e => handleSalaryInputChange(e.target.value)} />
                      <p className="text-[10px] text-slate-400 mt-1">
                        {salaryInput === "monthly" ? `연봉: ${formatKRW(annualSalary)}원` : `월급: ${formatKRW(monthlySalary)}원`}
                      </p>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500">비과세 항목</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-[10px] text-slate-400">식대 (최대 20만)</Label>
                          <Input className="h-8 text-xs" type="number" max={200000}
                            value={nonTaxable.mealAllowance || ""}
                            onChange={e => setNonTaxable(p => ({ ...p, mealAllowance: Math.min(200000, parseInt(e.target.value) || 0) }))} />
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-400">차량유지비 (최대 20만)</Label>
                          <Input className="h-8 text-xs" type="number" max={200000}
                            value={nonTaxable.carMaintenance || ""}
                            onChange={e => setNonTaxable(p => ({ ...p, carMaintenance: Math.min(200000, parseInt(e.target.value) || 0) }))} />
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-400">육아보조비</Label>
                          <Input className="h-8 text-xs" type="number"
                            value={nonTaxable.childcareAllowance || ""}
                            onChange={e => setNonTaxable(p => ({ ...p, childcareAllowance: parseInt(e.target.value) || 0 }))} />
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-400">연구보조비</Label>
                          <Input className="h-8 text-xs" type="number"
                            value={nonTaxable.researchAllowance || ""}
                            onChange={e => setNonTaxable(p => ({ ...p, researchAllowance: parseInt(e.target.value) || 0 }))} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-slate-500">부양가족 수 (본인 포함)</Label>
                      <Input className="h-8 text-xs w-24" type="number" min={1} value={dependents}
                        onChange={e => setDependents(Math.max(1, parseInt(e.target.value) || 1))} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 우측: 결과 */}
              <div className="space-y-5">
                {salaryResult && (
                  <>
                    <Card className={`rounded-2xl border-2 shadow-sm ${salaryResult.meetsMinimumWage ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}>
                      <CardContent className="p-4 flex items-center gap-3">
                        {salaryResult.meetsMinimumWage
                          ? <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                          : <AlertTriangle className="w-6 h-6 text-red-600" />}
                        <div>
                          <div className="font-bold text-sm">
                            {salaryResult.meetsMinimumWage ? "최저임금 준수" : "⚠️ 최저임금 미달"}
                          </div>
                          <div className="text-xs text-slate-600">
                            통상시급 {formatKRW(salaryResult.hourlyWage)}원 / 최저시급 {formatKRW(MINIMUM_WAGE_2025)}원
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-slate-200 shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold">📊 임금 구성 내역</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Row label="월 급여 총액" value={salaryResult.monthlySalary} bold primary />
                          <Separator />
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">과세 항목</div>
                          <Row label="기본급" value={salaryResult.basePay} />
                          {salaryResult.overtimePay > 0 && <Row label="고정연장수당" value={salaryResult.overtimePay} />}
                          {salaryResult.nightPay > 0 && <Row label="야간수당" value={salaryResult.nightPay} />}
                          {salaryResult.holidayPay > 0 && <Row label="휴일수당" value={salaryResult.holidayPay} />}
                          <Separator />
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">비과세 항목</div>
                          {salaryResult.mealAllowance > 0 && <Row label="식대보조비" value={salaryResult.mealAllowance} />}
                          {salaryResult.carMaintenance > 0 && <Row label="차량유지비" value={salaryResult.carMaintenance} />}
                          {salaryResult.childcareAllowance > 0 && <Row label="육아보조비" value={salaryResult.childcareAllowance} />}
                          {salaryResult.researchAllowance > 0 && <Row label="연구보조비" value={salaryResult.researchAllowance} />}
                          {salaryResult.nonTaxableTotal === 0 && <div className="text-xs text-slate-400 py-1">해당 없음</div>}
                          <Separator />
                          <Row label="과세 대상 금액" value={salaryResult.taxableAmount} bold />
                          <Row label="연봉" value={salaryResult.annualSalary} />
                        </div>
                      </CardContent>
                    </Card>

                    {deductionResult && (
                      <Card className="rounded-2xl border-slate-200 shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-bold">💰 공제 내역 (4대보험 + 세금)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <Row label="국민연금" value={deductionResult.nationalPension} deduct />
                            <Row label="건강보험" value={deductionResult.healthInsurance} deduct />
                            <Row label="장기요양" value={deductionResult.longTermCare} deduct />
                            <Row label="고용보험" value={deductionResult.employmentInsurance} deduct />
                            <Row label="소득세" value={deductionResult.incomeTax} deduct />
                            <Row label="지방소득세" value={deductionResult.localIncomeTax} deduct />
                            <Separator />
                            <Row label="공제 합계" value={deductionResult.totalDeduction} bold deduct />
                            <div className="bg-blue-50 rounded-xl p-4 mt-3">
                              <div className="text-xs text-slate-500 font-bold">실수령액</div>
                              <div className="text-2xl font-black text-blue-700">{formatKRW(deductionResult.netPay)}원</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ===== 탭 2: 근로계약서 ===== */}
          <TabsContent value="contract">
            <div className="flex justify-end mb-4 gap-2">
              <Button onClick={handleDownloadPDF} className="bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold">
                <Download className="w-3.5 h-3.5 mr-1.5" /> PDF 다운로드
              </Button>
            </div>
            <div ref={contractRef}>
              <Card className="rounded-2xl border-slate-200 shadow-lg max-w-4xl mx-auto">
                <CardContent className="p-8 md:p-12" style={{ fontFamily: "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif" }}>
                  <h1 className="text-center text-2xl font-black mb-8 tracking-widest">근 로 계 약 서</h1>
                  <table className="w-full text-sm border-collapse border border-slate-300 mb-6">
                    <tbody>
                      <tr>
                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold w-20 text-center" rowSpan={3}>사용자<br/>(東)</td>
                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold w-20">업체명</td>
                        <td className="border border-slate-300 p-2" colSpan={3}>{companyInfo.name || "주식회사 에코글로벌그룹"}</td>
                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold w-16">전화</td>
                        <td className="border border-slate-300 p-2">{companyInfo.phone || "02-553-1412"}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold">소재지</td>
                        <td className="border border-slate-300 p-2" colSpan={5}>{companyInfo.address || "서울특별시 서초구 사임당로18길 18, 1층"}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold">대표자</td>
                        <td className="border border-slate-300 p-2" colSpan={2}>{companyInfo.ceo || "정원석"}</td>
                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold">사업자번호</td>
                        <td className="border border-slate-300 p-2" colSpan={2}>{companyInfo.bizNumber || "120-88-06761"}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold text-center" rowSpan={2}>근로자<br/>(幸)</td>
                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold">성명</td>
                        <td className="border border-slate-300 p-2" colSpan={2}>{employeeInfo.name || "(미입력)"}</td>
                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold">주민번호</td>
                        <td className="border border-slate-300 p-2" colSpan={2}>{employeeInfo.residentNumber || "(미입력)"}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold">근로형태</td>
                        <td className="border border-slate-300 p-2" colSpan={5}>{currentWorkType.contractType}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="space-y-4 text-sm leading-relaxed">
                    <ContractArticle num={1} title="목적">
                      상기 幸은 제5조의 업무와 관련하여 東에게 근로를 제공할 것을 약속하고, 이의 대가로 東은 幸에게 제7조의 임금을
                      지급할 것을 내용으로 하는 동 근로계약을 다음과 같이 당사자 간의 서명 또는 날인을 하여 체결하고 東과 幸은 이를
                      성실히 이행할 것을 약정한다.
                    </ContractArticle>
                    <ContractArticle num={2} title="계약기간">
                      {employeeInfo.hireDate || "(입사일 미입력)"} ~
                    </ContractArticle>
                    <ContractArticle num={3} title="근로시간 및 근로일">
                      <p>① 소정근로시간 : 1일 {currentWorkType.dailyHours}시간, 1개월 {currentWorkType.monthlyStdHours}시간</p>
                      <p>② 시업종업 : 1주 5일 {currentWorkType.workHours} (휴게시간 : {currentWorkType.breakTime})</p>
                      <p className="text-xs text-slate-500 ml-4">(휴게시간은 회사의 질서, 규율, 후속 근무에 지장이 없는 범위 내에서만 사용가능)</p>
                      <p>③ 회사의 형편을 감안하여 필요한 경우 당사자 간의 합의를 통해 위 시간 및 일을 변경할 수 있다.</p>
                    </ContractArticle>
                    <ContractArticle num={4} title="연장·야간·휴일근로">
                      <p>① 東과 幸은 업무상 필요한 연장·야간·휴일근로를 하는 것에 합의한다.</p>
                      <p>② 연장·야간·휴일근로 시에는 통상임금의 50%를 가산하여 임금을 지급한다.</p>
                    </ContractArticle>
                    <ContractArticle num={5} title="종사업무 및 취업장소">
                      <p>① 종사업무 : {employeeInfo.department || "(미입력)"}</p>
                      <p>② 취업장소 : {companyInfo.name || "주식회사 에코글로벌그룹"} 본사 또는 업무상 필요에 의하여 東이 지정하는 장소</p>
                    </ContractArticle>
                    <ContractArticle num={6} title="휴일 및 휴가">
                      <p>① 東은 幸에게 주휴일(단, 주소정근로시간을 만근한 경우 부여함)과 근로자의 날을 휴일로 부여한다.</p>
                      <p>② 법정휴가(연차 및 생리휴가 등)는 근로기준법에서 정하는 바에 따른다.</p>
                    </ContractArticle>
                    {salaryResult && (
                      <ContractArticle num={7} title="임금">
                        <p>① 월급여액 및 임금의 구성항목</p>
                        <table className="w-full border-collapse border border-slate-300 my-2 text-xs">
                          <thead>
                            <tr className="bg-slate-50">
                              <th className="border border-slate-300 p-1.5" rowSpan={2}>월 급여액</th>
                              <th className="border border-slate-300 p-1.5" colSpan={3}>통상임금</th>
                              <th className="border border-slate-300 p-1.5" rowSpan={2}>연장수당</th>
                              <th className="border border-slate-300 p-1.5" rowSpan={2}>휴일수당</th>
                              <th className="border border-slate-300 p-1.5" rowSpan={2}>야간수당</th>
                            </tr>
                            <tr className="bg-slate-50">
                              <th className="border border-slate-300 p-1.5">기본급</th>
                              <th className="border border-slate-300 p-1.5">식대보조비</th>
                              <th className="border border-slate-300 p-1.5">차량유지비</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="text-center">
                              <td className="border border-slate-300 p-1.5 font-bold">{formatKRW(salaryResult.monthlySalary)}</td>
                              <td className="border border-slate-300 p-1.5">{formatKRW(salaryResult.basePay)}</td>
                              <td className="border border-slate-300 p-1.5">{salaryResult.mealAllowance > 0 ? formatKRW(salaryResult.mealAllowance) : "-"}</td>
                              <td className="border border-slate-300 p-1.5">{salaryResult.carMaintenance > 0 ? formatKRW(salaryResult.carMaintenance) : "-"}</td>
                              <td className="border border-slate-300 p-1.5">{salaryResult.overtimePay > 0 ? formatKRW(salaryResult.overtimePay) : "-"}</td>
                              <td className="border border-slate-300 p-1.5">{salaryResult.holidayPay > 0 ? formatKRW(salaryResult.holidayPay) : "-"}</td>
                              <td className="border border-slate-300 p-1.5">{salaryResult.nightPay > 0 ? formatKRW(salaryResult.nightPay) : "-"}</td>
                            </tr>
                          </tbody>
                        </table>
                        <p>② 임금의 계산방법 : 통상시급×근로시간</p>
                        <p>③ 임금산정기간 : 매월 1일~말일</p>
                        <p>④ 임금지급일 : 당월 말일 (단, 임금지급일이 휴일인 경우 그 전일에 지급)</p>
                        <p>⑤ 임금 및 수당은 幸에게 직접 지불하거나 幸의 명의로 된 예금통장에 입금한다.</p>
                        <p>⑥ 월급의 지급에 있어 징계, 지각, 조퇴, 결근 등에 대하여 일부를 공제하거나 삭감할 수 있다.</p>
                        <p>⑦ 東은 幸의 임금에서 다음의 금액을 매월 공제한다.</p>
                        <p className="ml-4">1) 갑근세 및 주민세</p>
                        <p className="ml-4">2) 고용보험, 국민연금, 건강보험료</p>
                        <p className="ml-4">3) 기타 법령에 의하거나 東과 幸이 합의한 금액</p>
                      </ContractArticle>
                    )}
                    <ContractArticle num={8} title="수습 및 시용기간">
                      <p>① 신규 입사자의 경우 3개월의 수습 및 시용기간을 두며, 수습·시용기간 중 근무태도, 능력, 자질, 성실성, 건강상태를
                      종합평가하여 계속근무가 부적격하다고 인정될 경우에는 본 계약을 해지한다.</p>
                      <p>② 신규 입사자의 경우 업무 평과, 근무태도, 능력, 자질에 따라 8조 1항에서 합의한 수습기간 외의 추가 수습 기간이
                      필요할 경우 상호 합의에 따라 수습기간을 연장할 수 있다.</p>
                      <p>③ 수습 기간 후에는 업무 능력 평가 후 상호협의에 따라 연봉 조정할 수 있다.</p>
                    </ContractArticle>
                    <ContractArticle num={9} title="성실근무 및 기밀유지">
                      <p>① 幸은 신의성실의 원칙으로 근무에 임하며 재직중 東의 동의없이 다른 직무에 종사하지 못한다.</p>
                      <p>② 본 근로계약서의 내용은 절대 기밀을 유지하며 위반 시는 어떤 징계와 불이익이라도 감수한다.</p>
                      <p>③ 업무수행 중 취득하게 되는 영업기밀 및 경영상의 정보, 서비스단가, 전산프로그램 및 웹하드 등의 ID와 비밀번호 등
                      정보를 제3자에게 누설하지 않는다.</p>
                      <p>④ 위와 관련한 유출의 방지를 위해서 개인 및 회사 이메일과 PC의 검색과 모니터링에 동의한다.</p>
                    </ContractArticle>
                    <ContractArticle num={10} title="계약해지 및 손해배상 등">
                      <p>① 계약기간이 종료되면 근로계약은 자동적으로 해지되며 幸은 당연 퇴직하는 것을 원칙으로 한다.</p>
                      <p>② 幸이 퇴사하고자 하는 경우 반드시 30일 전에 東에게 통보하고 후임자에게 인수인계를 한다. 만약 근로자가 통보하지
                      않아 東에게 손해가 발생한 경우 東은 幸에게 손해배상을 청구할 수 있다.</p>
                      <p>③ 본 계약서와 관련하여 분쟁이 있는 경우 동의 소재지 관할 법원으로 정한다.</p>
                    </ContractArticle>
                  </div>

                  <div className="mt-12 space-y-6 text-sm">
                    <div className="flex justify-end items-center gap-4">
                      <span className="font-bold">東 :</span>
                      <span>{companyInfo.name || "주식회사 에코글로벌그룹"}</span>
                      <span className="ml-8 font-bold">{companyInfo.ceo || "정원석"}</span>
                      <span className="text-xs text-slate-400 ml-4">(서명 또는 날인)</span>
                    </div>
                    <div className="flex justify-end items-center gap-4">
                      <span className="font-bold">幸 :</span>
                      <span className="ml-8 font-bold">{employeeInfo.name || "(미입력)"}</span>
                      <span className="text-xs text-slate-400 ml-4">(서명 또는 날인)</span>
                    </div>
                    <div className="flex justify-end items-center gap-4 mt-4 pt-4 border-t border-slate-200">
                      <span>근로계약서를 교부받았음을 확인함</span>
                      <span className="font-bold">幸 :</span>
                      <span className="font-bold">{employeeInfo.name || "(미입력)"}</span>
                      <span className="text-xs text-slate-400 ml-4">(서명 또는 날인)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const Row = ({ label, value, bold, deduct, primary }: { label: string; value: number; bold?: boolean; deduct?: boolean; primary?: boolean }) => (
  <div className={`flex justify-between items-center py-1 ${bold ? "font-bold" : ""}`}>
    <span className="text-xs text-slate-600">{label}</span>
    <span className={`text-sm ${primary ? "text-blue-700 font-black text-lg" : deduct ? "text-red-600" : "text-slate-900"} ${bold ? "font-bold" : ""}`}>
      {deduct ? "-" : ""}{formatKRW(value)}원
    </span>
  </div>
);

const ContractArticle = ({ num, title, children }: { num: number; title: string; children: React.ReactNode }) => (
  <div className="mb-4">
    <h3 className="font-bold mb-1">제{num}조 [{title}]</h3>
    <div className="ml-4 space-y-1">{children}</div>
  </div>
);

export default SalaryDesign;
