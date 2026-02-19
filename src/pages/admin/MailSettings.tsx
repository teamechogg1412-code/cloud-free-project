import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Mail, ArrowLeft, Key, Info, Copy, Save, Loader2, Globe } from "lucide-react";

const MailSettings = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState({ clientId: "", clientSecret: "" });

  const redirectUri = `${window.location.origin}/auth/gmail/callback`;

  useEffect(() => {
    if (currentTenant) fetchConfigs();
  }, [currentTenant]);

  const fetchConfigs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tenant_api_configs")
      .select("config_key, config_value")
      .eq("tenant_id", currentTenant?.tenant_id)
      .in("config_key", ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]);

    if (data) {
      const cid = data.find(d => d.config_key === "GOOGLE_CLIENT_ID")?.config_value || "";
      const sec = data.find(d => d.config_key === "GOOGLE_CLIENT_SECRET")?.config_value || "";
      setConfigs({ clientId: cid, clientSecret: sec });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!currentTenant) return;
    setSaving(true);
    try {
      const updates = [
        { tenant_id: currentTenant.tenant_id, config_key: "GOOGLE_CLIENT_ID", config_value: configs.clientId, category: "email" },
        { tenant_id: currentTenant.tenant_id, config_key: "GOOGLE_CLIENT_SECRET", config_value: configs.clientSecret, category: "email" }
      ];

      const { error } = await supabase.from("tenant_api_configs").upsert(updates, { onConflict: "tenant_id,config_key" });
      if (error) throw error;
      toast.success("메일 서버 설정이 저장되었습니다.");
    } catch (e: any) {
      toast.error("저장 실패: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("클립보드에 복사되었습니다.");
  };

  if (loading) return <div className="flex justify-center pt-40"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="pt-28 pb-16 px-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Mail className="text-blue-500" /> 전사 메일 연동 설정</h1>
            <p className="text-sm text-slate-500">직원들이 Gmail을 연동할 수 있도록 OAuth 클라이언트 정보를 설정합니다.</p>
          </div>
        </div>

        <Alert className="mb-8 bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 font-bold">필독: Google Cloud Console 설정</AlertTitle>
          <AlertDescription className="text-blue-700 text-xs space-y-2">
            <p>1. Google Cloud Console에서 [OAuth 2.0 클라이언트 ID]를 생성하세요.</p>
            <p>2. <strong>승인된 리디렉션 URI</strong>에 아래 주소를 반드시 추가해야 합니다:</p>
            <div className="flex items-center gap-2 mt-1">
              <code className="bg-white px-2 py-1 rounded border border-blue-200 flex-1">{redirectUri}</code>
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(redirectUri)}><Copy className="w-3 h-3 mr-1" /> 복사</Button>
            </div>
          </AlertDescription>
        </Alert>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Key className="w-5 h-5 text-amber-500" /> Google OAuth 자격 증명</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Google Client ID</Label>
              <Input value={configs.clientId} onChange={e => setConfigs({...configs, clientId: e.target.value})} placeholder="000000000000-xxx.apps.googleusercontent.com" />
            </div>
            <div className="space-y-2">
              <Label>Google Client Secret</Label>
              <Input type="password" value={configs.clientSecret} onChange={e => setConfigs({...configs, clientSecret: e.target.value})} placeholder="GOCSPX-xxxxxxxxx" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full h-12 text-md font-bold">
              {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              설정 저장
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MailSettings;
