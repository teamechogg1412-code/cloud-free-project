import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedLayout } from "@/components/ProtectedLayout";

// --- 페이지 임포트 ---

// 공개 페이지
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import GuestForm from "./pages/GuestForm";
import GmailOAuthCallback from "./pages/GmailOAuthCallback";
import NotFound from "./pages/NotFound";

// 일반 사용자 및 공통 앱 경로
import Dashboard from "./pages/Dashboard";
import ProfileManagement from "./pages/ProfileManagement";
import ArtistPortfolio from "./pages/ArtistPortfolio";
import Onboarding from "./pages/Onboarding";
import MyPage from "./pages/MyPage";
import AppModule from "./pages/AppModule";
import LeaveRequest from "./pages/LeaveRequest";

// 재무 앱 전용
import MyCardExpenses from "./pages/finance/MyCardExpenses";
import BankTransactions from "./pages/finance/BankTransactions";
import CardHistory from "./pages/finance/CardHistory";

// 본사 관리자 (Admin) 전용 페이지
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
import InternalMail from "./pages/admin/InternalMail";
import MediaPitching from "./pages/admin/MediaPitching";
import TenantAPISettings from "./pages/admin/TenantAPISettings";
import DriveSettings from "./pages/admin/DriveSettings";
import PartnershipManagement from "./pages/admin/PartnershipManagement";
import PartnerDataView from "./pages/admin/PartnerDataView";
import ScheduleManagement from "./pages/admin/ScheduleManagement";
import WorkRuleManagement from "./pages/admin/WorkRuleManagement";
import AttendanceManagement from "./pages/admin/AttendanceManagement";
import MailSettings from "./pages/admin/MailSettings";
import FinanceSettings from "./pages/admin/FinanceSettings";

// 슈퍼 어드민 (Super Admin) 전용 페이지
import SuperAdmin from "./pages/SuperAdmin";
import TenantRegistration from "./pages/TenantRegistration";
import MessageManagement from "./pages/SuperAdmin/MessageManagement";
import PressContacts from "./pages/SuperAdmin/PressContacts";
import APIManagement from "./pages/SuperAdmin/APIManagement";
import WorkRuleDefaults from "./pages/SuperAdmin/WorkRuleDefaults";
import OrgDefaults from "./pages/SuperAdmin/OrgDefaults";
import LeaveDefaults from "./pages/SuperAdmin/LeaveDefaults";
import StandardDriveMapping from "./pages/SuperAdmin/StandardDriveMapping"; // [신규: 표준 드라이브 설계]

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        <BrowserRouter>
          <Routes>
            {/* 1. 공개 경로 (누구나 접근 가능) */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/gmail/callback" element={<GmailOAuthCallback />} />
            <Route path="/guest-form" element={<GuestForm />} />

            {/* 2. 일반 및 관리자 보호 경로 (사이드바 레이아웃 적용) */}
            <Route element={<ProtectedLayout />}>
              {/* 일반 사용자 기능 */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profiles" element={<ProfileManagement />} />
              <Route path="/leave-request" element={<LeaveRequest />} />
              <Route path="/portfolio/:id" element={<ArtistPortfolio />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/my-page" element={<MyPage />} />
              <Route path="/apps/:category" element={<AppModule />} />
              
              {/* 재무 모듈 상세 */}
              <Route path="/apps/finance/cards" element={<MyCardExpenses />} />
              <Route path="/apps/finance/transactions" element={<BankTransactions />} />
              <Route path="/apps/finance/card-history" element={<CardHistory />} />

              {/* 본사 관리자 (Admin) 전용 메뉴 */}
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
              <Route path="/admin/finance-settings" element={<FinanceSettings />} />
            </Route>

            {/* 3. 슈퍼 어드민 전용 경로 (시스템 총괄 관리) */}
            <Route element={<ProtectedLayout requireSuperAdmin />}>
              <Route path="/super-admin" element={<SuperAdmin />} />
              <Route path="/super-admin/tenants/new" element={<TenantRegistration />} />
              <Route path="/super-admin/tenants/edit/:id" element={<TenantRegistration />} />
              <Route path="/super-admin/api-management" element={<APIManagement />} />
              <Route path="/super-admin/messages" element={<MessageManagement />} />
              <Route path="/super-admin/press-contacts" element={<PressContacts />} />
              <Route path="/super-admin/work-rules" element={<WorkRuleDefaults />} />
              <Route path="/super-admin/org-defaults" element={<OrgDefaults />} />
              <Route path="/super-admin/leave-defaults" element={<LeaveDefaults />} />
              <Route path="/super-admin/drive-template" element={<StandardDriveMapping />} />
            </Route>

            {/* 4. 예외 경로 (404) */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;