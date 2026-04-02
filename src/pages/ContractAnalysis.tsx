import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mammoth from "mammoth";
import {
  FileSearch,
  Upload,
  CheckCircle2,
  Loader2,
  Copy,
  Download,
  RotateCcw,
  FileText,
  Sparkles,
  Zap,
  ChevronDown,
  ChevronUp,
  FileUp,
  AlertCircle,
  Scale,
  Shield,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

// ─── Types ───
type AnalysisStatus = "idle" | "analyzing" | "done" | "error";

interface AnalysisResult {
  content: string;
  error?: string;
}

// ─── Constants ───
const CONTRACT_TYPES = [
  { key: "contract_movie", label: "영화 출연", icon: <FileText className="w-4 h-4" />, desc: "영화 출연 계약서" },
  { key: "contract_drama", label: "드라마 출연", icon: <FileText className="w-4 h-4" />, desc: "드라마 출연 계약서" },
  { key: "contract_advertisement", label: "광고 모델", icon: <Sparkles className="w-4 h-4" />, desc: "광고 모델 계약서" },
  { key: "contract_event", label: "행사/공연", icon: <Scale className="w-4 h-4" />, desc: "행사·공연 출연 계약서" },
  { key: "contract_other", label: "기타", icon: <FileSearch className="w-4 h-4" />, desc: "기타 유형 계약서" },
];

const REVIEW_LEVELS = [
  { value: "standard", label: "표준 검토", desc: "핵심 독소 조항 위주 간결 분석", icon: <Shield className="w-4 h-4" /> },
  { value: "detailed", label: "정밀 검토", desc: "전 조항 정밀 분석 + 법적 근거", icon: <ShieldAlert className="w-4 h-4" /> },
];

// ─── Main Component ───
const ContractAnalysis: React.FC = () => {
  const { currentTenant, user } = useAuth();
  const [phase, setPhase] = useState<"form" | "analyzing" | "results">("form");

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [contractText, setContractText] = useState("");
  const [contractType, setContractType] = useState("contract_movie");
  const [actorName, setActorName] = useState("");
  const [reviewLevel, setReviewLevel] = useState("standard");
  const [extraNotes, setExtraNotes] = useState("");
  const [extracting, setExtracting] = useState(false);

  // Analysis state
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const abortRef = useRef(false);

  // Cleanup contract text on unmount (security)
  useEffect(() => {
    return () => {
      setContractText("");
      setResult(null);
    };
  }, []);

  // ─── File Processing ───
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setExtracting(true);
    try {
      if (f.name.endsWith(".docx")) {
        const arrayBuffer = await f.arrayBuffer();
        const r = await mammoth.extractRawText({ arrayBuffer });
        setContractText(r.value);
        toast.success(`텍스트 추출 완료: ${r.value.length.toLocaleString()}자`);
      } else if (f.name.endsWith(".txt")) {
        const text = await f.text();
        setContractText(text);
        toast.success(`텍스트 로드 완료: ${text.length.toLocaleString()}자`);
      } else if (f.name.endsWith(".pdf")) {
        toast.error("PDF 파일은 텍스트 추출이 제한됩니다. .docx 또는 .txt로 변환 후 업로드해주세요.");
        setFile(null);
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
    if (!contractText) { toast.error("계약서 파일을 먼저 업로드해주세요."); return; }
    if (!actorName.trim()) { toast.error("검토 대상 배우 이름을 입력해주세요."); return; }

    setPhase("analyzing");
    setStatus("analyzing");
    setResult(null);
    abortRef.current = false;

    const reviewInstruction = reviewLevel === "detailed"
      ? "모든 조항을 한 줄 한 줄 꼼꼼하게 분석하고, 법적 근거와 예상 리스크를 포함하여 매우 상세한 리포트를 작성해줘."
      : "핵심적인 독소 조항과 불리한 조건 위주로 간결하게 요약해서 보고해줘.";

    const variables: Record<string, string> = {
      CONTRACT_TEXT: contractText.substring(0, 100000),
      ACTOR_NAME: actorName,
      EXTRA_NOTES: extraNotes || "(없음)",
      REVIEW_LEVEL_INSTRUCTION: reviewInstruction,
    };

    try {
      const { data, error } = await invokeEdgeFunction("analyze-contract", {
        body: { stepKey: contractType, variables, tenantId: currentTenant!.tenant_id },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "분석 실패");

      setResult({ content: data.result });
      setStatus("done");
      setPhase("results");

      // Save to DB
      try {
        await supabase.from("contract_analyses").insert({
          tenant_id: currentTenant!.tenant_id,
          user_id: user!.id,
          title: `${actorName} - ${CONTRACT_TYPES.find(t => t.key === contractType)?.label || "계약서"} 분석`,
          contract_type: contractType,
          review_level: reviewLevel,
          actor_name: actorName,
          status: "completed",
          result: data.result,
        });
      } catch (e) { console.error("Save error:", e); }

      toast.success("계약서 분석이 완료되었습니다!");
    } catch (err: any) {
      setResult({ content: "", error: err.message });
      setStatus("error");
      setPhase("results");
      toast.error(`분석 실패: ${err.message}`);
    }
  };

  // ─── Result Actions ───
  const copyResults = () => {
    if (!result?.content) return;
    navigator.clipboard.writeText(result.content);
    toast.success("분석 결과가 클립보드에 복사되었습니다.");
  };

  const downloadPdf = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");
      const el = document.getElementById("contract-result-container");
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
      pdf.save(`${actorName}_계약서분석.pdf`);
      toast.success("PDF 다운로드 완료");
    } catch (e) {
      toast.error("PDF 생성에 실패했습니다.");
    }
  };

  const resetForm = () => {
    setPhase("form");
    setStatus("idle");
    setResult(null);
    setContractText("");
    setFile(null);
    setActorName("");
    setExtraNotes("");
    abortRef.current = true;
  };

  // ─── Render ───
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* ════════ Hero Header ════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-red-500/5 border border-amber-500/10 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Scale className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">AI 계약서 법률 검토</h1>
            <p className="text-sm text-muted-foreground mt-1">
              엔터테인먼트 전문 변호사 AI · 독소조항 분석 · 법적 리스크 평가
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:text-amber-400">
                <Shield className="w-3 h-3 mr-1" /> 보안 분석
              </Badge>
              <Badge variant="outline" className="text-xs border-muted">
                세션 종료 시 데이터 자동 삭제
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* ════════ FORM PHASE ════════ */}
      {phase === "form" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* ── Left Column ── */}
            <div className="space-y-6">
              {/* File Upload */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <FileUp className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">계약서 파일</h3>
                      <p className="text-xs text-muted-foreground">.docx 또는 .txt (PDF는 변환 후 업로드)</p>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <label className={`relative flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                    contractText ? "border-green-400/50 bg-green-50/30 dark:bg-green-950/10" : "border-border hover:border-amber-500/50 hover:bg-amber-500/5"
                  }`}>
                    <input
                      type="file"
                      accept=".docx,.txt,.pdf"
                      onChange={handleFileChange}
                      disabled={extracting}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {extracting ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
                        <span className="text-sm text-muted-foreground">텍스트 추출 중...</span>
                      </div>
                    ) : contractText ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                        <span className="text-sm font-medium text-foreground">{file?.name}</span>
                        <span className="text-xs text-muted-foreground">{contractText.length.toLocaleString()}자 추출 완료</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-muted-foreground/50" />
                        <span className="text-sm text-muted-foreground">클릭하여 계약서를 업로드하세요</span>
                        <span className="text-xs text-muted-foreground/70">드래그 앤 드롭도 가능합니다</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Contract Type Selection */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <FileSearch className="w-4 h-4 text-orange-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">계약 유형</h3>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 gap-2">
                    {CONTRACT_TYPES.map((type) => (
                      <label
                        key={type.key}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          contractType === type.key
                            ? "border-amber-500/50 bg-amber-500/5 shadow-sm"
                            : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                        }`}
                      >
                        <input
                          type="radio"
                          name="contractType"
                          value={type.key}
                          checked={contractType === type.key}
                          onChange={(e) => setContractType(e.target.value)}
                          className="sr-only"
                        />
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          contractType === type.key ? "bg-amber-500/20 text-amber-600" : "bg-muted text-muted-foreground"
                        }`}>
                          {type.icon}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-foreground">{type.label}</span>
                          <p className="text-xs text-muted-foreground">{type.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right Column ── */}
            <div className="space-y-6">
              {/* Actor & Review Level */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Scale className="w-4 h-4 text-amber-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">검토 정보</h3>
                  </div>
                </div>
                <div className="p-5 space-y-5">
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">대상 배우</Label>
                    <Input
                      value={actorName}
                      onChange={(e) => setActorName(e.target.value)}
                      placeholder="검토 대상 배우 이름"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">검토 수준</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {REVIEW_LEVELS.map((level) => (
                        <label
                          key={level.value}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border cursor-pointer transition-all text-center ${
                            reviewLevel === level.value
                              ? "border-amber-500/50 bg-amber-500/5 shadow-sm"
                              : "border-border hover:border-muted-foreground/30"
                          }`}
                        >
                          <input
                            type="radio"
                            name="reviewLevel"
                            value={level.value}
                            checked={reviewLevel === level.value}
                            onChange={(e) => setReviewLevel(e.target.value)}
                            className="sr-only"
                          />
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            reviewLevel === level.value ? "bg-amber-500/20 text-amber-600" : "bg-muted text-muted-foreground"
                          }`}>
                            {level.icon}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-foreground block">{level.label}</span>
                            <span className="text-[11px] text-muted-foreground">{level.desc}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">특이사항 / 추가 요청</Label>
                    <Textarea
                      value={extraNotes}
                      onChange={(e) => setExtraNotes(e.target.value)}
                      placeholder="특별히 주의해서 검토해야 할 사항을 입력하세요. (예: 초상권 관련 조항 집중 검토)"
                      rows={4}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <div className="rounded-xl border border-amber-200 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-400">보안 안내</p>
                    <p className="text-xs text-amber-700/80 dark:text-amber-400/70 mt-1">
                      계약서 원문은 분석 후 브라우저 메모리에서 자동 삭제됩니다. 서버에는 분석 결과만 저장됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={startAnalysis}
            disabled={!contractText || !actorName.trim()}
            className="w-full group relative overflow-hidden rounded-xl py-4 px-6 font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-white/10 to-amber-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div className="relative flex items-center justify-center gap-2">
              <Zap className="w-5 h-5" />
              <span>AI 법률 검토 시작</span>
            </div>
          </button>
        </div>
      )}

      {/* ════════ ANALYZING PHASE ════════ */}
      {phase === "analyzing" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-8">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Scale className="w-10 h-10 text-white animate-pulse" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 animate-ping" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-foreground">전문 변호사 AI가 계약서를 검토 중입니다</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {reviewLevel === "detailed" ? "정밀 검토 모드 · 전 조항 분석 중..." : "표준 검토 모드 · 핵심 조항 분석 중..."}
                </p>
              </div>
              <div className="w-full max-w-md">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-pulse" style={{ width: "60%" }} />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                계약 유형: {CONTRACT_TYPES.find(t => t.key === contractType)?.label} · 대상: {actorName}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ RESULTS PHASE ════════ */}
      {phase === "results" && (
        <div className="space-y-6">
          {/* Action Buttons */}
          {status === "done" && (
            <div className="flex gap-2 flex-wrap">
              <Button onClick={copyResults} variant="outline" size="sm" className="rounded-lg">
                <Copy className="w-4 h-4 mr-1.5" /> 결과 복사
              </Button>
              <Button onClick={downloadPdf} variant="outline" size="sm" className="rounded-lg">
                <Download className="w-4 h-4 mr-1.5" /> PDF 다운로드
              </Button>
              <Button onClick={resetForm} variant="outline" size="sm" className="rounded-lg">
                <RotateCcw className="w-4 h-4 mr-1.5" /> 새 계약서 분석
              </Button>
            </div>
          )}

          {/* Result Content */}
          <div id="contract-result-container">
            {status === "done" && result?.content && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">법률 검토 리포트</h3>
                    <p className="text-xs text-muted-foreground">{actorName} · {CONTRACT_TYPES.find(t => t.key === contractType)?.label}</p>
                  </div>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {reviewLevel === "detailed" ? "정밀 검토" : "표준 검토"}
                  </Badge>
                </div>
                <div className="p-6">
                  <div className="prose prose-sm max-w-none dark:prose-invert
                    prose-h1:text-xl prose-h1:font-bold prose-h1:border-b prose-h1:border-border prose-h1:pb-2
                    prose-h2:text-lg prose-h2:font-semibold prose-h2:mt-6
                    prose-h3:text-base prose-h3:font-medium
                    prose-strong:text-amber-700 dark:prose-strong:text-amber-400
                    prose-blockquote:border-l-amber-500 prose-blockquote:bg-amber-50/50 dark:prose-blockquote:bg-amber-950/20 prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:rounded-r-lg
                  ">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">분석 실패</p>
                    <p className="text-sm text-destructive/80 mt-1">{result?.error}</p>
                  </div>
                </div>
                <Button onClick={resetForm} variant="outline" size="sm" className="mt-4">
                  <RotateCcw className="w-4 h-4 mr-1.5" /> 다시 시도
                </Button>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground italic">
            ⚖️ 본 분석 결과는 AI의 참고 의견이며, 법적 구속력이 없습니다. 중요한 결정은 반드시 전문 법률 자문을 받으시기 바랍니다.
          </p>
        </div>
      )}
    </div>
  );
};

export default ContractAnalysis;
