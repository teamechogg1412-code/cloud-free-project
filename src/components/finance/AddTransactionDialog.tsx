import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  onSaved: () => void;
  supabaseClient: any;
}

const CATEGORIES = [
  "식대", "교통비", "사무용품", "접대비", "출장비", "통신비", "기타",
];

export const AddTransactionDialog = ({ open, onOpenChange, cardId, onSaved, supabaseClient }: Props) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    transaction_date: new Date().toISOString().slice(0, 16),
    merchant_name: "",
    amount: "",
    category: "기타",
    memo: "",
  });

  const handleSave = async () => {
    if (!form.merchant_name.trim() || !form.amount) return;
    setSaving(true);
    try {
      const { error } = await supabaseClient.from("card_transactions").insert({
        card_id: cardId,
        transaction_date: new Date(form.transaction_date).toISOString(),
        merchant_name: form.merchant_name.trim(),
        amount: parseFloat(form.amount),
        category: form.category,
        memo: form.memo.trim() || null,
        status: "approved",
      });
      if (error) throw error;
      setForm({
        transaction_date: new Date().toISOString().slice(0, 16),
        merchant_name: "", amount: "", category: "기타", memo: "",
      });
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      console.error("Failed to save transaction:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>사용 내역 수동 등록</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>승인일시 *</Label>
            <Input
              type="datetime-local"
              value={form.transaction_date}
              onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>사용처 (가맹점명) *</Label>
            <Input
              value={form.merchant_name}
              onChange={(e) => setForm({ ...form, merchant_name: e.target.value })}
              placeholder="예: 스타벅스 강남점"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>금액 (원) *</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>카테고리</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>메모 (용도/프로젝트)</Label>
            <Textarea
              value={form.memo}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
              placeholder="예: 고객 미팅 식대"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving || !form.merchant_name.trim() || !form.amount} className="w-full gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            등록
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
