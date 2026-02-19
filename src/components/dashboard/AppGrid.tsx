import React from "react";
import { useNavigate } from "react-router-dom";
import {
  // 매니지먼트
  Film,
  FileSearch,
  ClipboardCheck,
  Monitor,
  Mail,
  // 홍보
  PenTool,
  Star,
  BellRing,
  Send,
  UserSearch,
  StickyNote,
  Share2,
  // 마케팅
  Target,
  FilePieChart,
  Megaphone,
  Inbox,
  BarChart3,
  Calculator,
  // 재무
  Receipt,
  FileText,
  FileCheck2,
  ScrollText,
  Car,
  Wallet,
  TrendingUp,
  CalendarClock,
  CreditCard,
  // 인사
  Palmtree,
  CalendarDays,
  Clock,
  Network,
  FileSignature,
  Gift,
  // 공용
  Calendar,
  BookOpen,
  FolderOpen,
  FileArchive,
  Bell,
  Search,
  Flower2,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";

interface AppItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  path?: string;
}

interface AppCategory {
  title: string;
  apps: AppItem[];
}

export const AppGrid = () => {
  const navigate = useNavigate();

  const appCategories: AppCategory[] = [
    {
      title: "매니지먼트",
      apps: [
        {
          id: "scenario",
          name: "시나리오 분석",
          icon: <Film className="w-6 h-6" />,
          color: "text-indigo-600",
          bgColor: "bg-indigo-50",
        },
        {
          id: "contract-analysis",
          name: "계약서 분석",
          icon: <FileSearch className="w-6 h-6" />,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
        },
        {
          id: "site-review",
          name: "현장 검토 사항",
          icon: <ClipboardCheck className="w-6 h-6" />,
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
        },
        {
          id: "select-monitor",
          name: "작품 셀렉 모니터링",
          icon: <Monitor className="w-6 h-6" />,
          color: "text-amber-600",
          bgColor: "bg-amber-50",
        },
        {
          id: "internal-mail",
          name: "사내 메일/소통",
          icon: <Mail className="w-6 h-6" />,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          path: "/admin/mail",
        },
      ],
    },
    {
      title: "홍보",
      apps: [
        {
          id: "press-release",
          name: "원고생성",
          icon: <PenTool className="w-6 h-6" />,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
        },
        {
          id: "profile-create",
          name: "프로필 제작",
          icon: <Star className="w-6 h-6" />,
          color: "text-indigo-600",
          bgColor: "bg-indigo-50",
          path: "/profiles",
        },
        {
          id: "news-monitor",
          name: "키워드 알림",
          icon: <BellRing className="w-6 h-6" />,
          color: "text-amber-600",
          bgColor: "bg-amber-50",
        },
        {
          id: "media-sending",
          name: "언론 보도 발송",
          icon: <Send className="w-6 h-6" />,
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
          path: "/admin/media-pitching",
        },
        {
          id: "profile-mgmt",
          name: "인물정보 관리",
          icon: <UserSearch className="w-6 h-6" />,
          color: "text-purple-600",
          bgColor: "bg-purple-50",
          path: "/profiles",
        },
        {
          id: "media-memo",
          name: "미디어 관계 메모",
          icon: <StickyNote className="w-6 h-6" />,
          color: "text-rose-500",
          bgColor: "bg-rose-50",
        },
        {
          id: "sns-posting",
          name: "SNS포스팅 생성",
          icon: <Share2 className="w-6 h-6" />,
          color: "text-cyan-600",
          bgColor: "bg-cyan-50",
        },
      ],
    },
    {
      title: "마케팅",
      apps: [
        {
          id: "marketing-plan",
          name: "마케팅 전략",
          icon: <Target className="w-6 h-6" />,
          color: "text-rose-600",
          bgColor: "bg-rose-50",
        },
        {
          id: "performance",
          name: "성과보고서",
          icon: <FilePieChart className="w-6 h-6" />,
          color: "text-slate-600",
          bgColor: "bg-slate-100",
        },
        {
          id: "campaign",
          name: "캠페인 관리",
          icon: <Megaphone className="w-6 h-6" />,
          color: "text-orange-600",
          bgColor: "bg-orange-50",
        },
        {
          id: "brand-review",
          name: "브랜드 제안 검토함",
          icon: <Inbox className="w-6 h-6" />,
          color: "text-violet-600",
          bgColor: "bg-violet-50",
        },
        {
          id: "sns-dashboard",
          name: "SNS/노출 지표",
          icon: <BarChart3 className="w-6 h-6" />,
          color: "text-blue-500",
          bgColor: "bg-blue-50",
        },
        {
          id: "roi-sim",
          name: "ROI 시뮬레이션",
          icon: <Calculator className="w-6 h-6" />,
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
        },
      ],
    },
    {
      title: "재무",
      apps: [
        {
          id: "billing-inbox",
          name: "외부청구함",
          icon: <Receipt className="w-6 h-6" />,
          color: "text-rose-500",
          bgColor: "bg-rose-50",
        },
        {
          id: "draft",
          name: "기안서",
          icon: <FileText className="w-6 h-6" />,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
        },
        {
          id: "approval",
          name: "지출결의서",
          icon: <FileCheck2 className="w-6 h-6" />,
          color: "text-orange-500",
          bgColor: "bg-orange-50",
        },
        {
          id: "civil-doc",
          name: "민원서류",
          icon: <ScrollText className="w-6 h-6" />,
          color: "text-slate-600",
          bgColor: "bg-slate-100",
        },
        {
          id: "vehicle-report",
          name: "차량 운행정산서",
          icon: <Car className="w-6 h-6" />,
          color: "text-slate-700",
          bgColor: "bg-slate-100",
          path: "/admin/driving",
        },
        {
          id: "monthly-budget",
          name: "월간예산",
          icon: <Wallet className="w-6 h-6" />,
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
        },
        {
          id: "my-cards",
          name: "내 법인카드",
          icon: <CreditCard className="w-6 h-6" />,
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
          path: "/apps/finance/cards",
        },
        {
          id: "revenue-track",
          name: "계약별 수익 트래킹",
          icon: <TrendingUp className="w-6 h-6" />,
          color: "text-indigo-600",
          bgColor: "bg-indigo-50",
        },
        {
          id: "cashflow-cal",
          name: "현금흐름 캘린더",
          icon: <CalendarClock className="w-6 h-6" />,
          color: "text-cyan-600",
          bgColor: "bg-cyan-50",
        },
      ],
    },
    {
      title: "인사",
      apps: [
        {
          id: "leave-request",
          name: "휴가신청",
          icon: <Palmtree className="w-6 h-6" />,
          color: "text-emerald-500",
          bgColor: "bg-emerald-50",
          path: "/leave-request",
        },
        {
          id: "leave-mgmt",
          name: "휴가 관리",
          icon: <CalendarDays className="w-6 h-6" />,
          color: "text-teal-600",
          bgColor: "bg-teal-50",
        },
        {
          id: "attendance",
          name: "출퇴근",
          icon: <Clock className="w-6 h-6" />,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          path: "/admin/attendance",
        },
        {
          id: "org-chart",
          name: "조직도",
          icon: <Network className="w-6 h-6" />,
          color: "text-purple-600",
          bgColor: "bg-purple-50",
        },
        {
          id: "labor-contract",
          name: "근로계약서",
          icon: <FileSignature className="w-6 h-6" />,
          color: "text-amber-600",
          bgColor: "bg-amber-50",
        },
        {
          id: "comp-leave",
          name: "보상휴가 관리",
          icon: <Gift className="w-6 h-6" />,
          color: "text-pink-500",
          bgColor: "bg-pink-50",
        },
      ],
    },
    {
      title: "공용",
      apps: [
        {
          id: "scheduler",
          name: "통합 스케줄러",
          icon: <Calendar className="w-6 h-6" />,
          color: "text-indigo-600",
          bgColor: "bg-indigo-50",
          path: "/admin/schedules",
        },
        {
          id: "regulations",
          name: "규정",
          icon: <BookOpen className="w-6 h-6" />,
          color: "text-slate-600",
          bgColor: "bg-slate-100",
        },
        {
          id: "project-info",
          name: "프로젝트 정보",
          icon: <FolderOpen className="w-6 h-6" />,
          color: "text-amber-500",
          bgColor: "bg-amber-50",
        },
        {
          id: "docs-minutes",
          name: "문서&회의록",
          icon: <FileArchive className="w-6 h-6" />,
          color: "text-blue-500",
          bgColor: "bg-blue-50",
        },
        {
          id: "notifications",
          name: "알림 센터",
          icon: <Bell className="w-6 h-6" />,
          color: "text-rose-500",
          bgColor: "bg-rose-50",
        },
        {
          id: "global-search",
          name: "통합 검색",
          icon: <Search className="w-6 h-6" />,
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
        },
        {
          id: "wreath",
          name: "화환신청",
          icon: <Flower2 className="w-6 h-6" />,
          color: "text-pink-500",
          bgColor: "bg-pink-50",
        },
        {
          id: "password-mgmt",
          name: "비밀번호 관리",
          icon: <KeyRound className="w-6 h-6" />,
          color: "text-slate-700",
          bgColor: "bg-slate-100",
        },
      ],
    },
  ];

  const categoryRouteMap: Record<string, string> = {
    매니지먼트: "management",
    홍보: "pr",
    마케팅: "marketing",
    재무: "finance",
    인사: "hr",
    공용: "common",
  };

  const handleAppClick = (app: AppItem) => {
    if (app.path) {
      navigate(app.path);
    } else {
      toast.info("준비 중인 기능입니다.");
    }
  };

  const handleCategoryClick = (title: string) => {
    const route = categoryRouteMap[title];
    if (route) {
      navigate(`/apps/${route}`);
    }
  };

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900" />
      <div className="relative z-10 p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {appCategories.map((category) => (
            <div
              key={category.title}
              className="bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-xl border border-white/50"
            >
              <button
                onClick={() => handleCategoryClick(category.title)}
                className="w-full font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2 text-sm tracking-wide text-left hover:text-blue-600 transition-colors flex items-center justify-between"
              >
                <span>
                  {category.title}
                  <span className="ml-2 text-xs font-normal text-slate-400">{category.apps.length}</span>
                </span>
                <span className="text-xs text-slate-400">전체보기 →</span>
              </button>
              <div className="grid grid-cols-4 gap-3">
                {category.apps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => handleAppClick(app)}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <div
                      className={`w-12 h-12 ${app.bgColor} rounded-xl flex items-center justify-center ${app.color} group-hover:scale-110 transition-transform shadow-sm border border-white`}
                    >
                      {app.icon}
                    </div>
                    <span className="text-[10px] font-medium text-slate-600 text-center leading-tight break-keep">
                      {app.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
