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
import { Save, RotateCcw, FileCode2, Info, Scale } from "lucide-react";

interface Prompt {
  id: string;
  key: string;
  name: string;
  content: string;
  category: string;
  display_order: number;
  tenant_id: string | null;
}

const DEFAULT_CONTRACT_PROMPTS = [
  {
    key: "contract_movie",
    name: "영화 출연 계약서",
    display_order: 1,
    content: `# 역할: 엔터테인먼트 전문 변호사 (15년 경력)

# 분석 전제 조건
- 검토 대상자: {{ACTOR_NAME}}
- 검토 수준: {{REVIEW_LEVEL_INSTRUCTION}}
- 특이사항: {{EXTRA_NOTES}}

위 배우의 **영화 출연 계약서**를 검토하여 리포트를 작성하라.

## 중점 분석 항목:
1. 출연료 지급 시기 및 조건
2. 러닝 개런티 산정 기준
3. 퍼블리시티권 귀속 여부
4. 2차 저작물 활용 범위
5. 계약 해지 조건 및 위약금
6. 초상권 및 성명권 보호
7. 촬영 일정 변경 시 보상 조항
8. 비밀유지 의무 범위

## 리포트 형식:
- **위험 조항**: 배우에게 불리한 조항을 인용 블록(>)으로 표시
- **수정 제안**: 각 위험 조항에 대한 수정안 제시
- **체크리스트**: 서명 전 반드시 확인할 사항 목록
- **종합 의견**: 계약 체결 권고/보류/거부 의견

[계약서 원문]
{{CONTRACT_TEXT}}`,
  },
  {
    key: "contract_drama",
    name: "드라마 출연 계약서",
    display_order: 2,
    content: `# 역할: 엔터테인먼트 전문 변호사 (15년 경력)

# 분석 전제 조건
- 검토 대상자: {{ACTOR_NAME}}
- 검토 수준: {{REVIEW_LEVEL_INSTRUCTION}}
- 특이사항: {{EXTRA_NOTES}}

위 배우의 **드라마 출연 계약서**를 검토하여 리포트를 작성하라.

## 중점 분석 항목:
1. 회차별 출연료 및 지급 일정
2. 전속 조항 (타 작품 출연 제한)
3. OTT/해외 판권 수익 분배
4. 장기 촬영 시 근로 조건
5. 부상/질병 시 보장 조항
6. 홍보 의무 범위 (예능 출연 등)
7. 재방송/VOD 수익 분배
8. 계약 해지 및 위약금

## 리포트 형식:
- **위험 조항**: 배우에게 불리한 조항을 인용 블록(>)으로 표시
- **수정 제안**: 각 위험 조항에 대한 수정안 제시
- **체크리스트**: 서명 전 반드시 확인할 사항 목록
- **종합 의견**: 계약 체결 권고/보류/거부 의견

[계약서 원문]
{{CONTRACT_TEXT}}`,
  },
  {
    key: "contract_advertisement",
    name: "광고 모델 계약서",
    display_order: 3,
    content: `# 역할: 엔터테인먼트 전문 변호사 (15년 경력)

# 분석 전제 조건
- 검토 대상자: {{ACTOR_NAME}}
- 검토 수준: {{REVIEW_LEVEL_INSTRUCTION}}
- 특이사항: {{EXTRA_NOTES}}

위 배우의 **광고 모델 계약서**를 검토하여 리포트를 작성하라.

## 중점 분석 항목:
1. 모델료 및 지급 조건
2. 광고 사용 기간 및 지역 범위
3. 초상 사용 범위 (온라인/오프라인/해외)
4. 경쟁 브랜드 제한 조항
5. 재촬영 의무 및 추가 비용
6. 이미지 훼손 시 해지 조건
7. 광고 소재 사전 승인권
8. 계약 갱신 조건

## 리포트 형식:
- **위험 조항**: 배우에게 불리한 조항을 인용 블록(>)으로 표시
- **수정 제안**: 각 위험 조항에 대한 수정안 제시
- **체크리스트**: 서명 전 반드시 확인할 사항 목록
- **종합 의견**: 계약 체결 권고/보류/거부 의견

[계약서 원문]
{{CONTRACT_TEXT}}`,
  },
  {
    key: "contract_event",
    name: "행사/공연 출연 계약서",
    display_order: 4,
    content: `# 역할: 엔터테인먼트 전문 변호사 (15년 경력)

# 분석 전제 조건
- 검토 대상자: {{ACTOR_NAME}}
- 검토 수준: {{REVIEW_LEVEL_INSTRUCTION}}
- 특이사항: {{EXTRA_NOTES}}

위 배우의 **행사/공연 출연 계약서**를 검토하여 리포트를 작성하라.

## 중점 분석 항목:
1. 출연료 및 교통/숙박 지원
2. 공연 시간 및 리허설 의무
3. 행사 취소/연기 시 보상
4. 안전 관련 조항 (보험 등)
5. 촬영/녹화/중계 권한
6. 초상 사용 동의 범위
7. 특수 요구사항 이행 의무
8. 계약 해지 조건

## 리포트 형식:
- **위험 조항**: 배우에게 불리한 조항을 인용 블록(>)으로 표시
- **수정 제안**: 각 위험 조항에 대한 수정안 제시
- **체크리스트**: 서명 전 반드시 확인할 사항 목록
- **종합 의견**: 계약 체결 권고/보류/거부 의견

[계약서 원문]
{{CONTRACT_TEXT}}`,
  },
  {
    key: "contract_other",
    name: "기타 유형 계약서",
    display_order: 5,
    content: `# 역할: 엔터테인먼트 전문 변호사 (15년 경력)

# 분석 전제 조건
- 검토 대상자: {{ACTOR_NAME}}
- 검토 수준: {{REVIEW_LEVEL_INSTRUCTION}}
- 특이사항: {{EXTRA_NOTES}}

위 배우의 계약서를 검토하여 리포트를 작성하라.

## 분석 항목:
1. 계약 당사자 및 계약 목적 명확성
2. 대가 지급 조건 및 시기
3. 권리 귀속 관계
4. 의무 사항의 합리성
5. 계약 기간 및 갱신 조건
6. 해지/해제 조건 및 효과
7. 비밀유지 의무
8. 분쟁 해결 방법
9. 기타 독소 조항

## 리포트 형식:
- **위험 조항**: 배우에게 불리한 조항을 인용 블록(>)으로 표시
- **수정 제안**: 각 위험 조항에 대한 수정안 제시
- **체크리스트**: 서명 전 반드시 확인할 사항 목록
- **종합 의견**: 계약 체결 권고/보류/거부 의견

[계약서 원문]
{{CONTRACT_TEXT}}`,
  },
];

const VARIABLE_DOCS = [
  { name: "{{CONTRACT_TEXT}}", desc: "업로드된 계약서 전체 텍스트" },
  { name: "{{ACTOR_NAME}}", desc: "검토 대상 배우 이름" },
  { name: "{{EXTRA_NOTES}}", desc: "사용자 추가 요청 사항" },
  { name: "{{REVIEW_LEVEL_INSTRUCTION}}", desc: "검토 수준에 따른 지시문 (자동 주입)" },
];

const ContractPromptManagement: React.FC = () => {
  const { currentTenant } = useAuth();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("scenario_prompts")
      .select("*")
      .eq("category", "Legal")
      .or("tenant_id.is.null")
      .order("display_order");

    if (data && data.length > 0) {
      setPrompts(data);
    } else {
      await initializeDefaults();
    }
    setLoading(false);
  };

  const initializeDefaults = async () => {
    const inserts = DEFAULT_CONTRACT_PROMPTS.map((p) => ({
      ...p,
      category: "Legal",
      tenant_id: null, // Global prompts for super admin
    }));
    const { data, error } = await supabase
      .from("scenario_prompts")
      .insert(inserts)
      .select();
    if (data) {
      setPrompts(data);
      toast.success("기본 계약서 분석 프롬프트가 초기화되었습니다.");
    }
    if (error) {
      toast.error("초기화 실패: " + error.message);
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
    const defaultPrompt = DEFAULT_CONTRACT_PROMPTS.find((p) => p.key === key);
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
        <Scale className="w-7 h-7 text-amber-600" />
        <div>
          <h1 className="text-2xl font-bold">계약서 분석 프롬프트 관리</h1>
          <p className="text-sm text-muted-foreground">AI 계약서 법률 검토 유형별 프롬프트를 수정합니다.</p>
        </div>
      </div>

      {/* Variable Reference */}
      <Card>
        <CardHeader className="py-3">
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
      {prompts.length > 0 && (
        <Tabs defaultValue={prompts[0]?.key || "contract_movie"}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {prompts.map((p) => (
              <TabsTrigger key={p.key} value={p.key} className="text-xs">
                {p.name}
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
      )}

      {loading && (
        <div className="text-center py-12 text-muted-foreground">프롬프트를 불러오는 중...</div>
      )}
    </div>
  );
};

export default ContractPromptManagement;
