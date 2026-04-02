import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Pencil, CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["일반", "출장비", "접대비", "교통비", "식대", "소모품", "기타"];
const PAYMENT_METHODS = ["법인카드", "개인카드", "현금", "계좌이체"];

interface TemplateItem {
  description: string;
  amount: number;
  payment_method: string;
  receipt_note: string;
}

export const ExpenseTemplateManager = () => {
  const { user, currentTenant } = useAuth();
  const tenantId = currentTenant?.tenant_id;

  const [templates, setTemplates] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("일반");
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<TemplateItem[]>([
    { description: "", amount: 0, payment_method: "법인카드", receipt_note: "" },
  ]);

  useEffect(() => {
    if (tenantId) {
      loadTemplates();
      loadMembers();
    }
  }, [tenantId]);

  const loadTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("expense_report_templates")
      .select("*, expense_report_template_items(*)")
      .eq("tenant_id", tenantId)
      .order("day_of_month");
    setTemplates(data || []);
    setLoading(false);
  };

  const loadMembers = async () => {
    const { data } = await supabase
      .from("tenant_memberships")
      .select("user_id, profiles:user_id(full_name), department, job_title")
      .eq("tenant_id", tenantId);
    setMembers(
      (data || []).map((m: any) => ({
        user_id: m.user_id,
        name: m.profiles?.full_name || "이름 없음",
        department: m.department,
        job_title: m.job_title,
      }))
    );
  };

  const resetForm = () => {
    setTitle("");
    setCategory("일반");
    setDayOfMonth(1);
    setAssigneeUserId("");
    setDescription("");
    setItems([{ description: "", amount: 0, payment_method: "법인카드", receipt_note: "" }]);
    setEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (tmpl: any) => {
    setEditId(tmpl.id);
    setTitle(tmpl.title);
    setCategory(tmpl.category);
    setDayOfMonth(tmpl.day_of_month);
    setAssigneeUserId(tmpl.assignee_user_id);
    setDescription(tmpl.description || "");
    setItems(
      (tmpl.expense_report_template_items || []).map((it: any) => ({
        description: it.description,
        amount: Number(it.amount),
        payment_method: it.payment_method || "법인카드",
        receipt_note: it.receipt_note || "",
      }))
    );
    if (items.length === 0) setItems([{ description: "", amount: 0, payment_method: "법인카드", receipt_note: "" }]);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !assigneeUserId) {
      toast.error("제목과 담당자를 입력하세요");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        title,
        category,
        day_of_month: dayOfMonth,
        assignee_user_id: assigneeUserId,
        description,
        created_by: user?.id,
        updated_at: new Date().toISOString(),
      };

      let templateId = editId;

      if (editId) {
        await supabase.from("expense_report_templates").update(payload).eq("id", editId);
        // Delete old items
        await supabase.from("expense_report_template_items").delete().eq("template_id", editId);
      } else {
        const { data, error } = await supabase
          .from("expense_report_templates")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        templateId = data.id;
      }

      // Insert items
      const validItems = items.filter((it) => it.description.trim());
      if (validItems.length > 0 && templateId) {
        await supabase.from("expense_report_template_items").insert(
          validItems.map((it, idx) => ({
            template_id: templateId,
            description: it.description,
            amount: it.amount,
            payment_method: it.payment_method,
            receipt_note: it.receipt_note,
            sort_order: idx,
          }))
        );
      }

      toast.success(editId ? "템플릿이 수정되었습니다" : "템플릿이 등록되었습니다");
      setDialogOpen(false);
      resetForm();
      loadTemplates();
    } catch (err: any) {
      toast.error("저장 실패: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("expense_report_templates").update({ is_active: !current }).eq("id", id);
    loadTemplates();
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("이 템플릿을 삭제하시겠습니까?")) return;
    await supabase.from("expense_report_templates").delete().eq("id", id);
    toast.success("삭제되었습니다");
    loadTemplates();
  };

  const addItem = () => setItems([...items, { description: "", amount: 0, payment_method: "법인카드", receipt_note: "" }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, val: any) =>
    setItems(items.map((it, i) => (i === idx ? { ...it, [field]: val } : it)));

  const getMemberName = (userId: string) => members.find((m) => m.user_id === userId)?.name || userId;

  const totalAmount = items.reduce((s, it) => s + Number(it.amount || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="w-5 h-5" /> 자동 생성 템플릿
        </CardTitle>
        <Button size="sm" onClick={openCreate} className="gap-1">
          <Plus className="w-4 h-4" /> 템플릿 등록
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">등록된 자동 생성 템플릿이 없습니다</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead>분류</TableHead>
                <TableHead>생성일</TableHead>
                <TableHead>담당자</TableHead>
                <TableHead className="text-right">예상 금액</TableHead>
                <TableHead>상태</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
                  <TableCell>매월 {t.day_of_month}일</TableCell>
                  <TableCell>{getMemberName(t.assignee_user_id)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {(t.expense_report_template_items || [])
                      .reduce((s: number, it: any) => s + Number(it.amount), 0)
                      .toLocaleString()}원
                  </TableCell>
                  <TableCell>
                    <Switch checked={t.is_active} onCheckedChange={() => toggleActive(t.id, t.is_active)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteTemplate(t.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "템플릿 수정" : "자동 생성 템플릿 등록"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>제목 *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="월간 교통비" />
              </div>
              <div>
                <Label>분류</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>매월 생성일 *</Label>
                <Select value={String(dayOfMonth)} onValueChange={(v) => setDayOfMonth(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>{d}일</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>담당자 (결의서 생성 대상) *</Label>
                <Select value={assigneeUserId} onValueChange={setAssigneeUserId}>
                  <SelectTrigger><SelectValue placeholder="직원 선택" /></SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.name} {m.department ? `(${m.department})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>비고</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="매월 반복 생성됩니다" />
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">항목</Label>
                <Button size="sm" variant="outline" onClick={addItem} className="gap-1">
                  <Plus className="w-3 h-3" /> 추가
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <Input
                      className="col-span-4"
                      placeholder="내역"
                      value={it.description}
                      onChange={(e) => updateItem(idx, "description", e.target.value)}
                    />
                    <Input
                      className="col-span-2"
                      type="number"
                      placeholder="금액"
                      value={it.amount || ""}
                      onChange={(e) => updateItem(idx, "amount", Number(e.target.value))}
                    />
                    <Select value={it.payment_method} onValueChange={(v) => updateItem(idx, "payment_method", v)}>
                      <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      className="col-span-3"
                      placeholder="비고"
                      value={it.receipt_note}
                      onChange={(e) => updateItem(idx, "receipt_note", e.target.value)}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="col-span-1"
                      onClick={() => removeItem(idx)}
                      disabled={items.length <= 1}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="text-right text-sm font-semibold mt-2">
                예상 합계: {totalAmount.toLocaleString()}원
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editId ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
