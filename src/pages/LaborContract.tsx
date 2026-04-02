import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/landing/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  FileSignature, FileText, Wallet, ArrowLeft, Clock, Building2, User, Download, Briefcase, Eye
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  calculateSalary, calculateDeductions, formatKRW,
  DEFAULT_WORK_TYPES, DEFAULT_NON_TAXABLE,
  type WorkType, type SalaryBreakdown, type DeductionBreakdown
} from "@/lib/salaryEngine";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useRef } from "react";
import { toast } from "sonner";

const LaborContract = () => {
  const navigate = useNavigate();
  const { user, currentTenant, profile } = useAuth();
  const contractRef = useRef<HTMLDivElement>(null);

  const [companyInfo, setCompanyInfo] = useState({
    name: "", ceo: "", address: "", phone: "", bizNumber: "",
  });
  const [membership, setMembership] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // For demo: use default work type A and salary 2.5M (eventually from DB)
  const [workType, setWorkType] = useState<WorkType>(DEFAULT_WORK_TYPES[0]);
  const [salaryResult, setSalaryResult] = useState<SalaryBreakdown | null>(null);
  const [deductionResult, setDeductionResult] = useState<DeductionBreakdown | null>(null);

  // Load company info
  useEffect(() => {
    const load = async () => {
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
    load();
  }, [currentTenant?.tenant_id]);

  // Load own membership info
  useEffect(() => {
    const load = async () => {
      if (!currentTenant?.tenant_id || !user?.id) return;
      setLoading(true);
      const { data } = await supabase
        .from("tenant_memberships")
        .select("*")
        .eq("tenant_id", currentTenant.tenant_id)
        .eq("user_id", user.id)
        .single() as any;
      if (data) setMembership(data);
      setLoading(false);
    };
    load();
  }, [currentTenant?.tenant_id, user?.id]);

  // Calculate salary (demo: 2.5M monthly, type A)
  useEffect(() => {
    const monthlySalary = 2_500_000; // TODO: pull from employee contract data
    const result = calculateSalary(monthlySalary, workType, DEFAULT_NON_TAXABLE);
    setSalaryResult(result);
    const deductions = calculateDeductions(result.taxableAmount, monthlySalary, 1);
    setDeductionResult(deductions);
  }, [workType]);

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
      pdf.save(`근로계약서_${profile?.full_name || "직원"}_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF가 다운로드되었습니다.");
    } catch {
      toast.error("PDF 생성 실패");
    }
  };

  const employeeName = profile?.full_name || "(미확인)";

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="pt-24 pb-16 px-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-lg bg-white shadow-sm border border-slate-200">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="p-2.5 rounded-2xl bg-amber-500 text-white"><FileSignature className="w-6 h-6" /></div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">나의 근로 정보</h1>
            <p className="text-sm text-slate-500">근로계약서 · 급여명세서 · 근무 정보 확인</p>
          </div>
        </div>

        <Tabs defaultValue="contract" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 shadow-sm p-1 rounded-xl">
            <TabsTrigger value="contract" className="rounded-lg font-bold text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <FileText className="w-3.5 h-3.5 mr-1.5" /> 근로계약서
            </TabsTrigger>
            <TabsTrigger value="payroll" className="rounded-lg font-bold text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Wallet className="w-3.5 h-3.5 mr-1.5" /> 급여 명세서
            </TabsTrigger>
            <TabsTrigger value="workinfo" className="rounded-lg font-bold text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Clock className="w-3.5 h-3.5 mr-1.5" /> 근무 정보
            </TabsTrigger>
          </TabsList>

          {/* ===== 탭 1: 근로계약서 (읽기 전용) ===== */}
          <TabsContent value="contract">
            <div className="flex justify-end mb-4">
              <Button onClick={handleDownloadPDF} className="bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold">
                <Download className="w-3.5 h-3.5 mr-1.5" /> PDF 다운로드
              </Button>
            </div>
            <div ref={contractRef}>
              <Card className="rounded-2xl border-slate-200 shadow-lg max-w-4xl mx-auto">
                <CardContent className="p-8 md:p-12" style={{ fontFamily: "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif" }}>
                  <h1 className="text-center text-2xl font-black mb-8 tracking-[0.5em]">근 로 계 약 서</h1>

                  {/* 상단 정보 테이블 */}
                  <table className="w-full text-sm border-collapse border border-slate-300 mb-6">
                    <tbody>
                      <tr>
                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold w-20 text-center" rowSpan={3}>사용자<br/>(東)</td>
                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold w-20">업체명</td>
                        <td className="border border-slate-300 p-2" colSpan={3}>{companyInfo.name || "-"}</td>
                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold w-16">전화</td>
                        <td className="border border-slate-300 p-2">{companyInfo.phone || "-"}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold">소재지</td>
                        <td className="border border-slate-300 p-2" colSpan={5}>{companyInfo.address || "-"}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold">대표자</td>
                        <td className="border border-slate-300 p-2" colSpan={2}>{companyInfo.ceo || "-"}</td>
                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold">사업자등록번호</td>
                        <td className="border border-slate-300 p-2" colSpan={2}>{companyInfo.bizNumber || "-"}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold text-center" rowSpan={2}>근로자<br/>(幸)</td>
                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold">성명</td>
                        <td className="border border-slate-300 p-2" colSpan={2}>{employeeName}</td>
                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold">주민등록번호</td>
                        <td className="border border-slate-300 p-2" colSpan={2}>***-*******</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 p-2 bg-slate-50 font-bold">근로형태</td>
                        <td className="border border-slate-300 p-2" colSpan={5}>{workType.contractType}</td>
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
                      <p>{membership?.created_at ? new Date(membership.created_at).toISOString().split("T")[0] : "(미정)"} ~</p>
                    </ContractArticle>

                    <ContractArticle num={3} title="근로시간 및 근로일">
                      <p>① 소정근로시간 : 1일 {workType.dailyHours} 시간, 1개월 {workType.monthlyStdHours.toFixed(1)} 시간</p>
                      <p>② 시 업 종 업 : 1주 5 일 &nbsp;&nbsp; {workType.workHours} &nbsp;&nbsp; ( 휴게시간 : {workType.breakTime} )</p>
                      <p className="text-xs text-slate-500 ml-8">(휴게시간은 회사의 질서, 규율, 후속 근무에 지장이 없는 범위 내에서만 사용가능)</p>
                      <p>③ 회사의 형편을 감안하여 필요한 경우 당사자 간의 합의를 통해 위 시간 및 일을 변경할 수 있다.</p>
                    </ContractArticle>

                    <ContractArticle num={4} title="연장·야간·휴일근로">
                      <p>① 東과 幸은 업무상 필요한 연장·야간·휴일근로를 하는 것에 합의한다.</p>
                      <p>② 연장·야간·휴일근로 시에는 통상임금의 50%를 가산하여 임금을 지급한다.</p>
                    </ContractArticle>

                    <ContractArticle num={5} title="종사업무 및 취업장소">
                      <p>① 종사업무 : {membership?.department || "매니지먼트"}</p>
                      <p>② 취업장소 : {companyInfo.name} 본사 또는 업무상 필요에 의하여 東이 지정하는 장소</p>
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

                  {/* 서명란 */}
                  <div className="mt-12 space-y-4 text-sm">
                    <div className="flex justify-end items-center gap-4">
                      <span className="font-bold w-8">東 :</span>
                      <span className="w-48">{companyInfo.name || "-"}</span>
                      <span className="font-bold w-20 text-right">{companyInfo.ceo || "-"}</span>
                      <span className="text-xs text-slate-400 ml-2">(서명 또는 날인)</span>
                    </div>
                    <div className="flex justify-end items-center gap-4">
                      <span className="font-bold w-8">幸 :</span>
                      <span className="w-48"></span>
                      <span className="font-bold w-20 text-right">{employeeName}</span>
                      <span className="text-xs text-slate-400 ml-2">(서명 또는 날인)</span>
                    </div>
                    <div className="flex justify-end items-center gap-4 mt-4 pt-4 border-t border-slate-200">
                      <span>근로계약서를 교부받았음을 확인함</span>
                      <span className="font-bold">幸 :</span>
                      <span className="font-bold">{employeeName}</span>
                      <span className="text-xs text-slate-400 ml-2">(서명 또는 날인)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== 탭 2: 급여 명세서 ===== */}
          <TabsContent value="payroll">
            {salaryResult && deductionResult ? (
              <Card className="rounded-2xl border-slate-200 shadow-lg max-w-2xl mx-auto">
                <CardContent className="p-8" style={{ fontFamily: "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif" }}>
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-black tracking-widest">급 여 명 세 서</h2>
                  </div>
                  <div className="space-y-2 text-sm mb-6">
                    <div className="flex justify-between"><span className="font-bold">회 사 :</span><span>{companyInfo.name}</span></div>
                    <div className="flex justify-between"><span className="font-bold">성 명 :</span><span>{employeeName}</span></div>
                    <div className="flex justify-between"><span className="font-bold">급여월 :</span><span>{new Date().getFullYear()}년 {new Date().getMonth() + 1}월</span></div>
                    <div className="flex justify-between"><span className="font-bold">산정기간 :</span><span>매월 1일 ~ 매월 말일</span></div>
                  </div>

                  <table className="w-full border-collapse border border-slate-300 text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="border border-slate-300 p-2 text-left" colSpan={2}>내 역</th>
                        <th className="border border-slate-300 p-2 text-right">금 액</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-blue-50/50"><td className="border border-slate-300 p-2 font-bold" colSpan={3}>지급내역</td></tr>
                      <tr><td className="border border-slate-300 p-2" colSpan={2}>기본급</td><td className="border border-slate-300 p-2 text-right">{formatKRW(salaryResult.basePay)}</td></tr>
                      {salaryResult.mealAllowance > 0 && <tr><td className="border border-slate-300 p-2" colSpan={2}>식대보조비</td><td className="border border-slate-300 p-2 text-right">{formatKRW(salaryResult.mealAllowance)}</td></tr>}
                      {salaryResult.carMaintenance > 0 && <tr><td className="border border-slate-300 p-2" colSpan={2}>차량유지비</td><td className="border border-slate-300 p-2 text-right">{formatKRW(salaryResult.carMaintenance)}</td></tr>}
                      {salaryResult.overtimePay > 0 && <tr><td className="border border-slate-300 p-2" colSpan={2}>고정연장수당</td><td className="border border-slate-300 p-2 text-right">{formatKRW(salaryResult.overtimePay)}</td></tr>}
                      <tr className="font-bold bg-slate-50"><td className="border border-slate-300 p-2" colSpan={2}>지급계</td><td className="border border-slate-300 p-2 text-right">{formatKRW(salaryResult.monthlySalary)}</td></tr>

                      <tr className="bg-red-50/50"><td className="border border-slate-300 p-2 font-bold" colSpan={3}>공제내역</td></tr>
                      <tr><td className="border border-slate-300 p-2" colSpan={2}>건강보험</td><td className="border border-slate-300 p-2 text-right">{formatKRW(deductionResult.healthInsurance)}</td></tr>
                      <tr><td className="border border-slate-300 p-2" colSpan={2}>장기요양</td><td className="border border-slate-300 p-2 text-right">{formatKRW(deductionResult.longTermCare)}</td></tr>
                      <tr><td className="border border-slate-300 p-2" colSpan={2}>국민연금</td><td className="border border-slate-300 p-2 text-right">{formatKRW(deductionResult.nationalPension)}</td></tr>
                      <tr><td className="border border-slate-300 p-2" colSpan={2}>고용보험</td><td className="border border-slate-300 p-2 text-right">{formatKRW(deductionResult.employmentInsurance)}</td></tr>
                      <tr><td className="border border-slate-300 p-2" colSpan={2}>소 득 세</td><td className="border border-slate-300 p-2 text-right">{formatKRW(deductionResult.incomeTax)}</td></tr>
                      <tr><td className="border border-slate-300 p-2" colSpan={2}>주 민 세</td><td className="border border-slate-300 p-2 text-right">{formatKRW(deductionResult.localIncomeTax)}</td></tr>
                      <tr className="font-bold bg-slate-50"><td className="border border-slate-300 p-2" colSpan={2}>공제합계</td><td className="border border-slate-300 p-2 text-right text-red-600">-{formatKRW(deductionResult.totalDeduction)}</td></tr>
                    </tbody>
                    <tfoot>
                      <tr className="bg-blue-600 text-white font-bold">
                        <td className="border border-blue-700 p-3" colSpan={2}>실지급액</td>
                        <td className="border border-blue-700 p-3 text-right text-lg">{formatKRW(deductionResult.netPay)}원</td>
                      </tr>
                    </tfoot>
                  </table>
                  <p className="text-center text-xs text-slate-400 mt-6">한달간 수고 많으셨습니다. 감사합니다.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12 text-slate-400">급여 정보를 불러오는 중입니다...</div>
            )}
          </TabsContent>

          {/* ===== 탭 3: 근무 정보 ===== */}
          <TabsContent value="workinfo">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* 개인 정보 */}
              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" /> 나의 인사 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow label="성명" value={employeeName} />
                  <InfoRow label="이메일" value={profile?.email || "-"} />
                  <InfoRow label="부서" value={membership?.department || "미지정"} />
                  <InfoRow label="직급" value={membership?.job_title || "미지정"} />
                  <InfoRow label="권한" value={
                    membership?.role === "company_admin" ? "관리자" :
                    membership?.role === "manager" ? "매니저" : "사원"
                  } />
                </CardContent>
              </Card>

              {/* 근무 조건 */}
              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" /> 근무 조건
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow label="근무 타입" value={`${workType.code} - ${workType.contractType}`} />
                  <InfoRow label="근무 시간" value={workType.workHours} />
                  <InfoRow label="휴게 시간" value={workType.breakTime} />
                  <InfoRow label="일일 근로" value={`${workType.dailyHours}시간`} />
                  <InfoRow label="월 소정근로" value={`${workType.monthlyStdHours}시간`} />
                  <InfoRow label="월 연장근로" value={`${workType.overtimeHours}시간`} />
                </CardContent>
              </Card>

              {/* 회사 정보 */}
              <Card className="rounded-2xl border-slate-200 shadow-sm md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600" /> 소속 회사 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <InfoRow label="상호" value={companyInfo.name || "-"} />
                    <InfoRow label="대표자" value={companyInfo.ceo || "-"} />
                    <InfoRow label="사업자번호" value={companyInfo.bizNumber || "-"} />
                    <InfoRow label="전화" value={companyInfo.phone || "-"} />
                    <div className="md:col-span-2">
                      <InfoRow label="주소" value={companyInfo.address || "-"} />
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

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
    <span className="text-xs font-bold text-slate-400">{label}</span>
    <span className="text-sm font-bold text-slate-800">{value}</span>
  </div>
);

const ContractArticle = ({ num, title, children }: { num: number; title: string; children: React.ReactNode }) => (
  <div className="mb-4">
    <h3 className="font-bold mb-1">제{num}조 [{title}]</h3>
    <div className="ml-4 space-y-1">{children}</div>
  </div>
);

export default LaborContract;
