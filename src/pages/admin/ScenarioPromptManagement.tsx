import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, RotateCcw, FileCode2, Info } from "lucide-react";

interface Prompt {
  id: string;
  key: string;
  name: string;
  content: string;
  category: string;
  display_order: number;
  tenant_id: string | null;
}

const DEFAULT_PROMPTS = [
  {
    key: "scenario_metadata",
    name: "1단계: 작품 개요 추출",
    display_order: 1,
    content: `다음 시나리오를 분석하여 작품의 기본 정보를 추출하세요.

## 분석 대상 시나리오:
{{DOCUMENT_CONTENT}}

## 추출 항목:
- 작품 제목
- 장르 (드라마/로맨스/스릴러/코미디 등)
- 주요 배경 (시대, 장소)
- 작품 유형: {{WORK_TYPE}}
- 전체 분위기 및 톤
- 예상 타겟 시청자층

마크다운 형식으로 깔끔하게 정리해주세요.`,
  },
  {
    key: "scenario_plot",
    name: "2단계: 줄거리 분석",
    display_order: 2,
    content: `다음 시나리오의 전체 줄거리를 분석하세요.

## 시나리오:
{{DOCUMENT_CONTENT}}

## 분석 요구사항:
1. **전체 줄거리 요약** (500자 내외)
2. **기승전결 구조 분석**
   - 기(起): 도입부
   - 승(承): 전개부
   - 전(轉): 위기/전환점
   - 결(結): 결말
3. **핵심 갈등 구조**
4. **주요 서브플롯**
5. **스토리 강점 및 약점**`,
  },
  {
    key: "scenario_character",
    name: "3단계: 인물 분석",
    display_order: 3,
    content: `다음 시나리오의 등장인물을 전원 분석하세요.

## 시나리오:
{{DOCUMENT_CONTENT}}

## 분석 요구사항:
각 인물에 대해:
- **이름 및 역할** (주연/조연/단역)
- **성격 특성** (3~5개 키워드)
- **극 중 목표와 동기**
- **관계도** (다른 인물과의 관계)
- **캐릭터 아크** (성장/변화 여부)
- **대사 스타일 및 특징**

특히 **{{PROPOSED_CHARACTER}}** 캐릭터에 대해 심층 분석을 해주세요.`,
  },
  {
    key: "scenario_potential",
    name: "4단계: 잠재력 평가",
    display_order: 4,
    content: `다음 시나리오의 상업적 잠재력을 평가하세요.

## 줄거리 분석 결과:
{{PLOT_RESULT}}

## 인물 분석 결과:
{{CHARACTER_RESULT}}

## 제작진 정보:
- 작가 인지도: {{WRITER_RECOGNITION}} | 작가 정보: {{WRITER_INFO}}
- 감독 인지도: {{DIRECTOR_RECOGNITION}} | 감독 정보: {{DIRECTOR_INFO}}
- 상대 배우 인지도: {{CO_STAR_RECOGNITION}} | 상대 배우 정보: {{CO_STAR_INFO}}
- 개런티 수준: {{GUARANTEE_LEVEL}}

## 평가 항목:
1. **상업성 점수** (100점 만점)
2. **시청률/관객수 예측**
3. **화제성 잠재력**
4. **리스크 요인**
5. **경쟁작 분석**
6. **종합 추천 의견**`,
  },
  {
    key: "scenario_casting_recommendation",
    name: "5단계: 캐스팅 추천",
    display_order: 5,
    content: `다음 배우의 캐스팅 적합성을 분석하고 출연 제안서를 작성하세요.

## 배우 정보:
이름: {{ACTOR_NAME}}
프로필:
{{ACTOR_PROFILE}}

## 제안 캐릭터: {{PROPOSED_CHARACTER}}

## 인물 분석 결과:
{{CHARACTER_RESULT}}

## 분석 요구사항:
1. **캐릭터-배우 매칭도** (적합성 점수 100점 만점)
2. **캐스팅 강점** (배우의 어떤 특성이 캐릭터와 맞는지)
3. **캐스팅 리스크** (우려사항)
4. **이미지 변신 가능성**
5. **출연 제안 포인트** (에이전시 입장에서 배우에게 어필할 포인트)
6. **최종 출연 추천 의견**`,
  },
  {
    key: "scenario_chemistry",
    name: "6단계: 케미 분석",
    display_order: 6,
    content: `다음 정보를 바탕으로 캐스팅 케미스트리를 분석하세요.

## 배우: {{ACTOR_NAME}}
## 배우 프로필: {{ACTOR_PROFILE}}
## 상대 배우 정보: {{CO_STAR_INFO}}
## 인물 분석 결과:
{{CHARACTER_RESULT}}

## 분석 요구사항:
1. **주연/조연 간 케미 예측**
2. **장르 적합성** (배우 조합이 해당 장르에 맞는지)
3. **과거 유사 캐스팅 사례 비교**
4. **가상 캐스팅 시나리오** (다른 배우 후보 3인 제안)
5. **팬덤 반응 예측**
6. **마케팅 활용 포인트**`,
  },
];

const VARIABLE_DOCS = [
  { name: "{{DOCUMENT_CONTENT}}", desc: "업로드된 시나리오 전체 텍스트" },
  { name: "{{ACTOR_NAME}}", desc: "선택된 배우 이름" },
  { name: "{{ACTOR_PROFILE}}", desc: "선택된 배우의 상세 프로필" },
  { name: "{{PROPOSED_CHARACTER}}", desc: "제안 받은 캐릭터명" },
  { name: "{{PLOT_RESULT}}", desc: "2단계 줄거리 분석 결과 (자동 주입)" },
  { name: "{{CHARACTER_RESULT}}", desc: "3단계 인물 분석 결과 (자동 주입)" },
  { name: "{{WRITER_RECOGNITION}}", desc: "작가 인지도 (상/중/하)" },
  { name: "{{DIRECTOR_RECOGNITION}}", desc: "감독 인지도 (상/중/하)" },
  { name: "{{CO_STAR_RECOGNITION}}", desc: "상대 배우 인지도 (상/중/하)" },
  { name: "{{GUARANTEE_LEVEL}}", desc: "개런티 수준 (상/중/하)" },
  { name: "{{WRITER_INFO}}", desc: "작가 정보 텍스트" },
  { name: "{{DIRECTOR_INFO}}", desc: "감독 정보 텍스트" },
  { name: "{{CO_STAR_INFO}}", desc: "상대 배우 정보 텍스트" },
  { name: "{{WORK_TYPE}}", desc: "작품 유형" },
];

const ScenarioPromptManagement: React.FC = () => {
  const { currentTenant } = useAuth();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (currentTenant) fetchPrompts();
  }, [currentTenant]);

  const fetchPrompts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("scenario_prompts")
      .select("*")
      .or(`tenant_id.eq.${currentTenant!.tenant_id},tenant_id.is.null`)
      .order("display_order");
    
    if (data && data.length > 0) {
      setPrompts(data);
    } else {
      // No prompts found, initialize defaults
      await initializeDefaults();
    }
    setLoading(false);
  };

  const initializeDefaults = async () => {
    const inserts = DEFAULT_PROMPTS.map((p) => ({
      ...p,
      category: "Scenario",
      tenant_id: currentTenant!.tenant_id,
    }));
    const { data, error } = await supabase
      .from("scenario_prompts")
      .insert(inserts)
      .select();
    if (data) {
      setPrompts(data);
      toast.success("기본 프롬프트가 초기화되었습니다.");
    }
  };

  const handleSave = async (prompt: Prompt) => {
    setSaving(prompt.id);
    const { error } = await supabase
      .from("scenario_prompts")
      .update({
        name: prompt.name,
        content: prompt.content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", prompt.id);

    if (error) {
      toast.error("저장 실패");
    } else {
      toast.success(`${prompt.name} 저장 완료`);
    }
    setSaving(null);
  };

  const updatePrompt = (id: string, field: string, value: string) => {
    setPrompts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const resetToDefault = async (key: string) => {
    const defaultPrompt = DEFAULT_PROMPTS.find((p) => p.key === key);
    if (!defaultPrompt) return;
    if (!confirm("기본 프롬프트로 초기화하시겠습니까?")) return;
    
    const existing = prompts.find((p) => p.key === key);
    if (existing) {
      await supabase
        .from("scenario_prompts")
        .update({ content: defaultPrompt.content, name: defaultPrompt.name })
        .eq("id", existing.id);
    }
    fetchPrompts();
    toast.success("기본값으로 초기화되었습니다.");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <FileCode2 className="w-7 h-7 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold">프롬프트 관리</h1>
          <p className="text-sm text-muted-foreground">시나리오 분석 단계별 AI 프롬프트를 수정합니다.</p>
        </div>
      </div>

      {/* Variable Reference */}
      <Card>
        <CardHeader className="py-3 cursor-pointer">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="w-4 h-4" /> 치환 변수 레퍼런스
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {VARIABLE_DOCS.map((v) => (
              <div key={v.name} className="flex items-start gap-2 text-xs">
                <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-primary shrink-0">{v.name}</code>
                <span className="text-muted-foreground">{v.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Prompt Editors */}
      <Tabs defaultValue={prompts[0]?.key || "scenario_metadata"}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {prompts.map((p) => (
            <TabsTrigger key={p.key} value={p.key} className="text-xs">
              {p.name.replace(/^\d단계: /, "")}
            </TabsTrigger>
          ))}
        </TabsList>

        {prompts.map((prompt) => (
          <TabsContent key={prompt.key} value={prompt.key}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <Input
                      value={prompt.name}
                      onChange={(e) => updatePrompt(prompt.id, "name", e.target.value)}
                      className="font-semibold text-lg border-none p-0 h-auto focus-visible:ring-0"
                    />
                    <Badge variant="outline" className="mt-1">{prompt.key}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => resetToDefault(prompt.key)}>
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> 기본값
                    </Button>
                    <Button size="sm" onClick={() => handleSave(prompt)} disabled={saving === prompt.id}>
                      <Save className="w-3.5 h-3.5 mr-1" /> {saving === prompt.id ? "저장 중..." : "저장"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={prompt.content}
                  onChange={(e) => updatePrompt(prompt.id, "content", e.target.value)}
                  rows={20}
                  className="font-mono text-sm"
                  placeholder="프롬프트 내용을 입력하세요. {{변수명}}을 사용할 수 있습니다."
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default ScenarioPromptManagement;
