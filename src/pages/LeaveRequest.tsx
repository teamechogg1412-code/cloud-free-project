import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, Plus, Check, X, Palmtree, Clock, TrendingUp } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "대기", variant: "outline" },
  approved: { label: "승인", variant: "default" },
  rejected: { label: "반려", variant: "destructive" },
  cancelled: { label: "취소", variant: "secondary" },
};

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

  // Admin: pending requests from all members
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  useEffect(() => {
    if (tenantId && user) loadAll();
  }, [tenantId, user]);

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

    // Admin: load all pending requests
    if (isCompanyAdmin) {
      const { data } = await supabase.from("leave_requests")
        .select("*, leave_type:leave_types(name), profile:profiles(full_name, email)")
        .eq("tenant_id", tenantId).eq("status", "pending")
        .order("created_at", { ascending: true });
      if (data) setPendingRequests(data);
    }
    setLoading(false);
  };

  // 잔여일수 요약 계산
  const balanceSummary: Record<string, { total: number; used: number }> = balances.reduce((acc: Record<string, { total: number; used: number }>, b: any) => {
    const key = b.group?.name || "기타";
    if (!acc[key]) acc[key] = { total: 0, used: 0 };
    acc[key].total += Number(b.total_days);
    acc[key].used += Number(b.used_days);
    return acc;
  }, {} as Record<string, { total: number; used: number }>);

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

  const approveRequest = async (id: string) => {
    if (!user) return;
    // Get request details to update balance
    const req = pendingRequests.find((r: any) => r.id === id);
    await supabase.from("leave_requests").update({ status: "approved", approved_by: user.id, approved_at: new Date().toISOString() }).eq("id", id);
    
    // Update used_days in balance if applicable
    if (req) {
      const { data: typeData } = await supabase.from("leave_types").select("group_id").eq("id", req.leave_type_id).single();
      if (typeData?.group_id) {
        const { data: bal } = await supabase.from("leave_balances")
          .select("id, used_days")
          .eq("tenant_id", tenantId!).eq("user_id", req.user_id).eq("group_id", typeData.group_id)
          .order("valid_from", { ascending: false }).limit(1).single();
        if (bal) {
          await supabase.from("leave_balances").update({ used_days: Number(bal.used_days) + Number(req.total_days) }).eq("id", bal.id);
        }
      }
    }
    toast.success("승인 완료");
    loadAll();
  };

  const rejectRequest = async (id: string) => {
    const reason = prompt("반려 사유를 입력하세요:");
    if (reason === null) return;
    await supabase.from("leave_requests").update({ status: "rejected", approved_by: user?.id, approved_at: new Date().toISOString(), reject_reason: reason }).eq("id", id);
    toast.success("반려 완료");
    loadAll();
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">로딩 중...</div>;

  const selectedType = types.find((t: any) => t.id === form.leave_type_id);

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
                  <div className="text-2xl font-bold text-primary">{data.total}</div>
                  <div className="text-xs text-muted-foreground">총 발생</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-destructive">{data.used}</div>
                  <div className="text-xs text-muted-foreground">사용</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-accent-foreground">{data.total - data.used}</div>
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
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.leave_type?.name || "-"}</TableCell>
                      <TableCell>{r.start_date} ~ {r.end_date}{r.start_time ? ` (${r.start_time}~${r.end_time})` : ""}</TableCell>
                      <TableCell>{r.total_days}일</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">{r.reason || "-"}</TableCell>
                      <TableCell><Badge variant={s.variant}>{s.label}</Badge>{r.reject_reason && <p className="text-xs text-destructive mt-1">{r.reject_reason}</p>}</TableCell>
                      <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("ko")}</TableCell>
                      <TableCell>
                        {r.status === "pending" && (
                          <Button size="sm" variant="ghost" onClick={() => cancelRequest(r.id)}><X className="w-4 h-4 text-destructive" /></Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {requests.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">신청 내역이 없습니다.</TableCell></TableRow>}
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
                  {pendingRequests.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.profile?.full_name || r.profile?.email || "-"}</TableCell>
                      <TableCell>{r.leave_type?.name || "-"}</TableCell>
                      <TableCell>{r.start_date} ~ {r.end_date}</TableCell>
                      <TableCell>{r.total_days}일</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">{r.reason || "-"}</TableCell>
                      <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("ko")}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="default" onClick={() => approveRequest(r.id)}><Check className="w-4 h-4" /></Button>
                          <Button size="sm" variant="destructive" onClick={() => rejectRequest(r.id)}><X className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pendingRequests.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">대기 중인 결재가 없습니다.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* 휴가 신청 Dialog */}
      <Dialog open={requestDialog} onOpenChange={setRequestDialog}>
        <DialogContent>
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
            <Button onClick={submitRequest} className="w-full">신청하기</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveRequest;
