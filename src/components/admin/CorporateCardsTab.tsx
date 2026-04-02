import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface Props {
  cards: any[];
  memberId: string;
  tenantId: string;
  memberName: string;
  canEdit: boolean;
  onRefresh: () => void;
}

const maskCardNumber = (num: string) => {
  if (num.length <= 4) return num;
  return "●●●● ●●●● ●●●● " + num.slice(-4);
};

export const CorporateCardsTab = ({ cards, memberId, tenantId, memberName, canEdit, onRefresh }: Props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ card_name: "", card_number: "", card_company: "", expiry_date: "", is_active: true });

  const openCreate = () => {
    setEditing(null);
    setForm({ card_name: "", card_number: "", card_company: "", expiry_date: "", is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({ card_name: c.card_name || "", card_number: c.card_number || "", card_company: c.card_company || "", expiry_date: c.expiry_date || "", is_active: c.is_active ?? true });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.card_number) { toast.error("카드번호를 입력해주세요."); return; }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("corporate_cards").update(form).eq("id", editing.id);
        if (error) throw error;
        toast.success("법인카드가 수정되었습니다.");
      } else {
        const { error } = await supabase.from("corporate_cards").insert({ ...form, holder_user_id: memberId, tenant_id: tenantId });
        if (error) throw error;
        toast.success("법인카드가 등록되었습니다.");
      }
      setDialogOpen(false);
      onRefresh();
    } catch (e: any) {
      toast.error("저장 실패: " + e.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("corporate_cards").delete().eq("id", id);
    if (error) toast.error("삭제 실패");
    else { toast.success("삭제 완료"); onRefresh(); }
  };

  return (
    <>
      {canEdit && (
        <div className="flex justify-end mb-4">
          <Button size="sm" onClick={openCreate} className="gap-1.5 font-bold text-xs"><Plus className="w-3.5 h-3.5" /> 카드 추가</Button>
        </div>
      )}
      <div className="grid gap-6 sm:grid-cols-2">
        {cards.map((card) => (
          <Card key={card.id} className="border-none shadow-lg bg-slate-900 text-white rounded-3xl overflow-hidden relative group">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">{card.card_company || "CORPORATE CARD"}</p>
                  <h4 className="text-lg font-bold">{card.card_name}</h4>
                </div>
                <Badge className={card.is_active ? "bg-blue-600" : "bg-slate-700"}>{card.is_active ? "사용중" : "정지"}</Badge>
              </div>
              <p className="text-2xl font-mono tracking-[0.2em] mb-4 text-center">{maskCardNumber(card.card_number)}</p>
              <div className="flex justify-between items-end opacity-60">
                <p className="text-xs font-bold">{memberName}</p>
                <p className="text-[10px] font-mono">{card.expiry_date || "00/00"}</p>
              </div>
              {canEdit && (
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full" onClick={(e) => { e.stopPropagation(); openEdit(card); }}><Pencil className="w-3 h-3" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon" className="h-7 w-7 rounded-full" onClick={e => e.stopPropagation()}><Trash2 className="w-3 h-3" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>삭제하시겠습니까?</AlertDialogTitle><AlertDialogDescription>이 법인카드를 삭제합니다.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(card.id)}>삭제</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {cards.length === 0 && <p className="col-span-full text-center py-20 text-slate-400">배정된 법인카드가 없습니다.</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "법인카드 수정" : "법인카드 추가"}</DialogTitle>
            <DialogDescription>법인카드 정보를 입력해주세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label className="text-xs font-bold">카드명</Label><Input value={form.card_name} onChange={e => setForm({ ...form, card_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-bold">카드번호</Label><Input value={form.card_number} onChange={e => setForm({ ...form, card_number: e.target.value })} placeholder="0000-0000-0000-0000" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-bold">카드사</Label><Input value={form.card_company} onChange={e => setForm({ ...form, card_company: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-bold">유효기간</Label><Input value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} placeholder="MM/YY" /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label className="text-xs">{form.is_active ? "사용중" : "정지"}</Label>
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
