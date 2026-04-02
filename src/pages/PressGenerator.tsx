import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Newspaper,
  Loader2,
  Copy,
  RotateCcw,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  FileText,
  ClipboardCopy,
} from "lucide-react";

// ─── Types ───
interface Actor {
  id: string;
  name: string;
  info: string;
}

interface PromptCard {
  key: string;
  name: string;
  content: string;
}

// ─── Main Component ───
const PressGenerator: React.FC = () => {
  const { currentTenant, user } = useAuth();

  // Form state
  const [actors, setActors] = useState<Actor[]>([]);
  const [selectedActorId, setSelectedActorId] = useState("");
  const [promptCards, setPromptCards] = useState<PromptCard[]>([]);
  const [selectedPromptKey, setSelectedPromptKey] = useState("");
  const [workTitle, setWorkTitle] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [characterFeatures, setCharacterFeatures] = useState("");
  const [scriptContent, setScriptContent] = useState("");
  const [includeCompanyInfo, setIncludeCompanyInfo] = useState(false);
  const [companyInfo, setCompanyInfo] = useState("");

  // Result state
  const [generating, setGenerating] = useState(false);
  const [resultTitle, setResultTitle] = useState("");
  const [resultBody, setResultBody] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (currentTenant) {
      fetchActors();
      fetchPromptCards();
      fetchCompanyInfo();
    }
  }, [currentTenant]);

  const fetchActors = async () => {
    const { data } = await supabase
      .from("scenario_actors")
      .select("*")
      .eq("tenant_id", currentTenant!.tenant_id)
      .order("name");
    if (data) setActors(data);
  };

  const fetchPromptCards = async () => {
    const { data } = await supabase
      .from("scenario_prompts")
      .select("key, name, content")
      .eq("category", "Press")
      .or(`tenant_id.eq.${currentTenant!.tenant_id},tenant_id.is.null`)
      .order("display_order");
    if (data && data.length > 0) {
      setPromptCards(data);
      setSelectedPromptKey(data[0].key);
    }
  };

  const fetchCompanyInfo = async () => {
    const { data } = await supabase
      .from("tenants")
      .select("name, address, phone, email")
      .eq("id", currentTenant!.tenant_id)
      .single();
    if (data) {
      const parts = [data.name, data.address, data.phone, data.email].filter(Boolean);
      setCompanyInfo(parts.join(" | "));
    }
  };

  const selectedActor = actors.find((a) => a.id === selectedActorId);

  // ─── Generate ───
  const handleGenerate = async () => {
    if (!selectedActorId) { toast.error("배우를 선택해주세요."); return; }
    if (!selectedPromptKey) { toast.error("기사 유형을 선택해주세요."); return; }

    setGenerating(true);
    setError("");
    setResultTitle("");
    setResultBody("");

    const variables: Record<string, string> = {
      ACTOR_NAME: selectedActor?.name || "",
      ACTOR_PROFILE: selectedActor?.info || "(프로필 정보 없음)",
      WORK_TITLE: workTitle || "(미입력)",
      CHARACTER_NAME: characterName || "(미입력)",
      CHARACTER_FEATURES: characterFeatures || "(미입력)",
      SCRIPT_CONTENT: scriptContent || "(없음)",
      COMPANY_INFO: includeCompanyInfo ? companyInfo : "(포함하지 않음)",
    };

    try {
      const { data, error: fnError } = await invokeEdgeFunction("generate-press", {
        body: { stepKey: selectedPromptKey, variables, tenantId: currentTenant!.tenant_id },
      });
      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || "생성 실패");

      const raw = data.result as string;
      // Parse title from first line if format: "제목: ..."
      const titleMatch = raw.match(/^제목:\s*(.+)/m);
      if (titleMatch) {
        setResultTitle(titleMatch[1].trim());
        setResultBody(raw.replace(/^제목:\s*.+\n?/, "").trim());
      } else {
        setResultTitle("");
        setResultBody(raw);
      }

      // Save to DB
      try {
        await supabase.from("press_articles").insert({
          tenant_id: currentTenant!.tenant_id,
          user_id: user!.id,
          actor_name: selectedActor?.name || "",
          prompt_key: selectedPromptKey,
          title: titleMatch?.[1]?.trim() || "기사",
          content: raw,
          work_title: workTitle,
        });
      } catch (e) { console.error("Save error:", e); }

      toast.success("기사가 생성되었습니다!");
    } catch (err: any) {
      setError(err.message);
      toast.error(`생성 실패: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // ─── Copy helpers ───
  const copyTitle = () => {
    if (!resultTitle) return;
    navigator.clipboard.writeText(resultTitle);
    toast.success("제목이 복사되었습니다.");
  };
  const copyBody = () => {
    if (!resultBody) return;
    navigator.clipboard.writeText(resultBody);
    toast.success("본문이 복사되었습니다.");
  };
  const copyAll = () => {
    const full = resultTitle ? `제목: ${resultTitle}\n\n${resultBody}` : resultBody;
    navigator.clipboard.writeText(full);
    toast.success("전체 내용이 복사되었습니다.");
  };

  const resetForm = () => {
    setResultTitle("");
    setResultBody("");
    setError("");
    setWorkTitle("");
    setCharacterName("");
    setCharacterFeatures("");
    setScriptContent("");
  };

  const hasResult = resultTitle || resultBody;
  const loadingMessages = [
    "홍보팀장이 기사를 작성 중입니다...",
    "최적의 헤드라인을 고민 중입니다...",
    "팩트 체크를 진행 중입니다...",
    "보도자료 형식을 다듬는 중입니다...",
  ];
  const [loadingIdx, setLoadingIdx] = useState(0);
  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setLoadingIdx((prev) => (prev + 1) % loadingMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [generating]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* ════════ Hero Header ════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-violet-500/5 border border-rose-500/10 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Newspaper className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">AI 기사 생성기</h1>
            <p className="text-sm text-muted-foreground mt-1">
              보도자료 · 기사 초안 · 인터뷰 질문지 · 홍보 원고 자동 생성
            </p>
          </div>
        </div>
      </div>

      {/* ════════ Prompt Card Slider ════════ */}
      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">기사 유형 선택</Label>
        {promptCards.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">
            등록된 프롬프트가 없습니다. 슈퍼 어드민에서 Press 카테고리 프롬프트를 등록해주세요.
          </div>
        ) : (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3 pb-3">
              {promptCards.map((card) => (
                <button
                  key={card.key}
                  onClick={() => setSelectedPromptKey(card.key)}
                  className={`shrink-0 w-48 p-4 rounded-xl border text-left transition-all ${
                    selectedPromptKey === card.key
                      ? "border-rose-500/50 bg-rose-500/5 shadow-md shadow-rose-500/10"
                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                    selectedPromptKey === card.key ? "bg-rose-500/20 text-rose-600" : "bg-muted text-muted-foreground"
                  }`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-foreground block whitespace-normal leading-tight">
                    {card.name.replace(/^C-\d+\.\s*기사\s*-\s*/, "")}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1 block">{card.key}</span>
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </div>

      {/* ════════ Two-Column Layout ════════ */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Left: Input Form ── */}
        <div className="space-y-5">
          {/* Actor Selection */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-semibold text-foreground">배우 & 작품 정보</h3>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">배우 선택</Label>
              <select
                value={selectedActorId}
                onChange={(e) => setSelectedActorId(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">-- 배우를 선택하세요 --</option>
                {actors.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              {selectedActor?.info && (
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{selectedActor.info.substring(0, 100)}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">작품명</Label>
                <Input value={workTitle} onChange={(e) => setWorkTitle(e.target.value)} placeholder="예: 눈물의 여왕" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">캐릭터명</Label>
                <Input value={characterName} onChange={(e) => setCharacterName(e.target.value)} placeholder="예: 홍해인" />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">캐릭터 특징 / 매력 포인트</Label>
              <Textarea
                value={characterFeatures}
                onChange={(e) => setCharacterFeatures(e.target.value)}
                placeholder="캐릭터의 주요 특성, 매력 포인트를 입력하세요."
                rows={2}
                className="text-sm"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">참고 자료 / 대본 내용</Label>
              <Textarea
                value={scriptContent}
                onChange={(e) => setScriptContent(e.target.value)}
                placeholder="보도자료 작성에 참고할 대본 내용이나 팩트 시트를 입력하세요."
                rows={4}
                className="text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="companyInfo"
                checked={includeCompanyInfo}
                onCheckedChange={(c) => setIncludeCompanyInfo(!!c)}
              />
              <label htmlFor="companyInfo" className="text-sm text-muted-foreground cursor-pointer">
                회사 정보 포함 (주소/연락처)
              </label>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!selectedActorId || !selectedPromptKey || generating}
            className="w-full group relative overflow-hidden rounded-xl py-4 px-6 font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-rose-500 to-pink-600 shadow-lg shadow-rose-500/20 hover:shadow-xl hover:shadow-rose-500/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-white/10 to-rose-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div className="relative flex items-center justify-center gap-2">
              {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              <span>{generating ? "생성 중..." : "AI 기사 생성"}</span>
            </div>
          </button>
        </div>

        {/* ── Right: Result Panel ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden min-h-[500px] flex flex-col">
          <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-semibold text-foreground">생성 결과</h3>
            </div>
            {hasResult && (
              <div className="flex gap-1.5">
                {resultTitle && (
                  <Button variant="ghost" size="sm" onClick={copyTitle} className="h-7 text-xs">
                    <ClipboardCopy className="w-3 h-3 mr-1" /> 제목
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={copyBody} className="h-7 text-xs">
                  <ClipboardCopy className="w-3 h-3 mr-1" /> 본문
                </Button>
                <Button variant="ghost" size="sm" onClick={copyAll} className="h-7 text-xs">
                  <Copy className="w-3 h-3 mr-1" /> 전체
                </Button>
                <Button variant="ghost" size="sm" onClick={resetForm} className="h-7 text-xs">
                  <RotateCcw className="w-3 h-3 mr-1" /> 초기화
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 p-5 overflow-auto">
            {generating ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
                    <Newspaper className="w-8 h-8 text-white animate-pulse" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-400 animate-ping" />
                </div>
                <p className="text-sm text-muted-foreground animate-pulse text-center">
                  {loadingMessages[loadingIdx]}
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <AlertCircle className="w-10 h-10 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={resetForm}>다시 시도</Button>
              </div>
            ) : hasResult ? (
              <div className="space-y-4">
                {resultTitle && (
                  <div className="rounded-lg bg-gradient-to-r from-rose-500/5 to-pink-500/5 border border-rose-200 dark:border-rose-900/30 p-4">
                    <Badge variant="outline" className="text-[10px] mb-2 border-rose-300 text-rose-600">HEADLINE</Badge>
                    <h2 className="text-lg font-bold text-foreground leading-snug">{resultTitle}</h2>
                  </div>
                )}
                <div className="prose prose-sm max-w-none dark:prose-invert
                  prose-h2:text-base prose-h2:font-semibold prose-h2:mt-4
                  prose-h3:text-sm prose-h3:font-medium
                  prose-blockquote:border-l-rose-500 prose-blockquote:bg-rose-50/50 dark:prose-blockquote:bg-rose-950/20
                ">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{resultBody}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <Newspaper className="w-12 h-12 opacity-20" />
                <p className="text-sm">왼쪽에서 정보를 입력하고 기사를 생성해보세요.</p>
                <div className="flex items-center gap-1 text-xs">
                  <ChevronRight className="w-3 h-3" /> 배우 선택 → 유형 선택 → 정보 입력 → 생성
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PressGenerator;
