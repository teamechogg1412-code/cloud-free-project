import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ClockInPopup } from "@/components/attendance/ClockInPopup";
import { AppGrid } from "@/components/dashboard/AppGrid";
import { usePendingApprovals } from "@/hooks/usePendingApprovals";
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
  Clock,
  UserCheck,
} from "lucide-react";

// 가상의 데이터 (기존 데이터 유지)
const mockNotices = [
  { id: "1", type: "notice", title: "2025년 1분기 전사 워크샵 안내", date: "2025-02-14", isNew: true },
  { id: "2", type: "notice", title: "사내 보안 교육 필수 이수 안내 (2/28까지)", date: "2025-02-12", isNew: true },
  { id: "3", type: "notice", title: "복리후생 제도 변경 공지", date: "2025-02-10", isNew: false },
];


const Dashboard = () => {
  const { currentTenant, profile } = useAuth();
  const navigate = useNavigate();
  const { myRequestItems, myTurnItems, myApprovedItems, totalCount } = usePendingApprovals();

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

          {/* 결재 워크플로우 - 두 그룹으로 분리 */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-xl flex items-center gap-3 text-slate-800">
                <AlertCircle className="w-6 h-6 text-amber-500" />
                결재 워크플로우
              </h3>
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none font-black px-3 py-1 rounded-full">
                {totalCount}건
              </Badge>
            </div>

            {totalCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <CheckCircle2 className="w-10 h-10 mb-3 text-emerald-400" />
                <p className="font-bold text-sm">처리 대기 중인 결재가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 내가 신청한 건 */}
                {myRequestItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1.5 h-5 bg-violet-500 rounded-full" />
                      <h4 className="text-sm font-black text-violet-700 uppercase tracking-wider">
                        내가 신청한 건 ({myRequestItems.length})
                      </h4>
                    </div>
                    <div className="space-y-3">
                      {myRequestItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => navigate("/leave-request")}
                          className="flex items-center gap-5 p-5 rounded-2xl hover:bg-violet-50/50 transition-all cursor-pointer border border-violet-100 group"
                        >
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-sm bg-violet-50 text-violet-500 group-hover:bg-violet-500 group-hover:text-white">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-md font-bold text-slate-700 truncate mb-1 group-hover:text-slate-900 transition-colors">
                              {item.leave_type} 신청
                            </div>
                            <div className="text-[11px] text-slate-400 font-bold tracking-tight">
                              {item.start_date} ~ {item.end_date} <span className="mx-2 opacity-30">|</span> {item.current_step}
                            </div>
                          </div>
                          <Badge className="bg-violet-100 text-violet-700 border-none text-[10px] font-black shrink-0">결재 대기</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 내가 승인해야 할 건 */}
                {myTurnItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1.5 h-5 bg-amber-500 rounded-full" />
                      <h4 className="text-sm font-black text-amber-700 uppercase tracking-wider">
                        내가 승인해야 할 건 ({myTurnItems.length})
                      </h4>
                    </div>
                    <div className="space-y-3">
                      {myTurnItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => navigate("/leave-request")}
                          className="flex items-center gap-5 p-5 rounded-2xl hover:bg-amber-50/50 transition-all cursor-pointer border border-amber-100 group"
                        >
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-sm bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white">
                            <UserCheck className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-md font-bold text-slate-700 truncate mb-1 group-hover:text-slate-900 transition-colors">
                              {item.requester_name}님의 {item.leave_type} 승인 요청
                            </div>
                            <div className="text-[11px] text-slate-400 font-bold tracking-tight">
                              {item.start_date} ~ {item.end_date} <span className="mx-2 opacity-30">|</span> {item.current_step}
                            </div>
                          </div>
                          <Badge className="bg-amber-500 text-white border-none text-[10px] font-black shrink-0">승인 필요</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 내가 승인했지만 아직 완료 안 된 건 */}
                {myApprovedItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1.5 h-5 bg-blue-500 rounded-full" />
                      <h4 className="text-sm font-black text-blue-700 uppercase tracking-wider">
                        승인 후 진행 중 ({myApprovedItems.length})
                      </h4>
                    </div>
                    <div className="space-y-3">
                      {myApprovedItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => navigate("/leave-request")}
                          className="flex items-center gap-5 p-5 rounded-2xl hover:bg-blue-50/50 transition-all cursor-pointer border border-blue-100 group"
                        >
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-sm bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white">
                            <Clock className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-md font-bold text-slate-700 truncate mb-1 group-hover:text-slate-900 transition-colors">
                              {item.requester_name}님의 {item.leave_type}
                            </div>
                            <div className="text-[11px] text-slate-400 font-bold tracking-tight">
                              {item.start_date} ~ {item.end_date} <span className="mx-2 opacity-30">|</span> {item.current_step}
                            </div>
                          </div>
                          <Badge className="bg-blue-100 text-blue-700 border-none text-[10px] font-black shrink-0">진행 중</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
  );
};

export default Dashboard;
