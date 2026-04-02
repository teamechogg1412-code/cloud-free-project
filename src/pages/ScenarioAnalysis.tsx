import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mammoth from "mammoth";
import {
  Film,
  Upload,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Copy,
  Download,
  RotateCcw,
  FileText,
  Users,
  Sparkles,
  Clapperboard,
  UserCheck,
  PenLine,
  Tv,
  Star,
  Zap,
  ChevronDown,
  ChevronUp,
  FileUp,
  History,
} from "lucide-react";

// ─── Types ───
interface Actor {
  id: string;
  name: string;
  info: string;
}

interface StepConfig {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

type StepStatus = "pending" | "running" | "done" | "error";

interface StepResult {
  status: StepStatus;
  content: string;
  error?: string;
}

// ─── Constants ───
const ANALYSIS_STEPS: StepConfig[] = [
  { key: "scenario_metadata", title: "작품 개요", description: "제목, 장르, 작가 등 메타데이터 추출", icon: <Clapperboard className="w-4 h-4" /> },
  { key: "scenario_plot", title: "줄거리 분석", description: "전체 구조 및 기승전결 요약", icon: <FileText className="w-4 h-4" /> },
  { key: "scenario_character", title: "인물 분석", description: "등장인물 전원 분석 및 관계도", icon: <Users className="w-4 h-4" /> },
  { key: "scenario_potential", title: "잠재력 평가", description: "상업적 가치 및 리스크 평가", icon: <Star className="w-4 h-4" /> },
  { key: "scenario_casting_recommendation", title: "캐스팅 추천", description: "출연 제안서 작성", icon: <UserCheck className="w-4 h-4" /> },
  { key: "scenario_chemistry", title: "케미 분석", description: "상대 배우와의 케미 및 가상 캐스팅", icon: <Sparkles className="w-4 h-4" /> },
];

const RECOGNITION_OPTIONS = [
  { value: "high", label: "상", color: "bg-primary text-primary-foreground" },
  { value: "medium", label: "중", color: "bg-secondary text-secondary-foreground" },
  { value: "low", label: "하", color: "bg-muted text-muted-foreground" },
];

const WORK_TYPES = [
  { value: "드라마", icon: <Tv className="w-4 h-4" /> },
  { value: "상업 영화", icon: <Film className="w-4 h-4" /> },
  { value: "독립 영화", icon: <Clapperboard className="w-4 h-4" /> },
  { value: "단막극", icon: <Star className="w-4 h-4" /> },
];

// ─── Main Component ───
const ScenarioAnalysis: React.FC = () => {
  const { currentTenant, user } = useAuth();
  const [phase, setPhase] = useState<"form" | "analyzing" | "results">("form");

  // Form state
  const [actors, setActors] = useState<Actor[]>([]);
  const [selectedActors, setSelectedActors] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [documentText, setDocumentText] = useState("");
  const [proposedCharacter, setProposedCharacter] = useState("");
  const [workType, setWorkType] = useState("드라마");
  const [writerRecognition, setWriterRecognition] = useState("medium");
  const [directorRecognition, setDirectorRecognition] = useState("medium");
  const [coStarRecognition, setCoStarRecognition] = useState("medium");
  const [guaranteeLevel, setGuaranteeLevel] = useState("medium");
  const [writerInfo, setWriterInfo] = useState("");
  const [directorInfo, setDirectorInfo] = useState("");
  const [coStarInfo, setCoStarInfo] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [showCrewSection, setShowCrewSection] = useState(false);

  // Analysis state
  const [stepResults, setStepResults] = useState<Record<string, StepResult>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [analysisTitle, setAnalysisTitle] = useState("");
  const abortRef = useRef(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // Recent analyses
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);

  useEffect(() => {
    if (currentTenant) {
      fetchActors();
      fetchRecentAnalyses();
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

  const fetchRecentAnalyses = async () => {
    const { data } = await supabase
      .from("scenario_analyses")
      .select("*")
      .eq("tenant_id", currentTenant!.tenant_id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setRecentAnalyses(data);
  };

  // ─── File Processing ───
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setExtracting(true);
    try {
      if (f.name.endsWith(".docx")) {
        const arrayBuffer = await f.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setDocumentText(result.value);
        toast.success(`텍스트 추출 완료: ${result.value.length.toLocaleString()}자`);
      } else if (f.name.endsWith(".txt")) {
        const text = await f.text();
        setDocumentText(text);
        toast.success(`텍스트 로드 완료: ${text.length.toLocaleString()}자`);
      } else {
        toast.error(".docx 또는 .txt 파일만 지원합니다.");
        setFile(null);
      }
    } catch (err) {
      toast.error("파일 텍스트 추출에 실패했습니다.");
      console.error(err);
    } finally {
      setExtracting(false);
    }
  };

  // ─── Analysis Engine ───
  const startAnalysis = async () => {
    if (!documentText) { toast.error("시나리오 파일을 먼저 업로드해주세요."); return; }
    if (selectedActors.length === 0) { toast.error("분석 대상 배우를 선택해주세요."); return; }

    const selectedActorData = actors.filter((a) => selectedActors.includes(a.id));
    const actorNames = selectedActorData.map((a) => a.name).join(", ");
    setAnalysisTitle(`${actorNames} 캐스팅 분석 보고서`);

    const initResults: Record<string, StepResult> = {};
    ANALYSIS_STEPS.forEach((s) => { initResults[s.key] = { status: "pending", content: "" }; });
    setStepResults(initResults);
    setCurrentStep(0);
    setPhase("analyzing");
    setExpandedSteps(new Set());
    abortRef.current = false;

    const baseVars: Record<string, string> = {
      DOCUMENT_CONTENT: documentText.substring(0, 80000),
      ACTOR_NAME: actorNames,
      ACTOR_PROFILE: selectedActorData.map((a) => `[${a.name}]\n${a.info || "프로필 정보 없음"}`).join("\n\n"),
      PROPOSED_CHARACTER: proposedCharacter || "(지정되지 않음)",
      WRITER_RECOGNITION: writerRecognition === "high" ? "상" : writerRecognition === "medium" ? "중" : "하",
      DIRECTOR_RECOGNITION: directorRecognition === "high" ? "상" : directorRecognition === "medium" ? "중" : "하",
      CO_STAR_RECOGNITION: coStarRecognition === "high" ? "상" : coStarRecognition === "medium" ? "중" : "하",
      GUARANTEE_LEVEL: guaranteeLevel === "high" ? "상" : guaranteeLevel === "medium" ? "중" : "하",
      WRITER_INFO: writerInfo || "(정보 없음)",
      DIRECTOR_INFO: directorInfo || "(정보 없음)",
      CO_STAR_INFO: coStarInfo || "(정보 없음)",
      WORK_TYPE: workType,
    };

    let chainedVars: Record<string, string> = { ...baseVars };

    for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
      if (abortRef.current) break;
      const step = ANALYSIS_STEPS[i];
      setCurrentStep(i);
      setStepResults((prev) => ({ ...prev, [step.key]: { status: "running", content: "" } }));
      // Auto-expand running step
      setExpandedSteps((prev) => new Set([...prev, step.key]));

      try {
        const { data, error } = await invokeEdgeFunction("analyze-scenario", {
          body: { stepKey: step.key, variables: chainedVars, tenantId: currentTenant!.tenant_id },
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "분석 실패");

        const result = data.result;
        if (step.key === "scenario_plot") chainedVars.PLOT_RESULT = result;
        else if (step.key === "scenario_character") chainedVars.CHARACTER_RESULT = result;
        else if (step.key === "scenario_metadata") chainedVars.METADATA_RESULT = result;

        setStepResults((prev) => ({ ...prev, [step.key]: { status: "done", content: result } }));
        if (i < ANALYSIS_STEPS.length - 1 && !abortRef.current) {
          await new Promise((r) => setTimeout(r, 3000));
        }
      } catch (err: any) {
        setStepResults((prev) => ({ ...prev, [step.key]: { status: "error", content: "", error: err.message } }));
        toast.error(`${step.title} 분석 실패: ${err.message}`);
        if (i < ANALYSIS_STEPS.length - 1) await new Promise((r) => setTimeout(r, 2000));
      }
    }

    try {
      await supabase.from("scenario_analyses").insert({
        tenant_id: currentTenant!.tenant_id,
        user_id: user!.id,
        title: `${actorNames} - ${file?.name || "분석"}`,
        actor_names: selectedActorData.map((a) => a.name),
        status: "completed",
        input_data: { workType, proposedCharacter, writerRecognition, directorRecognition, coStarRecognition, guaranteeLevel },
        results: Object.fromEntries(ANALYSIS_STEPS.map((s) => [s.key, stepResults[s.key]?.content || ""])),
      });
    } catch (e) { console.error("Save analysis error:", e); }

    setPhase("results");
    // Expand all on completion
    setExpandedSteps(new Set(ANALYSIS_STEPS.map((s) => s.key)));
    toast.success("모든 분석이 완료되었습니다!");
  };

  // ─── Result Actions ───
  const copyResults = () => {
    const fullText = ANALYSIS_STEPS.map((s) => {
      const r = stepResults[s.key];
      return `## ${s.title}\n\n${r?.content || "(분석 없음)"}`;
    }).join("\n\n---\n\n");
    navigator.clipboard.writeText(`# ${analysisTitle}\n\n${fullText}`);
    toast.success("분석 결과가 클립보드에 복사되었습니다.");
  };

  const downloadPdf = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");
      const el = document.getElementById("analysis-results-container");
      if (!el) return;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      let yOffset = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();
      while (yOffset < pdfHeight) {
        if (yOffset > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -yOffset, pdfWidth, pdfHeight);
        yOffset += pageHeight;
      }
      pdf.save(`${analysisTitle || "시나리오분석"}.pdf`);
      toast.success("PDF 다운로드 완료");
    } catch (e) {
      toast.error("PDF 생성에 실패했습니다.");
      console.error(e);
    }
  };

  const resetForm = () => {
    setPhase("form");
    setStepResults({});
    setCurrentStep(0);
    setDocumentText("");
    setFile(null);
    setSelectedActors([]);
    setProposedCharacter("");
    abortRef.current = true;
  };

  const toggleStep = (key: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ─── Render ───
  const completedSteps = Object.values(stepResults).filter((r) => r.status === "done").length;
  const progressPercent = (completedSteps / ANALYSIS_STEPS.length) * 100;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* ════════ Hero Header ════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 border border-primary/10 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <Film className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">시나리오 분석 시스템</h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI 기반 6단계 심층 분석 · 캐스팅 적합성 평가 · 케미스트리 예측
            </p>
            <div className="flex items-center gap-2 mt-3">
              {ANALYSIS_STEPS.map((s, i) => (
                <div key={s.key} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    stepResults[s.key]?.status === "done" ? "bg-green-500" :
                    stepResults[s.key]?.status === "running" ? "bg-primary animate-pulse" :
                    stepResults[s.key]?.status === "error" ? "bg-destructive" :
                    "bg-muted-foreground/30"
                  }`} />
                  {i < ANALYSIS_STEPS.length - 1 && <div className="w-4 h-px bg-border" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ════════ FORM PHASE ════════ */}
      {phase === "form" && (
        <div className="space-y-6">
          {/* Recent Analyses */}
          {recentAnalyses.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">최근 분석 이력</span>
              </div>
              <div className="grid gap-1.5">
                {recentAnalyses.slice(0, 3).map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                    <span className="text-sm text-foreground truncate max-w-[70%]">{a.title}</span>
                    <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("ko")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* ── Left Column ── */}
            <div className="space-y-6">
              {/* File Upload */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileUp className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">시나리오 파일</h3>
                      <p className="text-xs text-muted-foreground">.docx 또는 .txt</p>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <label className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                    documentText ? "border-green-400/50 bg-green-50/30 dark:bg-green-950/10" : "border-border hover:border-primary/50 hover:bg-primary/5"
                  }`}>
                    <input
                      type="file"
                      accept=".docx,.txt"
                      onChange={handleFileChange}
                      disabled={extracting}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {extracting ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <span className="text-sm text-muted-foreground">텍스트 추출 중...</span>
                      </div>
                    ) : documentText ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                        <span className="text-sm font-medium text-foreground">{file?.name}</span>
                        <span className="text-xs text-muted-foreground">{documentText.length.toLocaleString()}자 추출 완료</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-muted-foreground/50" />
                        <span className="text-sm text-muted-foreground">클릭하여 파일을 선택하세요</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Actor Selection */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">분석 대상 배우</h3>
                      <p className="text-xs text-muted-foreground">
                        {selectedActors.length > 0 ? `${selectedActors.length}명 선택됨` : "배우를 선택하세요"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  {actors.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      <Users className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                      등록된 배우가 없습니다.<br />관리자 페이지에서 배우를 추가해주세요.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {actors.map((actor) => {
                        const selected = selectedActors.includes(actor.id);
                        return (
                          <label
                            key={actor.id}
                            className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                              selected
                                ? "border-primary/50 bg-primary/5 shadow-sm"
                                : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                            }`}
                          >
                            <Checkbox
                              checked={selected}
                              onCheckedChange={(checked) =>
                                setSelectedActors((prev) =>
                                  checked ? [...prev, actor.id] : prev.filter((id) => id !== actor.id)
                                )
                              }
                            />
                            <div className="min-w-0">
                              <span className="text-sm font-medium text-foreground">{actor.name}</span>
                              {actor.info && (
                                <p className="text-xs text-muted-foreground truncate">{actor.info.substring(0, 30)}</p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Right Column ── */}
            <div className="space-y-6">
              {/* Work Info */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Clapperboard className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">작품 정보</h3>
                  </div>
                </div>
                <div className="p-5 space-y-5">
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">작품 유형</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {WORK_TYPES.map((t) => (
                        <label
                          key={t.value}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm cursor-pointer transition-all ${
                            workType === t.value
                              ? "border-primary/50 bg-primary/5 font-medium text-foreground"
                              : "border-border text-muted-foreground hover:border-muted-foreground/30"
                          }`}
                        >
                          <input type="radio" name="workType" value={t.value} checked={workType === t.value} onChange={(e) => setWorkType(e.target.value)} className="sr-only" />
                          {t.icon}
                          {t.value}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">제안 받은 캐릭터명</Label>
                    <Input
                      value={proposedCharacter}
                      onChange={(e) => setProposedCharacter(e.target.value)}
                      placeholder="예: 홍길동"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">개런티 수준</Label>
                    <div className="flex gap-2">
                      {RECOGNITION_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => setGuaranteeLevel(o.value)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                            guaranteeLevel === o.value
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-border text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Crew Section (Collapsible) */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setShowCrewSection(!showCrewSection)}
                  className="w-full px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                      <PenLine className="w-4 h-4 text-accent" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-semibold text-foreground">제작진 정보</h3>
                      <p className="text-xs text-muted-foreground">선택사항 · 입력 시 더 정확한 분석</p>
                    </div>
                  </div>
                  {showCrewSection ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {showCrewSection && (
                  <div className="p-5 space-y-5">
                    <CrewField label="작가" value={writerInfo} onChange={setWriterInfo} recognition={writerRecognition} onRecognitionChange={setWriterRecognition} placeholder="이름 및 주요 특징 (예: 김은숙, '도깨비' 흥행)" />
                    <Separator />
                    <CrewField label="감독" value={directorInfo} onChange={setDirectorInfo} recognition={directorRecognition} onRecognitionChange={setDirectorRecognition} placeholder="이름 및 주요 특징 (예: 봉준호, '기생충' 연출)" />
                    <Separator />
                    <CrewField label="상대 배우" value={coStarInfo} onChange={setCoStarInfo} recognition={coStarRecognition} onRecognitionChange={setCoStarRecognition} placeholder="이름 및 주요 특징 (예: 송혜교, 멜로 연기의 대가)" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={startAnalysis}
            disabled={!documentText || selectedActors.length === 0}
            className="w-full group relative overflow-hidden rounded-xl py-4 px-6 font-semibold text-primary-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary-foreground/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div className="relative flex items-center justify-center gap-2">
              <Zap className="w-5 h-5" />
              <span>AI 분석 시작하기</span>
            </div>
          </button>
        </div>
      )}

      {/* ════════ ANALYZING / RESULTS PHASE ════════ */}
      {(phase === "analyzing" || phase === "results") && (
        <div className="space-y-6">
          {/* Progress Card */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {phase === "results" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                )}
                <span className="font-semibold text-foreground">
                  {phase === "results" ? "분석 완료" : `${currentStep + 1}/${ANALYSIS_STEPS.length}단계 분석 중...`}
                </span>
              </div>
              <Badge variant={phase === "results" ? "secondary" : "default"} className="text-xs">
                {completedSteps}/{ANALYSIS_STEPS.length}
              </Badge>
            </div>
            <Progress value={progressPercent} className="h-2" />

            {/* Mini step indicators */}
            <div className="flex justify-between mt-3">
              {ANALYSIS_STEPS.map((step, i) => {
                const result = stepResults[step.key];
                return (
                  <div key={step.key} className="flex flex-col items-center gap-1" style={{ width: `${100 / ANALYSIS_STEPS.length}%` }}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                      result?.status === "done" ? "bg-green-500 text-primary-foreground" :
                      result?.status === "running" ? "bg-primary text-primary-foreground animate-pulse" :
                      result?.status === "error" ? "bg-destructive text-destructive-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {result?.status === "done" ? "✓" : i + 1}
                    </div>
                    <span className="text-[10px] text-muted-foreground text-center leading-tight hidden sm:block">{step.title}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          {phase === "results" && (
            <div className="flex gap-2 flex-wrap">
              <Button onClick={copyResults} variant="outline" size="sm" className="rounded-lg">
                <Copy className="w-4 h-4 mr-1.5" /> 결과 복사
              </Button>
              <Button onClick={downloadPdf} variant="outline" size="sm" className="rounded-lg">
                <Download className="w-4 h-4 mr-1.5" /> PDF 다운로드
              </Button>
              <Button onClick={resetForm} variant="outline" size="sm" className="rounded-lg">
                <RotateCcw className="w-4 h-4 mr-1.5" /> 다시 분석하기
              </Button>
            </div>
          )}

          {/* Step Results */}
          <div id="analysis-results-container" className="space-y-3">
            <p className="text-center text-xs text-muted-foreground italic py-2">
              본 분석 결과는 AI의 판단에 따르며, 참고용으로만 사용하시기 바랍니다.
            </p>
            {ANALYSIS_STEPS.map((step, i) => {
              const result = stepResults[step.key];
              const isExpanded = expandedSteps.has(step.key);
              const status = result?.status || "pending";

              return (
                <div
                  key={step.key}
                  className={`rounded-xl border overflow-hidden transition-all ${
                    status === "running" ? "border-primary/40 shadow-md shadow-primary/5" :
                    status === "done" ? "border-green-200 dark:border-green-900/30" :
                    status === "error" ? "border-destructive/30" :
                    "border-border"
                  } bg-card`}
                >
                  {/* Step Header */}
                  <button
                    onClick={() => toggleStep(step.key)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        status === "done" ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" :
                        status === "running" ? "bg-primary/10 text-primary" :
                        status === "error" ? "bg-destructive/10 text-destructive" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {status === "running" ? <Loader2 className="w-4 h-4 animate-spin" /> :
                         status === "done" ? <CheckCircle2 className="w-4 h-4" /> :
                         status === "error" ? <AlertCircle className="w-4 h-4" /> :
                         step.icon}
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{i + 1}단계: {step.title}</span>
                          {status === "running" && (
                            <span className="text-xs text-primary animate-pulse">분석 중...</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StepBadge status={status} />
                      {(status === "done" || status === "error") && (
                        isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Step Content */}
                  {status === "running" && (
                    <div className="px-4 pb-4">
                      <div className="rounded-lg bg-primary/5 border border-primary/10 p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-3 h-3 rounded-full bg-primary animate-ping absolute" />
                            <div className="w-3 h-3 rounded-full bg-primary relative" />
                          </div>
                          <span className="text-sm text-muted-foreground">AI가 분석 중입니다. 잠시만 기다려주세요...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {status === "done" && isExpanded && result?.content && (
                    <div className="px-4 pb-4">
                      <div className="prose prose-sm max-w-none dark:prose-invert rounded-lg bg-muted/20 border border-border/50 p-5">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.content}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {status === "error" && isExpanded && (
                    <div className="px-4 pb-4">
                      <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4">
                        <p className="text-sm text-destructive">❌ {result?.error}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Sub Components ───
const StepBadge: React.FC<{ status: StepStatus }> = ({ status }) => {
  const config = {
    pending: { label: "대기", cls: "bg-muted text-muted-foreground" },
    running: { label: "분석 중", cls: "bg-primary/10 text-primary" },
    done: { label: "완료", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    error: { label: "실패", cls: "bg-destructive/10 text-destructive" },
  };
  const c = config[status];
  return <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${c.cls}`}>{c.label}</span>;
};

const CrewField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  recognition: string;
  onRecognitionChange: (v: string) => void;
  placeholder: string;
}> = ({ label, value, onChange, recognition, onRecognitionChange, placeholder }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <Label className="text-sm font-medium">{label} 정보</Label>
      <div className="flex gap-1">
        {RECOGNITION_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onRecognitionChange(o.value)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
              recognition === o.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
    <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} className="text-sm" />
  </div>
);

export default ScenarioAnalysis;
