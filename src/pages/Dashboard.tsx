import { useAuth } from "@/hooks/useAuth";
import { ClockInPopup } from "@/components/attendance/ClockInPopup";
import { AppGrid } from "@/components/dashboard/AppGrid";
import { CalendarWidget } from "@/components/dashboard/CalendarWidget";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronRight,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";

// 가상의 데이터 (기존 데이터 유지)
const mockNotices = [
  { id: "1", type: "notice", title: "2025년 1분기 전사 워크샵 안내", date: "2025-02-14", isNew: true },
  { id: "2", type: "notice", title: "사내 보안 교육 필수 이수 안내 (2/28까지)", date: "2025-02-12", isNew: true },
  { id: "3", type: "notice", title: "복리후생 제도 변경 공지", date: "2025-02-10", isNew: false },
];

const mockReviewItems = [
  { id: "1", title: "견적서 승인 요청 - (주)ABC디자인", status: "pending", from: "김수연", time: "10분 전" },
  { id: "2", title: "지출결의서 검토 - 마케팅팀 캠페인 비용", status: "pending", from: "이준혁", time: "32분 전" },
  { id: "3", title: "휴가 신청 승인 - 박민서 (2/20~2/21)", status: "pending", from: "박민서", time: "1시간 전" },
  { id: "4", title: "차량 운행일지 확인 - 1월분", status: "done", from: "시스템", time: "2시간 전" },
];

const Dashboard = () => {
  const { currentTenant, profile } = useAuth();

  return (
      <div className="p-8 md:p-12 space-y-12 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <ClockInPopup />
        
        {/* 상단 웰컴 섹션 */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-[0.2em] mb-2">
              <Sparkles className="w-3.5 h-3.5" /> ArkPort Intelligent Workspace
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
              반갑습니다, <span className="text-blue-600">{profile?.full_name || "사용자"}</span>님.
            </h1>
            <p className="text-slate-500 mt-2 font-medium">
              오늘은 <span className="text-slate-900 font-bold">{currentTenant?.tenant?.name}</span>의 업무를 확인해 보세요.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
            <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-500 font-bold px-3 py-1">
              Standard Plan
            </Badge>
            <div className="h-8 w-[1px] bg-slate-100" />
            <span className="text-xs font-bold text-slate-400 px-2 uppercase tracking-widest">v1.2.0</span>
          </div>
        </section>

        {/* 1. 비즈니스 솔루션 (앱 그리드) */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-blue-600" />
              비즈니스 솔루션 탐색기
            </h2>
            <button className="text-xs font-bold text-blue-600 hover:underline">카테고리 설정</button>
          </div>
          {/* AppGrid 내부의 각 카드들도 세련된 디자인으로 렌더링됨 */}
          <AppGrid />
        </section>

        {/* 2. 통합 스케줄러 (중간 섹션) */}
        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <div className="w-1.5 h-7 bg-violet-600 rounded-full" />
              전사 통합 스케줄러
            </h2>
            <div className="flex gap-2">
               <Badge className="bg-violet-50 text-violet-600 border-violet-100 font-black">LIVE</Badge>
            </div>
          </div>
          <CalendarWidget />
        </section>

        {/* 3. 하단 알림 및 워크플로우 (2열 레이아웃) */}
        <section className="grid lg:grid-cols-2 gap-8 pb-12">
          
          {/* 전사 공지사항 */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-xl flex items-center gap-3 text-slate-800">
                <Bell className="w-6 h-6 text-blue-600" />
                사내 주요 공지
              </h3>
              <button className="p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </button>
            </div>
            <div className="space-y-4">
              {mockNotices.map((notice) => (
                <div key={notice.id} className="flex items-start gap-5 p-5 rounded-2xl hover:bg-blue-50/50 transition-all cursor-pointer group border border-transparent hover:border-blue-100">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-md font-bold text-slate-700 truncate group-hover:text-blue-700 transition-colors">
                        {notice.title}
                      </span>
                      {notice.isNew && <Badge className="bg-rose-500 text-[10px] h-4 font-black px-1.5 uppercase border-none">New</Badge>}
                    </div>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{notice.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 워크플로우 검토 (결재함) */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-xl flex items-center gap-3 text-slate-800">
                <AlertCircle className="w-6 h-6 text-amber-500" />
                미결재 워크플로우
              </h3>
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none font-black px-3 py-1 rounded-full">
                {mockReviewItems.filter(i => i.status === "pending").length}건 대기
              </Badge>
            </div>
            <div className="space-y-4">
              {mockReviewItems.map((item) => (
                <div key={item.id} className="flex items-center gap-5 p-5 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer border border-transparent hover:border-slate-100 group">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-sm ${
                    item.status === "done" ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white"
                  }`}>
                    {item.status === "done" ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <AlertCircle className="w-6 h-6" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-md font-bold text-slate-700 truncate mb-1 group-hover:text-slate-900 transition-colors">{item.title}</div>
                    <div className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">
                      Requester: <span className="text-slate-600">{item.from}</span> <span className="mx-2 opacity-30">|</span> {item.time}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 opacity-0 group-hover:opacity-100 transition-all">
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
  );
};

export default Dashboard;
