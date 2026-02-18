import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Header, HeaderRenderedProvider } from "@/components/landing/Header";
import { NAV_CATEGORIES, SUB_MENUS } from "@/lib/navigation";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronRight, Home, Mail, Car, Calendar, FileText, ClipboardCheck, Layers, Sparkles 
} from "lucide-react"; 
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Auto-detect category from URL
  const detectCategory = () => {
    const path = location.pathname;
    if (path.startsWith("/apps/")) return path.split("/")[2] || "management";
    if (path.startsWith("/admin/media-pitching") || path === "/profiles") return "pr";
    if (path.startsWith("/admin/driving")) return "finance";
    if (path.startsWith("/admin/schedules")) return "common";
    if (path.startsWith("/admin/hr") || path.startsWith("/admin/org") || path === "/my-page" || path.startsWith("/admin/attendance")) return "hr";
    if (path.startsWith("/admin/cards") || path.startsWith("/admin/vehicles")) return "finance";
    if (path.startsWith("/admin/keywords")) return "pr";
    return "management";
  };
  
  const [activeCategory, setActiveCategory] = useState(detectCategory);
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const currentCategoryInfo = NAV_CATEGORIES.find(c => c.id === activeCategory);
  const subMenuItems = SUB_MENUS[activeCategory] || [];

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-hidden">
      {/* 1. 헤더 영역 (최상위) */}
      <div className="z-[60] shrink-0">
        <Header />
      </div>
      
      {/* 2. 메인 바디 영역 */}
      <main className="flex-1 flex relative h-[calc(100vh-64px)] mt-16">
        
        {/* 사이드바 컨테이너 */}
        <div 
          className="flex h-full z-40 shrink-0"
          onMouseLeave={() => setIsMenuVisible(false)}
        >
          {/* Tier 1: 최좌측 아이콘 바 (항상 보임) */}
          <aside 
            className="w-[70px] bg-white border-r border-slate-100 flex flex-col items-center py-6 gap-4 shrink-0 z-50 shadow-[10px_0_30px_rgba(0,0,0,0.03)]"
            onMouseEnter={() => setIsMenuVisible(true)}
          >
            <button onClick={() => navigate("/dashboard")} className="w-11 h-11 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 mb-2 transition-all">
              <Home className="w-5 h-5" />
            </button>
            
            {NAV_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onMouseEnter={() => setActiveCategory(cat.id)}
                onClick={() => navigate(`/apps/${cat.id}`)}
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 relative group",
                  activeCategory === cat.id 
                    ? `${cat.color} text-white shadow-lg shadow-current/30 scale-105` 
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                )}
              >
                {cat.icon}
                {activeCategory === cat.id && (
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-slate-800 rounded-r-full" />
                )}
              </button>
            ))}

            <div className="w-8 h-[1px] bg-slate-100 my-2" />

            <div className="flex flex-col gap-3">
              {[
                { icon: <Mail className="w-5 h-5" />, path: "/apps/common" },
                { icon: <Car className="w-5 h-5" />, path: "/admin/driving" },
                { icon: <Calendar className="w-5 h-5" />, path: "/admin/schedules" },
                { icon: <FileText className="w-5 h-5" />, path: "/apps/finance" },
                { icon: <ClipboardCheck className="w-5 h-5" />, path: "/apps/finance" },
              ].map((item, idx) => (
                <button key={idx} onClick={() => navigate(item.path)} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
                  {item.icon}
                </button>
              ))}
            </div>
          </aside>

          {/* Tier 2: 슬라이딩 메뉴 패널 (수정 핵심) */}
          <aside className={cn(
              "absolute left-[70px] top-0 h-full w-64 text-white flex flex-col transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] z-40 shadow-[30px_0_60px_rgba(0,0,0,0.1)]",
              `bg-gradient-to-br ${currentCategoryInfo?.gradient}`,
              isMenuVisible ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0 pointer-events-none"
            )}>
            
            {/* 상단 텍스트 영역: pt-12 정도로 적절한 여백 부여 */}
            <div className="px-8 pt-12 pb-6"> 
              <div className="flex items-center gap-2 mb-2 opacity-70">
                <Layers className="w-3 h-3" />
                <span className="text-[10px] font-black uppercase tracking-widest">ArkPort Engine</span>
              </div>
              <h2 className="text-3xl font-black tracking-tighter leading-tight">
                {currentCategoryInfo?.label}
              </h2>
            </div>
            
            <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-1.5 scrollbar-hide">
              {subMenuItems.map((item) => (
                <button key={item.id} onClick={() => { if (item.path) navigate(item.path); setIsMenuVisible(false); }}
                  className={cn("w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-[13px] font-extrabold transition-all duration-300 group",
                    location.pathname === item.path 
                      ? "bg-white text-slate-900 shadow-xl scale-[1.02]" 
                      : "hover:bg-white/15 text-white/80 hover:text-white"
                  )}>
                  <div className="flex items-center gap-4">
                    {React.cloneElement(item.icon as React.ReactElement, { 
                      className: cn("w-4 h-4 transition-colors", location.pathname === item.path ? "text-blue-600" : "text-white/60 group-hover:text-white") 
                    })}
                    <span>{item.name}</span>
                  </div>
                  <ChevronRight className={cn("w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all", location.pathname === item.path && "hidden")} />
                </button>
              ))}
            </nav>
            
            <div className="p-6 bg-black/5 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Platform OS</span>
              <Badge className="bg-white/20 hover:bg-white/20 text-[9px] border-none font-black">PRO</Badge>
            </div>
          </aside>
        </div>

        {/* 3. 본문 영역 */}
        <div className="flex-1 bg-white overflow-y-auto relative z-0 scrollbar-hide">
          <HeaderRenderedProvider>
            {children}
          </HeaderRenderedProvider>
        </div>
      </main>
    </div>
  );
};
