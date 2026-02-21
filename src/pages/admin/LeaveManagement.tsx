import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, FolderOpen, CalendarPlus, Users, RefreshCw, Download } from "lucide-react";

interface LeaveGroup {
  id: string;
  name: string;
  description: string | null;
  overdraft_limit: number | null;
  is_active: boolean;
  sort_order: number;
}

interface LeaveType {
  id: string;
  group_id: string | null;
  name: string;
  display_name: string | null;
  time_option: string;
  paid_hours: number;
  deduction_days: number;
  special_option: string;
  min_consecutive_days: number;
  max_consecutive_days: number | null;
  include_holidays_in_consecutive: boolean;
  is_paid: boolean;
  is_active: boolean;
}

interface LeaveBalance {
  id: string;
  user_id: string;
  group_id: string | null;
  total_days: number;
  used_days: number;
  generation_type: string;
  memo: string | null;
  valid_from: string;
  valid_until: string | null;
  profile?: { full_name: string | null; email: string };
  group?: { name: string } | null;
}

const LeaveManagement = () => {
  const { currentTenant, isSuperAdmin } = useAuth();
  const tenantId = currentTenant?.tenant_id;

  const [groups, setGroups] = useState<LeaveGroup[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Group form
  const [groupDialog, setGroupDialog] = useState(false);
  const [editGroup, setEditGroup] = useState<LeaveGroup | null>(null);
  const [groupForm, setGroupForm] = useState({ name: "", description: "", overdraft_limit: "" });

  // Type form
  const [typeDialog, setTypeDialog] = useState(false);
  const [editType, setEditType] = useState<LeaveType | null>(null);
  const [typeForm, setTypeForm] = useState({
    group_id: "", name: "", display_name: "", time_option: "full_day",
    paid_hours: "8", deduction_days: "1", special_option: "none",
    min_consecutive_days: "1", max_consecutive_days: "", is_paid: true,
    include_holidays_in_consecutive: false,
  });

  // Balance form
  const [balanceDialog, setBalanceDialog] = useState(false);
  const [balanceForm, setBalanceForm] = useState({
    user_id: "", group_id: "", total_days: "", memo: "",
    valid_from: new Date().toISOString().split("T")[0], valid_until: "",
  });

  useEffect(() => {
    if (tenantId) loadAll();
  }, [tenantId]);

  const loadAll = async () => {
    if (!tenantId) return;
    setLoading(true);
    const [g, t, b, m] = await Promise.all([
      supabase.from("leave_groups").select("*").eq("tenant_id", tenantId).order("sort_order"),
      supabase.from("leave_types").select("*").eq("tenant_id", tenantId).order("sort_order"),
      supabase.from("leave_balances").select("*, profile:profiles(full_name, email), group:leave_groups(name)").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      supabase.from("tenant_memberships").select("user_id, department, job_title, profile:profiles(full_name, email)").eq("tenant_id", tenantId).eq("is_suspended", false),
    ]);
    if (g.data) setGroups(g.data as any);
    if (t.data) setTypes(t.data as any);
    if (b.data) setBalances(b.data as any);
    if (m.data) setMembers(m.data as any);
    setLoading(false);
  };

  // ===== Group CRUD =====
  const openGroupDialog = (group?: LeaveGroup) => {
    if (group) {
      setEditGroup(group);
      setGroupForm({ name: group.name, description: group.description || "", overdraft_limit: group.overdraft_limit?.toString() ?? "" });
    } else {
      setEditGroup(null);
      setGroupForm({ name: "", description: "", overdraft_limit: "" });
    }
    setGroupDialog(true);
  };

  const saveGroup = async () => {
    if (!tenantId || !groupForm.name.trim()) return;
    const payload = {
      tenant_id: tenantId,
      name: groupForm.name.trim(),
      description: groupForm.description.trim() || null,
      overdraft_limit: groupForm.overdraft_limit === "" ? null : Number(groupForm.overdraft_limit),
    };
    if (editGroup) {
      const { error } = await supabase.from("leave_groups").update(payload).eq("id", editGroup.id);
      if (error) { toast.error("수정 실패: " + error.message); return; }
      toast.success("휴가 그룹 수정 완료");
    } else {
      const { error } = await supabase.from("leave_groups").insert(payload as any);
      if (error) { toast.error("추가 실패: " + error.message); return; }
      toast.success("휴가 그룹 추가 완료");
    }
    setGroupDialog(false);
    loadAll();
  };

  const deleteGroup = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("leave_groups").delete().eq("id", id);
    toast.success("삭제 완료");
    loadAll();
  };

  // ===== Type CRUD =====
  const openTypeDialog = (type?: LeaveType) => {
    if (type) {
      setEditType(type);
      setTypeForm({
        group_id: type.group_id || "", name: type.name, display_name: type.display_name || "",
        time_option: type.time_option, paid_hours: type.paid_hours.toString(),
        deduction_days: type.deduction_days.toString(), special_option: type.special_option,
        min_consecutive_days: type.min_consecutive_days.toString(),
        max_consecutive_days: type.max_consecutive_days?.toString() || "",
        is_paid: type.is_paid, include_holidays_in_consecutive: type.include_holidays_in_consecutive,
      });
    } else {
      setEditType(null);
      setTypeForm({ group_id: "", name: "", display_name: "", time_option: "full_day", paid_hours: "8", deduction_days: "1", special_option: "none", min_consecutive_days: "1", max_consecutive_days: "", is_paid: true, include_holidays_in_consecutive: false });
    }
    setTypeDialog(true);
  };

  const saveType = async () => {
    if (!tenantId || !typeForm.name.trim()) return;
    const payload = {
      tenant_id: tenantId,
      group_id: typeForm.group_id || null,
      name: typeForm.name.trim(),
      display_name: typeForm.display_name.trim() || null,
      time_option: typeForm.time_option,
      paid_hours: Number(typeForm.paid_hours),
      deduction_days: Number(typeForm.deduction_days),
      special_option: typeForm.special_option,
      min_consecutive_days: Number(typeForm.min_consecutive_days),
      max_consecutive_days: typeForm.max_consecutive_days ? Number(typeForm.max_consecutive_days) : null,
      is_paid: typeForm.is_paid,
      include_holidays_in_consecutive: typeForm.include_holidays_in_consecutive,
    };
    if (editType) {
      const { error } = await supabase.from("leave_types").update(payload).eq("id", editType.id);
      if (error) { toast.error("수정 실패: " + error.message); return; }
      toast.success("휴가 유형 수정 완료");
    } else {
      const { error } = await supabase.from("leave_types").insert(payload as any);
      if (error) { toast.error("추가 실패: " + error.message); return; }
      toast.success("휴가 유형 추가 완료");
    }
    setTypeDialog(false);
    loadAll();
  };

  const deleteType = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const { error } = await supabase.from("leave_types").delete().eq("id", id);
    if (error) { toast.error("삭제 실패 (사용 중인 유형은 삭제 불가)"); return; }
    toast.success("삭제 완료");
    loadAll();
  };

  // ===== Balance (휴가 발생) =====
  const saveBalance = async () => {
    if (!tenantId || !balanceForm.user_id || !balanceForm.total_days) return;
    const { error } = await supabase.from("leave_balances").insert({
      tenant_id: tenantId,
      user_id: balanceForm.user_id,
      group_id: balanceForm.group_id || null,
      total_days: Number(balanceForm.total_days),
      generation_type: "manual",
      memo: balanceForm.memo || null,
      valid_from: balanceForm.valid_from,
      valid_until: balanceForm.valid_until || null,
    } as any);
    if (error) { toast.error("발생 실패: " + error.message); return; }
    toast.success("휴가 발생 완료");
    setBalanceDialog(false);
    setBalanceForm({ user_id: "", group_id: "", total_days: "", memo: "", valid_from: new Date().toISOString().split("T")[0], valid_until: "" });
    loadAll();
  };

  // ===== 연차 자동 발생 =====
  const autoGenerateAnnualLeave = async () => {
    if (!tenantId) return;
    // 연차 그룹 확인/생성
    let annualGroupId: string;
    const existing = groups.find(g => g.name === "연차");
    if (existing) {
      annualGroupId = existing.id;
    } else {
      const { data, error } = await supabase.from("leave_groups").insert({ tenant_id: tenantId, name: "연차", description: "근로기준법 기반 연차휴가", overdraft_limit: 0 } as any).select().single();
      if (error || !data) { toast.error("연차 그룹 생성 실패"); return; }
      annualGroupId = data.id;
    }

    // 직원별 입사일 조회 & 연차 계산
    const { data: details } = await supabase.from("employee_details").select("user_id, hire_date").eq("tenant_id", tenantId);
    if (!details || details.length === 0) { toast.info("입사일이 등록된 직원이 없습니다."); return; }

    let count = 0;
    const year = new Date().getFullYear();
    const validFrom = `${year}-01-01`;
    const validUntil = `${year}-12-31`;

    for (const d of details) {
      if (!d.hire_date) continue;
      // 이미 올해 연차 발생 건이 있는지 확인
      const { data: existingBal } = await supabase.from("leave_balances")
        .select("id").eq("tenant_id", tenantId).eq("user_id", d.user_id)
        .eq("group_id", annualGroupId).eq("generation_type", "auto_annual")
        .gte("valid_from", validFrom).lte("valid_from", validUntil).limit(1);
      if (existingBal && existingBal.length > 0) continue;

      // DB 함수로 연차 일수 계산
      const { data: calcResult } = await supabase.rpc("calculate_annual_leave_days", { _hire_date: d.hire_date });
      const days = calcResult as unknown as number;
      if (!days || days <= 0) continue;

      await supabase.from("leave_balances").insert({
        tenant_id: tenantId, user_id: d.user_id, group_id: annualGroupId,
        total_days: days, generation_type: "auto_annual",
        memo: `${year}년 연차 자동발생 (입사일: ${d.hire_date})`,
        valid_from: validFrom, valid_until: validUntil,
      } as any);
      count++;
    }
    toast.success(`${count}명의 연차가 자동 발생되었습니다.`);
    loadAll();
  };

  const deleteBalance = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("leave_balances").delete().eq("id", id);
    toast.success("삭제 완료");
    loadAll();
  };

  // ===== 기본값 불러오기 =====
  const loadDefaults = async () => {
    if (!tenantId) return;
    if (!confirm("시스템 기본 휴가 그룹/유형을 불러오시겠습니까? 기존 데이터와 중복되지 않는 항목만 추가됩니다.")) return;

    const [gRes, tRes] = await Promise.all([
      supabase.from("leave_groups").select("*").is("tenant_id", null),
      supabase.from("leave_types").select("*").is("tenant_id", null),
    ]);

    const defaultGroups = gRes.data || [];
    const defaultTypes = tRes.data || [];
    if (defaultGroups.length === 0 && defaultTypes.length === 0) {
      toast.info("등록된 시스템 기본값이 없습니다."); return;
    }

    let groupCount = 0;
    const groupIdMap: Record<string, string> = {};

    for (const dg of defaultGroups) {
      const exists = groups.find(g => g.name === dg.name);
      if (exists) { groupIdMap[dg.id] = exists.id; continue; }
      const { data } = await supabase.from("leave_groups").insert({
        tenant_id: tenantId, name: dg.name, description: dg.description,
        overdraft_limit: dg.overdraft_limit, sort_order: dg.sort_order,
      } as any).select().single();
      if (data) { groupIdMap[dg.id] = data.id; groupCount++; }
    }

    let typeCount = 0;
    for (const dt of defaultTypes) {
      const exists = types.find(t => t.name === dt.name);
      if (exists) continue;
      await supabase.from("leave_types").insert({
        tenant_id: tenantId, name: dt.name, display_name: dt.display_name,
        group_id: dt.group_id ? (groupIdMap[dt.group_id] || null) : null,
        time_option: dt.time_option, paid_hours: dt.paid_hours,
        deduction_days: dt.deduction_days, special_option: dt.special_option,
        is_paid: dt.is_paid, min_consecutive_days: dt.min_consecutive_days,
        max_consecutive_days: dt.max_consecutive_days,
        include_holidays_in_consecutive: dt.include_holidays_in_consecutive,
      } as any);
      typeCount++;
    }

    toast.success(`그룹 ${groupCount}개, 유형 ${typeCount}개가 추가되었습니다.`);
    loadAll();
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">로딩 중...</div>;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">휴가 관리</h1>

      <Tabs defaultValue="groups">
        <TabsList>
          <TabsTrigger value="groups">휴가 그룹</TabsTrigger>
          <TabsTrigger value="types">휴가 유형</TabsTrigger>
          <TabsTrigger value="balances">휴가 발생</TabsTrigger>
        </TabsList>

        {/* ===== 휴가 그룹 ===== */}
        <TabsContent value="groups" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">비슷한 유형의 휴가를 그룹으로 관리합니다.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadDefaults}><Download className="w-4 h-4 mr-1" />기본값 불러오기</Button>
              <Button onClick={() => openGroupDialog()}><Plus className="w-4 h-4 mr-1" />휴가 그룹 추가</Button>
            </div>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>그룹명</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead>초과사용 제한</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="w-24">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map(g => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell className="text-muted-foreground">{g.description || "-"}</TableCell>
                    <TableCell>
                      {g.overdraft_limit === null ? "제한 없음" : g.overdraft_limit === 0 ? "초과 불가" : `최대 -${g.overdraft_limit}일`}
                    </TableCell>
                    <TableCell><Badge variant={g.is_active ? "default" : "secondary"}>{g.is_active ? "활성" : "비활성"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openGroupDialog(g)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteGroup(g.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {groups.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">등록된 휴가 그룹이 없습니다.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ===== 휴가 유형 ===== */}
        <TabsContent value="types" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">다양한 휴가 유형을 등록합니다.</p>
            <Button onClick={() => openTypeDialog()}><Plus className="w-4 h-4 mr-1" />휴가 유형 추가</Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>유형명</TableHead>
                  <TableHead>그룹</TableHead>
                  <TableHead>시간옵션</TableHead>
                  <TableHead>유급시간</TableHead>
                  <TableHead>차감일수</TableHead>
                  <TableHead>특별옵션</TableHead>
                  <TableHead>유급</TableHead>
                  <TableHead className="w-24">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}{t.display_name ? ` (${t.display_name})` : ""}</TableCell>
                    <TableCell>{groups.find(g => g.id === t.group_id)?.name || "-"}</TableCell>
                    <TableCell>{t.time_option === "full_day" ? "하루 종일" : "시간 입력"}</TableCell>
                    <TableCell>{t.paid_hours}h</TableCell>
                    <TableCell>{t.deduction_days}일</TableCell>
                    <TableCell>
                      {{ none: "해당없음", long_term: "장기휴가", day_off: "휴무", holiday: "휴일" }[t.special_option] || "-"}
                    </TableCell>
                    <TableCell><Badge variant={t.is_paid ? "default" : "outline"}>{t.is_paid ? "유급" : "무급"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openTypeDialog(t)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteType(t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {types.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">등록된 휴가 유형이 없습니다.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ===== 휴가 발생 ===== */}
        <TabsContent value="balances" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">직원별 휴가 발생 현황을 관리합니다.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={autoGenerateAnnualLeave}><RefreshCw className="w-4 h-4 mr-1" />연차 자동발생</Button>
              <Button onClick={() => setBalanceDialog(true)}><CalendarPlus className="w-4 h-4 mr-1" />수동 발생</Button>
            </div>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>직원</TableHead>
                  <TableHead>휴가 그룹</TableHead>
                  <TableHead>총 발생</TableHead>
                  <TableHead>사용</TableHead>
                  <TableHead>잔여</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>유효기간</TableHead>
                  <TableHead>메모</TableHead>
                  <TableHead className="w-16">삭제</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{(b as any).profile?.full_name || (b as any).profile?.email || "-"}</TableCell>
                    <TableCell>{(b as any).group?.name || "-"}</TableCell>
                    <TableCell>{b.total_days}일</TableCell>
                    <TableCell>{b.used_days}일</TableCell>
                    <TableCell className="font-bold">{b.total_days - b.used_days}일</TableCell>
                    <TableCell><Badge variant="outline">{{ manual: "수동", auto_annual: "연차자동", compensatory: "보상" }[b.generation_type] || b.generation_type}</Badge></TableCell>
                    <TableCell className="text-xs">{b.valid_from} ~ {b.valid_until || "무제한"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{b.memo || "-"}</TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => deleteBalance(b.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
                {balances.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">발생된 휴가가 없습니다.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== Group Dialog ===== */}
      <Dialog open={groupDialog} onOpenChange={setGroupDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editGroup ? "휴가 그룹 수정" : "휴가 그룹 추가"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>그룹명 *</Label><Input value={groupForm.name} onChange={e => setGroupForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>설명</Label><Textarea value={groupForm.description} onChange={e => setGroupForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div>
              <Label>초과사용 제한 (비워두면 제한 없음, 0=초과불가)</Label>
              <Input type="number" value={groupForm.overdraft_limit} onChange={e => setGroupForm(p => ({ ...p, overdraft_limit: e.target.value }))} placeholder="비워두면 제한 없음" />
            </div>
            <Button onClick={saveGroup} className="w-full">{editGroup ? "수정" : "추가"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Type Dialog ===== */}
      <Dialog open={typeDialog} onOpenChange={setTypeDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editType ? "휴가 유형 수정" : "휴가 유형 추가"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>휴가 그룹</Label>
              <Select value={typeForm.group_id} onValueChange={v => setTypeForm(p => ({ ...p, group_id: v }))}>
                <SelectTrigger><SelectValue placeholder="그룹 없음" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">그룹 없음</SelectItem>
                  {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>유형명 *</Label><Input value={typeForm.name} onChange={e => setTypeForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>표시 이름</Label><Input value={typeForm.display_name} onChange={e => setTypeForm(p => ({ ...p, display_name: e.target.value }))} placeholder="다른 직원에게 보이는 이름" /></div>
            <div>
              <Label>시간 옵션</Label>
              <Select value={typeForm.time_option} onValueChange={v => setTypeForm(p => ({ ...p, time_option: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_day">하루 종일</SelectItem>
                  <SelectItem value="time_input">시간 입력</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>유급시간 (h)</Label><Input type="number" value={typeForm.paid_hours} onChange={e => setTypeForm(p => ({ ...p, paid_hours: e.target.value }))} /></div>
              <div><Label>차감일수</Label><Input type="number" step="0.5" value={typeForm.deduction_days} onChange={e => setTypeForm(p => ({ ...p, deduction_days: e.target.value }))} /></div>
            </div>
            {typeForm.time_option === "full_day" && (
              <>
                <div>
                  <Label>특별 옵션</Label>
                  <Select value={typeForm.special_option} onValueChange={v => setTypeForm(p => ({ ...p, special_option: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">해당 없음</SelectItem>
                      <SelectItem value="long_term">장기 휴가</SelectItem>
                      <SelectItem value="day_off">휴무</SelectItem>
                      <SelectItem value="holiday">휴일</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>최소 연속일수</Label><Input type="number" value={typeForm.min_consecutive_days} onChange={e => setTypeForm(p => ({ ...p, min_consecutive_days: e.target.value }))} /></div>
                  <div><Label>최대 연속일수</Label><Input type="number" value={typeForm.max_consecutive_days} onChange={e => setTypeForm(p => ({ ...p, max_consecutive_days: e.target.value }))} placeholder="제한없음" /></div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={typeForm.include_holidays_in_consecutive} onCheckedChange={v => setTypeForm(p => ({ ...p, include_holidays_in_consecutive: v }))} />
                  <Label>연속일수에 휴무/휴일 포함</Label>
                </div>
              </>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={typeForm.is_paid} onCheckedChange={v => setTypeForm(p => ({ ...p, is_paid: v }))} />
              <Label>유급 휴가</Label>
            </div>
            <Button onClick={saveType} className="w-full">{editType ? "수정" : "추가"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Balance Dialog ===== */}
      <Dialog open={balanceDialog} onOpenChange={setBalanceDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>휴가 수동 발생</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>직원 *</Label>
              <Select value={balanceForm.user_id} onValueChange={v => setBalanceForm(p => ({ ...p, user_id: v }))}>
                <SelectTrigger><SelectValue placeholder="직원 선택" /></SelectTrigger>
                <SelectContent>
                  {members.map((m: any) => (
                    <SelectItem key={m.user_id} value={m.user_id}>{m.profile?.full_name || m.profile?.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>휴가 그룹</Label>
              <Select value={balanceForm.group_id} onValueChange={v => setBalanceForm(p => ({ ...p, group_id: v }))}>
                <SelectTrigger><SelectValue placeholder="그룹 선택" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">그룹 없음</SelectItem>
                  {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>발생 일수 *</Label><Input type="number" step="0.5" value={balanceForm.total_days} onChange={e => setBalanceForm(p => ({ ...p, total_days: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>유효 시작일</Label><Input type="date" value={balanceForm.valid_from} onChange={e => setBalanceForm(p => ({ ...p, valid_from: e.target.value }))} /></div>
              <div><Label>유효 종료일</Label><Input type="date" value={balanceForm.valid_until} onChange={e => setBalanceForm(p => ({ ...p, valid_until: e.target.value }))} /></div>
            </div>
            <div><Label>메모</Label><Textarea value={balanceForm.memo} onChange={e => setBalanceForm(p => ({ ...p, memo: e.target.value }))} /></div>
            <Button onClick={saveBalance} className="w-full">휴가 발생</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveManagement;
