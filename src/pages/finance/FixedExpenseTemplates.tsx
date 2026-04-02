import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Trash2, Pencil, CalendarClock, Loader2, ArrowLeft,
  Upload, Send, UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { writeAuditLog } from "@/lib/auditLog";

const CATEGORIES = ["일반", "출장비", "접대비", "교통비", "식대", "소모품", "기타"];
const PAYMENT_METHODS = ["법인카드", "개인카드", "현금", "계좌이체"];
const SUPABASE_URL = "https://matcnptzugnaisuhowbk.supabase.co";

interface TemplateItem {
  description: string;
  amount: number;
  payment_method: string;
  receipt_note: string;
}

interface ExpenseItem {
  item_date: string;
  description: string;
  amount: number;
  payment_method: string;
  receipt_note: string;
  receipt_file?: File | null;
}

interface ApprovalLineItem {
  user_id: string;
  name: string;
  job_title: string;
  step_order: number;
}

const FixedExpenseTemplates = () => {
  const { user, currentTenant } = useAuth();
  const navigate = useNavigate();
  const tenantId = currentTenant?.tenant_id;

  // Template state
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Template form
  const [tmplTitle, setTmplTitle] = useState("");
  const [tmplCategory, setTmplCategory] = useState("일반");
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [tmplDescription, setTmplDescription] = useState("");
  const [tmplItems, setTmplItems] = useState<TemplateItem[]>([
    { description: "", amount: 0, payment_method: "법인카드", receipt_note: "" },
  ]);

  // Create report dialog
  const [createDialog, setCreateDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("일반");
  const [requestedDate, setRequestedDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<ExpenseItem[]>([
    { item_date: new Date().toISOString().split("T")[0], description: "", amount: 0, payment_method: "법인카드", receipt_note: "", receipt_file: null },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Approval line
  const [approvalLines, setApprovalLines] = useState<ApprovalLineItem[]>([]);

  useEffect(() => {
    if (tenantId && user?.id) {
      loadTemplates();
      loadApprovalLines();
    }
  }, [tenantId, user?.id]);

  // ─── Approval Lines ───
  const loadApprovalLines = async () => {
    if (!tenantId || !user) return;
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
  };

  // ─── Template CRUD ───
  const loadTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("expense_report_templates")
      .select("*, expense_report_template_items(*)")
      .eq("tenant_id", tenantId)
      .eq("assignee_user_id", user?.id)
      .order("day_of_month");
    setTemplates(data || []);
    setLoading(false);
  };

  const resetTemplateForm = () => {
    setTmplTitle(""); setTmplCategory("일반"); setDayOfMonth(1);
    setTmplDescription("");
    setTmplItems([{ description: "", amount: 0, payment_method: "법인카드", receipt_note: "" }]);
    setEditId(null);
  };

  const openCreateTemplate = () => { resetTemplateForm(); setTemplateDialogOpen(true); };

  const openEditTemplate = (tmpl: any) => {
    setEditId(tmpl.id);
    setTmplTitle(tmpl.title);
    setTmplCategory(tmpl.category);
    setDayOfMonth(tmpl.day_of_month);
    setTmplDescription(tmpl.description || "");
    const mapped = (tmpl.expense_report_template_items || []).map((it: any) => ({
      description: it.description,
      amount: Number(it.amount),
      payment_method: it.payment_method || "법인카드",
      receipt_note: it.receipt_note || "",
    }));
    setTmplItems(mapped.length > 0 ? mapped : [{ description: "", amount: 0, payment_method: "법인카드", receipt_note: "" }]);
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!tmplTitle.trim()) { toast.error("제목을 입력하세요"); return; }
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        title: tmplTitle, category: tmplCategory,
        day_of_month: dayOfMonth,
        assignee_user_id: user?.id,
        description: tmplDescription,
        created_by: user?.id,
        updated_at: new Date().toISOString(),
      };

      let templateId = editId;
      if (editId) {
        await supabase.from("expense_report_templates").update(payload).eq("id", editId);
        await supabase.from("expense_report_template_items").delete().eq("template_id", editId);
      } else {
        const { data, error } = await supabase
          .from("expense_report_templates").insert(payload).select("id").single();
        if (error) throw error;
        templateId = data.id;
      }

      const validItems = tmplItems.filter((it) => it.description.trim());
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

      toast.success(editId ? "수정되었습니다" : "등록되었습니다");
      setTemplateDialogOpen(false);
      resetTemplateForm();
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
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("expense_report_template_items").delete().eq("template_id", id);
    await supabase.from("expense_report_templates").delete().eq("id", id);
    toast.success("삭제되었습니다");
    loadTemplates();
  };

  const addTmplItem = () => setTmplItems([...tmplItems, { description: "", amount: 0, payment_method: "법인카드", receipt_note: "" }]);
  const removeTmplItem = (idx: number) => setTmplItems(tmplItems.filter((_, i) => i !== idx));
  const updateTmplItem = (idx: number, field: string, val: any) =>
    setTmplItems(tmplItems.map((it, i) => (i === idx ? { ...it, [field]: val } : it)));

  const tmplTotalAmount = tmplItems.reduce((s, it) => s + Number(it.amount || 0), 0);

  // ─── Create Report (like ExpenseReport) ───
  const openCreateReport = (template?: any) => {
    if (template) {
      setTitle(template.title);
      setCategory(template.category);
      setDescription(template.description || "");
      const mapped = (template.expense_report_template_items || []).map((it: any) => ({
        item_date: new Date().toISOString().split("T")[0],
        description: it.description,
        amount: Number(it.amount),
        payment_method: it.payment_method || "법인카드",
        receipt_note: it.receipt_note || "",
        receipt_file: null,
      }));
      setItems(mapped.length > 0 ? mapped : [
        { item_date: new Date().toISOString().split("T")[0], description: "", amount: 0, payment_method: "법인카드", receipt_note: "", receipt_file: null },
      ]);
    } else {
      setTitle(""); setCategory("일반"); setDescription("");
      setItems([
        { item_date: new Date().toISOString().split("T")[0], description: "", amount: 0, payment_method: "법인카드", receipt_note: "", receipt_file: null },
      ]);
    }
    setRequestedDate(new Date().toISOString().split("T")[0]);
    setCreateDialog(true);
  };

  const addItem = () => setItems([...items, { item_date: new Date().toISOString().split("T")[0], description: "", amount: 0, payment_method: "법인카드", receipt_note: "", receipt_file: null }]);
  const removeItem = (idx: number) => { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)); };
  const updateItem = (idx: number, field: keyof ExpenseItem, val: any) =>
    setItems(items.map((it, i) => (i === idx ? { ...it, [field]: val } : it)));

  const totalAmount = items.reduce((s, it) => s + Number(it.amount || 0), 0);

  const uploadReceiptFile = async (file: File, reportId: string, itemIndex: number): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${tenantId}/${reportId}/${itemIndex}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("expense-receipts").upload(path, file, { upsert: true });
    if (error) { console.error("File upload error:", error); return null; }
    return `${SUPABASE_URL}/storage/v1/object/public/expense-receipts/${path}`;
  };

  const submitReport = async () => {
    if (!tenantId || !user) return;
    if (!title.trim()) { toast.error("제목을 입력해주세요."); return; }
    if (items.some(i => !i.description.trim() || !i.amount)) { toast.error("모든 항목의 내역과 금액을 입력해주세요."); return; }

    setSubmitting(true);
    try {
      const { data: report, error } = await supabase
        .from("expense_reports")
        .insert({
          tenant_id: tenantId,
          user_id: user.id,
          title: title.trim(),
          category,
          total_amount: totalAmount,
          requested_date: requestedDate,
          description: description.trim() || null,
          status: "pending",
        } as any)
        .select()
        .single();

      if (error || !report) throw error || new Error("생성 실패");

      const itemInserts = [];
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        let receiptFileUrl: string | null = null;
        if (item.receipt_file) {
          receiptFileUrl = await uploadReceiptFile(item.receipt_file, report.id, idx);
        }
        itemInserts.push({
          expense_report_id: report.id,
          item_date: item.item_date,
          description: item.description.trim(),
          amount: Number(item.amount),
          payment_method: item.payment_method,
          receipt_note: item.receipt_note.trim() || null,
          sort_order: idx,
          receipt_file_url: receiptFileUrl,
        });
      }

      const { error: itemErr } = await supabase.from("expense_report_items").insert(itemInserts as any);
      if (itemErr) throw itemErr;

      writeAuditLog({
        tenantId, userId: user.id, action: "create",
        entity: "expense_report", entityId: report.id,
        after: { title, category, totalAmount, type: "fixed" },
      });

      toast.success("고정 지출결의서가 제출되었습니다");
      setCreateDialog(false);
    } catch (err: any) {
      toast.error("제출 실패: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-8 pb-16 px-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarClock className="w-6 h-6 text-primary" />
              고정 지출결의서
            </h1>
          </div>
          <Button onClick={() => openCreateReport()} className="gap-1">
            <Plus className="w-4 h-4" /> 결의서 작성
          </Button>
        </div>

        {/* Approval Line Info */}
        {approvalLines.length > 0 && (
          <Card>
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2 text-sm">
                <UserCheck className="w-4 h-4 text-primary" />
                <span className="font-medium">결재라인:</span>
                {approvalLines.map((a, i) => (
                  <span key={a.user_id}>
                    <Badge variant="outline" className="text-xs">
                      {i + 1}차 {a.name} {a.job_title && `(${a.job_title})`}
                    </Badge>
                    {i < approvalLines.length - 1 && <span className="mx-1">→</span>}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {approvalLines.length === 0 && (
          <Card>
            <CardContent className="py-3 px-4">
              <p className="text-sm text-muted-foreground">
                결재라인이 등록되지 않았습니다. 관리자 설정에서 결재라인을 먼저 등록하세요.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Template Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">고정 지출 템플릿</CardTitle>
            <Button size="sm" onClick={openCreateTemplate} className="gap-1">
              <Plus className="w-4 h-4" /> 템플릿 등록
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              자주 사용하는 고정 지출 항목을 템플릿으로 등록하면, 결의서 작성 시 빠르게 불러올 수 있습니다.
            </p>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">등록된 고정 지출 템플릿이 없습니다</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>제목</TableHead>
                    <TableHead>분류</TableHead>
                    <TableHead>생성일</TableHead>
                    <TableHead className="text-right">예상 금액</TableHead>
                    <TableHead>활성</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.title}</TableCell>
                      <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
                      <TableCell>매월 {t.day_of_month}일</TableCell>
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
                          <Button size="sm" variant="outline" onClick={() => openCreateReport(t)} className="gap-1">
                            <Send className="w-3 h-3" /> 결의
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEditTemplate(t)}>
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
        </Card>
      </main>

      {/* Create/Edit Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "템플릿 수정" : "고정 지출 템플릿 등록"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>제목 *</Label>
                <Input value={tmplTitle} onChange={(e) => setTmplTitle(e.target.value)} placeholder="월간 교통비" />
              </div>
              <div>
                <Label>분류</Label>
                <Select value={tmplCategory} onValueChange={setTmplCategory}>
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
                <Label>비고</Label>
                <Input value={tmplDescription} onChange={(e) => setTmplDescription(e.target.value)} placeholder="매월 반복 생성됩니다" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">항목</Label>
                <Button size="sm" variant="outline" onClick={addTmplItem} className="gap-1">
                  <Plus className="w-3 h-3" /> 추가
                </Button>
              </div>
              <div className="space-y-2">
                {tmplItems.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <Input className="col-span-4" placeholder="내역" value={it.description}
                      onChange={(e) => updateTmplItem(idx, "description", e.target.value)} />
                    <Input className="col-span-2" type="number" placeholder="금액" value={it.amount || ""}
                      onChange={(e) => updateTmplItem(idx, "amount", Number(e.target.value))} />
                    <Select value={it.payment_method} onValueChange={(v) => updateTmplItem(idx, "payment_method", v)}>
                      <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input className="col-span-3" placeholder="비고" value={it.receipt_note}
                      onChange={(e) => updateTmplItem(idx, "receipt_note", e.target.value)} />
                    <Button size="icon" variant="ghost" className="col-span-1"
                      onClick={() => removeTmplItem(idx)} disabled={tmplItems.length <= 1}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="text-right text-sm font-semibold mt-2">
                예상 합계: {tmplTotalAmount.toLocaleString()}원
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>취소</Button>
            <Button onClick={handleSaveTemplate} disabled={saving} className="gap-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editId ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Report Dialog (like ExpenseReport) */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>고정 지출결의서 작성</DialogTitle>
            <DialogDescription>항목을 작성하고 증빙을 첨부한 후 결재를 요청하세요.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Approval line display */}
            {approvalLines.length > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 text-sm">
                <UserCheck className="w-4 h-4 text-primary" />
                <span className="font-medium">결재라인:</span>
                {approvalLines.map((a, i) => (
                  <span key={a.user_id}>
                    <Badge variant="outline" className="text-xs">
                      {i + 1}차 {a.name}
                    </Badge>
                    {i < approvalLines.length - 1 && <span className="mx-1">→</span>}
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>제목 *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="고정 지출 제목" />
              </div>
              <div>
                <Label>분류</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>지출요청일</Label>
                <Input type="date" value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>비고</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="설명 (선택)" rows={2} />
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">지출 항목</Label>
                <Button size="sm" variant="outline" onClick={addItem} className="gap-1">
                  <Plus className="w-3 h-3" /> 추가
                </Button>
              </div>
              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div key={idx} className="p-3 border rounded-md space-y-2">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <Input className="col-span-2" type="date" value={it.item_date}
                        onChange={(e) => updateItem(idx, "item_date", e.target.value)} />
                      <Input className="col-span-3" placeholder="내역" value={it.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)} />
                      <Input className="col-span-2" type="number" placeholder="금액" value={it.amount || ""}
                        onChange={(e) => updateItem(idx, "amount", Number(e.target.value))} />
                      <Select value={it.payment_method} onValueChange={(v) => updateItem(idx, "payment_method", v)}>
                        <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input className="col-span-2" placeholder="비고" value={it.receipt_note}
                        onChange={(e) => updateItem(idx, "receipt_note", e.target.value)} />
                      <Button size="icon" variant="ghost" className="col-span-1"
                        onClick={() => removeItem(idx)} disabled={items.length <= 1}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">증빙:</Label>
                      {it.receipt_file ? (
                        <Badge variant="outline" className="text-xs">{it.receipt_file.name}</Badge>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" asChild>
                          <label>
                            <Upload className="w-3 h-3" /> 파일 첨부
                            <input type="file" accept="image/*,.pdf" className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) updateItem(idx, "receipt_file", f);
                                e.target.value = "";
                              }} />
                          </label>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-right text-sm font-semibold mt-2">
                합계: {totalAmount.toLocaleString()}원
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>취소</Button>
            <Button onClick={submitReport} disabled={submitting} className="gap-1">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              결재 요청
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FixedExpenseTemplates;
