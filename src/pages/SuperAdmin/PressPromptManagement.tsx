import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, RotateCcw, Info, Newspaper, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Prompt {
  id: string;
  key: string;
  name: string;
  content: string;
  category: string;
  display_order: number;
  tenant_id: string | null;
}

const DEFAULT_PRESS_PROMPTS = [
  {
    key: "acting_casting_confirmed",
    name: "출연 확정 보도자료",
    display_order: 1,
    content: `### 지시사항: '출연 확정' 보도자료 작성
- 역할: 엔터테인먼트사 홍보팀장
- 목적: {{ACTOR_NAME}} 배우가 {{WORK_TITLE}}에 출연을 확정했음을 발표

[배우 프로필 참조]
{{ACTOR_PROFILE}}

[작품 정보]
- 제목: {{WORK_TITLE}}
- 캐릭터명: {{CHARACTER_NAME}}
- 특징: {{CHARACTER_FEATURES}}

핵심 내용:
1. 배우의 새로운 연기 변신에 대한 기대감 고조.
2. 캐릭터와 배우의 시너지 강조.
3. {{COMPANY_INFO}}

보도자료 형식으로 작성해줘.`,
  },
  {
    key: "acting_contract_signing",
    name: "전속계약 체결 소식",
    display_order: 2,
    content: `### 지시사항: '전속계약 체결' 보도자료 작성
- 역할: 엔터테인먼트사 홍보팀장
- 목적: {{ACTOR_NAME}} 배우의 전속계약 체결 소식 발표

[배우 프로필]
{{ACTOR_PROFILE}}

핵심 내용:
1. 배우의 주요 필모그래피와 성장 가능성 강조.
2. 소속사의 전폭적인 지원 계획.
3. 향후 활동 방향 및 기대작 언급.
4. {{COMPANY_INFO}}

[참고자료]
{{SCRIPT_CONTENT}}

정식 보도자료 형식으로 작성해줘.`,
  },
  {
    key: "acting_scene_stealer",
    name: "신스틸러 활약 기사",
    display_order: 3,
    content: `### 지시사항: '신스틸러 활약' 분석 기사 작성
- 역할: 전문 엔터테인먼트 기자
- 목적: {{ACTOR_NAME}} 배우의 {{WORK_TITLE}} 속 활약상 분석

[배우 프로필]
{{ACTOR_PROFILE}}

[작품/캐릭터 정보]
- 작품: {{WORK_TITLE}}
- 캐릭터: {{CHARACTER_NAME}}
- 특징: {{CHARACTER_FEATURES}}

[참고 장면/대본]
{{SCRIPT_CONTENT}}

분석 포인트:
1. 해당 장면에서 배우의 연기력 분석.
2. 시청자/관객 반응 예측.
3. 배우의 커리어에서의 의미.

기사 형식으로 작성해줘.`,
  },
  {
    key: "acting_still_cut",
    name: "스틸컷 공개 홍보",
    display_order: 4,
    content: `### 지시사항: '스틸컷 공개' 홍보 기사 작성
- 역할: 홍보팀장
- 목적: {{ACTOR_NAME}} 배우의 {{WORK_TITLE}} 스틸컷 공개

[배우 프로필]
{{ACTOR_PROFILE}}

[작품 정보]
- 작품: {{WORK_TITLE}}
- 캐릭터: {{CHARACTER_NAME}}
- 특징: {{CHARACTER_FEATURES}}

핵심 내용:
1. 스틸컷 속 비주얼과 캐릭터 변신 포인트.
2. 작품에 대한 기대감 고조.
3. {{COMPANY_INFO}}

홍보 기사 형식으로 작성해줘.`,
  },
  {
    key: "acting_photoshoot",
    name: "화보 공개 보도자료",
    display_order: 5,
    content: `### 지시사항: '화보 공개' 보도자료 작성
- 역할: 홍보팀장
- 목적: {{ACTOR_NAME}} 배우의 화보 공개 소식 발표

[배우 프로필]
{{ACTOR_PROFILE}}

핵심 내용:
1. 화보 컨셉과 배우의 새로운 매력 포인트.
2. 비하인드 스토리 또는 촬영 에피소드.
3. {{COMPANY_INFO}}

[참고자료]
{{SCRIPT_CONTENT}}

보도자료 형식으로 작성해줘.`,
  },
  {
    key: "acting_award",
    name: "수상 소식 보도자료",
    display_order: 6,
    content: `### 지시사항: '수상 소식' 보도자료 작성
- 역할: 홍보팀장
- 목적: {{ACTOR_NAME}} 배우의 수상 소식 발표

[배우 프로필]
{{ACTOR_PROFILE}}

[수상 정보]
{{SCRIPT_CONTENT}}

핵심 내용:
1. 수상 부문 및 의미.
2. 수상 소감 또는 향후 행보.
3. {{CHARACTER_FEATURES}}
4. {{COMPANY_INFO}}

보도자료 형식으로 작성해줘.`,
  },
  {
    key: "acting_final_remarks",
    name: "종영 소감 기사",
    display_order: 7,
    content: `### 지시사항: '종영 소감' 인터뷰 기사 작성
- 역할: 전문 엔터테인먼트 기자
- 목적: {{ACTOR_NAME}} 배우의 {{WORK_TITLE}} 종영 소감 인터뷰

[배우 프로필]
{{ACTOR_PROFILE}}

[작품 정보]
- 작품: {{WORK_TITLE}}
- 캐릭터: {{CHARACTER_NAME}}
- 특징: {{CHARACTER_FEATURES}}

[참고 내용]
{{SCRIPT_CONTENT}}

포함 사항:
1. 작품을 마친 소감.
2. 기억에 남는 장면/에피소드.
3. 캐릭터에 대한 애착.
4. 향후 계획.

인터뷰 기사 형식으로 작성해줘.`,
  },
  {
    key: "acting_interview_questions",
    name: "인터뷰 질문지 생성",
    display_order: 8,
    content: `### 지시사항: 전문 인터뷰 질문지 생성
- 역할: 시니어 엔터테인먼트 기자
- 목적: {{ACTOR_NAME}} 배우 인터뷰용 질문지 작성

[배우 프로필]
{{ACTOR_PROFILE}}

[작품 정보]
- 작품: {{WORK_TITLE}}
- 캐릭터: {{CHARACTER_NAME}}
- 특징: {{CHARACTER_FEATURES}}

[참고자료]
{{SCRIPT_CONTENT}}

질문 구성:
1. 오프닝 질문 (가벼운 아이스브레이커) 2~3개
2. 작품/캐릭터 관련 핵심 질문 5~7개
3. 연기/커리어 관련 질문 3~5개
4. 팬 소통/개인 이야기 질문 2~3개
5. 클로징 질문 1~2개

각 질문에 간단한 의도와 예상 답변 방향도 함께 작성해줘.`,
  },
];

const VARIABLE_DOCS = [
  { name: "{{ACTOR_NAME}}", desc: "선택된 배우 이름" },
  { name: "{{ACTOR_PROFILE}}", desc: "배우의 상세 경력 및 정보" },
  { name: "{{WORK_TITLE}}", desc: "작품 제목" },
  { name: "{{CHARACTER_NAME}}", desc: "캐릭터명" },
  { name: "{{CHARACTER_FEATURES}}", desc: "캐릭터 특징/매력 포인트" },
  { name: "{{SCRIPT_CONTENT}}", desc: "참고 대본/팩트 시트" },
  { name: "{{COMPANY_INFO}}", desc: "회사 주소 및 연락처" },
];

const PressPromptManagement: React.FC = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");

  useEffect(() => { fetchPrompts(); }, []);

  const fetchPrompts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("scenario_prompts")
      .select("*")
      .eq("category", "Press")
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
    const inserts = DEFAULT_PRESS_PROMPTS.map((p) => ({
      ...p,
      category: "Press",
      tenant_id: null,
    }));
    const { data, error } = await supabase
      .from("scenario_prompts")
      .insert(inserts)
      .select();
    if (data) {
      setPrompts(data);
      toast.success("기본 보도자료 프롬프트가 초기화되었습니다.");
    }
    if (error) toast.error("초기화 실패: " + error.message);
  };

  const handleSave = async (prompt: Prompt) => {
    setSaving(prompt.id);
    const { error } = await supabase
      .from("scenario_prompts")
      .update({ name: prompt.name, content: prompt.content, updated_at: new Date().toISOString() })
      .eq("id", prompt.id);
    if (error) toast.error("저장 실패");
    else toast.success(`${prompt.name} 저장 완료`);
    setSaving(null);
  };

  const updatePrompt = (id: string, field: string, value: string) => {
    setPrompts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const resetToDefault = async (key: string) => {
    const def = DEFAULT_PRESS_PROMPTS.find((p) => p.key === key);
    if (!def || !confirm("기본 프롬프트로 초기화하시겠습니까?")) return;
    const existing = prompts.find((p) => p.key === key);
    if (existing) {
      await supabase.from("scenario_prompts").update({ content: def.content, name: def.name }).eq("id", existing.id);
    }
    fetchPrompts();
    toast.success("기본값으로 초기화되었습니다.");
  };

  const handleAddPrompt = async () => {
    if (!newKey.trim() || !newName.trim()) { toast.error("Key와 이름을 입력해주세요."); return; }
    const { error } = await supabase.from("scenario_prompts").insert({
      key: newKey.startsWith("acting_") ? newKey : `acting_${newKey}`,
      name: newName,
      content: `### 지시사항: '${newName}' 작성\n- 역할: 엔터테인먼트사 홍보팀장\n\n[배우 프로필]\n{{ACTOR_PROFILE}}\n\n[작품 정보]\n- 작품: {{WORK_TITLE}}\n- 캐릭터: {{CHARACTER_NAME}}\n\n작성해줘.`,
      category: "Press",
      tenant_id: null,
      display_order: prompts.length + 1,
    });
    if (error) { toast.error("추가 실패: " + error.message); return; }
    toast.success("새 프롬프트가 추가되었습니다.");
    setAddDialogOpen(false);
    setNewKey("");
    setNewName("");
    fetchPrompts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 프롬프트를 삭제하시겠습니까?")) return;
    await supabase.from("scenario_prompts").delete().eq("id", id);
    toast.success("삭제되었습니다.");
    fetchPrompts();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Newspaper className="w-7 h-7 text-rose-600" />
          <div>
            <h1 className="text-2xl font-bold">보도자료 프롬프트 관리</h1>
            <p className="text-sm text-muted-foreground">AI 기사 생성 유형별 프롬프트를 수정합니다.</p>
          </div>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> 프롬프트 추가
        </Button>
      </div>

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

      {prompts.length > 0 && (
        <Tabs defaultValue={prompts[0]?.key}>
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
                      <Button variant="outline" size="sm" onClick={() => handleDelete(prompt.id)}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> 삭제
                      </Button>
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
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {loading && <div className="text-center py-12 text-muted-foreground">프롬프트를 불러오는 중...</div>}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 보도자료 프롬프트 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Key (acting_ 접두사 자동 추가)</Label>
              <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="예: brand_collaboration" />
            </div>
            <div>
              <Label>표시 이름</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="예: 브랜드 콜라보 보도자료" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>취소</Button>
            <Button onClick={handleAddPrompt}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PressPromptManagement;
