import { Outlet } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { DashboardLayout } from "./DashboardLayout";

interface ProtectedLayoutProps {
  requireSuperAdmin?: boolean;
}

export const ProtectedLayout = ({ requireSuperAdmin = false }: ProtectedLayoutProps) => {
  return (
    <ProtectedRoute requireSuperAdmin={requireSuperAdmin}>
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </ProtectedRoute>
  );
};
