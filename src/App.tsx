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
import OrgChart from "./pages/OrgChart";
import ProfileManagement from "./pages/ProfileManagement";
import ArtistPortfolio from "./pages/ArtistPortfolio";
import Onboarding from "./pages/Onboarding";
import MyPage from "./pages/MyPage";
import AppModule from "./pages/AppModule";
import LeaveRequest from "./pages/LeaveRequest";
import FlowerRequest from "./pages/FlowerRequest";
import ExpenseReport from "./pages/ExpenseReport";
import ProposalRequest from "./pages/ProposalRequest";
import MyDocuments from "./pages/MyDocuments";
import CivilDocuments from "./pages/CivilDocuments";

// 재무 앱 전용
import MyCardExpenses from "./pages/finance/MyCardExpenses";
import BankTransactions from "./pages/finance/BankTransactions";
import CardHistory from "./pages/finance/CardHistory";
import FixedExpenseTemplates from "./pages/finance/FixedExpenseTemplates";

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
import PartnerHub from "./pages/admin/PartnerHub";
import ScheduleManagement from "./pages/admin/ScheduleManagement";
import WorkRuleManagement from "./pages/admin/WorkRuleManagement";
import AttendanceManagement from "./pages/admin/AttendanceManagement";
import MailSettings from "./pages/admin/MailSettings";
import FinanceSettings from "./pages/admin/FinanceSettings";
import SecurityManagement from "./pages/admin/SecurityManagement";
import AdminPermissions from "./pages/admin/AdminPermissions";
import LeaveManagement from "./pages/admin/LeaveManagement";
import AuditLogs from "./pages/admin/AuditLogs";
import PasswordManagement from "./pages/PasswordManagement";
import RegulationSettings from "./pages/admin/RegulationSettings";
import WorksManagement from "./pages/admin/WorksManagement";
import CastingInbox from "./pages/admin/CastingInbox";
import ContractReview from "./pages/admin/ContractReview";
// 슈퍼 어드민 (Super Admin) 전용 페이지
import SuperAdmin from "./pages/SuperAdmin";
import TenantRegistration from "./pages/TenantRegistration";
import MessageManagement from "./pages/SuperAdmin/MessageManagement";
import PressContacts from "./pages/SuperAdmin/PressContacts";
import APIManagement from "./pages/SuperAdmin/APIManagement";
import WorkRuleDefaults from "./pages/SuperAdmin/WorkRuleDefaults";
import OrgDefaults from "./pages/SuperAdmin/OrgDefaults";
import LeaveDefaults from "./pages/SuperAdmin/LeaveDefaults";
import StandardDriveMapping from "./pages/SuperAdmin/StandardDriveMapping";
import RegulationManagement from "./pages/SuperAdmin/RegulationManagement";
import BankPresets from "./pages/SuperAdmin/BankPresets";
import RegulationViewer from "./pages/RegulationViewer";
import ContractPromptManagement from "./pages/SuperAdmin/ContractPromptManagement";
import PressPromptManagement from "./pages/SuperAdmin/PressPromptManagement";
import TelegramManagement from "./pages/SuperAdmin/TelegramManagement";
import ScenarioAnalysis from "./pages/ScenarioAnalysis";
import ContractAnalysis from "./pages/ContractAnalysis";
import PressGenerator from "./pages/PressGenerator";
import ScenarioActorManagement from "./pages/admin/ScenarioActorManagement";
import ScenarioPromptManagement from "./pages/admin/ScenarioPromptManagement";
import LaborContract from "./pages/LaborContract";
import SalaryDesign from "./pages/admin/SalaryDesign";
import RevenueSettlement from "./pages/admin/RevenueSettlement";
import InvoiceSubmit from "./pages/InvoiceSubmit";
import InvoiceInbox from "./pages/admin/InvoiceInbox";
import ProjectProfitDashboard from "./pages/finance/ProjectProfitDashboard";
import MonthlyBudget from "./pages/finance/MonthlyBudget";
import DrivingSettlement from "./pages/finance/DrivingSettlement";

const queryClient = new QueryClient();

/** GitHub Pages 등 하위 경로 배포 시 Vite `base`와 동일하게 맞춤 */
const routerBasename =
  import.meta.env.BASE_URL.replace(/\/$/, "") || undefined;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        <BrowserRouter basename={routerBasename}>
          <Routes>
            {/* 1. 공개 경로 (누구나 접근 가능) */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/gmail/callback" element={<GmailOAuthCallback />} />
            <Route path="/guest-form" element={<GuestForm />} />
            <Route path="/invoice/:token" element={<InvoiceSubmit />} />

            {/* 2. 일반 및 관리자 보호 경로 (사이드바 레이아웃 적용) */}
            <Route element={<ProtectedLayout />}>
              {/* 일반 사용자 기능 */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profiles" element={<ProfileManagement />} />
              <Route path="/leave-request" element={<LeaveRequest />} />
              <Route path="/flower-request" element={<FlowerRequest />} />
              <Route path="/expense-report" element={<ExpenseReport />} />
              <Route path="/portfolio/:id" element={<ArtistPortfolio />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/my-page" element={<MyPage />} />
              <Route path="/apps/:category" element={<AppModule />} />
              <Route path="/proposal-request" element={<ProposalRequest />} />
              <Route path="/my-documents" element={<MyDocuments />} />
              <Route path="/civil-documents" element={<CivilDocuments />} />
              <Route path="/org-chart" element={<OrgChart />} />
              <Route path="/scenario-analysis" element={<ScenarioAnalysis />} />
              <Route path="/contract-analysis" element={<ContractAnalysis />} />
              <Route path="/press-generator" element={<PressGenerator />} />
              <Route path="/labor-contract" element={<LaborContract />} />
              
              {/* 재무 모듈 상세 */}
              <Route path="/apps/finance/cards" element={<MyCardExpenses />} />
              <Route path="/apps/finance/transactions" element={<BankTransactions />} />
              <Route path="/apps/finance/card-history" element={<CardHistory />} />
              <Route path="/apps/finance/fixed-expense" element={<FixedExpenseTemplates />} />
              <Route path="/apps/finance/billing" element={<InvoiceInbox />} />
              <Route path="/apps/finance/revenue" element={<ProjectProfitDashboard />} />
              <Route path="/apps/finance/monthly-budget" element={<MonthlyBudget />} />
              <Route path="/apps/finance/driving-settlement" element={<DrivingSettlement />} />

              {/* 본사 관리자 (Admin) 전용 메뉴 */}
            </Route>

            <Route element={<ProtectedLayout requireCompanyAdmin />}>
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
              <Route path="/admin/partner-hub" element={<PartnerHub />} />
              <Route path="/admin/schedules" element={<ScheduleManagement />} />
              <Route path="/admin/work-rules" element={<WorkRuleManagement />} />
              <Route path="/admin/attendance" element={<AttendanceManagement />} />
              <Route path="/admin/mail-settings" element={<MailSettings />} />
              <Route path="/admin/finance-settings" element={<FinanceSettings />} />
              <Route path="/admin/security" element={<SecurityManagement />} />
              <Route path="/admin/leave-management" element={<LeaveManagement />} />
              <Route path="/admin/audit-logs" element={<AuditLogs />} />
              <Route path="/admin/regulations" element={<RegulationSettings />} />
              <Route path="/admin/permissions" element={<AdminPermissions />} />
              <Route path="/admin/works" element={<WorksManagement />} />
              <Route path="/admin/casting-inbox" element={<CastingInbox />} />
              <Route path="/admin/contract-review" element={<ContractReview />} />
              <Route path="/admin/scenario-actors" element={<ScenarioActorManagement />} />
              <Route path="/admin/salary-design" element={<SalaryDesign />} />
              <Route path="/admin/revenue-settlement" element={<RevenueSettlement />} />
              
              <Route path="/apps/common/password-mgmt" element={<PasswordManagement />} />
              <Route path="/apps/common/regulations" element={<RegulationViewer />} />
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
              <Route path="/super-admin/regulations" element={<RegulationManagement />} />
              <Route path="/super-admin/bank-presets" element={<BankPresets />} />
              <Route path="/super-admin/scenario-prompts" element={<ScenarioPromptManagement />} />
              <Route path="/super-admin/contract-prompts" element={<ContractPromptManagement />} />
              <Route path="/super-admin/press-prompts" element={<PressPromptManagement />} />
              <Route path="/super-admin/telegram" element={<TelegramManagement />} />
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