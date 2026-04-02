import { ShieldCheck, UserMinus, Zap, Activity, Database } from "lucide-react";

export const WorkflowIndependence = () => {
  const partners = [
    { name: "A 캐스팅 에이전시", status: "연결됨", activity: "Access Level: Partial", type: "외부 파트너" },
    { name: "B 마케팅사", status: "대기", activity: "Access Level: Denied", type: "외부 파트너" },
    { name: "C 세무회계법인", status: "연결됨", activity: "Access Level: Admin-Only", type: "전문가 파트너" },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container px-4">
        <div className="flex flex-col md:flex-row gap-12 items-center">
          {/* 왼쪽: 설명 (SaaS 인프라 정체성 강조) */}
          <div className="flex-1">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">
              회사는 독립되어야 하고,
              <br />
              <span className="gradient-text">경영 데이터는 보호되어야 합니다</span>
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              ArkPort OS는 배우 법인이 외부 협업(에이전시, 전문직 등) 시 발생하는 모든 행정 기록을 법인 고유의 자산으로
              격리 보관하는 <strong>클라우드 인프라</strong>입니다. 플랫폼 이용 종료 시에도 모든 데이터는 표준 포맷으로{" "}
              <strong>완전한 이관 및 백업을 보장</strong>합니다.
            </p>
            <div className="space-y-6">
              <div className="flex gap-3 items-start">
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold">데이터 소유권 독립 (Data Sovereignty)</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    협업 중 발생하는 모든 시스템 로그와 문서는 오직 법인의 소유입니다. 계약 해지 시 권한 회수 버튼
                    하나로 파트너로부터 데이터를 완벽하게 격리할 수 있습니다.
                  </div>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold">인프라 구독 모델 (SaaS Subscription)</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    본 서비스는 매출 성과를 공유하지 않는 기술 솔루션입니다. 법인의 운영 규모 및 데이터 보존 리소스에
                    최적화된 엔터프라이즈 플랜을 제공합니다.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 오른쪽: 시각화 카드 (IT 보안 시스템 느낌으로 수정) */}
          <div className="flex-1 w-full max-w-md">
            <div className="glass-card p-6 border-primary/20 shadow-2xl shadow-primary/10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">외부 협업 권한 관리 (Access Control)</h3>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                  Admin: Actor Company
                </span>
              </div>

              <div className="space-y-4">
                {partners.map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50 group hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${p.status === "연결됨" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-slate-400"}`}
                      />
                      <div>
                        <div className="text-sm font-bold">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{p.activity}</div>
                      </div>
                    </div>
                    <button className="text-[10px] flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-destructive/5 text-destructive border border-destructive/10 hover:bg-destructive hover:text-white transition-all font-bold">
                      <UserMinus className="w-3 h-3" /> 권한 회수
                    </button>
                  </div>
                ))}
              </div>

              {/* 하단 요금제 정보: '공동사업' 느낌을 지우기 위한 SaaS 요금 체계 강조 */}
              <div className="mt-8 pt-6 border-t border-border/50">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium font-mono">
                      <Activity className="w-3.5 h-3.5" /> Enterprise Subscription
                    </span>
                    <div className="text-xs font-bold text-foreground">인프라 라이선스 플랜</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-primary tracking-tight">Tier-based</div>
                    <div className="text-[9px] text-muted-foreground uppercase font-bold">Infrastructure Usage Fee</div>
                  </div>
                </div>
                <div className="mt-4 p-3 rounded-lg bg-secondary/50 border border-border/50 text-[10px] text-muted-foreground leading-normal">
                  ※ ArkPort OS는 법인 운영을 위한 IT 인프라만을 기술적으로 제공하며, 배우 법인과 파트너사 간의 계약,
                  지휘 관계 및 개별 의사결정에는 일체 개입하지 않는 <strong>독립적인 기술 솔루션</strong>입니다.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
