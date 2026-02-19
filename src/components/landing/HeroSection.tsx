import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { Link } from "react-router-dom";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Effects - 기존의 세련된 블루 블롭 유지 */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-primary/5" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-primary/15 via-primary/25 to-accent/15 rounded-full blur-[100px]" />
      <div className="absolute top-1/4 right-0 w-[300px] h-[300px] bg-accent/20 rounded-full blur-[80px]" />
      <div className="absolute bottom-1/4 left-0 w-[250px] h-[250px] bg-primary/15 rounded-full blur-[60px]" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.5)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.5)_1px,transparent_1px)] bg-[size:6rem_6rem] opacity-30" />

      <div className="container relative z-10 px-4 py-20 text-center">
        {/* Badge: 운영 헌법 강조 */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/20 backdrop-blur-sm mb-8 animate-fade-in">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">Operating Constitution v1.0 준수</span>
        </div>

        {/* Main Heading: 아티스트의 독립성 강조 */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 tracking-tighter animate-slide-up leading-[1.1]">
          관리받는 배우에서
          <br />
          <span className="gradient-text">경영하는 아티스트</span>로
        </h1>

        {/* Subtitle: 시스템과 인프라의 가치 전달 */}
        <p
          className="text-lg md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed animate-slide-up font-medium"
          style={{ animationDelay: "0.1s" }}
        >
          BOTEDA OS는 매니지먼트사가 아닙니다.
          <br className="hidden md:block" />
          배우 법인이 스스로 일어서도록 돕는 <strong>기술 인프라</strong>이자 <strong>운영 OS</strong>입니다.
          <br className="hidden md:block" />
          지휘와 통제 대신, <strong>권한과 기록</strong>으로 투명한 경영 환경을 제공합니다.
        </p>

        {/* CTA Buttons */}
        <div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up"
          style={{ animationDelay: "0.2s" }}
        >
          <Link to="/guest-form">
            <Button variant="hero" size="xl" className="group px-8">
              운영 인프라 도입 문의
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="glass" size="xl" className="px-8">
              대시보드 미리보기
            </Button>
          </Link>
        </div>

        {/* Stats: 플랫폼의 철학적 수치화 */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-24 animate-slide-up border-t border-border/50 pt-12"
          style={{ animationDelay: "0.3s" }}
        >
          {[
            {
              value: "0%",
              label: "의사결정 개입",
              icon: <Zap className="w-4 h-4 text-amber-500" />,
            },
            {
              value: "100%",
              label: "모든 행위 로그화",
              icon: <ShieldCheck className="w-4 h-4 text-blue-500" />,
            },
            {
              value: "No %",
              label: "운영 구조 기반 요금",
              icon: <Zap className="w-4 h-4 text-emerald-500" />,
            },
            {
              value: "Legal",
              label: "세무/노무 리스크 방어",
              icon: <ShieldCheck className="w-4 h-4 text-purple-500" />,
            },
          ].map((stat) => (
            <div key={stat.label} className="text-center group">
              <div className="flex items-center justify-center gap-1 mb-2">
                {stat.icon}
                <div className="text-3xl md:text-4xl font-black text-foreground group-hover:gradient-text transition-all">
                  {stat.value}
                </div>
              </div>
              <div className="text-xs md:text-sm font-bold text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
