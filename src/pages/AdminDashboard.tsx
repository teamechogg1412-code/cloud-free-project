import { Header } from "@/components/landing/Header";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  Key, 
  UserCog, 
  Settings, 
  Database, 
  ArrowLeft, 
  ShieldCheck, 
  CreditCard, 
  CarFront,
  Building,
  Megaphone,
  Clock
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AdminSystem = () => {
  const navigate = useNavigate();

  // App.tsx의 Route path와 정확히 일치시켜야 합니다.
  const adminMenus = [
    { 
      title: "회사 정보 관리", 
      icon: <Building className="w-6 h-6 text-slate-600" />, 
      path: "/admin/company", 
      desc: "사업자 정보 및 공식 문서 관리" 
    },
    { 
      title: "인사 관리", 
      icon: <Users className="w-6 h-6 text-blue-600" />, 
      path: "/admin/hr", 
      desc: "임직원 정보, 권한 및 서류 관리" 
    },
    { 
      title: "배우 관리", 
      icon: <UserCog className="w-6 h-6 text-indigo-600" />, 
      path: "/admin/artists", 
      desc: "아티스트 DB 및 프로필 마스터 데이터" 
    },
    { 
      title: "법인카드 관리", 
      icon: <CreditCard className="w-6 h-6 text-orange-500" />, 
      path: "/admin/cards", 
      desc: "법인카드 사용자 및 결제 증빙 관리" 
    },
    { 
      title: "차량 관리", 
      icon: <CarFront className="w-6 h-6 text-emerald-600" />, 
      path: "/admin/vehicles", 
      desc: "법인 차량 리스료 및 보험, 사고 관리" 
    },
    { 
      title: "키워드 관리", 
      icon: <Key className="w-6 h-6 text-amber-500" />, 
      path: "/admin/keywords", 
      desc: "시스템 검색어 및 태그 데이터 관리" 
    },
    { 
      title: "미디어 피칭", 
      icon: <Megaphone className="w-6 h-6 text-rose-500" />, 
      path: "/admin/media-pitching", 
      desc: "언론사 배포 및 홍보 관리" 
    },
    { 
      title: "근로규칙 관리", 
      icon: <Clock className="w-6 h-6 text-teal-600" />, 
      path: "/admin/work-rules", 
      desc: "소정근로 및 최대근로 규칙 설정" 
    },
    { 
      title: "API 설정", 
      icon: <Settings className="w-6 h-6 text-slate-500" />, 
      path: "/admin/api-settings", 
      desc: "외부 연동 키 및 서비스 설정" 
    },
    { 
      title: "Drive 설정", 
      icon: <Database className="w-6 h-6 text-blue-500" />, 
      path: "/admin/drive-settings", 
      desc: "전사 저장소(Google Drive) 연동" 
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="pt-28 pb-16 px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <ShieldCheck className="w-5 h-5" />
              <span className="font-semibold text-sm">Corporate Admin Hub</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">본사 통합 관리 시스템</h1>
            <p className="text-muted-foreground mt-1">회사 운영 전반에 필요한 설정을 통합 제어합니다.</p>
          </div>
          <Button variant="ghost" className="gap-2" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" /> 대시보드
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {adminMenus.map((menu) => (
            <Link key={menu.title} to={menu.path} className="block h-full">
              <Card className="hover:shadow-xl transition-all border-none bg-white group cursor-pointer h-full border-b-4 border-transparent hover:border-primary">
                <CardContent className="p-8 flex flex-col items-start gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    {menu.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">
                      {menu.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {menu.desc}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminSystem;