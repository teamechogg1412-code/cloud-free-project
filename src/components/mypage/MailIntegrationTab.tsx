import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Mail, Shield, CheckCircle2, AlertCircle, Loader2, 
  Trash2, Eye, EyeOff, RefreshCw 
} from "lucide-react";
import { toast } from "sonner";

interface MailConfig {
  id: string;
  provider: string;
  is_active: boolean;
  google_email: string | null;
  nw_client_id: string | null;
  nw_service_account: string | null;
  nw_domain_id: string | null;
  nw_user_id: string | null;
  last_synced_at: string | null;
  created_at: string;
}

interface Props {
  userId: string;
  tenantId: string;
}

export const MailIntegrationTab = ({ userId, tenantId }: Props) => {
  const [configs, setConfigs] = useState<MailConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  // NaverWorks form
  const [nwForm, setNwForm] = useState({
    nw_client_id: "",
    nw_client_secret: "",
    nw_service_account: "",
    nw_private_key: "",
    nw_domain_id: "",
    nw_user_id: "",
  });
  const [showSecret, setShowSecret] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, [userId, tenantId]);

  const fetchConfigs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_mail_configs")
      .select("id, provider, is_active, google_email, nw_client_id, nw_service_account, nw_domain_id, nw_user_id, last_synced_at, created_at")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId);

    if (!error && data) setConfigs(data as MailConfig[]);
    setLoading(false);
  };

  const maskValue = (val: string | null) => {
    if (!val) return "-";
    if (val.length <= 6) return "****";
    return val.substring(0, 4) + "****" + val.substring(val.length - 4);
  };

  const saveNaverWorks = async () => {
    if (!nwForm.nw_client_id || !nwForm.nw_client_secret || !nwForm.nw_service_account || !nwForm.nw_private_key) {
      toast.error("필수 항목을 모두 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      const existing = configs.find(c => c.provider === "naverworks");
      if (existing) {
        const { error } = await supabase.from("user_mail_configs").update({
          nw_client_id: nwForm.nw_client_id,
          nw_client_secret: nwForm.nw_client_secret,
          nw_service_account: nwForm.nw_service_account,
          nw_private_key: nwForm.nw_private_key,
          nw_domain_id: nwForm.nw_domain_id,
          nw_user_id: nwForm.nw_user_id,
          is_active: true,
        }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_mail_configs").insert({
          user_id: userId,
          tenant_id: tenantId,
          provider: "naverworks",
          nw_client_id: nwForm.nw_client_id,
          nw_client_secret: nwForm.nw_client_secret,
          nw_service_account: nwForm.nw_service_account,
          nw_private_key: nwForm.nw_private_key,
          nw_domain_id: nwForm.nw_domain_id,
          nw_user_id: nwForm.nw_user_id,
        });
        if (error) throw error;
      }
      toast.success("네이버웍스 연동 정보가 저장되었습니다.");
      setNwForm({ nw_client_id: "", nw_client_secret: "", nw_service_account: "", nw_private_key: "", nw_domain_id: "", nw_user_id: "" });
      await fetchConfigs();
    } catch (e: any) {
      toast.error("저장 실패: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGmailOAuth = async () => {
    setSaving(true);
    try {
      const redirectUri = `${window.location.origin}/auth/gmail/callback`;
      const res = await supabase.functions.invoke("gmail-oauth", {
        body: { action: "get_auth_url", tenantId, redirectUri },
      });
      if (res.error) throw res.error;
      if (!res.data?.authUrl) throw new Error(res.data?.error || "OAuth URL 생성 실패");
      
      // Store state for CSRF validation
      sessionStorage.setItem("gmail_oauth_state", res.data.state);
      sessionStorage.setItem("gmail_oauth_tenant_id", tenantId);
      
      // Redirect to Google
      window.location.href = res.data.authUrl;
    } catch (e: any) {
      toast.error("Gmail 연동 시작 실패: " + e.message);
      setSaving(false);
    }
  };

  const testConnection = async (configId: string, provider: string) => {
    setTesting(configId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("인증이 필요합니다.");

      const res = await supabase.functions.invoke("fetch-mail", {
        body: { action: "test", configId, provider },
      });

      if (res.error) throw res.error;
      if (res.data?.success) {
        toast.success(`${provider === "gmail" ? "Gmail" : "네이버웍스"} 연동 테스트 성공!`);
      } else {
        toast.error("연동 실패: " + (res.data?.error || "알 수 없는 오류"));
      }
    } catch (e: any) {
      toast.error("테스트 실패: " + e.message);
    } finally {
      setTesting(null);
    }
  };

  const deleteConfig = async (configId: string) => {
    try {
      const { error } = await supabase.from("user_mail_configs").delete().eq("id", configId);
      if (error) throw error;
      toast.success("연동 정보가 삭제되었습니다.");
      await fetchConfigs();
    } catch (e: any) {
      toast.error("삭제 실패: " + e.message);
    }
  };

  const gmailConfig = configs.find(c => c.provider === "gmail");
  const nwConfig = configs.find(c => c.provider === "naverworks");

  if (loading) {
    return (
      <Card className="border-none shadow-lg rounded-2xl">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-muted-foreground text-sm">불러오는 중...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" /> 메일 연동 설정
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          외부 메일 서비스를 연동하여 사내 메일함에서 실시간으로 메일을 조회할 수 있습니다.
        </p>
        <div className="flex items-center gap-2 mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
          <Shield className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            입력된 정보는 암호화 저장되며, 메일 본문은 서버에 저장되지 않습니다. (Stateless 방식)
          </p>
        </div>
      </CardHeader>

      <CardContent className="p-6 md:p-8">
        {/* 연동 현황 */}
        {configs.length > 0 && (
          <div className="mb-8 space-y-3">
            <h3 className="text-sm font-bold text-foreground mb-3">연동 현황</h3>
            {configs.map(config => (
              <div key={config.id} className="flex items-center justify-between p-4 rounded-2xl border border-border/50 bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                    config.provider === "gmail" 
                      ? "bg-red-50 text-red-600 dark:bg-red-950/30" 
                      : "bg-green-50 text-green-600 dark:bg-green-950/30"
                  }`}>
                    {config.provider === "gmail" ? "G" : "NW"}
                  </div>
                  <div>
                    <p className="text-sm font-bold">
                      {config.provider === "gmail" ? "Google Gmail" : "네이버웍스"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {config.provider === "gmail" 
                        ? config.google_email || "이메일 미등록"
                        : maskValue(config.nw_client_id)
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={config.is_active ? "default" : "secondary"} className="text-[10px]">
                    {config.is_active ? (
                      <><CheckCircle2 className="w-3 h-3 mr-1" /> 활성</>
                    ) : (
                      <><AlertCircle className="w-3 h-3 mr-1" /> 비활성</>
                    )}
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-8 text-xs"
                    onClick={() => testConnection(config.id, config.provider)}
                    disabled={testing === config.id}>
                    {testing === config.id 
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> 
                      : <RefreshCw className="w-3.5 h-3.5" />}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive"
                    onClick={() => deleteConfig(config.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 새 연동 추가 */}
        <Tabs defaultValue="gmail" className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="gmail" className="flex-1 gap-1.5">
              <span className="text-red-500 font-bold text-xs">G</span> Gmail
            </TabsTrigger>
            <TabsTrigger value="naverworks" className="flex-1 gap-1.5">
              <span className="text-green-500 font-bold text-xs">NW</span> 네이버웍스
            </TabsTrigger>
          </TabsList>

          {/* Gmail 설정 */}
          <TabsContent value="gmail">
            <div className="space-y-4 p-4 rounded-2xl bg-muted/30 border border-border/50">
              {gmailConfig ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium">Gmail이 이미 연동되어 있습니다.</p>
                  <p className="text-xs text-muted-foreground mt-1">{gmailConfig.google_email}</p>
                  <p className="text-xs text-muted-foreground mt-3">
                    수정하려면 기존 연동을 삭제 후 다시 등록해주세요.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
                    <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed">
                      <strong>Gmail 연동 방법:</strong> 아래 버튼을 클릭하면 Google 로그인 화면으로 이동합니다. 
                      로그인 후 메일 읽기 권한을 허용하면 자동으로 연동이 완료됩니다.
                    </p>
                  </div>
                  <Button 
                    onClick={handleGmailOAuth} 
                    disabled={saving} 
                    className="w-full rounded-xl h-12 text-sm font-semibold gap-2"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    Google 계정으로 연동하기
                  </Button>
                </>
              )}
            </div>
          </TabsContent>

          {/* 네이버웍스 설정 */}
          <TabsContent value="naverworks">
            <div className="space-y-4 p-4 rounded-2xl bg-muted/30 border border-border/50">
              {nwConfig ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium">네이버웍스가 이미 연동되어 있습니다.</p>
                  <p className="text-xs text-muted-foreground mt-1">Client ID: {maskValue(nwConfig.nw_client_id)}</p>
                  <p className="text-xs text-muted-foreground mt-3">
                    수정하려면 기존 연동을 삭제 후 다시 등록해주세요.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-xl bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800">
                    <p className="text-[11px] text-green-700 dark:text-green-400 leading-relaxed">
                      <strong>네이버웍스 연동 방법:</strong> 네이버웍스 Developer Console에서 
                      Server API 앱을 생성하고, 메일 읽기 권한(mail.read)을 부여한 후, 발급받은 정보를 입력해주세요.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Client ID <span className="text-destructive">*</span></Label>
                      <Input 
                        placeholder="Client ID" 
                        value={nwForm.nw_client_id}
                        onChange={e => setNwForm({...nwForm, nw_client_id: e.target.value})}
                        className="rounded-xl" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Client Secret <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <Input 
                          type={showSecret ? "text" : "password"} 
                          placeholder="Client Secret"
                          value={nwForm.nw_client_secret}
                          onChange={e => setNwForm({...nwForm, nw_client_secret: e.target.value})}
                          className="rounded-xl pr-10" 
                        />
                        <button 
                          type="button"
                          onClick={() => setShowSecret(!showSecret)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Service Account <span className="text-destructive">*</span></Label>
                      <Input 
                        placeholder="xxxxx.serviceaccount@example.com" 
                        value={nwForm.nw_service_account}
                        onChange={e => setNwForm({...nwForm, nw_service_account: e.target.value})}
                        className="rounded-xl" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Domain ID</Label>
                      <Input 
                        placeholder="Domain ID" 
                        value={nwForm.nw_domain_id}
                        onChange={e => setNwForm({...nwForm, nw_domain_id: e.target.value})}
                        className="rounded-xl" 
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs font-semibold">User ID (메일 사용자)</Label>
                      <Input 
                        placeholder="user@company.com" 
                        value={nwForm.nw_user_id}
                        onChange={e => setNwForm({...nwForm, nw_user_id: e.target.value})}
                        className="rounded-xl" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Private Key <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <textarea 
                        rows={4}
                        placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                        value={nwForm.nw_private_key}
                        onChange={e => setNwForm({...nwForm, nw_private_key: e.target.value})}
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" 
                        style={{ fontFamily: "monospace" }}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPrivateKey(!showPrivateKey)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
                        {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button onClick={saveNaverWorks} disabled={saving} className="w-full rounded-xl">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Mail className="w-4 h-4 mr-1.5" />}
                    네이버웍스 연동 저장
                  </Button>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
