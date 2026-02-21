import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  FileText, 
  User, 
  Users, 
  Calendar as CalendarIcon, 
  MapPin, 
  Mail, 
  ArrowLeft,
  Save,
  Loader2,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COMPANY_TYPES } from "@/lib/companyTypes";

const TenantRegistration = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [isJointRep, setIsJointRep] = useState(false);
  const [members, setMembers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    domain_prefix: "",
    company_type: "talent_agency",
    biz_number: "",
    corp_number: "",
    rep_name: "",
    opening_date: "",
    tax_email: "",
    biz_type: "",
    biz_item: "",
    address: "",
  });

  useEffect(() => {
    if (isEditMode) {
      const getTenantAndMembers = async () => {
        try {
          // 1. 고객사 상세 정보 가져오기
          const { data: tenant, error: tenantError } = await supabase
            .from("tenants")
            .select("*")
            .eq("id", id)
            .single();

          if (tenantError) throw tenantError;

          // 2. 소속 임직원 목록 가져오기 (관계 모호성 해결을 위해 user_id 명시)
          const { data: memberData, error: memberError } = await supabase
            .from("tenant_memberships")
            .select(`
              id,
              role,
              department,
              job_title,
              profiles:user_id (
                id,
                full_name,
                email,
                avatar_url
              )
            `)
            .eq("tenant_id", id);

          if (memberError) throw memberError;

          if (tenant) {
            const prefix = tenant.domain?.split(".")[0] || "";
            setFormData({
              name: tenant.name || "",
              domain_prefix: prefix,
              company_type: (tenant as any).company_type || "talent_agency",
              biz_number: tenant.biz_number || "",
              corp_number: tenant.corp_number || "",
              rep_name: tenant.rep_name || "",
              opening_date: tenant.opening_date || "",
              tax_email: tenant.tax_email || "",
              biz_type: tenant.biz_type || "",
              biz_item: tenant.biz_item || "",
              address: tenant.address || "",
            });
            if (tenant.rep_name?.includes(",")) setIsJointRep(true);
          }

          if (memberData) {
            setMembers(memberData);
          }
        } catch (error: any) {
          console.error("Fetch error:", error);
          toast.error("정보를 불러오는 중 오류가 발생했습니다.");
        } finally {
          setFetching(false);
        }
      };

      getTenantAndMembers();
    }
  }, [id, isEditMode, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const fullDomain = formData.domain_prefix 
        ? `${formData.domain_prefix.toLowerCase()}.arkport.io` 
        : null;

      const payload = {
        name: formData.name,
        domain: fullDomain,
        company_type: formData.company_type,
        biz_number: formData.biz_number,
        corp_number: formData.corp_number,
        rep_name: formData.rep_name,
        opening_date: formData.opening_date,
        tax_email: formData.tax_email,
        biz_type: formData.biz_type,
        biz_item: formData.biz_item,
        address: formData.address,
      } as any;

      if (isEditMode) {
        const { error } = await supabase.from("tenants").update(payload).eq("id", id);
        if (error) throw error;
        toast.success("정보가 수정되었습니다.");
      } else {
        const { error } = await supabase.from("tenants").insert([payload]);
        if (error) throw error;
        toast.success("새 고객사가 등록되었습니다.");
      }
      navigate("/super-admin");
    } catch (error: any) {
      toast.error("저장 실패: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  if (fetching) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate("/super-admin")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> 슈퍼 어드민 대시보드로 돌아가기
          </button>

          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">
              고객사 정보 수정
            </h1>
            <p className="text-muted-foreground">테넌트 인프라 및 사업자 세부 정보를 관리합니다.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 1. 시스템 접속 정보 */}
            <Card className="glass-card border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="w-5 h-5 text-primary" /> 시스템 접속 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">회사 식별 이름 (내부용)</Label>
                  <Input id="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain_prefix">접속 서브도메인</Label>
                  <div className="flex items-center">
                    <Input id="domain_prefix" value={formData.domain_prefix} onChange={handleChange} className="rounded-r-none border-r-0" required />
                    <span className="bg-secondary px-3 h-10 flex items-center border border-input rounded-r-md text-sm">.arkport.io</span>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>회사 유형</Label>
                  <Select value={formData.company_type} onValueChange={(v) => setFormData(prev => ({ ...prev, company_type: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="회사 유형 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.emoji} {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* 2. 임직원 현황 섹션 */}
            <Card className="glass-card shadow-md border-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-accent" /> 소속 임직원 현황
                </CardTitle>
                <CardDescription>현재 이 고객사에 등록된 총 {members.length}명의 인력입니다. 대표 관리자는 회사 관리 메뉴에 접근할 수 있습니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {members.length > 0 ? (
                    members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={member.profiles?.avatar_url} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {member.profiles?.full_name?.substring(0, 1) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-bold flex items-center gap-2">
                              {member.profiles?.full_name}
                              <Badge variant={member.role === 'company_admin' ? 'default' : 'secondary'} className="text-[10px] h-4">
                                {member.role === 'company_admin' ? '대표 관리자' : member.role === 'manager' ? '매니저' : '사원'}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">{member.profiles?.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right hidden sm:block">
                            <div className="text-xs font-medium">{member.department || "부서 미지정"}</div>
                            <div className="text-[11px] text-muted-foreground">{member.job_title || "직함 미지정"}</div>
                          </div>
                          {member.role !== 'company_admin' ? (
                            <Button 
                              type="button"
                              variant="outline" 
                              size="sm"
                              onClick={async () => {
                                try {
                                  const { error } = await supabase
                                    .from("tenant_memberships")
                                    .update({ role: 'company_admin' })
                                    .eq("id", member.id);
                                  if (error) throw error;
                                  toast.success(`${member.profiles?.full_name}님을 대표 관리자로 지정했습니다.`);
                                  setMembers(prev => prev.map(m => 
                                    m.id === member.id ? { ...m, role: 'company_admin' } : m
                                  ));
                                } catch (error: any) {
                                  toast.error("권한 변경 실패: " + error.message);
                                }
                              }}
                            >
                              관리자 지정
                            </Button>
                          ) : (
                            <Button 
                              type="button"
                              variant="ghost" 
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={async () => {
                                try {
                                  const { error } = await supabase
                                    .from("tenant_memberships")
                                    .update({ role: 'employee' })
                                    .eq("id", member.id);
                                  if (error) throw error;
                                  toast.success(`${member.profiles?.full_name}님의 관리자 권한을 해제했습니다.`);
                                  setMembers(prev => prev.map(m => 
                                    m.id === member.id ? { ...m, role: 'employee' } : m
                                  ));
                                } catch (error: any) {
                                  toast.error("권한 변경 실패: " + error.message);
                                }
                              }}
                            >
                              권한 해제
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">등록된 임직원이 없습니다.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 3. 사업자 등록 정보 */}
            <Card className="glass-card shadow-md">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5 text-primary" /> 사업자 등록 정보
                  </CardTitle>
                  <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full border border-border">
                    <Label htmlFor="joint-rep-switch" className="text-xs cursor-pointer">공동대표 여부</Label>
                    <Switch id="joint-rep-switch" checked={isJointRep} onCheckedChange={setIsJointRep} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="biz_number">등록번호 (사업자번호)</Label>
                    <Input id="biz_number" value={formData.biz_number} onChange={handleChange} placeholder="000-00-00000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rep_name">대표자 성명</Label>
                    <div className="relative">
                      {isJointRep ? <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" /> : <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />}
                      <Input id="rep_name" value={formData.rep_name} onChange={handleChange} className="pl-10" placeholder={isJointRep ? "쉼표(,)로 구분 입력" : "성함 입력"} />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="corp_number">법인등록번호</Label>
                    <Input id="corp_number" value={formData.corp_number} onChange={handleChange} placeholder="000000-0000000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="opening_date">개업연월일</Label>
                    <Input id="opening_date" value={formData.opening_date} onChange={handleChange} type="date" />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="tax_email">전자세금계산서 이메일</Label>
                    <Input id="tax_email" value={formData.tax_email} onChange={handleChange} type="email" placeholder="tax@company.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="biz_type">업태</Label>
                      <Input id="biz_type" value={formData.biz_type} onChange={handleChange} placeholder="서비스업" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="biz_item">종목</Label>
                      <Input id="biz_item" value={formData.biz_item} onChange={handleChange} placeholder="광고 대행" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">사업장 소재지</Label>
                  <Textarea id="address" value={formData.address} onChange={handleChange} className="min-h-[80px]" placeholder="사업장 주소를 입력하세요." />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-4 pt-4 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => navigate("/super-admin")}>취소</Button>
              <Button type="submit" variant="hero" size="xl" disabled={loading} className="px-12">
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                {isEditMode ? "수정 완료" : "고객사 등록 완료"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default TenantRegistration;