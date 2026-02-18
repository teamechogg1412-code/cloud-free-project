import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PendingApproval } from "./PendingApproval";
import { Loader2, Ban } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requireSuperAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireSuperAdmin = false }: ProtectedRouteProps) => {
  const { user, loading, isPendingApproval, isSuperAdmin, currentTenant, isSuspended } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // 1. 로그인이 안 된 경우
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // 2. 가입 승인 대기 중인 경우
  if (isPendingApproval && !isSuperAdmin) {
    return <PendingApproval />;
  }

  // 2.5. 계정 정지된 경우
  if (isSuspended && !isSuperAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Ban className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">계정이 정지되었습니다</h2>
          <p className="text-sm text-slate-500 mb-6">
            관리자에 의해 계정이 정지되었습니다. 문의가 필요한 경우 관리자에게 연락해 주세요.
          </p>
        </div>
      </div>
    );
  }

  // 3. 핵심: 온보딩 체크 (정보 등록 여부)
  // 소속 회사(currentTenant)는 있는데 직급(job_title) 정보가 없다면 미등록자로 간주
  // 단, 슈퍼어드민은 이 과정을 건너뛰게 하거나, 온보딩 페이지 자체에서는 무한 루프 방지
  const needsOnboarding = currentTenant && !currentTenant.job_title && !isSuperAdmin;

  if (needsOnboarding && location.pathname !== "/onboarding") {
    console.log("정보 미등록 감지: 온보딩 페이지로 강제 이동합니다.");
    return <Navigate to="/onboarding" replace />;
  }

  // 4. 슈퍼 어드민 전용 경로 체크
  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};