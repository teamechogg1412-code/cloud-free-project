import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Settings, Save, RefreshCw, EyeOff, 
  ShieldAlert, Mail, Brain, Sparkles, Cpu, 
  ArrowLeft, Terminal, Globe, CheckCircle2, AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ConfigItem {
  key: string;
  value: string; // masked value from edge function
  is_set: boolean;
  description: string | null;
  category: string | null;
}

// New value inputs tracked separately from masked display values
type InputMap = Record<string, string>;

const categoryStyles: Record<string, { icon: any, color: string, label: string }> = {
  EMAIL: { icon: <Mail className="w-5 h-5" />, color: "border-l-blue-500", label: "이메일 인프라" },
  AI_GEMINI: { icon: <Sparkles className="w-5 h-5" />, color: "border-l-orange-500", label: "Google Gemini AI" },
  AI_HUGGINGFACE: { icon: <Brain className="w-5 h-5" />, color: "border-l-yellow-500", label: "Hugging Face AI" },
  SYSTEM: { icon: <Globe className="w-5 h-5" />, color: "border-l-slate-500", label: "시스템 네트워크" },
  TELEGRAM: { icon: <Globe className="w-5 h-5" />, color: "border-l-cyan-500", label: "📨 텔레그램 봇" },
};

const APIManagement = () => {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  // Track new values being typed — separate from masked display
  const [newValues, setNewValues] = useState<InputMap>({});

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-system-config", {
        method: "GET",
      });
      if (error) throw error;
      setConfigs(data?.data || []);
      // Reset new value inputs on refresh
      setNewValues({});
    } catch (error: any) {
      toast.error("데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleSave = async (key: string) => {
    const value = newValues[key];
    if (value === undefined || value.trim() === "") {
      toast.error("저장할 값을 입력하세요.");
      return;
    }
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      const { error } = await supabase.functions.invoke("manage-system-config", {
        method: "POST",
        body: { key, value: value.trim() },
      });
      if (error) throw error;
      toast.success(`${key} 설정 저장 완료`);
      // Clear the input and re-fetch to update masked display
      setNewValues(prev => { const n = { ...prev }; delete n[key]; return n; });
      await fetchConfigs();
    } catch (error: any) {
      toast.error("저장 실패");
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const categories = Array.from(new Set(configs.map(c => c.category)));

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="pt-28 pb-16 px-6 max-w-6xl mx-auto">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/super-admin")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Settings className="w-8 h-8 text-indigo-600" /> 시스템 마스터 API 관리
              </h1>
              <p className="text-slate-500 mt-1">플랫폼 전체에서 사용하는 AI 모델, 메일 서버, 인프라 키를 통합 통제합니다.</p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchConfigs} className="bg-white">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> 데이터 동기화
          </Button>
        </div>

        {/* Security notice */}
        <div className="mb-8 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <EyeOff className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-500" />
          <div>
            <span className="font-semibold">보안 보호 모드:</span> 실제 API 키 값은 서버에서만 처리되며 브라우저로 전송되지 않습니다.
            설정된 키는 <span className="font-mono bg-blue-100 px-1 rounded">abc••••••••••••••••</span> 형태로 표시됩니다.
            변경하려면 새 값을 입력 후 저장하세요.
          </div>
        </div>

        <div className="space-y-12">
          {categories.map(cat => (
            <section key={cat} className="animate-in fade-in slide-in-from-bottom-3 duration-500">
              <div className="flex items-center gap-3 mb-4 px-1">
                <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                  {categoryStyles[cat ?? ""]?.icon || <Cpu className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{categoryStyles[cat ?? ""]?.label || cat}</h2>
                  <p className="text-xs text-slate-400">Infrastructure Group: {cat}</p>
                </div>
                <div className="h-px flex-1 bg-slate-200 ml-4 opacity-50"></div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {configs.filter(c => c.category === cat).map((config) => (
                  <Card key={config.key} className={`border-none shadow-sm border-l-4 ${categoryStyles[cat ?? ""]?.color || 'border-l-slate-300'} bg-white overflow-hidden`}>
                    <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center gap-6">
                      <div className="lg:w-1/4">
                        <div className="flex items-center gap-2 mb-1">
                          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="font-bold text-slate-900 text-sm">{config.key}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{config.description}</p>
                        <div className="mt-2">
                          {config.is_set ? (
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[10px] gap-1">
                              <CheckCircle2 className="w-3 h-3" /> 설정됨
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-[10px] gap-1">
                              <AlertCircle className="w-3 h-3" /> 미설정
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col gap-2">
                        {/* Masked current value display */}
                        {config.is_set && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono text-sm text-slate-500">{config.value}</span>
                            <span className="text-[10px] text-slate-400 ml-auto">현재 저장된 값 (마스킹됨)</span>
                          </div>
                        )}
                        {/* New value input */}
                        <div className="flex gap-2">
                          <Input
                            type="password"
                            value={newValues[config.key] ?? ""}
                            onChange={(e) => setNewValues(prev => ({ ...prev, [config.key]: e.target.value }))}
                            className="font-mono text-sm bg-white border-slate-200 h-11"
                            placeholder={config.is_set ? "새 값으로 변경하려면 입력..." : "값을 입력하세요..."}
                          />
                          <Button 
                            onClick={() => handleSave(config.key)} 
                            disabled={saving[config.key] || !newValues[config.key]?.trim()}
                            className="w-24 font-bold h-11 shadow-sm"
                          >
                            {saving[config.key] ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2"/>저장</>}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* 하단 보안 가이드 */}
        <div className="mt-16 bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute -top-10 -right-10 opacity-10">
             <ShieldAlert className="w-64 h-64" />
          </div>
          <div className="relative z-10">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
               <ShieldAlert className="text-amber-400" /> 슈퍼 어드민 보안 프로토콜
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-3">
                  <p className="text-sm text-slate-300 font-bold">1. 데이터 가용성</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    이곳에서 변경된 API 키와 모델 설정은 Edge Function 및 모든 서비스 페이지에 실시간으로 반영됩니다. 잘못된 모델 ID를 입력할 경우 시스템 장애의 원인이 될 수 있습니다.
                  </p>
               </div>
               <div className="space-y-3">
                  <p className="text-sm text-slate-300 font-bold">2. 모델 설정 팁</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Hugging Face 모델 ID는 <code>author/model-name</code> 형식을 준수해야 합니다. Gemini API 키는 Google Cloud Console에서 발급받은 최신 버전을 권장합니다.
                  </p>
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default APIManagement;
