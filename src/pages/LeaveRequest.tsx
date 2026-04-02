import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, Plus, Check, X, Palmtree, ChevronDown, ChevronUp, UserCheck, Clock, CircleDot } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "대기", variant: "outline" },
  approved: { label: "승인", variant: "default" },
  rejected: { label: "반려", variant: "destructive" },
  cancelled: { label: "취소", variant: "secondary" },
};

interface ApprovalLineItem {
  user_id: string;
  name: string;
  job_title: string;
  step_order: number;
}

const LeaveRequest = () => {
  const { user, currentTenant, isCompanyAdmin } = useAuth();
  const tenantId = currentTenant?.tenant_id;

  const [balances, setBalances] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestDialog, setRequestDialog] = useState(false);
  const [form, setForm] = useState({
    leave_type_id: "", start_date: "", end_date: "", start_time: "", end_time: "", reason: "",
  });

  // Approval line
  const [approvalLines, setApprovalLines] = useState<ApprovalLineItem[]>([]);

  // Admin: pending requests
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  // Admin: approval lines for each requester (keyed by requester user_id)
  const [pendingApprovalLines, setPendingApprovalLines] = useState<
    Record<string, { approver_user_id: string; step_order: number }[]>
  >({});

  // Expanded row for progress
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId && user) {
      Promise.all([autoGenerateMyBalance(), autoGenerateCompensatoryLeave()]).then(() => loadAll());
    }
  }, [tenantId, user]);

  /** 본인의 연차/월차 자동 발생 (없을 경우에만) */
  const autoGenerateMyBalance = async () => {
    if (!tenantId || !user) return;

    // 1. 입사일 조회
    const { data: detail } = await supabase
      .from("employee_details")
      .select("hire_date")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .single();

    if (!detail?.hire_date) return; // 입사일 없으면 스킵

    const hireDate = new Date(detail.hire_date);
    const now = new Date();
    const diffMs = now.getTime() - hireDate.getTime();
    const diffMonths = (now.getFullYear() - hireDate.getFullYear()) * 12 + (now.getMonth() - hireDate.getMonth());
    const diffYears = now.getFullYear() - hireDate.getFullYear() - (now < new Date(now.getFullYear(), hireDate.getMonth(), hireDate.getDate()) ? 1 : 0);

    // 2. "연차" 그룹 확보 (없으면 생성)
    let annualGroupId: string;
    const { data: groups } = await supabase
      .from("leave_groups")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("name", "연차")
      .limit(1);

    if (groups && groups.length > 0) {
      annualGroupId = groups[0].id;
    } else {
      const { data: newGroup, error } = await supabase
        .from("leave_groups")
        .insert({ tenant_id: tenantId, name: "연차", description: "근로기준법 기반 연차휴가", overdraft_limit: 0 } as any)
        .select()
        .single();
      if (error || !newGroup) return;
      annualGroupId = newGroup.id;
    }

    const year = now.getFullYear();
    const validFrom = `${year}-01-01`;
    const validUntil = `${year}-12-31`;

    // 3. 올해 이미 자동발생된 건이 있는지 확인
    const { data: existingBal } = await supabase
      .from("leave_balances")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .eq("group_id", annualGroupId)
      .gte("valid_from", validFrom)
      .lte("valid_from", validUntil)
      .limit(1);

    if (existingBal && existingBal.length > 0) return; // 이미 존재

    // 4. 연차 일수 계산
    let totalDays = 0;
    let memo = "";

    if (diffYears >= 1) {
      // 1년 이상: 기본 15일 + 2년마다 1일 추가 (최대 25일)
      const extraDays = Math.floor((diffYears - 1) / 2);
      totalDays = Math.min(15 + extraDays, 25);
      memo = `${year}년 연차 자동발생 (근속 ${diffYears}년, 입사일: ${detail.hire_date})`;
    } else {
      // 1년 미만: 매월 1일씩 발생 (최대 11개, 입사 첫 달 제외)
      totalDays = Math.min(Math.max(diffMonths, 0), 11);
      memo = `${year}년 월차 자동발생 (근무 ${diffMonths}개월, 입사일: ${detail.hire_date})`;
    }

    if (totalDays <= 0) return;

    await supabase.from("leave_balances").insert({
      tenant_id: tenantId,
      user_id: user.id,
      group_id: annualGroupId,
      total_days: totalDays,
      used_days: 0,
      generation_type: "auto_annual",
      memo,
      valid_from: validFrom,
      valid_until: validUntil,
    } as any);
  };

  /** 보상휴가 자동 발생: 초과근무 시간 기반 */
  const autoGenerateCompensatoryLeave = async () => {
    if (!tenantId || !user) return;

    // 1. "대체휴무" 또는 "보상휴가" 그룹 확보
    let compGroupId: string;
    const { data: compGroups } = await supabase
      .from("leave_groups")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .in("name", ["대체휴무", "보상휴가"])
      .limit(1);

    if (compGroups && compGroups.length > 0) {
      compGroupId = compGroups[0].id;
    } else {
      const { data: newGroup, error } = await supabase
        .from("leave_groups")
        .insert({ tenant_id: tenantId, name: "보상휴가", description: "초과근무 보상휴가", overdraft_limit: 0 } as any)
        .select()
        .single();
      if (error || !newGroup) return;
      compGroupId = newGroup.id;
    }

    const now = new Date();
    const year = now.getFullYear();
    const validFrom = `${year}-01-01`;
    const validUntil = `${year}-12-31`;

    // 2. 올해 이미 보상휴가가 발생되었는지 확인
    const { data: existingComp } = await supabase
      .from("leave_balances")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .eq("group_id", compGroupId)
      .eq("generation_type", "auto_compensatory")
      .gte("valid_from", validFrom)
      .lte("valid_from", validUntil)
      .limit(1);

    if (existingComp && existingComp.length > 0) return;

    // 3. 소정근로시간 조회 (기본 8시간/일)
    let standardDailyHours = 8;
    const { data: workRule } = await supabase
      .from("work_rules")
      .select("standard_work_hours, work_days")
      .eq("tenant_id", tenantId)
      .limit(1)
      .single();

    if (workRule) {
      const workDaysCount = (workRule.work_days as string[])?.length || 5;
      standardDailyHours = (workRule.standard_work_hours || 40) / workDaysCount;
    }

    // 4. 올해 출퇴근 기록에서 초과근무 시간 합산
    const { data: records } = await supabase
      .from("attendance_records")
      .select("clock_in, clock_out, date")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .gte("date", validFrom)
      .lte("date", validUntil)
      .not("clock_out", "is", null);

    if (!records || records.length === 0) return;

    let totalOvertimeHours = 0;
    for (const r of records) {
      if (!r.clock_in || !r.clock_out) continue;
      const workedMs = new Date(r.clock_out).getTime() - new Date(r.clock_in).getTime();
      const workedHours = workedMs / (1000 * 60 * 60);
      // 점심시간 1시간 제외
      const netWorkedHours = Math.max(workedHours - 1, 0);
      const overtime = Math.max(netWorkedHours - standardDailyHours, 0);
      totalOvertimeHours += overtime;
    }

    // 5. 8시간 초과근무 = 1일 보상휴가
    const compDays = Math.floor(totalOvertimeHours / 8 * 10) / 10; // 소수점 1자리
    if (compDays <= 0) return;

    await supabase.from("leave_balances").insert({
      tenant_id: tenantId,
      user_id: user.id,
      group_id: compGroupId,
      total_days: compDays,
      used_days: 0,
      generation_type: "auto_compensatory",
      memo: `${year}년 보상휴가 자동발생 (초과근무 ${totalOvertimeHours.toFixed(1)}시간 → ${compDays}일)`,
      valid_from: validFrom,
      valid_until: validUntil,
    } as any);
  };

  const loadAll = async () => {
    if (!tenantId || !user) return;
    setLoading(true);

    const [bRes, tRes, rRes] = await Promise.all([
      supabase.from("leave_balances")
        .select("*, group:leave_groups(name)")
        .eq("tenant_id", tenantId).eq("user_id", user.id)
        .order("valid_from", { ascending: false }),
      supabase.from("leave_types")
        .select("*, group:leave_groups(name)")
        .eq("tenant_id", tenantId).eq("is_active", true),
      supabase.from("leave_requests")
        .select("*, leave_type:leave_types(name, group:leave_groups(name))")
        .eq("tenant_id", tenantId).eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (bRes.data) setBalances(bRes.data);
    if (tRes.data) setTypes(tRes.data);
    if (rRes.data) setRequests(rRes.data);

    // Load user's approval lines
    const { data: approvalData } = await supabase
      .from("approval_lines")
      .select("approver_user_id, step_order")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .order("step_order", { ascending: true });

    if (approvalData && approvalData.length > 0) {
      const approverIds = approvalData.map((a: any) => a.approver_user_id);
      const [profilesRes, membersRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", approverIds),
        supabase.from("tenant_memberships").select("user_id, job_title").eq("tenant_id", tenantId).in("user_id", approverIds),
      ]);
      const nameMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p.full_name]));
      const titleMap = new Map((membersRes.data || []).map((m: any) => [m.user_id, m.job_title]));

      setApprovalLines(approvalData.map((a: any) => ({
        user_id: a.approver_user_id,
        name: nameMap.get(a.approver_user_id) || "이름 없음",
        job_title: titleMap.get(a.approver_user_id) || "",
        step_order: a.step_order,
      })));
    } else {
      setApprovalLines([]);
    }

    // Admin: load all pending requests
    if (isCompanyAdmin) {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*, leave_type:leave_types(name), profile:profiles!leave_requests_user_id_fkey(full_name, email)")
        .eq("tenant_id", tenantId)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error || !data) {
        setPendingRequests([]);
        setPendingApprovalLines({});
      } else {
        setPendingRequests(data);

        const requesterIds = Array.from(
          new Set((data || []).map((r: any) => r.user_id).filter(Boolean))
        );

        if (requesterIds.length === 0) {
          setPendingApprovalLines({});
        } else {
          const { data: linesData } = await supabase
            .from("approval_lines")
            .select("user_id, approver_user_id, step_order")
            .eq("tenant_id", tenantId)
            .in("user_id", requesterIds)
            .order("step_order", { ascending: true });

          const map: Record<string, { approver_user_id: string; step_order: number }[]> = {};
          for (const row of linesData || []) {
            if (!map[row.user_id]) map[row.user_id] = [];
            map[row.user_id].push({
              approver_user_id: row.approver_user_id,
              step_order: row.step_order,
            });
          }
          setPendingApprovalLines(map);
        }
      }
    }
    setLoading(false);
  };

  const balanceSummary: Record<string, { total: number; used: number }> = balances.reduce((acc: Record<string, { total: number; used: number }>, b: any) => {
    const key = b.group?.name || "기타";
    if (!acc[key]) acc[key] = { total: 0, used: 0 };
    acc[key].total += Number(b.total_days);
    acc[key].used += Number(b.used_days);
    return acc;
  }, {} as Record<string, { total: number; used: number }>);

  // 보상휴가 카드가 항상 보이도록 보장
  if (!balanceSummary["보상휴가"] && !balanceSummary["대체휴무"]) {
    balanceSummary["보상휴가"] = { total: 0, used: 0 };
  }

  const submitRequest = async () => {
    if (!tenantId || !user || !form.leave_type_id || !form.start_date || !form.end_date) {
      toast.error("필수 항목을 입력해주세요."); return;
    }
    const selectedType = types.find((t: any) => t.id === form.leave_type_id);
    const startDate = new Date(form.start_date);
    const endDate = new Date(form.end_date);
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const totalDays = diffDays * (selectedType?.deduction_days || 1);

    const { error } = await supabase.from("leave_requests").insert({
      tenant_id: tenantId, user_id: user.id, leave_type_id: form.leave_type_id,
      start_date: form.start_date, end_date: form.end_date,
      start_time: form.start_time || null, end_time: form.end_time || null,
      total_days: totalDays, reason: form.reason || null,
    } as any);

    if (error) { toast.error("신청 실패: " + error.message); return; }
    toast.success("휴가 신청 완료");
    setRequestDialog(false);
    setForm({ leave_type_id: "", start_date: "", end_date: "", start_time: "", end_time: "", reason: "" });
    loadAll();
  };

  const cancelRequest = async (id: string) => {
    if (!confirm("취소하시겠습니까?")) return;
    await supabase.from("leave_requests").update({ status: "cancelled" }).eq("id", id);
    toast.success("취소 완료");
    loadAll();
  };

  const getRequesterApprovalLine = async (requesterUserId: string) => {
    if (!tenantId) return [];

    const cached = pendingApprovalLines[requesterUserId];
    if (cached) return [...cached].sort((a, b) => a.step_order - b.step_order);

    const { data } = await supabase
      .from("approval_lines")
      .select("approver_user_id, step_order")
      .eq("tenant_id", tenantId)
      .eq("user_id", requesterUserId)
      .order("step_order", { ascending: true });

    const lines = (data || []).map((l: any) => ({
      approver_user_id: l.approver_user_id,
      step_order: l.step_order,
    }));

    setPendingApprovalLines((prev) => ({ ...prev, [requesterUserId]: lines }));
    return lines;
  };

  const getNextApprover = (
    lines: { approver_user_id: string; step_order: number }[],
    lastActorUserId: string | null
  ) => {
    if (lines.length === 0) return { nextApproverId: null as string | null, nextIndex: 0 };

    const lastIdx = lastActorUserId
      ? lines.findIndex((l) => l.approver_user_id === lastActorUserId)
      : -1;

    const nextIndex = lastIdx + 1;
    const nextApproverId = lines[nextIndex]?.approver_user_id ?? null;

    return { nextApproverId, nextIndex };
  };

  const approveRequest = async (id: string) => {
    if (!user || !tenantId) return;

    const req = pendingRequests.find((r: any) => r.id === id);
    if (!req) return;

    const lines = await getRequesterApprovalLine(req.user_id);
    const { nextApproverId, nextIndex } = getNextApprover(lines, req.approved_by || null);

    // 결재라인이 있는 경우: "현재 차례"가 아니면 승인 불가
    if (nextApproverId && nextApproverId !== user.id) {
      toast.error("현재 결재 차례가 아닙니다.");
      return;
    }

    const isFinalApproval = lines.length === 0 || nextIndex >= lines.length - 1;

    // 중간 승인: status는 그대로 pending, approved_by/approved_at만 갱신해서 다음 승인자에게 넘김
    if (!isFinalApproval) {
      const { error } = await supabase
        .from("leave_requests")
        .update({ approved_by: user.id, approved_at: new Date().toISOString() })
        .eq("id", id);

      if (error) {
        toast.error("승인 실패: " + error.message);
        return;
      }

      toast.success(`${nextIndex + 1}차 승인 완료 (다음 결재자 대기)`);
      loadAll();
      return;
    }

    // 최종 승인
    const { error: approveErr } = await supabase
      .from("leave_requests")
      .update({ status: "approved", approved_by: user.id, approved_at: new Date().toISOString() })
      .eq("id", id);

    if (approveErr) {
      toast.error("승인 실패: " + approveErr.message);
      return;
    }

    // 최종 승인 시에만 잔여 차감
    const { data: typeData } = await supabase
      .from("leave_types")
      .select("group_id")
      .eq("id", req.leave_type_id)
      .single();

    if (typeData?.group_id) {
      const { data: bal } = await supabase
        .from("leave_balances")
        .select("id, used_days")
        .eq("tenant_id", tenantId)
        .eq("user_id", req.user_id)
        .eq("group_id", typeData.group_id)
        .order("valid_from", { ascending: false })
        .limit(1)
        .single();

      if (bal) {
        await supabase
          .from("leave_balances")
          .update({ used_days: Number(bal.used_days) + Number(req.total_days) })
          .eq("id", bal.id);
      }
    }

    toast.success("최종 승인 완료");
    loadAll();
  };

  const rejectRequest = async (id: string) => {
    if (!user || !tenantId) return;

    const req = pendingRequests.find((r: any) => r.id === id);
    if (!req) return;

    const lines = await getRequesterApprovalLine(req.user_id);
    const { nextApproverId } = getNextApprover(lines, req.approved_by || null);

    if (nextApproverId && nextApproverId !== user.id) {
      toast.error("현재 결재 차례가 아닙니다.");
      return;
    }

    const reason = prompt("반려 사유를 입력하세요:");
    if (reason === null) return;

    const { error } = await supabase
      .from("leave_requests")
      .update({
        status: "rejected",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        reject_reason: reason,
      })
      .eq("id", id);

    if (error) {
      toast.error("반려 실패: " + error.message);
      return;
    }

    toast.success("반려 완료");
    loadAll();
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">로딩 중...</div>;

  const selectedType = types.find((t: any) => t.id === form.leave_type_id);

  const getApprovalStatus = (request: any) => {
    if (request.status === "approved") return "approved";
    if (request.status === "rejected") return "rejected";
    if (request.status === "cancelled") return "cancelled";
    return "pending";
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Palmtree className="w-6 h-6" />휴가 신청</h1>
        <Button onClick={() => setRequestDialog(true)}><Plus className="w-4 h-4 mr-1" />휴가 신청</Button>
      </div>

      {/* 잔여일수 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(balanceSummary).map(([group, data]) => (
          <Card key={group}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                <span className="font-semibold">{group}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{data.total ?? 0}</div>
                  <div className="text-xs text-muted-foreground">총 발생</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-destructive">{data.used ?? 0}</div>
                  <div className="text-xs text-muted-foreground">사용</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-accent-foreground">{(data.total ?? 0) - (data.used ?? 0)}</div>
                  <div className="text-xs text-muted-foreground">잔여</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {Object.keys(balanceSummary).length === 0 && (
          <Card className="col-span-full"><CardContent className="pt-6 text-center text-muted-foreground">발생된 휴가가 없습니다. 관리자에게 문의하세요.</CardContent></Card>
        )}
      </div>

      <Tabs defaultValue="my-requests">
        <TabsList>
          <TabsTrigger value="my-requests">내 휴가 신청</TabsTrigger>
          {isCompanyAdmin && <TabsTrigger value="approvals">결재함 ({pendingRequests.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="my-requests">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>기간</TableHead>
                  <TableHead>차감일수</TableHead>
                  <TableHead>사유</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>신청일</TableHead>
                  <TableHead className="w-20">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r: any) => {
                  const s = STATUS_MAP[r.status] || STATUS_MAP.pending;
                  const isExpanded = expandedRow === r.id;
                  return (
                    <React.Fragment key={r.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedRow(isExpanded ? null : r.id)}>
                        <TableCell className="px-2">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="font-medium">{r.leave_type?.name || "-"}</TableCell>
                        <TableCell>{r.start_date} ~ {r.end_date}{r.start_time ? ` (${r.start_time}~${r.end_time})` : ""}</TableCell>
                        <TableCell>{r.total_days}일</TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">{r.reason || "-"}</TableCell>
                        <TableCell><Badge variant={s.variant}>{s.label}</Badge>{r.reject_reason && <p className="text-xs text-destructive mt-1">{r.reject_reason}</p>}</TableCell>
                        <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("ko")}</TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          {r.status === "pending" && (
                            <Button size="sm" variant="ghost" onClick={() => cancelRequest(r.id)}><X className="w-4 h-4 text-destructive" /></Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30 px-6 py-4">
                            <ApprovalProgress
                              approvalLines={approvalLines}
                              status={getApprovalStatus(r)}
                              approvedBy={r.approved_by}
                              approvedAt={r.approved_at}
                              rejectReason={r.reject_reason}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
                {requests.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">신청 내역이 없습니다.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {isCompanyAdmin && (
          <TabsContent value="approvals">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>신청자</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>기간</TableHead>
                    <TableHead>차감일수</TableHead>
                    <TableHead>사유</TableHead>
                    <TableHead>신청일</TableHead>
                    <TableHead className="w-28">결재</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((r: any) => {
                    const cachedLines = (pendingApprovalLines[r.user_id] || [])
                      .slice()
                      .sort((a, b) => a.step_order - b.step_order);

                    const { nextApproverId } = getNextApprover(cachedLines, r.approved_by || null);
                    const isMyTurn = !nextApproverId || nextApproverId === user?.id;

                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.profile?.full_name || r.profile?.email || "-"}</TableCell>
                        <TableCell>{r.leave_type?.name || "-"}</TableCell>
                        <TableCell>{r.start_date} ~ {r.end_date}</TableCell>
                        <TableCell>{r.total_days}일</TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">{r.reason || "-"}</TableCell>
                        <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("ko")}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="default"
                              disabled={!isMyTurn}
                              onClick={() => approveRequest(r.id)}
                              title={!isMyTurn ? "현재 결재 차례가 아닙니다" : "승인"}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={!isMyTurn}
                              onClick={() => rejectRequest(r.id)}
                              title={!isMyTurn ? "현재 결재 차례가 아닙니다" : "반려"}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {pendingRequests.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">대기 중인 결재가 없습니다.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* 휴가 신청 Dialog */}
      <Dialog open={requestDialog} onOpenChange={setRequestDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>휴가 신청</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>휴가 유형 *</Label>
              <Select value={form.leave_type_id} onValueChange={v => setForm(p => ({ ...p, leave_type_id: v }))}>
                <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  {types.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.group?.name ? `[${t.group.name}] ` : ""}{t.name} ({t.deduction_days}일 차감)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>시작일 *</Label><Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value, end_date: p.end_date || e.target.value }))} /></div>
              <div><Label>종료일 *</Label><Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} /></div>
            </div>
            {selectedType?.time_option === "time_input" && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>시작시간</Label><Input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} /></div>
                <div><Label>종료시간</Label><Input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} /></div>
              </div>
            )}
            <div><Label>사유</Label><Textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="휴가 사유 입력" /></div>
            {form.start_date && form.end_date && selectedType && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p>차감 일수: <strong>{(Math.ceil((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1) * selectedType.deduction_days}일</strong></p>
              </div>
            )}

            {/* 결재라인 표시 */}
            <div className="border rounded-lg p-3 space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-semibold">
                <UserCheck className="w-4 h-4 text-primary" />결재라인
              </Label>
              {approvalLines.length > 0 ? (
                <div className="flex items-center gap-1 flex-wrap">
                  {approvalLines.map((line, i) => (
                    <React.Fragment key={line.user_id}>
                      <div className="flex items-center gap-1.5 bg-muted rounded-md px-3 py-1.5">
                        <span className="text-xs font-medium text-primary">{i + 1}차</span>
                        <span className="text-sm font-medium">{line.name}</span>
                        {line.job_title && <span className="text-xs text-muted-foreground">({line.job_title})</span>}
                      </div>
                      {i < approvalLines.length - 1 && <span className="text-muted-foreground">→</span>}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">설정된 결재라인이 없습니다. 마이페이지에서 결재라인을 설정해주세요.</p>
              )}
            </div>

            <Button onClick={submitRequest} className="w-full">신청하기</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/** 결재 진행 상황 컴포넌트 */
const ApprovalProgress = ({ approvalLines, status, approvedBy, approvedAt, rejectReason }: {
  approvalLines: ApprovalLineItem[];
  status: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectReason?: string;
}) => {
  if (approvalLines.length === 0) {
    return <p className="text-sm text-muted-foreground">결재라인이 설정되지 않았습니다.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold flex items-center gap-1.5">
        <Clock className="w-4 h-4" />결재 진행 상황
      </p>
      <div className="flex items-start justify-center gap-0">
        {approvalLines.map((line, i) => {
          const lastActorIndex = approvedBy
            ? approvalLines.findIndex((l) => l.user_id === approvedBy)
            : -1;

          let stepStatus: "done" | "current" | "waiting" | "rejected" = "waiting";

          if (status === "approved") {
            stepStatus = "done";
          } else if (status === "rejected") {
            if (i < lastActorIndex) stepStatus = "done";
            else if (i === lastActorIndex) stepStatus = "rejected";
          } else if (status === "pending") {
            if (lastActorIndex >= 0) {
              if (i <= lastActorIndex) stepStatus = "done";
              else if (i === lastActorIndex + 1) stepStatus = "current";
            } else {
              if (i === 0) stepStatus = "current";
            }
          }

          return (
            <div key={line.user_id} className="flex items-start">
              <div className="flex flex-col items-center min-w-[80px]">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  stepStatus === "done" ? "bg-primary text-primary-foreground border-primary" :
                  stepStatus === "rejected" ? "bg-destructive text-destructive-foreground border-destructive" :
                  stepStatus === "current" ? "bg-background text-primary border-primary animate-pulse" :
                  "bg-muted text-muted-foreground border-border"
                }`}>
                  {stepStatus === "done" ? <Check className="w-4 h-4" /> :
                   stepStatus === "rejected" ? <X className="w-4 h-4" /> :
                   stepStatus === "current" ? <CircleDot className="w-4 h-4" /> :
                   `${i + 1}`}
                </div>
                <span className="text-xs font-medium mt-1">{line.name}</span>
                {line.job_title && <span className="text-[10px] text-muted-foreground">{line.job_title}</span>}
                {stepStatus === "done" && approvedAt && approvedBy === line.user_id && (
                  <span className="text-[10px] text-muted-foreground">{new Date(approvedAt).toLocaleDateString("ko")}</span>
                )}
                {stepStatus === "rejected" && rejectReason && (
                  <span className="text-[10px] text-destructive max-w-[100px] text-center">{rejectReason}</span>
                )}
              </div>
              {i < approvalLines.length - 1 && (
                <div className={`h-0.5 w-8 mt-4 ${stepStatus === "done" ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LeaveRequest;
