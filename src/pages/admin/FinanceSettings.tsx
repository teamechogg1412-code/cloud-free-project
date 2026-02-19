import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/landing/Header";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Landmark, CreditCard, Plus, Trash2, ShieldCheck, Database,
  RefreshCw, Save, Settings, Eye, EyeOff, ExternalLink,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const BANK_CODES = [
  { code: "0002", name: "산업은행" }, { code: "0003", name: "기업은행" },
  { code: "0004", name: "국민은행" }, { code: "0007", name: "수협은행" },
  { code: "0011", name: "농협은행" }, { code: "0020", name: "우리은행" },
  { code: "0023", name: "SC제일은행" }, { code: "0027", name: "씨티은행" },
  { code: "0031", name: "대구은행" }, { code: "0032", name: "부산은행" },
  { code: "0034", name: "광주은행" }, { code: "0035", name: "제주은행" },
  { code: "0037", name: "전북은행" }, { code: "0039", name: "경남은행" },
  { code: "0045", name: "새마을금고" }, { code: "0048", name: "신협은행" },
  { code: "0071", name: "우체국" }, { code: "0081", name: "하나은행" },
  { code: "0088", name: "신한은행" }, { code: "0089", name: "K뱅크" },
];

const CARD_CODES = [
  { code: "0301", name: "국민카드" }, { code: "0302", name: "현대카드" },
  { code: "0303", name: "삼성카드" }, { code: "0304", name: "신한카드" },
  { code: "0305", name: "롯데카드" }, { code: "0306", name: "BC카드" },
  { code: "0307", name: "하나카드" }, { code: "0308", name: "우리카드" },
];

const getOrgName = (code: string, type: string) => {
  const list = type === "BK" ? BANK_CODES : CARD_CODES;
  return list.find((i) => i.code === code)?.name || code;
};

const FinanceSettings = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [masterConfigs, setMasterConfigs] = useState({
    CODEF_CLIENT_ID: "", CODEF_CLIENT_SECRET: "", CODEF_PUBLIC_KEY: "",
  });
  const [connectedIds, setConnectedIds] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  // 발급 다이얼로그
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({ type: "BK", orgCode: "0004", password: "", loginId: "" });
  const [derFile, setDerFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);

  // 계좌 등록 다이얼로그
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({
    connectedIdKey: "", businessType: "BK", organization: "",
    accountNumber: "", accountAlias: "",
  });

  useEffect(() => {
    if (currentTenant) fetchAll();
  }, [currentTenant]);

  const fetchAll = async () => {
    setLoading(true);
    const [configRes, accountRes] = await Promise.all([
      supabase.from("tenant_api_configs").select("*").eq("tenant_id", currentTenant?.tenant_id),
      supabase.from("finance_accounts").select("*").eq("tenant_id", currentTenant?.tenant_id).eq("is_active", true),
    ]);

    if (configRes.data) {
      const masters = { CODEF_CLIENT_ID: "", CODEF_CLIENT_SECRET: "", CODEF_PUBLIC_KEY: "" };
      configRes.data.forEach((item: any) => {
        if (item.config_key in masters) (masters as any)[item.config_key] = item.config_value;
      });
      setMasterConfigs(masters);
      setConnectedIds(configRes.data.filter((item: any) => item.config_key.startsWith("CONNECTED_ID_")));
    }
    if (accountRes.data) setAccounts(accountRes.data);
    setLoading(false);
  };

  const handleSaveMasters = async () => {
    setProcessing(true);
    const updates = Object.entries(masterConfigs).map(([key, value]) => ({
      tenant_id: currentTenant?.tenant_id, config_key: key, config_value: value, category: "finance_master",
    }));
    await supabase.from("tenant_api_configs").upsert(updates, { onConflict: "tenant_id,config_key" });
    toast.success("마스터 설정 저장 완료");
    setProcessing(false);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
    });

  const handleGenerateId = async () => {
    if (form.type === "BK" && (!derFile || !keyFile)) return toast.error("은행 연동에는 인증서 파일이 필요합니다.");
    if (form.type === "CD" && !form.loginId) return toast.error("카드 연동에는 로그인 ID가 필요합니다.");
    if (!form.password) return toast.error("비밀번호를 입력하세요.");

    setProcessing(true);
    try {
      const bodyPayload: any = {
        action: "create_connected_id", tenantId: currentTenant?.tenant_id,
        businessType: form.type, organization: form.orgCode, password: form.password,
      };
      if (form.type === "BK") {
        bodyPayload.derFile = await fileToBase64(derFile!);
        bodyPayload.keyFile = await fileToBase64(keyFile!);
      } else {
        bodyPayload.loginId = form.loginId;
      }

      const { data, error } = await supabase.functions.invoke("codef-api", { body: bodyPayload });
      if (error) throw error;
      if (data.result.code !== "CF-00000") throw new Error(data.result.message);

      toast.success(`${form.type === "BK" ? "은행" : "카드"} 연동 성공!`);
      setIsDialogOpen(false);
      fetchAll();
    } catch (e: any) {
      toast.error("발급 실패: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const openAddAccount = (connectedItem: any) => {
    const key = connectedItem.config_key;
    const type = key.includes("_BK_") ? "BK" : "CD";
    const org = key.split("_").pop()!;
    setAccountForm({
      connectedIdKey: key, businessType: type, organization: org,
      accountNumber: "", accountAlias: "",
    });
    setIsAccountDialogOpen(true);
  };

  const handleAddAccount = async () => {
    if (!accountForm.accountNumber && accountForm.businessType === "BK") {
      return toast.error("계좌번호를 입력하세요.");
    }
    setProcessing(true);
    try {
      const { error } = await supabase.from("finance_accounts").insert({
        tenant_id: currentTenant?.tenant_id,
        connected_id_key: accountForm.connectedIdKey,
        business_type: accountForm.businessType,
        organization: accountForm.organization,
        account_number: accountForm.accountNumber || null,
        account_alias: accountForm.accountAlias || null,
      });
      if (error) throw error;
      toast.success("계좌/카드 등록 완료");
      setIsAccountDialogOpen(false);
      fetchAll();
    } catch (e: any) {
      toast.error("등록 실패: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    await supabase.from("finance_accounts").delete().eq("id", id);
    toast.success("삭제 완료");
    fetchAll();
  };

  const handleDeleteConnectedId = async (configId: string, configKey: string) => {
    await supabase.from("tenant_api_configs").delete().eq("id", configId);
    // 연관 계좌도 삭제
    await supabase.from("finance_accounts")
      .delete()
      .eq("tenant_id", currentTenant?.tenant_id)
      .eq("connected_id_key", configKey);
    toast.success("연동 삭제 완료");
    fetchAll();
  };

  const renderConnectedSection = (type: "BK" | "CD", icon: React.ReactNode, title: string, color: string) => {
    const filtered = connectedIds.filter((id) => id.config_key.includes(`_${type}_`));
    return (
      <Card className="border-none shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle className={`text-md flex items-center gap-2 ${color}`}>
            {icon} {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">연동된 {type === "BK" ? "은행" : "카드"}이 없습니다.</p>
          )}
          {filtered.map((item) => {
            const orgCode = item.config_key.split("_").pop()!;
            const orgName = getOrgName(orgCode, type);
            const relatedAccounts = accounts.filter((a) => a.connected_id_key === item.config_key);

            return (
              <div key={item.id} className="p-4 bg-muted/50 rounded-xl border space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold">{orgName}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{item.config_value}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="text-xs h-7"
                      onClick={() => openAddAccount(item)}>
                      <Plus className="w-3 h-3 mr-1" /> {type === "BK" ? "계좌" : "카드"} 추가
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive h-7 w-7"
                      onClick={() => handleDeleteConnectedId(item.id, item.config_key)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                {relatedAccounts.length > 0 && (
                  <div className="space-y-1.5 pl-3 border-l-2 border-primary/20">
                    {relatedAccounts.map((acc) => (
                      <div key={acc.id} className="flex items-center justify-between text-xs bg-background p-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {acc.account_alias || (type === "BK" ? "계좌" : "카드")}
                          </Badge>
                          <span className="font-mono text-muted-foreground">
                            {acc.account_number || "전체"}
                          </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                          onClick={() => handleDeleteAccount(acc.id)}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-28 pb-16 px-6 max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-3xl font-black flex items-center gap-3">
            <Database className="text-primary" /> 금융 연동 마스터
          </h1>
          
          {/* 버튼 그룹 */}
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="rounded-xl px-4 h-12 font-bold border-slate-200 hover:bg-slate-50 transition-all"
              onClick={() => window.open("https://codef.io/login", "_blank")}
            >
              <ExternalLink className="mr-2 w-4 h-4 text-slate-500" />
              CODEF API 받으러 가기
            </Button>
            
            <Button 
              onClick={() => setIsDialogOpen(true)} 
              className="rounded-xl px-6 h-12 font-bold shadow-lg bg-primary hover:bg-primary/90"
            >
              <Plus className="mr-2 w-5 h-5" /> 신규 Connected ID 발급
            </Button>
          </div>
        </div>

        {/* CODEF 마스터 키 */}
        <Card className="border-none shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">CODEF API 설정 (공통)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Client ID</Label>
                <Input value={masterConfigs.CODEF_CLIENT_ID}
                  onChange={(e) => setMasterConfigs({ ...masterConfigs, CODEF_CLIENT_ID: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Client Secret</Label>
                <Input type="password" value={masterConfigs.CODEF_CLIENT_SECRET}
                  onChange={(e) => setMasterConfigs({ ...masterConfigs, CODEF_CLIENT_SECRET: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>RSA Public Key</Label>
              <Textarea className="font-mono text-xs h-24" value={masterConfigs.CODEF_PUBLIC_KEY}
                onChange={(e) => setMasterConfigs({ ...masterConfigs, CODEF_PUBLIC_KEY: e.target.value })} />
            </div>
            <Button onClick={handleSaveMasters} disabled={processing} className="w-full">
              <Save className="mr-2 w-4 h-4" /> 마스터 정보 저장
            </Button>
          </CardContent>
        </Card>

        {/* 은행/카드 연동 목록 + 계좌 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderConnectedSection("BK", <Landmark size={18} />, "은행 연동 & 계좌", "text-amber-600")}
          {renderConnectedSection("CD", <CreditCard size={18} />, "카드 연동", "text-blue-600")}
        </div>

        {/* Connected ID 발급 다이얼로그 */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle>신규 Connected ID 생성</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>유형</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, orgCode: v === "BK" ? "0004" : "0301" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BK">은행 (계좌)</SelectItem>
                      <SelectItem value="CD">카드 (법인)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>기관 선택</Label>
                  <Select value={form.orgCode} onValueChange={(v) => setForm({ ...form, orgCode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(form.type === "BK" ? BANK_CODES : CARD_CODES).map((b) => (
                        <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.type === "BK" ? (
                <div className="space-y-2">
                  <Label>공동인증서 (NPKI)</Label>
                  <Input type="file" className="text-xs" onChange={(e) => setDerFile(e.target.files?.[0] || null)} />
                  <Input type="file" className="text-xs" onChange={(e) => setKeyFile(e.target.files?.[0] || null)} />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>카드사 로그인 ID</Label>
                  <Input value={form.loginId} onChange={(e) => setForm({ ...form, loginId: e.target.value })}
                    placeholder="카드사 웹사이트 로그인 아이디" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>{form.type === "BK" ? "인증서 비밀번호" : "카드사 로그인 비밀번호"}</Label>
                <Input type="password" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleGenerateId} disabled={processing} className="w-full h-11 font-bold">
                {processing ? <RefreshCw className="animate-spin mr-2" /> : <ShieldCheck className="mr-2" />}
                연동 ID 발급 시작
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 계좌/카드 추가 다이얼로그 */}
        <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle>
                {accountForm.businessType === "BK" ? "계좌번호 등록" : "카드번호 등록"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label>기관</Label>
                <Input value={getOrgName(accountForm.organization, accountForm.businessType)} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>{accountForm.businessType === "BK" ? "계좌번호" : "카드번호"}</Label>
                <Input value={accountForm.accountNumber}
                  onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
                  placeholder={accountForm.businessType === "BK" ? "예: 08660104141706" : "비워두면 전체 카드"} />
              </div>
              <div className="space-y-1.5">
                <Label>별칭 (선택)</Label>
                <Input value={accountForm.accountAlias}
                  onChange={(e) => setAccountForm({ ...accountForm, accountAlias: e.target.value })}
                  placeholder="예: 급여통장, 운영자금" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddAccount} disabled={processing} className="w-full h-11 font-bold">
                {processing ? <RefreshCw className="animate-spin mr-2" /> : <Plus className="mr-2" />}
                등록
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default FinanceSettings;
