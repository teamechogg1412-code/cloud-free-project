import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { NAV_CATEGORIES, SUB_MENUS } from "@/lib/navigation";
import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const AppModule = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  
  // 현재 카테고리 정보 가져오기
  const currentCategory = category || "management";
  const categoryInfo = NAV_CATEGORIES.find(c => c.id === currentCategory);
  const subMenuItems = SUB_MENUS[currentCategory] || [];

  const handleSubMenuClick = (item: any) => {
    if (item.path) {
      navigate(item.path);
    } else {
      toast.info(`'${item.name}' 기능은 준비 중입니다.`);
    }
  };

  return (
      <div className="p-8 md:p-12 max-w-7xl mx-auto animate-in fade-in duration-500">
        
        {/* 상단 타이틀 */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className={cn("p-2 rounded-xl text-white", categoryInfo?.color)}>
              {categoryInfo?.icon}
            </div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              {categoryInfo?.label} <span className="text-slate-400">전체 서비스</span>
            </h3>
          </div>
          <p className="text-slate-500 font-medium ml-12">
            원하시는 메뉴를 선택하여 업무를 시작하세요.
          </p>
        </div>

        {/* 서비스 앱 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {subMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSubMenuClick(item)}
              className="flex items-center gap-5 p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-500/50 hover:-translate-y-1 transition-all text-left group"
            >
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                `${categoryInfo?.color}/10`,
                categoryInfo?.color
              )}>
                {React.cloneElement(item.icon as React.ReactElement, { className: "w-7 h-7" })}
              </div>
              <div>
                <span className="font-bold text-lg text-slate-800 block group-hover:text-blue-600 transition-colors">
                  {item.name}
                </span>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Launch Service
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* 하단 안내 (선택 사항) */}
        <div className="mt-16 p-10 rounded-[3rem] bg-slate-50 border border-slate-100 text-center">
          <Construction className="w-12 h-12 mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-medium">더 많은 서비스가 곧 추가될 예정입니다.</p>
        </div>
      </div>
  );
};

export default AppModule;
