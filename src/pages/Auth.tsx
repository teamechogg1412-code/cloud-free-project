import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, Building2, CheckCircle, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COMPANY_TYPES } from "@/lib/companyTypes";

interface InvitationInfo {
  id: string;
  email: string;
  role: string;
  department: string | null;
  job_title: string | null;
  tenant_name: string;
  tenant_id: string;
}

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState<string>("talent_agency");
  const [loading, setLoading] = useState(false);
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 이미 로그인된 사용자는 대시보드로 리다이렉트
  const { user: authUser, loading: authLoading } = useAuth();
  useEffect(() => {
    if (!authLoading && authUser && !searchParams.get("invite")) {
      navigate("/dashboard", { replace: true });
    }
  }, [authUser, authLoading, navigate, searchParams]);

  // URL에서 초대 이메일 파라미터 확인
  useEffect(() => {
    const inviteEmail = searchParams.get("invite");
    if (inviteEmail) {
      setEmail(inviteEmail);
      setIsLogin(false);
      checkInvitation(inviteEmail);
    }
  }, [searchParams]);

  // 이메일 변경 시 초대 확인
  const checkInvitation = async (emailToCheck: string) => {
    if (!emailToCheck || emailToCheck.length < 5) {
      setInvitationInfo(null);
      return;
    }

    setCheckingInvite(true);
    try {
      const { data, error } = await supabase
        .from("employee_invitations")
        .select(`
          id, email, role, department, job_title, tenant_id,
          tenants:tenant_id ( name )
        `)
        .eq("email", emailToCheck.toLowerCase())
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        const tenantData = data.tenants as any;
        setInvitationInfo({
          id: data.id,
          email: data.email,
          role: data.role,
          department: data.department,
          job_title: data.job_title,
          tenant_name: tenantData?.name || "알 수 없음",
          tenant_id: data.tenant_id,
        });
      } else {
        setInvitationInfo(null);
      }
    } catch (err) {
      console.error("Invitation check error:", err);
      setInvitationInfo(null);
    } finally {
      setCheckingInvite(false);
    }
  };

  // 이메일 입력 변경 핸들러 (디바운스)
  useEffect(() => {
    if (!isLogin && email) {
      const timer = setTimeout(() => {
        checkInvitation(email);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setInvitationInfo(null);
    }
  }, [email, isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error("로그인 실패", {
            description: error.message,
          });
        } else {
          toast.success("로그인 성공!");
          navigate("/dashboard");
        }
      } else {
        if (!fullName.trim()) {
          toast.error("이름을 입력해주세요");
          setLoading(false);
          return;
        }
        // 초대가 없는 경우에만 회사명 필수
        if (!invitationInfo && !companyName.trim()) {
          toast.error("회사명을 입력해주세요");
          setLoading(false);
          return;
        }
        const { error } = await signUp(
          email,
          password,
          fullName,
          invitationInfo ? invitationInfo.tenant_name : companyName,
          invitationInfo ? undefined : companyType
        );
        if (error) {
          toast.error("회원가입 실패", {
            description: error.message,
          });
        } else {
          if (invitationInfo) {
            toast.success("회원가입이 완료되었습니다!", {
              description: `${invitationInfo.tenant_name}에 자동으로 등록되었습니다. 로그인해주세요.`,
            });
          } else {
            toast.success("회원가입이 완료되었습니다!", {
              description: "관리자 승인 후 시스템을 이용할 수 있습니다.",
            });
          }
          setIsLogin(true);
        }
      }
    } catch (err) {
      toast.error("오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "company_admin":
        return "관리자";
      case "manager":
        return "매니저";
      default:
        return "사원";
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">A</span>
            </div>
            <span className="font-bold text-2xl">
              <span className="gradient-text">Ark</span>Port
            </span>
          </div>
          <p className="text-muted-foreground">
            {isLogin ? "계정에 로그인하세요" : "새 계정을 만드세요"}
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass-card p-8">
          {/* 초대 정보 배너 */}
          {!isLogin && invitationInfo && (
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-foreground">
                    {invitationInfo.tenant_name}에서 초대했습니다
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {getRoleLabel(invitationInfo.role)}
                    </Badge>
                    {invitationInfo.department && (
                      <Badge variant="outline" className="text-xs">
                        {invitationInfo.department}
                      </Badge>
                    )}
                    {invitationInfo.job_title && (
                      <Badge variant="outline" className="text-xs">
                        {invitationInfo.job_title}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    가입 완료 시 자동으로 소속됩니다
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">이름</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="홍길동"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10"
                      required={!isLogin}
                    />
                  </div>
                </div>
                {/* 초대가 없는 경우에만 회사명 입력 표시 */}
                {!invitationInfo && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="companyName">회사명</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="companyName"
                          type="text"
                          placeholder="회사명을 입력하세요"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="pl-10"
                          required={!isLogin && !invitationInfo}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>회사 유형</Label>
                      <Select value={companyType} onValueChange={setCompanyType}>
                        <SelectTrigger>
                          <SelectValue placeholder="회사 유형을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPANY_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.emoji} {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        관리자 승인 후 해당 회사에 소속됩니다
                      </p>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={!!searchParams.get("invite")}
                />
                {checkingInvite && !isLogin && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  처리 중...
                </>
              ) : isLogin ? (
                "로그인"
              ) : (
                "회원가입"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setInvitationInfo(null);
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? (
                <>
                  계정이 없으신가요?{" "}
                  <span className="text-primary font-medium">회원가입</span>
                </>
              ) : (
                <>
                  이미 계정이 있으신가요?{" "}
                  <span className="text-primary font-medium">로그인</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          로그인하면 ArkPort 이용약관 및 개인정보처리방침에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
};

export default Auth;