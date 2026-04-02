import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ArrowLeft, Landmark, Plus, Loader2, Pencil, Trash2, Building2
} from "lucide-react";

interface BankPreset {
  id: string;
  label: string;
  bank_name_en: string;
  swift_code: string;
  branch_name_en: string;
  bank_address_en: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const EMPTY_FORM = {
  label: "",
  bank_name_en: "",
  swift_code: "",
  branch_name_en: "Head Office",
  bank_address_en: "",
  sort_order: 0,
  is_active: true,
};

const BankPresets = () => {
  const navigate = useNavigate();
  const [presets, setPresets] = useState<BankPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchPresets = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("bank_presets")
      .select("*")
      .order("sort_order")
      .order("label");
    if (error) {
      toast.error("은행 정보를 불러오지 못했습니다.");
      console.error(error);
    }
    setPresets(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPresets(); }, []);

  const openCreateDialog = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, sort_order: presets.length });
    setDialogOpen(true);
  };

  const openEditDialog = (preset: BankPreset) => {
    setEditingId(preset.id);
    setForm({
      label: preset.label,
      bank_name_en: preset.bank_name_en,
      swift_code: preset.swift_code,
      branch_name_en: preset.branch_name_en,
      bank_address_en: preset.bank_address_en,
      sort_order: preset.sort_order,
      is_active: preset.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.label.trim() || !form.bank_name_en.trim()) {
      toast.error("은행 한글명과 영문명은 필수입니다.");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await (supabase as any)
          .from("bank_presets")
          .update(form)
          .eq("id", editingId);
        if (error) throw error;
        toast.success("수정되었습니다.");
      } else {
        const { error } = await (supabase as any)
          .from("bank_presets")
          .insert([form]);
        if (error) throw error;
        toast.success("등록되었습니다.");
      }
      setDialogOpen(false);
      fetchPresets();
    } catch (e: any) {
      toast.error("저장 실패: " + e.message);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const { error } = await (supabase as any)
        .from("bank_presets")
        .delete()
        .eq("id", deletingId);
      if (error) throw error;
      toast.success("삭제되었습니다.");
      setDeleteDialogOpen(false);
      fetchPresets();
    } catch (e: any) {
      toast.error("삭제 실패: " + e.message);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setForm(prev => ({ ...prev, [id]: value }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => navigate("/super-admin")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Super Admin으로 돌아가기
          </button>

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Landmark className="w-7 h-7 text-primary" /> 은행 정보 관리
              </h1>
              <p className="text-muted-foreground mt-1">
                인보이스에 사용될 은행 프리셋을 등록·관리합니다. 고객사 등록 시 여기서 등록된 은행을 선택할 수 있습니다.
              </p>
            </div>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="w-4 h-4" /> 은행 추가
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : presets.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>등록된 은행 프리셋이 없습니다.</p>
                <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
                  첫 은행 등록하기
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[50px] text-xs">순서</TableHead>
                      <TableHead className="text-xs">은행명 (한글)</TableHead>
                      <TableHead className="text-xs">Bank Name (EN)</TableHead>
                      <TableHead className="text-xs">SWIFT Code</TableHead>
                      <TableHead className="text-xs">Branch</TableHead>
                      <TableHead className="text-xs">상태</TableHead>
                      <TableHead className="w-[100px] text-xs text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {presets.map((preset) => (
                      <TableRow key={preset.id} className="group">
                        <TableCell className="text-xs text-muted-foreground">{preset.sort_order}</TableCell>
                        <TableCell className="font-medium text-sm">{preset.label}</TableCell>
                        <TableCell className="text-sm">{preset.bank_name_en}</TableCell>
                        <TableCell>
                          {preset.swift_code ? (
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{preset.swift_code}</code>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{preset.branch_name_en || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={preset.is_active ? "default" : "secondary"} className="text-[10px]">
                            {preset.is_active ? "활성" : "비활성"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(preset)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => { setDeletingId(preset.id); setDeleteDialogOpen(true); }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* 등록/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-primary" />
              {editingId ? "은행 정보 수정" : "새 은행 등록"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="label">은행명 (한글) *</Label>
                <Input id="label" value={form.label} onChange={handleChange} placeholder="KB국민은행" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_name_en">Bank Name (EN) *</Label>
                <Input id="bank_name_en" value={form.bank_name_en} onChange={handleChange} placeholder="Kookmin Bank" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="swift_code">SWIFT Code</Label>
                <Input id="swift_code" value={form.swift_code} onChange={handleChange} placeholder="CZNBKRSE" className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch_name_en">Branch Name</Label>
                <Input id="branch_name_en" value={form.branch_name_en} onChange={handleChange} placeholder="Head Office" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_address_en">Bank Address</Label>
              <Input id="bank_address_en" value={form.bank_address_en} onChange={handleChange} placeholder="84, Namdaemun-ro, Jung-gu, Seoul, Korea" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sort_order">정렬 순서</Label>
                <Input id="sort_order" type="number" value={form.sort_order} onChange={(e) => setForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">활성 상태</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>은행 프리셋 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 은행 정보를 삭제하시겠습니까? 이미 등록된 고객사 데이터에는 영향을 주지 않습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BankPresets;
