import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { ArchitectureSection } from "@/components/landing/ArchitectureSection";
import { WorkflowIndependence } from "@/components/landing/PartnerControl";
import { PricingSection } from "@/components/landing/PricingSection";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* 1. 첫인상: Arkport OS의 정체성 (운영 인프라) */}
        <HeroSection />

        {/* 2. 주요 기능: 행정 자동화 및 올인원 플랫폼 */}
        <FeaturesSection />

        {/* 3. 시스템 아키텍처: 위장도급 리스크를 제거하는 '권한/로그' 중심 구조 */}
        <ArchitectureSection />

        {/* 4. 워크플로우 독립성: 파트너를 직접 제어하고 데이터를 소유하는 방식 */}
        <WorkflowIndependence />

        {/* 5. 수익 분리 구조: 에이전시(18%)와 인프라(2%)의 명확한 비용 구분 */}
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
