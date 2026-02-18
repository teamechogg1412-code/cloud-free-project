import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="border-t border-border/50 py-16 bg-background">
      <div className="container px-4">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand & Mission */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-primary-foreground font-bold text-sm">B</span>
              </div>
              <span className="font-bold text-xl tracking-tight">
                <span className="gradient-text">ArkPort</span> OS
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              ArkPort OS는 배우 법인의 자립 경영을 지원하는 차세대 운영 인프라입니다. 지휘와 통제가 아닌 기술과 기록으로
              법인의 경영 주권을 보호합니다.
            </p>
            <div className="text-[11px] text-primary font-semibold tracking-wider uppercase">
              The Artist Operating System
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-bold mb-6 text-sm text-foreground">솔루션</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/guest-form" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  외부 거래처 청구
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  법인 경영 대시보드
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/drive-settings"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  중앙 집중 저장소
                </Link>
              </li>
              <li>
                <Link to="/super-admin" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  시스템 총괄 관리
                </Link>
              </li>
            </ul>
          </div>

          {/* Feature Links */}
          <div>
            <h4 className="font-bold mb-6 text-sm text-foreground">핵심 기능</h4>
            <ul className="space-y-3">
              <li>
                <span className="text-sm text-muted-foreground hover:text-foreground cursor-default transition-colors">
                  의사결정 및 전자결재
                </span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground hover:text-foreground cursor-default transition-colors">
                  전사적 감사 로그 (Audit)
                </span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground hover:text-foreground cursor-default transition-colors">
                  AI 행정 자동화
                </span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground hover:text-foreground cursor-default transition-colors">
                  독립 파트너십 워크스페이스
                </span>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-bold mb-6 text-sm text-foreground">지원 및 문의</h4>
            <ul className="space-y-3">
              <li>
                <span className="text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                  도입 문의 (Sales)
                </span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                  운영 가이드 문서
                </span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                  API 레퍼런스
                </span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                  고객 지원 센터
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal & Copyright */}
        <div className="mt-16 pt-8 border-t border-border/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <p className="text-xs text-muted-foreground mb-2">© 2025 ArkPort Inc. All rights reserved.</p>
              <p className="text-[10px] text-muted-foreground/60 max-w-md leading-normal">
                본 서비스는 각 배우 법인의 독립적인 경영권을 존중하며, 시스템 인프라 및 행정 대행 업무를 기술적으로
                제공합니다. 최종 의사결정과 책임은 해당 법인에 귀속됩니다.
              </p>
            </div>

            <div className="flex gap-8 items-center">
              <span className="text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer transition-colors">
                이용약관
              </span>
              <span className="text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer transition-colors">
                개인정보처리방침
              </span>
              <span className="text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer transition-colors">
                쿠키 설정
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
