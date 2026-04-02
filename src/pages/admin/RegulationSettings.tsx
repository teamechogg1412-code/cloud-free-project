import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, BookOpen, Download, PenTool, Eye, Check, Plus, Edit2, Trash2 } from "lucide-react";

const REGULATION_CATEGORIES = [
  "인사관리", "급여관리", "복무관리", "상벌관리",
  "출장여비관리", "위임전결 규정", "취업규칙", "보안관리", "기타",
];

interface StandardRegulation {
  id: string;
  category: string;
  title: string;
  content: string;
  sort_order: number;
  is_active: boolean;
}

interface TenantRegulation {
  id: string;
  tenant_id: string;
  category: string;
  use_standard: boolean;
  custom_title: string | null;
  custom_content: string | null;
  standard_regulation_id: string | null;
  sort_order: number;
  is_active: boolean;
}

const RegulationSettings = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.tenant_id;
  const companyName = currentTenant?.tenant?.name || "회사";

  const [standardRegs, setStandardRegs] = useState<StandardRegulation[]>([]);
  const [tenantRegs, setTenantRegs] = useState<TenantRegulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("인사관리");
  const [openingDate, setOpeningDate] = useState("");

  // Dialog states
  const [isCustomFormOpen, setIsCustomFormOpen] = useState(false);
  const [editingCustom, setEditingCustom] = useState<TenantRegulation | null>(null);
  const [customForm, setCustomForm] = useState({ title: "", content: "", sort_order: 0 });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState({ title: "", content: "" });

  const fetchData = async () => {
    if (!tenantId) return;
    const [stdRes, tenantRes, tenantInfo] = await Promise.all([
      supabase.from("standard_regulations").select("*").eq("is_active", true).order("category").order("sort_order"),
      supabase.from("tenant_regulations").select("*").eq("tenant_id", tenantId),
      supabase.from("tenants").select("opening_date").eq("id", tenantId).single(),
    ]);
    setStandardRegs(stdRes.data || []);
    setTenantRegs(tenantRes.data || []);
    if (tenantInfo.data?.opening_date) {
      const d = new Date(tenantInfo.data.opening_date);
      setOpeningDate(`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tenantId]);

  const replacePlaceholders = (text: string) => 
    text.replace(/\{\{회사명\}\}/g, companyName).replace(/\{\{개업일\}\}/g, openingDate || "0000년 0월 0일");

  // 해당 카테고리의 표준 규정 목록
  const categoryStandards = standardRegs.filter(r => r.category === activeCategory);

  // 해당 카테고리의 테넌트 규정 설정
  const categoryTenantRegs = tenantRegs.filter(r => r.category === activeCategory);

  // 표준 규정이 이미 복사(사용) 설정 되었는지 확인
  const isStandardImported = (stdId: string) =>
    categoryTenantRegs.some(tr => tr.standard_regulation_id === stdId && tr.use_standard);

  // 자체 규정만 (use_standard === false)
  const customRegs = categoryTenantRegs.filter(tr => !tr.use_standard);

  // 표준 규정을 전체 복사(import)
  const importStandard = async (std: StandardRegulation) => {
    if (!tenantId) return;
    if (isStandardImported(std.id)) {
      toast.info("이미 사용 중인 표준 규정입니다.");
      return;
    }
    const { error } = await supabase.from("tenant_regulations").insert({
      tenant_id: tenantId,
      category: std.category,
      use_standard: true,
      standard_regulation_id: std.id,
      custom_title: null,
      custom_content: null,
      sort_order: std.sort_order,
      is_active: true,
    } as any);
    if (error) toast.error("가져오기 실패: " + error.message);
    else { toast.success(`"${std.title}" 표준 규정을 사용합니다.`); fetchData(); }
  };

  // 카테고리의 모든 표준 규정 일괄 복사
  const importAllStandards = async () => {
    if (!tenantId) return;
    const toImport = categoryStandards.filter(s => !isStandardImported(s.id));
    if (toImport.length === 0) { toast.info("모든 표준 규정이 이미 사용 중입니다."); return; }
    const rows = toImport.map(std => ({
      tenant_id: tenantId,
      category: std.category,
      use_standard: true,
      standard_regulation_id: std.id,
      sort_order: std.sort_order,
      is_active: true,
    }));
    const { error } = await supabase.from("tenant_regulations").insert(rows as any);
    if (error) toast.error("일괄 가져오기 실패");
    else { toast.success(`${toImport.length}건의 표준 규정을 가져왔습니다.`); fetchData(); }
  };

  // 사용 해제
  const removeImported = async (trId: string) => {
    const { error } = await supabase.from("tenant_regulations").delete().eq("id", trId);
    if (error) toast.error("삭제 실패");
    else { toast.success("사용 해제되었습니다."); fetchData(); }
  };

  // 자체 규정 추가/수정
  const openCustomForm = (existing?: TenantRegulation) => {
    if (existing) {
      setEditingCustom(existing);
      setCustomForm({ title: existing.custom_title || "", content: existing.custom_content || "", sort_order: existing.sort_order });
    } else {
      setEditingCustom(null);
      setCustomForm({ title: "", content: "", sort_order: 0 });
    }
    setIsCustomFormOpen(true);
  };

  const saveCustom = async () => {
    if (!tenantId || !customForm.title.trim() || !customForm.content.trim()) {
      toast.error("제목과 내용을 입력해주세요.");
      return;
    }
    const payload = {
      tenant_id: tenantId,
      category: activeCategory,
      use_standard: false,
      custom_title: customForm.title,
      custom_content: customForm.content,
      sort_order: customForm.sort_order,
      is_active: true,
    };
    if (editingCustom) {
      const { error } = await supabase.from("tenant_regulations").update({ ...payload, updated_at: new Date().toISOString() } as any).eq("id", editingCustom.id);
      if (error) toast.error("수정 실패");
      else toast.success("자체 규정이 수정되었습니다.");
    } else {
      const { error } = await supabase.from("tenant_regulations").insert(payload as any);
      if (error) toast.error("등록 실패");
      else toast.success("자체 규정이 등록되었습니다.");
    }
    setIsCustomFormOpen(false);
    fetchData();
  };

  const openPreview = (title: string, content: string) => {
    setPreviewData({ title: replacePlaceholders(title), content: replacePlaceholders(content) });
    setPreviewOpen(true);
  };

  // 해당 카테고리에서 표준 규정을 사용 중인 것들
  const importedStandards = categoryTenantRegs.filter(tr => tr.use_standard);

  if (loading) return <div className="p-10 text-center text-muted-foreground">로딩 중...</div>;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <BookOpen className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-black text-foreground">{companyName} 규정 관리</h1>
          <p className="text-sm text-muted-foreground">표준 규정을 가져오거나, 자체 규정을 등록할 수 있습니다.</p>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mt-6">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {REGULATION_CATEGORIES.map(cat => (
            <TabsTrigger key={cat} value={cat} className="text-xs">{cat}</TabsTrigger>
          ))}
        </TabsList>

        {REGULATION_CATEGORIES.map(cat => (
          <TabsContent key={cat} value={cat} className="mt-6 space-y-6">
            {/* 1. 표준 규정 섹션 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Download className="w-4 h-4" /> 표준 규정 (슈퍼어드민 등록)
                  </CardTitle>
                  {categoryStandards.length > 0 && (
                    <Button size="sm" variant="outline" onClick={importAllStandards}>
                      전체 가져오기
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {categoryStandards.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">이 카테고리에 등록된 표준 규정이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {categoryStandards.map(std => {
                      const imported = importedStandards.find(tr => tr.standard_regulation_id === std.id);
                      return (
                        <div key={std.id} className="flex items-center justify-between px-4 py-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                          <div className="flex items-center gap-3">
                            {imported && <Check className="w-4 h-4 text-green-600" />}
                            <span className="font-medium text-sm">{replacePlaceholders(std.title)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={() => openPreview(std.title, std.content)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            {imported ? (
                              <Button size="sm" variant="outline" className="text-destructive" onClick={() => removeImported(imported.id)}>
                                사용 해제
                              </Button>
                            ) : (
                              <Button size="sm" onClick={() => importStandard(std)}>
                                <Download className="w-4 h-4 mr-1" /> 가져오기
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. 자체 규정 섹션 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PenTool className="w-4 h-4" /> 자체 규정
                  </CardTitle>
                  <Button size="sm" onClick={() => openCustomForm()}>
                    <Plus className="w-4 h-4 mr-1" /> 자체 규정 추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {customRegs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">등록된 자체 규정이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {customRegs.map(cr => (
                      <div key={cr.id} className="flex items-center justify-between px-4 py-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                        <span className="font-medium text-sm">{cr.custom_title}</span>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openPreview(cr.custom_title || "", cr.custom_content || "")}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openCustomForm(cr)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeImported(cr.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Custom Regulation Form Dialog */}
      <Dialog open={isCustomFormOpen} onOpenChange={setIsCustomFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustom ? "자체 규정 수정" : "자체 규정 등록"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">카테고리</label>
                <Input value={activeCategory} disabled />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">정렬 순서</label>
                <Input type="number" value={customForm.sort_order} onChange={e => setCustomForm({ ...customForm, sort_order: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">제목</label>
              <Input value={customForm.title} onChange={e => setCustomForm({ ...customForm, title: e.target.value })} placeholder="예: 사내 보안 규정" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">내용</label>
              <Textarea
                value={customForm.content}
                onChange={e => setCustomForm({ ...customForm, content: e.target.value })}
                rows={16}
                placeholder="규정 내용을 입력하세요..."
                className="font-mono text-sm leading-relaxed"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomFormOpen(false)}>취소</Button>
            <Button onClick={saveCustom}>{editingCustom ? "수정" : "등록"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewData.title}</DialogTitle>
          </DialogHeader>
          <div className="whitespace-pre-wrap font-serif text-sm leading-[1.9] bg-muted/50 border rounded-lg p-6 mt-2">
            {previewData.content}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RegulationSettings;
