import { FileText, Users, ShieldCheck, Workflow, Calendar, Car, MessageSquare, Lock } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "AI 행정 증빙 처리",
    description:
      "외부 거래처의 청구서와 영수증을 AI가 분석합니다. 로그인 없이도 증빙 자료를 수집하고 데이터를 구조화하여 세무 리스크를 사전 방어합니다.",
    gradient: "from-primary to-cyan-400",
  },
  {
    icon: Workflow,
    title: "최종 의사결정 시스템",
    description:
      "모든 자금 집행은 배우 법인 대표의 전자 승인을 거칩니다. 실질적 경영 주체가 누구인지 법적으로 증명하는 가장 강력한 수단입니다.",
    gradient: "from-accent to-pink-400",
  },
  {
    icon: MessageSquare,
    title: "전사적 감사 로그 (Audit)",
    description:
      "단순한 채팅이 아닙니다. 파트너사와의 모든 소통과 업무 변경 이력이 타임라인에 기록되어, 향후 분쟁이나 세무 조사 시 완벽한 증거가 됩니다.",
    gradient: "from-violet-500 to-purple-400",
  },
  {
    icon: Lock,
    title: "독립 법인 인프라",
    description:
      "멀티 테넌트 기술로 각 배우 법인의 데이터를 완벽하게 격리합니다. 파트너사가 바뀌어도 법인의 소중한 경영 데이터는 오직 법인 소유로 남습니다.",
    gradient: "from-warning to-orange-400",
  },
  {
    icon: ShieldCheck,
    title: "권한 기반 보안 제어",
    description:
      "에이전시, 세무사 등 외부 파트너에게 필요한 만큼의 권한만 부여하세요. 계약 종료와 동시에 버튼 하나로 모든 접근 권한을 즉시 회수할 수 있습니다.",
    gradient: "from-red-500 to-rose-400",
  },
  {
    icon: Calendar,
    title: "투명한 일정 매칭",
    description:
      "에이전시와 배우 간의 일정을 실시간 공유합니다. 지휘 관계가 아닌 협업 관계로서, 투명한 정보 공유를 통해 업무 효율을 극대화합니다.",
    gradient: "from-blue-500 to-indigo-400",
  },
  {
    icon: Car,
    title: "법인 경비 자동 정산",
    description:
      "차량 주행 기록, 식비 등 현장에서 발생하는 실비 지출을 사진 한 장으로 정산합니다. 법인 운영의 투명성을 확보하고 세무 신고를 자동화합니다.",
    gradient: "from-teal-500 to-cyan-400",
  },
  {
    icon: Users,
    title: "아티스트 팀 그룹웨어",
    description:
      "배우 개인이 아닌 '법인'을 중심으로 팀이 움직입니다. 근태 관리부터 프로젝트 협업까지, 독립 법인에 최적화된 경영 환경을 제공합니다.",
    gradient: "from-success to-emerald-400",
  },
];

export const FeaturesSection = () => {
  return (
    <section className="py-24 relative">
      <div className="container px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight">
            독립 경영을 완성하는
            <br />
            <span className="gradient-text">핵심 인프라 솔루션</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto leading-relaxed">
            ArkPort OS는 단순한 편의 기능을 넘어, 배우 법인의 법적 실체를 보호하고
            <br className="hidden md:block" />
            자립적인 경영이 가능한 완벽한 기술적 환경을 구축합니다.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="glass-card-hover p-6 group flex flex-col h-full"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Icon */}
              <div
                className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.gradient} p-2.5 mb-6 transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-lg`}
              >
                <feature.icon className="w-full h-full text-white" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">{feature.description}</p>

              {/* Subtle Arrow for Hover Effect */}
              <div className="mt-6 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
