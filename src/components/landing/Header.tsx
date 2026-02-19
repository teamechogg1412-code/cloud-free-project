import { useState, useEffect, createContext, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  X,
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  CreditCard,
  Building2,
  ChevronDown,
  Users,
  ShieldCheck,
  LayoutDashboard,
  LayoutGrid,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// Context to prevent duplicate Header rendering inside DashboardLayout
const HeaderRenderedContext = createContext(false);
export const HeaderRenderedProvider = ({ children }: { children: React.ReactNode }) => (
  <HeaderRenderedContext.Provider value={true}>{children}</HeaderRenderedContext.Provider>
);

export const Header = () => {
  const isAlreadyRendered = useContext(HeaderRenderedContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const {
    user,
    profile,
    currentTenant,
    memberships,
    setCurrentTenant,
    signOut,
    isSuperAdmin,
    isCompanyAdmin,
    loading,
  } = useAuth();
  const navigate = useNavigate();

  // 권한 상태 확인용 (브라우저 콘솔에서 확인 가능)
  useEffect(() => {
    if (user && !loading) {
      console.log("Header UI Status:", {
        isSuperAdmin,
        isCompanyAdmin,
        tenant: currentTenant?.tenant.name,
      });
    }
  }, [user, loading, isSuperAdmin, isCompanyAdmin, currentTenant]);

  const navLinks = [];

  const handleSignOut = async () => {
    await signOut();
    toast.success("로그아웃되었습니다");
    navigate("/");
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.slice(0, 2);
  };

  // If Header is already rendered by DashboardLayout, skip this instance
  if (isAlreadyRendered) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* 1. 로고 섹션 */}
          <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">B</span>
            </div>
            <span className="font-bold text-lg hidden sm:block">
              <span className="gradient-text">ArkPort</span> OS
            </span>
          </Link>

          {/* 2. 회사 선택기 (로그인 시 노출) */}
          {user && memberships.length > 0 && (
            <div className="hidden lg:flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-sm font-normal min-w-[140px] justify-between border-primary/20 bg-primary/5 hover:bg-primary/10"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate font-semibold text-primary">
                        {currentTenant?.tenant.name || "회사 선택"}
                      </span>
                    </div>
                    <ChevronDown className="w-3 h-3 text-primary shrink-0" />
                  </Button>
                </DropdownMenuTrigger>



                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">접속 회사 전환</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {memberships.map((membership) => (
                    <DropdownMenuItem
                      key={membership.id}
                      className="cursor-pointer"
                      onClick={() => setCurrentTenant(membership)}
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      {membership.tenant.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>


                
              </DropdownMenu>
            </div>
          )}

          {/* 3. 검색바 (중앙) */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="검색어를 입력하세요..."
                className="pl-10 h-9 bg-secondary/50 border-transparent focus:border-primary/30"
              />
            </div>
          </div>

          {/* 4. 내비게이션 & 관리 버튼 세트 (우측) */}
          <div className="flex items-center gap-1 sm:gap-3">
            {/* 기본 메뉴 링크 (데스크탑 전용) */}
            <nav className="hidden xl:flex items-center gap-4 mr-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {user && !loading && (
              <div className="flex items-center gap-2 mr-2">
                {/* [스크린샷 반영] 슈퍼 어드민 센터 버튼 (빨간색) */}
                {isSuperAdmin && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="hidden sm:flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 font-bold h-9 px-4 rounded-lg shadow-sm border-none text-white"
                    onClick={() => navigate("/super-admin")}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    슈퍼 어드민 센터
                  </Button>
                )}

                {/* [스크린샷 반영] 관리 시스템 버튼 (파란색) */}
                {isCompanyAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:flex items-center gap-1.5 border-primary text-primary hover:bg-primary/5 font-bold h-9 px-4 rounded-lg shadow-sm"
                    onClick={() => navigate("/admin")}
                  >
                    <Settings className="w-4 h-4" />
                    관리 시스템
                  </Button>
                )}
              </div>
            )}

            {user ? (
              <>
                <Button variant="ghost" size="icon" className="w-9 h-9 text-muted-foreground hidden sm:flex">
                  <Bell className="w-5 h-5" />
                </Button>

                {/* 프로필 드롭다운 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2 px-2 h-9 hover:bg-primary/5">
                      <Avatar className="w-7 h-7 border border-primary/20">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold uppercase">
                          {getInitials(profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden md:block text-sm font-semibold">{profile?.full_name}</span>
                      <ChevronDown className="w-3 h-3 text-muted-foreground hidden md:block" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-64 border border-border shadow-xl">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <span className="text-sm font-bold">{profile?.full_name}</span>
                        <span className="text-xs text-muted-foreground font-normal truncate">{profile?.email}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/dashboard")}>
                      <LayoutDashboard className="w-4 h-4 mr-2 text-muted-foreground" /> 대시보드 홈
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/my-page")}>
                      <User className="w-4 h-4 mr-2 text-muted-foreground" /> 마이페이지
                    </DropdownMenuItem>

                    {/* 드롭다운 내 관리자 메뉴 백업 */}
                    {(isSuperAdmin || isCompanyAdmin) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-[10px] font-bold text-primary uppercase px-2 py-2">
                          Quick Access
                        </DropdownMenuLabel>
                        {isSuperAdmin && (
                          <DropdownMenuItem
                            className="text-rose-600 font-bold"
                            onClick={() => navigate("/super-admin")}
                          >
                            <ShieldCheck className="w-4 h-4 mr-2" /> 슈퍼 어드민 센터
                          </DropdownMenuItem>
                        )}
                        {isCompanyAdmin && (
                          <DropdownMenuItem className="text-primary font-bold" onClick={() => navigate("/admin")}>
                            <LayoutGrid className="w-4 h-4 mr-2" /> 통합 관리 센터
                          </DropdownMenuItem>
                        )}
                      </>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer">
                      <CreditCard className="w-4 h-4 mr-2" /> 결제 및 구독
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:text-destructive"
                      onClick={handleSignOut}
                    >
                      <LogOut className="w-4 h-4 mr-2" /> 로그아웃
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/auth">
                  <Button variant="ghost" size="sm">
                    로그인
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="default" size="sm" className="bg-primary">
                    시작하기
                  </Button>
                </Link>
              </div>
            )}

            {/* 모바일 메뉴 토글 버튼 */}
            <button className="xl:hidden p-2 text-muted-foreground" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 5. 모바일 메뉴 (반응형) */}
      {isMenuOpen && (
        <div className="xl:hidden border-t border-border bg-card p-4 space-y-4 shadow-inner">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="px-4 py-3 text-sm font-medium hover:bg-secondary rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {/* 모바일 버전 관리자 버튼 */}
            {user && (isSuperAdmin || isCompanyAdmin) && (
              <div className="pt-4 mt-2 border-t border-border space-y-2">
                <p className="px-4 text-[10px] font-bold text-muted-foreground uppercase mb-2">관리 도구</p>
                {isSuperAdmin && (
                  <Button
                    variant="destructive"
                    className="w-full justify-start bg-rose-600"
                    onClick={() => {
                      navigate("/super-admin");
                      setIsMenuOpen(false);
                    }}
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" /> 슈퍼 어드민 센터
                  </Button>
                )}
                {isCompanyAdmin && (
                  <Button
                    variant="outline"
                    className="w-full justify-start border-primary text-primary"
                    onClick={() => {
                      navigate("/admin");
                      setIsMenuOpen(false);
                    }}
                  >
                    <Settings className="w-4 h-4 mr-2" /> 관리 시스템
                  </Button>
                )}
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
