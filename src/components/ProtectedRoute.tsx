// src/components/ProtectedRoute.tsx

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
  const { user, loading, isPendingApproval, isSuperAdmin, isCompanyAdmin, currentTenant, isSuspended } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isPendingApproval && !isSuperAdmin) {
    return <PendingApproval />;
  }

  if (isSuspended && !isSuperAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Ban className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">계정이 정지되었습니다</h2>
          <p className="text-sm text-slate-500 mb-6">
            관리자에 의해 계정이 정지되었습니다.
          </p>
        </div>
      </div>
    );
  }

  /**
   * [수정된 로직]
   * 일반 직원은 정보(job_title)가 없으면 온보딩으로 강제 이동시키지만,
   * 대표 관리자(isCompanyAdmin)나 슈퍼 어드민은 설정을 위해 자유로운 이동을 허용합니다.
   */
  const needsOnboarding = currentTenant && !currentTenant.job_title && !isCompanyAdmin;

  if (needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};