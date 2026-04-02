import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Search, ChevronRight } from "lucide-react";

const REGULATION_CATEGORIES = [
  "인사관리", "급여관리", "복무관리", "상벌관리",
  "출장여비관리", "위임전결 규정", "취업규칙", "보안관리", "기타",
];

interface DisplayRegulation {
  id: string;
  category: string;
  title: string;
  content: string;
  sort_order: number;
  source: "standard" | "custom";
}

const RegulationViewer = () => {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.tenant_id;
  const companyName = currentTenant?.tenant?.name || "회사";

  const [regulations, setRegulations] = useState<DisplayRegulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selected, setSelected] = useState<DisplayRegulation | null>(null);
  const [openingDate, setOpeningDate] = useState("");

  useEffect(() => {
    const fetchRegulations = async () => {
      if (!tenantId) {
        const { data } = await supabase
          .from("standard_regulations")
          .select("id, category, title, content, sort_order")
          .eq("is_active", true)
          .order("category")
          .order("sort_order");
        setRegulations((data || []).map(r => ({ ...r, source: "standard" as const })));
        setLoading(false);
        return;
      }

      // 개업일 조회
      const { data: tenantData } = await supabase.from("tenants").select("opening_date").eq("id", tenantId).single();
      if (tenantData?.opening_date) {
        const d = new Date(tenantData.opening_date);
        setOpeningDate(`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`);
      }

      // 테넌트 규정 설정 조회
      const { data: tenantRegs } = await supabase
        .from("tenant_regulations")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true);

      if (!tenantRegs || tenantRegs.length === 0) {
        // 설정된 규정이 없으면 빈 목록
        setRegulations([]);
        setLoading(false);
        return;
      }

      // 표준 규정 ID 목록
      const stdIds = tenantRegs
        .filter((tr: any) => tr.use_standard && tr.standard_regulation_id)
        .map((tr: any) => tr.standard_regulation_id);

      let standardMap: Record<string, any> = {};
      if (stdIds.length > 0) {
        const { data: stds } = await supabase
          .from("standard_regulations")
          .select("*")
          .in("id", stdIds);
        (stds || []).forEach((s: any) => { standardMap[s.id] = s; });
      }

      // 최종 표시 목록 조합
      const display: DisplayRegulation[] = [];
      tenantRegs.forEach((tr: any) => {
        if (tr.use_standard && tr.standard_regulation_id && standardMap[tr.standard_regulation_id]) {
          const std = standardMap[tr.standard_regulation_id];
          display.push({
            id: tr.id,
            category: std.category,
            title: std.title,
            content: std.content,
            sort_order: tr.sort_order ?? std.sort_order,
            source: "standard",
          });
        } else if (!tr.use_standard && tr.custom_title) {
          display.push({
            id: tr.id,
            category: tr.category,
            title: tr.custom_title,
            content: tr.custom_content || "",
            sort_order: tr.sort_order ?? 0,
            source: "custom",
          });
        }
      });

      display.sort((a, b) => a.category.localeCompare(b.category) || a.sort_order - b.sort_order);
      setRegulations(display);
      setLoading(false);
    };

    fetchRegulations();
  }, [tenantId]);

  const replacePlaceholders = (text: string) => 
    text.replace(/\{\{회사명\}\}/g, companyName).replace(/\{\{개업일\}\}/g, openingDate || "0000년 0월 0일");

  const filtered = regulations.filter((r) => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || r.category === filterCategory;
    return matchSearch && matchCat;
  });

  const grouped = filtered.reduce<Record<string, DisplayRegulation[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <BookOpen className="w-7 h-7 text-primary" />
        <h1 className="text-2xl font-black text-foreground">{companyName} 규정집</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">회사의 주요 규정을 확인할 수 있습니다.</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="규정 검색..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 카테고리</SelectItem>
            {REGULATION_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-20">로딩 중...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <Card className="text-center py-20">
          <CardContent className="text-muted-foreground">
            {tenantId ? "관리자가 아직 규정을 설정하지 않았습니다. 관리시스템에서 규정을 가져오거나 등록해주세요." : "등록된 규정이 없습니다."}
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="mb-6">
            <h3 className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-2">
              <Badge variant="outline">{cat}</Badge>
              <span className="text-xs">{items.length}건</span>
            </h3>
            <div className="space-y-1">
              {items.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors text-left group"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {replacePlaceholders(r.title)}
                    </span>
                    {r.source === "custom" && <Badge variant="secondary" className="text-xs">자체</Badge>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="secondary">{selected?.category}</Badge>
              {selected ? replacePlaceholders(selected.title) : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="whitespace-pre-wrap font-serif text-sm leading-[1.9] bg-muted/50 border rounded-lg p-6 mt-2">
            {selected ? replacePlaceholders(selected.content) : ""}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RegulationViewer;
