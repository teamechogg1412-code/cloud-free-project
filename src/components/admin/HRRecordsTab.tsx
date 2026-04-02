import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { writeAuditLog } from "@/lib/auditLog";

const recordTypeLabel: Record<string, string> = {
  promotion: "승진", transfer: "부서이동", role_change: "역할변경",
  note: "메모", join: "입사", leave: "퇴사", hire: "신규채용"
};

const recordTypes = ["promotion", "transfer", "role_change", "note", "join", "leave", "hire"];

interface Props {
  records: any[];
  memberId: string;
  tenantId: string;
  canEdit: boolean;
  onRefresh: () => void;
}

export const HRRecordsTab = ({ records, memberId, tenantId, canEdit, onRefresh }: Props) => {
  const { user, profile: authProfile } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ record_type: "note", title: "", description: "", effective_date: "" });

  const openCreate = () => {
    setEditing(null);
    setForm({ record_type: "note", title: "", description: "", effective_date: new Date().toISOString().split("T")[0] });
    setDialogOpen(true);
  };

  const openEdit = (r: any) => {
    setEditing(r);
    setForm({ record_type: r.record_type, title: r.title, description: r.description || "", effective_date: r.effective_date || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) { toast.error("제목을 입력해주세요."); return; }
    setSaving(true);
    try {
      if (editing) {
        const before = { record_type: editing.record_type, title: editing.title, description: editing.description, effective_date: editing.effective_date };
        const { error } = await supabase.from("hr_records").update(form).eq("id", editing.id);
        if (error) throw error;
        writeAuditLog({ tenantId, userId: user?.id || "", userName: authProfile?.full_name || "", action: "update", entity: "hr_records", entityId: editing.id, before, after: form });
        toast.success("인사기록이 수정되었습니다.");
      } else {
        const { data, error } = await supabase.from("hr_records").insert({ ...form, user_id: memberId, tenant_id: tenantId }).select("id").single();
        if (error) throw error;
        writeAuditLog({ tenantId, userId: user?.id || "", userName: authProfile?.full_name || "", action: "create", entity: "hr_records", entityId: data?.id, after: form });
        toast.success("인사기록이 등록되었습니다.");
      }
      setDialogOpen(false);
      onRefresh();
    } catch (e: any) {
      toast.error("저장 실패: " + e.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const record = records.find(r => r.id === id);
    const { error } = await supabase.from("hr_records").delete().eq("id", id);
    if (error) toast.error("삭제 실패");
    else {
      writeAuditLog({ tenantId, userId: user?.id || "", userName: authProfile?.full_name || "", action: "delete", entity: "hr_records", entityId: id, before: record });
      toast.success("삭제 완료"); onRefresh();
    }
  };

  return (
    <>
      <Card className="border-none shadow-md rounded-2xl overflow-hidden">
        {canEdit && (
          <div className="flex justify-end p-4 pb-0">
            <Button size="sm" onClick={openCreate} className="gap-1.5 font-bold text-xs"><Plus className="w-3.5 h-3.5" /> 기록 추가</Button>
          </div>
        )}
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-24 text-[10px] font-black uppercase">유형</TableHead>
              <TableHead className="text-[10px] font-black uppercase">제목</TableHead>
              <TableHead className="w-32 text-[10px] font-black uppercase">발효일</TableHead>
              {canEdit && <TableHead className="w-20 text-[10px] font-black uppercase text-right">관리</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id}>
                <TableCell><Badge variant="outline" className="text-[10px]">{recordTypeLabel[r.record_type] || r.record_type}</Badge></TableCell>
                <TableCell className="font-bold text-slate-700">{r.title}</TableCell>
                <TableCell className="text-xs text-slate-400 font-mono">{r.effective_date}</TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>삭제하시겠습니까?</AlertDialogTitle><AlertDialogDescription>이 인사기록을 영구 삭제합니다.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(r.id)}>삭제</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {records.length === 0 && <TableRow><TableCell colSpan={canEdit ? 4 : 3} className="text-center py-20 text-slate-400">인사 기록이 존재하지 않습니다.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "인사기록 수정" : "인사기록 추가"}</DialogTitle>
            <DialogDescription>인사기록 정보를 입력해주세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">유형</Label>
              <Select value={form.record_type} onValueChange={v => setForm({ ...form, record_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{recordTypes.map(t => <SelectItem key={t} value={t}>{recordTypeLabel[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs font-bold">제목</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-bold">설명</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-bold">발효일</Label><Input type="date" value={form.effective_date} onChange={e => setForm({ ...form, effective_date: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="animate-spin w-4 h-4" /> : "저장"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
