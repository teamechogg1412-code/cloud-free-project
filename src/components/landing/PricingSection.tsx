import { Check, ShieldCheck, Zap, ClipboardCheck } from "lucide-react";

export const PricingSection = () => {
  /**
   * ✅ 전체 수정 반영 (헤더 폭 vs 카드 폭 분리 + 전체 가로 확장)
   * - (중요) 퍼센트/매출 연동 표현은 전면 비노출
   * - Casting Agency X / ArkPort OS / Backoffice / KPI Incentive를 "역할"로 분리
   * - ArkPort는 SaaS(인프라) + 운영 KPI 인센티브(매출 권리 아님)로만 정의
   * - 헤더(문장)는 "좁게" 유지, 카드 그리드(내용)는 "넓게" 사용 → 답답함 해소
   * - 하단 각주도 카드 폭 기준으로 자연스럽게 확장
   */

  const plans = [
    // ✅ 1) Casting Agency X (전면 운영)
    {
      title: "전면 운영 파트너십 (Casting Agency X)",
      pricing: { big: "Custom", sub: "/ 운영 구조 기반" },
      role: "영업·PR·운영 통합 수행",
      description:
        "작품·브랜딩·광고·PR 등 아티스트 활동 전반을 ‘프로젝트 단위’로 통합 수행합니다. 비용은 성과(매출) 공유가 아니라 운영 구조·투입 리소스·활동 구성에 따라 개별 산정됩니다.",
      features: [
        "작품 영업(드라마·영화) 및 계약 조건 협상(프로젝트 단위)",
        "광고/커머셜 세일즈 및 캠페인 운영(프로젝트 단위)",
        "PR/마케팅 운영 및 홍보 채널 커뮤니케이션(업무 범위 명시)",
        "매니저 교육·운영 가이드 및 현장 매니지먼트(옵션)",
        "사무실·회의·촬영 공간 제공(옵션)",
      ],
      border: "border-border",
      bg: "bg-background/50",
      buttonText: "개별 계약 주체",
      iconType: "shield",
      subnote:
        "※ 전속/지휘 관계가 아닌 ‘외부 운영 파트너십’입니다. 계약 범위·기간·투입 인력을 문서로 확정하며, 백오피스·행정은 Boteda 영역으로 분리됩니다.",
    },

    // ✅ 2) ArkPort 정액 - 시스템 관리
    {
      title: "시스템 관리 (ArkPort OS)",
      pricing: { big: "정액", sub: "/ 월·법인 단위" },
      role: "시스템 운영 및 통제",
      description:
        "권한·워크플로우·감사 로그·문서 표준 등 법인 운영 인프라를 제공하고, 모든 행위가 로그로 남는 ‘증거 기반 경영 환경’을 구축합니다.",
      features: [
        "권한 기반 승인·기록(전자결재) 체계",
        "전사적 감사 로그(Audit) 및 증빙 보관",
        "정산·계약·문서 워크플로우 관리",
        "데이터 격리(멀티 테넌트) 및 보안·접근 통제",
      ],
      border: "border-primary/40",
      bg: "bg-primary/5 shadow-2xl shadow-primary/10",
      highlight: true,
      buttonText: "System Subscription",
      iconType: "zap",
      subnote:
        "※ 정액 기반의 인프라 이용료이며, 영업·섭외·계약 체결 대가 또는 매출 권리와 무관합니다. 최종 승인 주체는 항상 ‘배우 법인’입니다.",
    },

    // ✅ 3) ArkPort 정액 - 백오피스(재무/행정/인사)
    {
      title: "백오피스 대행 (Finance · Admin · HR)",
      pricing: { big: "정액", sub: "/ 월 또는 건별" },
      role: "재무·행정·인사 지원",
      description:
        "정산·청구·증빙·기장 보조 등 법인 백오피스 업무를 지원하거나 대행합니다. 의사결정이 아닌 ‘자료·프로세스·증빙 완결성’에 집중합니다.",
      features: [
        "정산·청구·증빙 수집 및 검수",
        "기장·신고용 자료 정리(보조)",
        "지출 관리 및 비용 처리 프로세스 운영",
        "인사·총무 운영 지원(계약·근태·서류)",
      ],
      border: "border-border",
      bg: "bg-background/50",
      buttonText: "업무위탁(대행) 계약",
      iconType: "ops",
      subnote:
        "※ 법무·세무는 1차 자료 정리 및 리스크 체크까지 지원하며, 최종 판단은 외부 전문가 또는 ‘법인 결재’로 진행됩니다.",
    },

    // ✅ 4) ArkPort 성과 인센티브(변동)
    {
      title: "성과 인센티브 (Performance Incentive)",
      pricing: { big: "Variable", sub: "/ KPI 달성 시" },
      role: "운영 성과 보상",
      description:
        "오류·분쟁 감소, 리드타임 단축, 증빙 완결성 향상, 미수·누락 최소화 등 ‘운영 KPI’ 달성 시에만 지급되는 성과 보상입니다.",
      features: [
        "성과 지표 충족 시에만 지급",
        "연 환산 상한(Cap) 설정",
        "KPI·산정 기간을 계약서로 명확화",
        "매출·출연료·계약 금액과 무관한 운영 성과 보상",
      ],
      border: "border-border",
      bg: "bg-background/50",
      buttonText: "성과 인센티브 조항",
      iconType: "shield",
      subnote:
        "※ 성과 인센티브는 정액 비용과 별도로 운영되며, 총 비용에는 상한(Cap)이 설정됩니다. ‘매출 권리’가 아니라 ‘운영 품질 KPI’에 대한 보상입니다.",
    },
  ];

  const iconFor = (iconType: string) => {
    if (iconType === "zap") return <Zap className="w-4 h-4" />;
    if (iconType === "ops") return <ClipboardCheck className="w-4 h-4" />;
    return <ShieldCheck className="w-4 h-4" />;
  };

  return (
    <section className="py-28 relative overflow-hidden">
      {/* ✅ 배경 블러: 무대가 넓어졌으니 블러도 살짝 키움 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[140px] -z-10" />

      {/* ✅ 1) 헤더 컨테이너(좁게) */}
      <div className="mx-auto max-w-[920px] px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            투명한 <span className="gradient-text">운영 분리</span> 구조
          </h2>

          <p className="text-muted-foreground text-lg max-w-3xl mx-auto leading-relaxed">
            매니지먼트 수수료 모델이 아닙니다. <strong>전면 운영(에이전시)</strong>과{" "}
            <strong>시스템·백오피스(ArkPort)</strong>를 분리하여
            <br className="hidden md:block" />
            배우 법인의 <strong>독립성</strong>과 <strong>증거 기반 경영</strong>을 보장합니다.
          </p>

          {/* ✅ “초기 1명 → 다수 확장” 메시지 (리스크 방어용) */}
          <div className="mt-6 text-[12px] text-muted-foreground/70 max-w-3xl mx-auto leading-relaxed">
            ※ ArkPort OS는 특정 1개 법인을 위한 맞춤 구조가 아니라, 동일한 운영 표준을 다수 아티스트/법인에 확장하는
            인프라입니다. 초기에는 단일 법인의 사용 비중이 높을 수 있으나, 동일한 계약·권한·로그 원칙을 기반으로 다수
            법인으로 확장됩니다.
          </div>
        </div>
      </div>

      {/* ✅ 2) 카드/각주 컨테이너(넓게) */}
      <div className="mx-auto max-w-[1920px] px-12">
        {/* 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-10">
          {plans.map((plan) => (
            <div key={plan.title} className={`glass-card px-10 py-12 flex flex-col ${plan.border} ${plan.bg} relative`}>
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                  ArkPort Core
                </div>
              )}

              <div className="mb-10">
                <div className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                  {iconFor(plan.iconType)}
                  {plan.role}
                </div>

                <h3 className="text-2xl font-bold mb-4">{plan.title}</h3>

                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl md:text-5xl font-black tracking-tighter">{plan.pricing.big}</span>
                  <span className="text-muted-foreground font-medium">{plan.pricing.sub}</span>
                </div>

                {plan.subnote && (
                  <div className="text-[11px] text-muted-foreground/70 mb-5 leading-relaxed">{plan.subnote}</div>
                )}

                <p className="text-sm text-muted-foreground leading-relaxed">{plan.description}</p>
              </div>

              <div className="space-y-4 mb-10 flex-1">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-border/50 text-center">
                <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">
                  {plan.buttonText}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 하단 각주 */}
        <div className="mt-14 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            * 모든 비용은 배우 기획사(법인)와 각 파트너 간 <strong>독립적 서비스 계약</strong>에 근거하여 집행됩니다.
          </p>

          <p className="text-[11px] text-muted-foreground/60 max-w-5xl mx-auto leading-relaxed">
            Casting Agency X는 프로젝트 단위의 전면 운영을 담당하며, 비용은 성과(매출) 공유가 아닌 운영 구조·활동
            구성·투입 리소스에 따라 개별 산정됩니다.
            <br />
            ArkPort는 시스템 및 백오피스(재무·행정·인사) 지원을 정액 기반으로 수행하며, 성과 인센티브는 운영 KPI 달성
            시에만 적용되고 연 환산 상한(Cap)이 설정됩니다.
            <br />
            모든 최종 승인과 의사결정, 데이터 소유권은 배우 기획사(법인)에 귀속되며, ArkPort는 지휘·통제·개별 계약
            결정에 개입하지 않는 독립 인프라 솔루션입니다.
          </p>
        </div>
      </div>
    </section>
  );
};
