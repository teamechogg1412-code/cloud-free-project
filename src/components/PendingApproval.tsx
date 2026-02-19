import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Clock, Building2, LogOut } from "lucide-react";

export const PendingApproval = () => {
  const { signOut, signupRequest, profile } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Logo */}
        <div className="inline-flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">A</span>
          </div>
          <span className="font-bold text-2xl">
            <span className="gradient-text">Ark</span>Port
          </span>
        </div>

        {/* Status Card */}
        <div className="glass-card p-8">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>

          <h2 className="text-2xl font-bold mb-2">승인 대기 중</h2>
          <p className="text-muted-foreground mb-6">
            관리자가 회원가입 요청을 검토하고 있습니다.
          </p>

          {signupRequest && (
            <div className="bg-secondary/50 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Building2 className="w-4 h-4" />
                <span>요청한 회사</span>
              </div>
              <p className="font-medium">{signupRequest.company_name}</p>
            </div>
          )}

          <div className="space-y-3 text-sm text-muted-foreground">
            <p>• 관리자 승인 후 시스템을 이용할 수 있습니다</p>
            <p>• 승인 완료 시 이메일로 알림을 받게 됩니다</p>
            <p>• 문의사항은 시스템 관리자에게 연락해주세요</p>
          </div>

          <Button
            variant="outline"
            className="mt-8 w-full"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          {profile?.email}로 로그인됨
        </p>
      </div>
    </div>
  );
};
