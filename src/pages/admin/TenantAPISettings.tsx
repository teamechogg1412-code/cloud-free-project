import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings, Save, Key, RefreshCw, Eye, EyeOff, AlertCircle, Plus, Loader2, Trash2 } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfigItem {
  id: string;
  tenant_id: string;
  config_key: string;
  config_value: string;
  description: string | null;
  category: string;
  is_encrypted: boolean;
}

const categoryOptions = ["general", "ai", "social", "analytics", "payment", "telegram"];

const categoryPresetKeys: Record<string, { key: string; description: string }[]> = {
  general: [],
  ai: [
    { key: "GEMINI_API_KEY", description: "Google Gemini API 키" },
    { key: "OPENAI_API_KEY", description: "OpenAI API 키" },
    { key: "HUGGINGFACE_API_KEY", description: "Hugging Face API 키" },
  ],
  social: [
    { key: "NAVER_CLIENT_ID", description: "네이버 검색 API Client ID" },
    { key: "NAVER_CLIENT_SECRET", description: "네이버 검색 API Client Secret" },
    { key: "KAKAO_REST_API_KEY", description: "카카오 REST API 키" },
    { key: "INSTAGRAM_ACCESS_TOKEN", description: "인스타그램 액세스 토큰" },
  ],
  analytics: [
    { key: "GA_MEASUREMENT_ID", description: "Google Analytics 측정 ID" },
    { key: "GA_API_SECRET", description: "Google Analytics API Secret" },
  ],
  payment: [
    { key: "TOSS_SECRET_KEY", description: "토스페이먼츠 시크릿 키" },
    { key: "TOSS_CLIENT_KEY", description: "토스페이먼츠 클라이언트 키" },
  ],
  telegram: [
    { key: "TELEGRAM_BOT_TOKEN", description: "텔레그램 봇 토큰 (@BotFather)" },
    { key: "TELEGRAM_CHAT_ID", description: "텔레그램 채팅/그룹 ID" },
  ],
};

const TenantAPISettings = () => {
  const { currentTenant, isCompanyAdmin, isSuperAdmin } = useAuth();
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<ConfigItem | null>(null);

  const [formData, setFormData] = useState({
    config_key: "",
    config_value: "",
    description: "",
    category: "general",
  });

  const fetchConfigs = async () => {
    if (!currentTenant) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("tenant_api_configs")
      .select("*")
      .eq("tenant_id", currentTenant.tenant_id)
      .order("category");

    if (error) {
      toast.error("설정을 불러오지 못했습니다.");
    } else {
      setConfigs(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConfigs();
  }, [currentTenant]);

  const handleChange = (id: string, newValue: string) => {
    setConfigs(prev => prev.map(item =>
      item.id === id ? { ...item, config_value: newValue } : item
    ));
  };

  const handleSaveValue = async (config: ConfigItem) => {
    setSaving(true);
    const { error } = await supabase
      .from("tenant_api_configs")
      .update({
        config_value: config.config_value,
        updated_at: new Date().toISOString()
      })
      .eq("id", config.id);

    if (error) {
      toast.error("저장 실패");
    } else {
      toast.success("설정이 업데이트되었습니다.");
    }
    setSaving(false);
  };

  const handleAddConfig = async () => {
    if (!formData.config_key || !currentTenant) {
      toast.error("설정 키는 필수입니다.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("tenant_api_configs")
        .insert({
          tenant_id: currentTenant.tenant_id,
          config_key: formData.config_key,
          config_value: formData.config_value,
          description: formData.description || null,
          category: formData.category,
        });
      if (error) throw error;
      toast.success("새 설정이 추가되었습니다.");
      setIsSheetOpen(false);
      fetchConfigs();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error("이미 존재하는 설정 키입니다.");
      } else {
        toast.error(`추가 실패: ${error.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentConfig) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("tenant_api_configs")
        .delete()
        .eq("id", currentConfig.id);
      if (error) throw error;
      toast.success("설정이 삭제되었습니다.");
      setIsDeleteDialogOpen(false);
      fetchConfigs();
    } catch (error: any) {
      toast.error(`삭제 실패: ${error.message}`);
    } finally {
      setSaving(false);
      setCurrentConfig(null);
    }
  };

  const toggleShow = (id: string) => {
    setShowKey(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openAddSheet = () => {
    setFormData({ config_key: "", config_value: "", description: "", category: "general" });
    setIsSheetOpen(true);
  };

  if (!isCompanyAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-muted-foreground font-medium">접근 권한이 없습니다.</p>
          <Button onClick={() => window.history.back()} variant="outline">뒤로 가기</Button>
        </div>
      </div>
    );
  }

  // 카테고리별 그룹핑
  const groupedConfigs = configs.reduce((acc, config) => {
    const cat = config.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(config);
    return acc;
  }, {} as Record<string, ConfigItem[]>);

  const categoryLabels: Record<string, string> = {
    general: "일반 설정",
    ai: "AI / LLM",
    social: "소셜 미디어",
    analytics: "분석 도구",
    payment: "결제",
    telegram: "📨 텔레그램 봇",
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-24 pb-16 px-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="w-8 h-8 text-primary" /> 회사 API 설정
            </h1>
            <p className="text-muted-foreground mt-2">
              {isSuperAdmin ? "전체 회사" : currentTenant?.tenant.name}의 API 키와 설정을 관리합니다.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchConfigs}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> 새로고침
            </Button>
            <Button variant="hero" onClick={openAddSheet}>
              <Plus className="w-4 h-4 mr-2" /> 설정 추가
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : configs.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-16 text-center text-muted-foreground">
              등록된 API 설정이 없습니다. 새 설정을 추가해 보세요.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {Object.entries(groupedConfigs).map(([category, items]) => (
              <Card key={category} className="glass-card border-l-4 border-l-primary/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-primary" /> {categoryLabels[category] || category}
                  </CardTitle>
                  <CardDescription>{items.length}개 설정</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((config) => (
                    <div key={config.id} className="grid gap-2 p-4 rounded-xl bg-secondary/20 border border-border/50">
                      <div className="flex justify-between items-center">
                        <Label className="font-bold text-sm flex items-center gap-2">
                          <Key className="w-3 h-3 text-muted-foreground" /> {config.config_key}
                        </Label>
                        <div className="flex items-center gap-2">
                          {config.description && (
                            <Badge variant="outline" className="text-[10px]">{config.description}</Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-destructive"
                            onClick={() => { setCurrentConfig(config); setIsDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showKey[config.id] ? "text" : "password"}
                            value={config.config_value}
                            onChange={(e) => handleChange(config.id, e.target.value)}
                            className="pr-10 font-mono text-sm"
                            placeholder="값을 입력하세요"
                          />
                          <button
                            onClick={() => toggleShow(config.id)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showKey[config.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <Button
                          onClick={() => handleSaveValue(config)}
                          disabled={saving}
                          size="sm"
                          className="w-20"
                        >
                          {saving ? "저장..." : <><Save className="w-4 h-4 mr-1" /> 저장</>}
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* 설정 추가 Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-md p-0 overflow-hidden flex flex-col">
          <SheetHeader className="p-6 border-b">
            <SheetTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> 새 API 설정 추가
            </SheetTitle>
          </SheetHeader>
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label htmlFor="category">카테고리</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val, config_key: "", description: "" })}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(c => (
                    <SelectItem key={c} value={c}>{categoryLabels[c] || c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {categoryPresetKeys[formData.category]?.length > 0 && (
              <div className="space-y-2">
                <Label>빠른 선택</Label>
                <div className="flex flex-wrap gap-2">
                  {categoryPresetKeys[formData.category].map(preset => (
                    <Button
                      key={preset.key}
                      type="button"
                      variant={formData.config_key === preset.key ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() => setFormData({ ...formData, config_key: preset.key, description: preset.description })}
                    >
                      {preset.key}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="config_key">설정 키 *</Label>
              <Input
                id="config_key"
                placeholder="예: OPENAI_API_KEY"
                value={formData.config_key}
                onChange={(e) => setFormData({ ...formData, config_key: e.target.value.toUpperCase().replace(/\s/g, '_') })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="config_value">값</Label>
              <Input
                id="config_value"
                type="password"
                placeholder="API 키 또는 설정값"
                value={formData.config_value}
                onChange={(e) => setFormData({ ...formData, config_value: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Input
                id="description"
                placeholder="예: OpenAI GPT-4 API 키"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <SheetFooter className="p-6 border-t">
            <SheetClose asChild>
              <Button variant="outline" disabled={saving}>취소</Button>
            </SheetClose>
            <Button onClick={handleAddConfig} disabled={saving || !formData.config_key}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              추가
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* 삭제 확인 Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive font-bold text-xl">설정을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              "{currentConfig?.config_key}" 설정이 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TenantAPISettings;
