import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface Props {
  approvalLines: any[];
  memberId: string;
  tenantId: string;
  canEdit: boolean;
  onRefresh: () => void;
}

export const ApprovalLineTab = ({ approvalLines, memberId, tenantId, canEdit, onRefresh }: Props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [form, setForm] = useState({ approver_user_id: "", step_order: 1 });

  useEffect(() => {
    if (dialogOpen && tenantId) {
      supabase.from("tenant_memberships").select("user_id, job_title, profiles:user_id(full_name)").eq("tenant_id", tenantId)
        .then(({ data }) => setMembers(data || []));
    }
  }, [dialogOpen, tenantId]);

  const openCreate = () => {
    setForm({ approver_user_id: "", step_order: (approvalLines.length || 0) + 1 });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.approver_user_id) { toast.error("승인자를 선택해주세요."); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("approval_lines").insert({
        user_id: memberId, tenant_id: tenantId,
        approver_user_id: form.approver_user_id, step_order: form.step_order
      });
      if (error) throw error;
      toast.success("결제라인이 추가되었습니다.");
      setDialogOpen(false);
      onRefresh();
    } catch (e: any) {
      toast.error("저장 실패: " + e.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("approval_lines").delete().eq("id", id);
    if (error) toast.error("삭제 실패");
    else { toast.success("삭제 완료"); onRefresh(); }
  };

  return (
    <>
      <Card className="border-none shadow-md rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-black">설정된 개인 결제라인</CardTitle>
          {canEdit && <Button size="sm" onClick={openCreate} className="gap-1.5 font-bold text-xs"><Plus className="w-3.5 h-3.5" /> 추가</Button>}
        </CardHeader>
        <CardContent className="space-y-4">
          {approvalLines.map((line) => (
            <div key={line.id} className="flex items-center gap-5 p-5 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">{line.step_order}</div>
              <div className="flex-1">
                <p className="font-bold text-slate-800">{line.approver?.full_name}</p>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">Approval Step {line.step_order}</p>
              </div>
              <Badge variant="outline" className="text-xs">승인자</Badge>
              {canEdit && (
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>삭제하시겠습니까?</AlertDialogTitle><AlertDialogDescription>이 결제라인을 삭제합니다.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(line.id)}>삭제</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))}
          {approvalLines.length === 0 && <p className="text-center py-10 text-slate-400">결제라인이 설정되지 않았습니다.</p>}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>결제라인 추가</DialogTitle>
            <DialogDescription>승인자를 선택해주세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">승인자</Label>
              <Select value={form.approver_user_id} onValueChange={v => setForm({ ...form, approver_user_id: v })}>
                <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  {members.filter(m => m.user_id !== memberId).map(m => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.profiles?.full_name || m.user_id}
                      {m.job_title && <span className="text-muted-foreground ml-1">({m.job_title})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">단계</Label>
              <Input type="number" min={1} value={form.step_order} onChange={e => setForm({ ...form, step_order: parseInt(e.target.value) || 1 })} />
            </div>
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
