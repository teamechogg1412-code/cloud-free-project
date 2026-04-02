import { Outlet } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { DashboardLayout } from "./DashboardLayout";

interface ProtectedLayoutProps {
  requireSuperAdmin?: boolean;
  requireCompanyAdmin?: boolean;
}

export const ProtectedLayout = ({ requireSuperAdmin = false, requireCompanyAdmin = false }: ProtectedLayoutProps) => {
  return (
    <ProtectedRoute requireSuperAdmin={requireSuperAdmin} requireCompanyAdmin={requireCompanyAdmin}>
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </ProtectedRoute>
  );
};
