import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, Key, UserCog, Laptop, Database, ShieldCheck, ArrowLeft, Mail,
  Building, CreditCard, CarFront, Megaphone, Target, Navigation, Handshake, Eye, Calendar, ShieldAlert
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AdminSystem = () => {
  const navigate = useNavigate();
  const adminMenus = [
    { 
      title: "회사 정보 관리", 
      icon: <Building className="w-6 h-6" />, 
      path: "/admin/company", 
      color: "bg-orange-500", 
      desc: "사업자 정보 및 공식 문서 관리" 
    },
    { 
      title: "금융 연동 설정", 
      icon: <Database className="w-6 h-6" />, 
      path: "/admin/finance-settings", // 아까 App.tsx에 등록한 경로
      color: "bg-blue-600", 
      desc: "CODEF API 인증 및 계좌/카드 연동 관리" 
    },
    { 
      title: "메일 서버 설정", 
      icon: <Mail className="w-6 h-6" />, 
      path: "/admin/mail-settings", 
      color: "bg-blue-400", 
      desc: "전사 Gmail / 네이버웍스 API 및 OAuth 연동 관리" 
    },
    { 
      title: "인사 관리", 
      icon: <Users className="w-6 h-6" />, 
      path: "/admin/hr", 
      color: "bg-blue-500", 
      desc: "직원 명부 및 부서 관리" 
    },
    { 
      title: "배우 관리", 
      icon: <UserCog className="w-6 h-6" />, 
      path: "/admin/artists", 
      color: "bg-indigo-500", 
      desc: "아티스트 마스터 데이터 관리" 
    },
    { 
      title: "법인카드 관리", 
      icon: <CreditCard className="w-6 h-6" />, 
      path: "/admin/cards", 
      color: "bg-rose-500", 
      desc: "법인카드 사용 내역 및 증빙 관리" 
    },
    { 
      title: "차량 관리", 
      icon: <CarFront className="w-6 h-6" />, 
      path: "/admin/vehicles", 
      color: "bg-emerald-500", 
      desc: "법인 차량 리스 및 보험 관리" 
    },
    { 
    title: "부서 및 직급 관리", 
    icon: <Users className="w-6 h-6" />, 
    path: "/admin/org-chart", 
    color: "bg-emerald-500", 
    desc: "사내 조직도, 부서장 및 직급 체계 설정" 
    },
    { 
      title: "프로젝트 마스터", 
      icon: <Target className="w-6 h-6" />, 
      path: "/admin/projects", 
      color: "bg-violet-500", 
      desc: "진행 사업 관리 및 비용 정산 코드 제어" 
    },
    { 
      title: "실시간 운행 관제", 
      icon: <Navigation className="w-6 h-6" />, 
      path: "/admin/driving", 
      color: "bg-slate-900", 
      desc: "GPS 기반 주행일지 자동 생성 및 기록" 
    },
    { 
      title: "키워드 관리", 
      icon: <Key className="w-6 h-6" />, 
      path: "/admin/keywords", 
      color: "bg-amber-500", 
      desc: "검색어 필터링 및 태그 관리" 
    },
    { 
      title: "미디어 피칭", 
      icon: <Megaphone className="w-6 h-6" />, 
      path: "/admin/media-pitching", 
      color: "bg-pink-500", 
      desc: "언론사 배포 및 홍보 관리" 
    },
    { 
      title: "API 설정", 
      icon: <Laptop className="w-6 h-6" />, 
      path: "/admin/api-settings", 
      color: "bg-slate-600", 
      desc: "외부 시스템 연동 설정" 
    },
    { 
      title: "배우 스케줄 관리", 
      icon: <Calendar className="w-6 h-6" />, 
      path: "/admin/schedules", 
      color: "bg-sky-500", 
      desc: "배우별 일정 등록 및 관리" 
    },
    { 
      title: "파트너사 관리", 
      icon: <Handshake className="w-6 h-6" />, 
      path: "/admin/partnerships", 
      color: "bg-teal-500", 
      desc: "외부 파트너 회사와 데이터 공유 관리" 
    },
    { 
      title: "파트너 데이터 열람", 
      icon: <Eye className="w-6 h-6" />, 
      path: "/admin/partner-data", 
      color: "bg-cyan-500", 
      desc: "연결된 파트너사의 공유 데이터 조회" 
    },
    { 
      title: "Drive 설정", 
      icon: <Database className="w-6 h-6" />, 
      path: "/admin/drive-settings", 
      color: "bg-blue-600", 
      desc: "전사 스토리지 구성" 
    },
    { 
      title: "보안관리", 
      icon: <ShieldAlert className="w-6 h-6" />, 
      path: "/admin/security", 
      color: "bg-red-600", 
      desc: "공유 계정 비밀번호 관리 및 접근 권한 제어" 
    },
  ];

  return (
    <div className="pb-16 px-6 max-w-7xl mx-auto py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold mb-2">
              <ShieldCheck className="w-5 h-5" /> Admin System Only
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">본사 통합 관리 센터</h1>
            <p className="text-slate-500 mt-2 text-lg">회사 인프라와 권한 설정을 관리하는 시스템 허브입니다.</p>
          </div>
          <Button variant="ghost" className="gap-2" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4" /> 대시보드로 돌아가기
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminMenus.map((menu) => (
            <div key={menu.title} onClick={() => navigate(menu.path)} className="cursor-pointer">
              <Card className="hover:shadow-xl transition-all border-none shadow-sm group overflow-hidden bg-white">
                <CardContent className="p-8 flex items-start gap-6">
                  <div className={`p-4 rounded-2xl ${menu.color} text-white shadow-lg shadow-current/20 group-hover:scale-110 transition-transform`}>
                    {menu.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-slate-800">{menu.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{menu.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
    </div>
  );
};

export default AdminSystem;
