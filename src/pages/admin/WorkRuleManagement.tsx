import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Plus, Save, Loader2, Trash2, Clock,
  Download, PenTool, AlertTriangle, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface WorkRule {
  id: string;
  name: string;
  work_days: string[];
  standard_work_unit: string;
  standard_work_hours: number;
  overtime_min_unit: string;
  overtime_min_hours: number;
  overtime_max_unit: string;
  overtime_max_hours: number;
  standard_period: string;
  standard_period_start_day: number | null;
  standard_include_holidays: boolean;
  max_work_unit: string;
  max_work_hours: number;
  max_period: string;
  max_period_start_day: number | null;
  max_include_holidays: boolean;
  is_default: boolean;
  is_active: boolean;
  description: string | null;
  created_at: string;
}

const ALL_DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const UNITS = ["1일", "1주", "1개월"];
const PERIODS = ["1주", "2주", "1개월", "3개월", "6개월", "1년"];

const WorkRuleManagement = () => {
  const navigate = useNavigate();
  const { user, currentTenant } = useAuth();
  const [rules, setRules] = useState<WorkRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<WorkRule> | null>(null);
  const [isNew, setIsNew] = useState(false);

  const tenantId = currentTenant?.tenant_id;

  const fetchRules = async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("work_rules")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (data) setRules(data as unknown as WorkRule[]);
    if (error) toast.error("불러오기 실패: " + error.message);
    setLoading(false);
  };

  useEffect(() => { fetchRules(); }, [tenantId]);

  const loadSystemDefaults = async () => {
    if (!tenantId) return;
    setLoadingDefaults(true);
    try {
      const { data: defaults, error } = await supabase
        .from("work_rules")
        .select("*")
        .is("tenant_id", null)
        .eq("is_active", true)
        .order("is_default", { ascending: false });

      if (error) throw error;
      if (!defaults || defaults.length === 0) {
        toast.info("등록된 시스템 기본 근로규칙이 없습니다.");
        return;
      }

      // Insert copies for this tenant
      const inserts = defaults.map((d: any) => ({
        tenant_id: tenantId,
        name: d.name,
        work_days: d.work_days,
        standard_work_unit: d.standard_work_unit,
        standard_work_hours: d.standard_work_hours,
        overtime_min_unit: d.overtime_min_unit,
        overtime_min_hours: d.overtime_min_hours,
        overtime_max_unit: d.overtime_max_unit,
        overtime_max_hours: d.overtime_max_hours,
        standard_period: d.standard_period,
        standard_period_start_day: d.standard_period_start_day,
        standard_include_holidays: d.standard_include_holidays,
        max_work_unit: d.max_work_unit,
        max_work_hours: d.max_work_hours,
        max_period: d.max_period,
        max_period_start_day: d.max_period_start_day,
        max_include_holidays: d.max_include_holidays,
        is_default: d.is_default,
        is_active: true,
        description: d.description,
        created_by: user?.id,
      }));

      const { error: insertError } = await supabase.from("work_rules").insert(inserts as any);
      if (insertError) throw insertError;

      toast.success(`${defaults.length}개의 기본 근로규칙을 불러왔습니다.`);
      fetchRules();
    } catch (e: any) {
      toast.error("불러오기 실패: " + e.message);
    } finally {
      setLoadingDefaults(false);
    }
  };

  const openNew = () => {
    setIsNew(true);
    setEditingRule({
      name: "",
      work_days: ["월", "화", "수", "목", "금"],
      standard_work_unit: "1주",
      standard_work_hours: 40,
      overtime_min_unit: "1주",
      overtime_min_hours: 0,
      overtime_max_unit: "1주",
      overtime_max_hours: 12,
      standard_period: "1주",
      standard_period_start_day: 1,
      standard_include_holidays: false,
      max_work_unit: "1주",
      max_work_hours: 52,
      max_period: "1주",
      max_period_start_day: 1,
      max_include_holidays: false,
      is_default: false,
      is_active: true,
      description: "",
    });
  };

  const openEdit = (rule: WorkRule) => {
    setIsNew(false);
    setEditingRule({ ...rule });
  };

  const saveRule = async () => {
    if (!editingRule?.name || !tenantId) { toast.error("규칙명을 입력해주세요."); return; }
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        name: editingRule.name,
        work_days: editingRule.work_days || ["월", "화", "수", "목", "금"],
        standard_work_unit: editingRule.standard_work_unit || "1주",
        standard_work_hours: editingRule.standard_work_hours || 40,
        overtime_min_unit: editingRule.overtime_min_unit || "1주",
        overtime_min_hours: editingRule.overtime_min_hours || 0,
        overtime_max_unit: editingRule.overtime_max_unit || "1주",
        overtime_max_hours: editingRule.overtime_max_hours || 12,
        standard_period: editingRule.standard_period || "1주",
        standard_period_start_day: editingRule.standard_period_start_day,
        standard_include_holidays: editingRule.standard_include_holidays || false,
        max_work_unit: editingRule.max_work_unit || "1주",
        max_work_hours: editingRule.max_work_hours || 52,
        max_period: editingRule.max_period || "1주",
        max_period_start_day: editingRule.max_period_start_day,
        max_include_holidays: editingRule.max_include_holidays || false,
        is_default: editingRule.is_default || false,
        is_active: editingRule.is_active !== false,
        description: editingRule.description || null,
        created_by: user?.id,
      };

      if (isNew) {
        const { error } = await supabase.from("work_rules").insert(payload as any);
        if (error) throw error;
        toast.success("근로규칙이 등록되었습니다.");
      } else {
        const { error } = await supabase.from("work_rules").update(payload as any).eq("id", editingRule.id!);
        if (error) throw error;
        toast.success("근로규칙이 수정되었습니다.");
      }
      setEditingRule(null);
      fetchRules();
    } catch (e: any) {
      toast.error("저장 실패: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm("이 근로규칙을 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("work_rules").delete().eq("id", id);
    if (error) toast.error("삭제 실패: " + error.message);
    else { toast.success("삭제되었습니다."); fetchRules(); }
  };

  const toggleDay = (day: string) => {
    if (!editingRule) return;
    const days = editingRule.work_days || [];
    setEditingRule({
      ...editingRule,
      work_days: days.includes(day) ? days.filter(d => d !== day) : [...days, day],
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="pt-24 pb-16 px-4 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Button variant="ghost" size="sm" className="gap-1 mb-2" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-4 h-4" /> 관리 시스템
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" /> 근로규칙 관리
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              소정근로규칙 및 최대근로규칙을 설정하여 근무시간 관리 기준을 정의합니다.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadSystemDefaults} disabled={loadingDefaults} className="gap-1.5">
              {loadingDefaults ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              초기 셋팅값 불러오기
            </Button>
            <Button onClick={openNew} className="gap-1.5">
              <Plus className="w-4 h-4" /> 근로규칙 추가
            </Button>
          </div>
        </div>

        {/* 편집 폼 */}
        {editingRule && (
          <Card className="border-2 border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PenTool className="w-4 h-4 text-primary" />
                {isNew ? "새 근로규칙 등록" : "근로규칙 수정"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">규칙명 *</Label>
                  <Input
                    value={editingRule.name || ""}
                    onChange={e => setEditingRule({ ...editingRule, name: e.target.value })}
                    placeholder="예: 주 52시간제"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">설명</Label>
                  <Input
                    value={editingRule.description || ""}
                    onChange={e => setEditingRule({ ...editingRule, description: e.target.value })}
                    placeholder="규칙 설명"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* 소정근로요일 */}
              <div>
                <Label className="text-xs font-semibold mb-2 block">소정근로요일</Label>
                <div className="flex gap-2">
                  {ALL_DAYS.map(day => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                        (editingRule.work_days || []).includes(day)
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* 소정근로규칙 */}
              <div>
                <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" /> 소정근로규칙
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">소정근로 단위</Label>
                    <Select value={editingRule.standard_work_unit} onValueChange={v => setEditingRule({ ...editingRule, standard_work_unit: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">소정근로시간</Label>
                    <Input type="number" value={editingRule.standard_work_hours ?? 40} onChange={e => setEditingRule({ ...editingRule, standard_work_hours: Number(e.target.value) })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">연장근로 최소기준</Label>
                    <div className="flex gap-1 mt-1">
                      <Select value={editingRule.overtime_min_unit} onValueChange={v => setEditingRule({ ...editingRule, overtime_min_unit: v })}>
                        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="number" value={editingRule.overtime_min_hours ?? 0} onChange={e => setEditingRule({ ...editingRule, overtime_min_hours: Number(e.target.value) })} className="flex-1" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">연장근로 최대기준</Label>
                    <div className="flex gap-1 mt-1">
                      <Select value={editingRule.overtime_max_unit} onValueChange={v => setEditingRule({ ...editingRule, overtime_max_unit: v })}>
                        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="number" value={editingRule.overtime_max_hours ?? 12} onChange={e => setEditingRule({ ...editingRule, overtime_max_hours: Number(e.target.value) })} className="flex-1" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                  <div>
                    <Label className="text-xs">단위기간</Label>
                    <Select value={editingRule.standard_period} onValueChange={v => setEditingRule({ ...editingRule, standard_period: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{PERIODS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2 pb-1">
                    <Switch checked={editingRule.standard_include_holidays} onCheckedChange={v => setEditingRule({ ...editingRule, standard_include_holidays: v })} />
                    <Label className="text-xs">휴일 포함</Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 최대근로규칙 */}
              <div>
                <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> 최대근로규칙
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">최대근로 단위</Label>
                    <Select value={editingRule.max_work_unit} onValueChange={v => setEditingRule({ ...editingRule, max_work_unit: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">최대근로시간</Label>
                    <Input type="number" value={editingRule.max_work_hours ?? 52} onChange={e => setEditingRule({ ...editingRule, max_work_hours: Number(e.target.value) })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">단위기간</Label>
                    <Select value={editingRule.max_period} onValueChange={v => setEditingRule({ ...editingRule, max_period: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{PERIODS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2 pb-1">
                    <Switch checked={editingRule.max_include_holidays} onCheckedChange={v => setEditingRule({ ...editingRule, max_include_holidays: v })} />
                    <Label className="text-xs">휴일 포함</Label>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={editingRule.is_default} onCheckedChange={v => setEditingRule({ ...editingRule, is_default: v })} />
                    <Label className="text-xs">기본 규칙</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={editingRule.is_active !== false} onCheckedChange={v => setEditingRule({ ...editingRule, is_active: v })} />
                    <Label className="text-xs">활성화</Label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingRule(null)}>취소</Button>
                  <Button size="sm" onClick={saveRule} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                    저장
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 규칙 목록 */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : rules.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">등록된 근로규칙이 없습니다.</p>
              <p className="text-xs mt-1">"초기 셋팅값 불러오기"로 시스템 기본값을 가져오거나 직접 추가하세요.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rules.map(rule => (
              <Card key={rule.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-sm">{rule.name}</h3>
                        {rule.is_default && <Badge variant="default" className="text-[10px]">기본값</Badge>}
                        <Badge variant={rule.is_active ? "secondary" : "outline"} className="text-[10px]">
                          {rule.is_active ? "활성" : "비활성"}
                        </Badge>
                      </div>
                      {rule.description && <p className="text-xs text-muted-foreground mb-3">{rule.description}</p>}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="bg-blue-50 rounded-lg p-2.5">
                          <p className="text-blue-400 font-medium mb-0.5">소정근로</p>
                          <p className="font-bold text-blue-700">{rule.standard_work_unit} {rule.standard_work_hours}시간</p>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-2.5">
                          <p className="text-amber-400 font-medium mb-0.5">연장근로</p>
                          <p className="font-bold text-amber-700">최소 {rule.overtime_min_hours}h / 최대 {rule.overtime_max_hours}h</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-2.5">
                          <p className="text-red-400 font-medium mb-0.5">최대근로</p>
                          <p className="font-bold text-red-700">{rule.max_work_unit} {rule.max_work_hours}시간</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2.5">
                          <p className="text-slate-400 font-medium mb-0.5">소정근로요일</p>
                          <p className="font-bold text-slate-700">{(rule.work_days || []).join(", ")}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(rule)}>
                        <PenTool className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteRule(rule.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default WorkRuleManagement;
