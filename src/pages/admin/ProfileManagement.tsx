import { Header } from "@/components/landing/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, ArrowLeft, Construction } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ProfileManagement = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="pt-28 pb-16 px-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <User className="w-8 h-8 text-primary" /> 인물정보 등록 관리
            </h1>
            <p className="text-slate-500 mt-1">네이버/다음 인물검색 위임장 자동 생성</p>
          </div>
        </div>

        <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
          <CardContent className="p-16 text-center">
            <div className="inline-flex p-6 rounded-full bg-primary/10 mb-6">
              <Construction className="w-16 h-16 text-primary/60" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">기능 준비 중</h2>
            <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
              인물정보 관리 기능이 곧 제공됩니다.<br />
              네이버/다음 위임장 자동 생성, 신분증 관리 등의 기능이 포함될 예정입니다.
            </p>
            <Button 
              variant="outline" 
              className="mt-8"
              onClick={() => navigate("/admin")}
            >
              관리자 홈으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProfileManagement;
