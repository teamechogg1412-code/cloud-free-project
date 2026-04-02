import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit2, Trash2, BookOpen, ArrowLeft, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

const REGULATION_CATEGORIES = [
  "인사관리", "급여관리", "복무관리", "상벌관리",
  "출장여비관리", "위임전결 규정", "취업규칙", "보안관리", "기타",
];

interface Regulation {
  id: string;
  category: string;
  title: string;
  content: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const RegulationManagement = () => {
  const navigate = useNavigate();
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form
  const [form, setForm] = useState({
    category: "인사관리",
    title: "",
    content: "",
    sort_order: 0,
    is_active: true,
  });
  const [previewContent, setPreviewContent] = useState("");

  const fetchRegulations = async () => {
    const { data, error } = await supabase
      .from("standard_regulations")
      .select("*")
      .order("category")
      .order("sort_order");
    if (error) { console.error(error); toast.error("규정 목록을 불러오지 못했습니다."); }
    else setRegulations(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRegulations(); }, []);

  const resetForm = () => {
    setForm({ category: "인사관리", title: "", content: "", sort_order: 0, is_active: true });
    setEditingId(null);
  };

  const openCreate = () => { resetForm(); setIsFormOpen(true); };
  const openEdit = (r: Regulation) => {
    setForm({ category: r.category, title: r.title, content: r.content, sort_order: r.sort_order, is_active: r.is_active });
    setEditingId(r.id);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) { toast.error("제목과 내용을 입력해주세요."); return; }
    if (editingId) {
      const { error } = await supabase.from("standard_regulations").update({ ...form, updated_at: new Date().toISOString() }).eq("id", editingId);
      if (error) toast.error("수정 실패: " + error.message);
      else toast.success("규정이 수정되었습니다.");
    } else {
      const { error } = await supabase.from("standard_regulations").insert(form as any);
      if (error) toast.error("등록 실패: " + error.message);
      else toast.success("규정이 등록되었습니다.");
    }
    setIsFormOpen(false);
    resetForm();
    fetchRegulations();
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from("standard_regulations").delete().eq("id", deletingId);
    if (error) toast.error("삭제 실패");
    else { toast.success("삭제되었습니다."); fetchRegulations(); }
    setIsDeleteOpen(false);
  };

  const openPreview = (r: Regulation) => {
    // Preview with sample company name
    setPreviewContent(r.content.replace(/\{\{회사명\}\}/g, "주식회사 샘플엔터테인먼트"));
    setIsPreviewOpen(true);
  };

  const filtered = regulations.filter((r) => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) || r.content.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === "all" || r.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const grouped = filtered.reduce<Record<string, Regulation[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate("/super-admin")}><ArrowLeft className="w-5 h-5" /></Button>
        <BookOpen className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-black text-slate-900">표준 규정 관리</h1>
          <p className="text-sm text-slate-500">
            모든 고객사에 적용되는 표준 규정을 관리합니다. 본문에 <code className="bg-slate-200 px-1 rounded text-xs font-mono">{`{{회사명}}`}</code>을 입력하면 각 회사 조회 시 자동 치환됩니다.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="규정 검색..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 카테고리</SelectItem>
            {REGULATION_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={openCreate} className="ml-auto"><Plus className="w-4 h-4 mr-1" /> 규정 등록</Button>
      </div>

      {/* Table grouped by category */}
      {loading ? (
        <p className="text-center text-slate-400 py-20">로딩 중...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <Card className="text-center py-20 text-slate-400">
          <CardContent>등록된 규정이 없습니다. 새 규정을 등록해주세요.</CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="mb-8">
            <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Badge variant="secondary">{cat}</Badge>
              <span className="text-slate-400">{items.length}건</span>
            </h3>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">순서</TableHead>
                    <TableHead>제목</TableHead>
                    <TableHead className="w-20">상태</TableHead>
                    <TableHead className="w-32 text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-slate-500">{r.sort_order}</TableCell>
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell>
                        <Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "활성" : "비활성"}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => openPreview(r)}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Edit2 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => { setDeletingId(r.id); setIsDeleteOpen(true); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        ))
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "규정 수정" : "새 규정 등록"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">카테고리</label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REGULATION_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">정렬 순서</label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">제목</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="예: 인사관리 규정" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                내용 <span className="text-xs text-slate-400">(회사명 자리에 <code className="bg-slate-100 px-1 rounded font-mono">{`{{회사명}}`}</code> 입력)</span>
              </label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={18}
                placeholder={`제 1 조 (목적)\n당 규정은 {{회사명}}(이하 "회사"라 한다)의 인사행정의 기본 기준을 명시하여...`}
                className="font-mono text-sm leading-relaxed"
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              <label htmlFor="is_active" className="text-sm">활성 상태</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>취소</Button>
            <Button onClick={handleSave}>{editingId ? "수정" : "등록"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>미리보기 (샘플 회사명 치환)</DialogTitle>
          </DialogHeader>
          <div className="whitespace-pre-wrap font-serif text-sm leading-relaxed bg-white border rounded-lg p-6">
            {previewContent}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>규정을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RegulationManagement;
