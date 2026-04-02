/**
 * 임금 설계 엔진 (Salary Design Engine)
 * 엑셀의 '임금설계' 시트 로직을 코드로 구현
 */

// 2025년 최저임금
export const MINIMUM_WAGE_2025 = 10_030;

// 근무 타입 정의 (A~F)
export interface WorkType {
  code: string;
  label: string;
  category: string;       // 내근직 / 내근+현장
  contractType: string;   // 포괄임금제 / 간주근로제 / 선택적 시간근로제
  workHours: string;      // 10:00-19:00
  breakTime: string;      // 12:00-13:00
  dailyHours: number;     // 8
  monthlyStdHours: number; // 209
  overtimeHours: number;  // 월 연장근로시간
  nightHours: number;     // 야간근로시간
  holidayHours: number;   // 휴일근로시간
}

export const DEFAULT_WORK_TYPES: WorkType[] = [
  { code: "A", label: "내근직 포괄임금제 (연장40h)", category: "내근직", contractType: "포괄임금제", workHours: "10:00-19:00", breakTime: "12:00-13:00", dailyHours: 8, monthlyStdHours: 209, overtimeHours: 40, nightHours: 0, holidayHours: 0 },
  { code: "B", label: "내근직 간주근로제 (연장5h)", category: "내근직", contractType: "간주근로제", workHours: "10:00-19:00", breakTime: "12:00-13:00", dailyHours: 8, monthlyStdHours: 209, overtimeHours: 5, nightHours: 0, holidayHours: 0 },
  { code: "C", label: "내근+현장 선택적 (연장0h)", category: "내근+현장", contractType: "선택적 근로시간제", workHours: "10:00-19:00", breakTime: "12:00-13:00", dailyHours: 8, monthlyStdHours: 209, overtimeHours: 0, nightHours: 0, holidayHours: 0 },
  { code: "D", label: "내근+현장 선택적 (연장15h)", category: "내근+현장", contractType: "선택적 근로시간제", workHours: "10:00-19:00", breakTime: "12:00-13:00", dailyHours: 8, monthlyStdHours: 209, overtimeHours: 15, nightHours: 0, holidayHours: 0 },
  { code: "E", label: "내근직 간주근로제 (연장0h)", category: "내근직", contractType: "간주근로제", workHours: "10:00-19:00", breakTime: "12:00-13:00", dailyHours: 8, monthlyStdHours: 209, overtimeHours: 0, nightHours: 0, holidayHours: 0 },
  { code: "F", label: "내근+현장 선택적 (연장30h)", category: "내근+현장", contractType: "선택적 근로시간제", workHours: "10:00-19:00", breakTime: "12:00-13:00", dailyHours: 8, monthlyStdHours: 209, overtimeHours: 30, nightHours: 0, holidayHours: 0 },
];

// 비과세 항목
export interface NonTaxableItems {
  mealAllowance: number;      // 식대 (최대 200,000)
  carMaintenance: number;     // 차량유지비 (최대 200,000)
  childcareAllowance: number; // 육아보조비
  researchAllowance: number;  // 연구보조비
}

export const DEFAULT_NON_TAXABLE: NonTaxableItems = {
  mealAllowance: 0,
  carMaintenance: 0,
  childcareAllowance: 0,
  researchAllowance: 0,
};

// 급여 계산 결과
export interface SalaryBreakdown {
  monthlySalary: number;        // 월급여 총액
  totalWorkHours: number;       // 총 근로시간 (소정 + 연장)
  hourlyWage: number;           // 통상시급
  basePay: number;              // 기본급
  overtimePay: number;          // 고정연장수당 (1.5배)
  nightPay: number;             // 야간수당
  holidayPay: number;           // 휴일수당
  mealAllowance: number;        // 식대
  carMaintenance: number;       // 차량유지비
  childcareAllowance: number;   // 육아보조비
  researchAllowance: number;    // 연구보조비
  taxableAmount: number;        // 과세 대상 금액
  nonTaxableTotal: number;      // 비과세 합계
  meetsMinimumWage: boolean;    // 최저임금 준수 여부
  minimumWageHourly: number;    // 최저시급
  annualSalary: number;         // 연봉
}

/**
 * 월급 기반 임금 역산 엔진
 * 총액에서 비과세를 빼고, 기본급과 수당을 역산
 */
export function calculateSalary(
  monthlySalary: number,
  workType: WorkType,
  nonTaxable: NonTaxableItems = DEFAULT_NON_TAXABLE,
  minimumWage: number = MINIMUM_WAGE_2025
): SalaryBreakdown {
  const stdHours = workType.monthlyStdHours; // 209
  const overtimeHours = workType.overtimeHours;
  const nightHours = workType.nightHours;
  const holidayHours = workType.holidayHours;

  // 총 근로시간 = 소정 + 연장 + 야간 + 휴일
  const totalWorkHours = stdHours + overtimeHours + nightHours + holidayHours;

  // 비과세 합계
  const nonTaxableTotal = nonTaxable.mealAllowance + nonTaxable.carMaintenance
    + nonTaxable.childcareAllowance + nonTaxable.researchAllowance;

  // 과세 대상 금액
  const taxableAmount = monthlySalary - nonTaxableTotal;

  // 통상시급 계산: 과세금액 / (소정시간 + 연장시간*1.5 + 야간시간*1.5 + 휴일시간*1.5)
  const weightedHours = stdHours + (overtimeHours * 1.5) + (nightHours * 1.5) + (holidayHours * 1.5);
  const hourlyWage = weightedHours > 0 ? taxableAmount / weightedHours : 0;

  // 기본급 = 통상시급 * 소정근로시간
  const basePay = Math.round(hourlyWage * stdHours);

  // 고정연장수당 = 통상시급 * 연장시간 * 1.5
  const overtimePay = Math.round(hourlyWage * overtimeHours * 1.5);

  // 야간수당 = 통상시급 * 야간시간 * 1.5
  const nightPay = Math.round(hourlyWage * nightHours * 1.5);

  // 휴일수당 = 통상시급 * 휴일시간 * 1.5
  const holidayPay = Math.round(hourlyWage * holidayHours * 1.5);

  // 최저임금 검증
  const meetsMinimumWage = hourlyWage >= minimumWage;

  return {
    monthlySalary,
    totalWorkHours,
    hourlyWage: Math.round(hourlyWage * 100) / 100,
    basePay,
    overtimePay,
    nightPay,
    holidayPay,
    mealAllowance: nonTaxable.mealAllowance,
    carMaintenance: nonTaxable.carMaintenance,
    childcareAllowance: nonTaxable.childcareAllowance,
    researchAllowance: nonTaxable.researchAllowance,
    taxableAmount,
    nonTaxableTotal,
    meetsMinimumWage,
    minimumWageHourly: minimumWage,
    annualSalary: monthlySalary * 12,
  };
}

// 4대 보험 요율 (2025년 기준, 근로자 부담분)
export const INSURANCE_RATES_2025 = {
  nationalPension: 0.045,      // 국민연금 4.5%
  healthInsurance: 0.03545,    // 건강보험 3.545%
  longTermCare: 0.1281,        // 장기요양 (건강보험의 12.81%)
  employmentInsurance: 0.009,  // 고용보험 0.9%
  localIncomeTax: 0.1,         // 지방소득세 (소득세의 10%)
};

export interface DeductionBreakdown {
  nationalPension: number;     // 국민연금
  healthInsurance: number;     // 건강보험
  longTermCare: number;        // 장기요양
  employmentInsurance: number; // 고용보험
  incomeTax: number;           // 소득세
  localIncomeTax: number;      // 지방소득세
  totalDeduction: number;      // 공제합계
  netPay: number;              // 실수령액
}

/**
 * 4대보험 + 세금 공제 계산
 */
export function calculateDeductions(
  taxableAmount: number,
  monthlySalary: number,
  dependents: number = 1
): DeductionBreakdown {
  const rates = INSURANCE_RATES_2025;

  // 국민연금 (과세금액 기준, 상한 590만원)
  const pensionBase = Math.min(taxableAmount, 5_900_000);
  const nationalPension = Math.round(pensionBase * rates.nationalPension / 10) * 10;

  // 건강보험 (과세금액 기준)
  const healthInsurance = Math.round(taxableAmount * rates.healthInsurance / 10) * 10;

  // 장기요양 (건강보험의 12.81%)
  const longTermCare = Math.round(healthInsurance * rates.longTermCare / 10) * 10;

  // 고용보험 (과세금액 기준)
  const employmentInsurance = Math.round(taxableAmount * rates.employmentInsurance / 10) * 10;

  // 소득세 (간이세액표 기반 - 간략화)
  const incomeTax = lookupSimplifiedTax(taxableAmount, dependents);

  // 지방소득세 (소득세의 10%)
  const localIncomeTax = Math.round(incomeTax * rates.localIncomeTax / 10) * 10;

  const totalDeduction = nationalPension + healthInsurance + longTermCare
    + employmentInsurance + incomeTax + localIncomeTax;

  return {
    nationalPension,
    healthInsurance,
    longTermCare,
    employmentInsurance,
    incomeTax,
    localIncomeTax,
    totalDeduction,
    netPay: monthlySalary - totalDeduction,
  };
}

/**
 * 간이세액표 간략화 계산 (2025년 기준)
 * 실제로는 간이세액표 전체를 참조해야 하지만, 근사치 공식으로 대체
 */
function lookupSimplifiedTax(taxableAmountWon: number, dependents: number): number {
  const monthly = taxableAmountWon / 1000; // 천원 단위
  
  if (monthly <= 1060) return 0;
  
  // 근사 계산 (부양가족 1인 기준)
  let baseTax = 0;
  if (monthly <= 1500) {
    baseTax = Math.round((monthly - 1060) * 6.5);
  } else if (monthly <= 2000) {
    baseTax = Math.round(2860 + (monthly - 1500) * 15);
  } else if (monthly <= 3000) {
    baseTax = Math.round(10360 + (monthly - 2000) * 24);
  } else if (monthly <= 4000) {
    baseTax = Math.round(34360 + (monthly - 3000) * 35);
  } else if (monthly <= 5000) {
    baseTax = Math.round(69360 + (monthly - 4000) * 38);
  } else if (monthly <= 7000) {
    baseTax = Math.round(107360 + (monthly - 5000) * 40);
  } else {
    baseTax = Math.round(187360 + (monthly - 7000) * 42);
  }

  // 부양가족 공제 (1인당 약 30,000원 감면, 간략화)
  const dependentDeduction = Math.max(0, (dependents - 1)) * 30000;
  const tax = Math.max(0, baseTax - dependentDeduction);
  
  return Math.round(tax / 10) * 10;
}

/**
 * 숫자를 한국 원화 포맷으로
 */
export function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR").format(Math.round(amount));
}
