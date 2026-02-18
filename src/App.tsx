import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedLayout } from "@/components/ProtectedLayout";

// 페이지 임포트
import InternalMail from "./pages/admin/InternalMail";
import LeaveRequest from "./pages/LeaveRequest";
import MailSettings from "./pages/admin/MailSettings";
import MyCardExpenses from "./pages/finance/MyCardExpenses";
import BankTransactions from "./pages/finance/BankTransactions";
import CardHistory from "./pages/finance/CardHistory";
import FinanceSettings from "./pages/admin/FinanceSettings"; // [추가]

// 공개 페이지
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import GuestForm from "./pages/GuestForm";
import GmailOAuthCallback from "./pages/GmailOAuthCallback";
import NotFound from "./pages/NotFound";

// 일반 사용자 경로
import Dashboard from "./pages/Dashboard";
import ProfileManagement from "./pages/ProfileManagement";
import ArtistPortfolio from "./pages/ArtistPortfolio";
import Onboarding from "./pages/Onboarding";
import MyPage from "./pages/MyPage";
import AppModule from "./pages/AppModule";

// 본사 관리자 (Admin) 페이지
import AdminSystem from "./pages/AdminSystem";
import CompanyManagement from "./pages/admin/CompanyManagement";
import HRManagement from "./pages/admin/HRManagement";
import MemberDetail from "./pages/admin/MemberDetail";
import ArtistManagement from "./pages/admin/ArtistManagement";
import CorporateCardManagement from "./pages/admin/CorporateCardManagement";
import VehicleManagement from "./pages/admin/VehicleManagement";
import OrgManagement from "./pages/admin/OrgManagement";
import ProjectManagement from "./pages/admin/ProjectManagement";
import DrivingControl from "./pages/admin/DrivingControl";
import KeywordManagement from "./pages/admin/KeywordManagement";
import MediaPitching from "./pages/admin/MediaPitching";
import TenantAPISettings from "./pages/admin/TenantAPISettings";
import DriveSettings from "./pages/admin/DriveSettings";
import PartnershipManagement from "./pages/admin/PartnershipManagement";
import PartnerDataView from "./pages/admin/PartnerDataView";
import ScheduleManagement from "./pages/admin/ScheduleManagement";
import WorkRuleManagement from "./pages/admin/WorkRuleManagement";
import AttendanceManagement from "./pages/admin/AttendanceManagement";

// 슈퍼 어드민 (Super Admin) 페이지
import SuperAdmin from "./pages/SuperAdmin";
import TenantRegistration from "./pages/TenantRegistration";
import MessageManagement from "./pages/SuperAdmin/MessageManagement";
import PressContacts from "./pages/SuperAdmin/PressContacts";
import APIManagement from "./pages/SuperAdmin/APIManagement";
import WorkRuleDefaults from "./pages/SuperAdmin/WorkRuleDefaults";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        <BrowserRouter>
          <Routes>
            {/* 1. 공개 경로 */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/gmail/callback" element={<GmailOAuthCallback />} />
            <Route path="/guest-form" element={<GuestForm />} />

            {/* 2. 사이드바 레이아웃이 적용되는 인증 경로 */}
            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profiles" element={<ProfileManagement />} />
              <Route path="/leave-request" element={<LeaveRequest />} />
              <Route path="/portfolio/:id" element={<ArtistPortfolio />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/my-page" element={<MyPage />} />
              <Route path="/apps/:category" element={<AppModule />} />
              {/* 재무 앱 경로 */}
              <Route path="/apps/finance/cards" element={<MyCardExpenses />} />
              <Route path="/apps/finance/transactions" element={<BankTransactions />} />
              <Route path="/apps/finance/card-history" element={<CardHistory />} />
              {/* 본사 관리 시스템 (Admin) */}
              <Route path="/admin" element={<AdminSystem />} />
              <Route path="/admin/company" element={<CompanyManagement />} />
              <Route path="/admin/hr" element={<HRManagement />} />
              <Route path="/admin/hr/:id" element={<MemberDetail />} />
              <Route path="/admin/artists" element={<ArtistManagement />} />
              <Route path="/admin/cards" element={<CorporateCardManagement />} />
              <Route path="/admin/vehicles" element={<VehicleManagement />} />
              <Route path="/admin/org-chart" element={<OrgManagement />} />
              <Route path="/admin/projects" element={<ProjectManagement />} />
              <Route path="/admin/driving" element={<DrivingControl />} />
              <Route path="/admin/keywords" element={<KeywordManagement />} />
              <Route path="/admin/mail" element={<InternalMail />} />
              <Route path="/admin/media-pitching" element={<MediaPitching />} />
              <Route path="/admin/api-settings" element={<TenantAPISettings />} />
              <Route path="/admin/drive-settings" element={<DriveSettings />} />
              <Route path="/admin/partnerships" element={<PartnershipManagement />} />
              <Route path="/admin/partner-data" element={<PartnerDataView />} />
              <Route path="/admin/schedules" element={<ScheduleManagement />} />
              <Route path="/admin/work-rules" element={<WorkRuleManagement />} />
              <Route path="/admin/attendance" element={<AttendanceManagement />} />
              <Route path="/admin/mail-settings" element={<MailSettings />} />
              <Route path="/admin/finance-settings" element={<FinanceSettings />} /> {/* [금융 연동 설정 추가] */}
            </Route>

            {/* 3. 슈퍼 어드민 경로 (사이드바 포함) */}
            <Route element={<ProtectedLayout requireSuperAdmin />}>
              <Route path="/super-admin" element={<SuperAdmin />} />
              <Route path="/super-admin/tenants/new" element={<TenantRegistration />} />
              <Route path="/super-admin/tenants/edit/:id" element={<TenantRegistration />} />
              <Route path="/super-admin/api-management" element={<APIManagement />} />
              <Route path="/super-admin/messages" element={<MessageManagement />} />
              <Route path="/super-admin/press-contacts" element={<PressContacts />} />
              <Route path="/super-admin/work-rules" element={<WorkRuleDefaults />} />
            </Route>

            {/* 4. 404 페이지 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
