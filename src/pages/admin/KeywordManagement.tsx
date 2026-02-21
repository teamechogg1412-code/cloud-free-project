import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Hash, Plus, Search, Loader2, Save, Edit2, Trash2, AlertCircle, Tags, ArrowUpDown
} from "lucide-react";

interface Keyword {
  id: string;
  tenant_id: string;
  keyword: string;
  category: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
}

const categoryOptions = ["브랜드", "제품", "이벤트", "인물", "기타"];

const KeywordManagement = () => {
  const { currentTenant, isCompanyAdmin, isSuperAdmin } = useAuth();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentKeyword, setCurrentKeyword] = useState<Keyword | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    keyword: "",
    category: "",
    priority: 0,
    is_active: true,
  });

  const fetchKeywords = async () => {
    if (!currentTenant) return;
    setLoading(true);

    let query = supabase
      .from("keywords")
      .select("*")
      .eq("tenant_id", currentTenant.tenant_id)
      .order("priority", { ascending: false });

    if (searchQuery) {
      query = query.ilike("keyword", `%${searchQuery}%`);
    }
    if (filterCategory && filterCategory !== "ALL") {
      query = query.eq("category", filterCategory);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("키워드를 불러오는 데 실패했습니다.");
    } else {
      setKeywords(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchKeywords();
  }, [currentTenant, searchQuery, filterCategory]);

  const handleSave = async () => {
    if (!formData.keyword || !currentTenant) {
      toast.error("키워드는 필수 입력 항목입니다.");
      return;
    }
    setIsSaving(true);

    try {
      const payload = {
        tenant_id: currentTenant.tenant_id,
        keyword: formData.keyword,
        category: formData.category || null,
        priority: formData.priority,
        is_active: formData.is_active,
      };

      if (currentKeyword) {
        const { error } = await supabase
          .from("keywords")
          .update(payload)
          .eq("id", currentKeyword.id);
        if (error) throw error;
        toast.success("키워드가 수정되었습니다.");
      } else {
        const { error } = await supabase
          .from("keywords")
          .insert(payload);
        if (error) throw error;
        toast.success("키워드가 등록되었습니다.");
      }
      setIsSheetOpen(false);
      fetchKeywords();
    } catch (error: any) {
      toast.error(`저장 실패: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentKeyword) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("keywords")
        .delete()
        .eq("id", currentKeyword.id);
      if (error) throw error;
      toast.success("키워드가 삭제되었습니다.");
      setIsDeleteDialogOpen(false);
      fetchKeywords();
    } catch (error: any) {
      toast.error(`삭제 실패: ${error.message}`);
    } finally {
      setIsSaving(false);
      setCurrentKeyword(null);
    }
  };

  const handleNewKeyword = () => {
    setCurrentKeyword(null);
    setFormData({ keyword: "", category: "", priority: 0, is_active: true });
    setIsSheetOpen(true);
  };

  const handleEditKeyword = (kw: Keyword) => {
    setCurrentKeyword(kw);
    setFormData({
      keyword: kw.keyword,
      category: kw.category || "",
      priority: kw.priority,
      is_active: kw.is_active,
    });
    setIsSheetOpen(true);
  };

  if (!isCompanyAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-muted-foreground font-medium">접근 권한이 없습니다.</p>
          <Button onClick={() => window.history.back()} variant="outline">뒤로 가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-24 pb-16 px-4 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Tags className="w-8 h-8 text-primary" /> 키워드 관리
            </h1>
            <p className="text-muted-foreground mt-1">
              {isSuperAdmin ? "전체 회사" : currentTenant?.tenant.name}의 모니터링 키워드를 관리합니다.
            </p>
          </div>
          <Button variant="hero" className="gap-2" size="lg" onClick={handleNewKeyword}>
            <Plus className="w-5 h-5" /> 키워드 추가
          </Button>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="glass-card shadow-sm border-primary/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">전체 키워드</p>
                <Hash className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-bold mt-2">{keywords.length}개</div>
            </CardContent>
          </Card>
          <Card className="glass-card shadow-sm border-green-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">활성 키워드</p>
                <Tags className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold mt-2">{keywords.filter(k => k.is_active).length}개</div>
            </CardContent>
          </Card>
          <Card className="glass-card shadow-sm border-amber-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">비활성 키워드</p>
                <ArrowUpDown className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold mt-2">{keywords.filter(k => !k.is_active).length}개</div>
            </CardContent>
          </Card>
        </div>

        {/* 필터/검색 */}
        <Card className="glass-card shadow-sm border border-border mb-8">
          <CardContent className="pt-4 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="키워드 검색"
                className="pl-9 bg-secondary/50 border-none h-10 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select onValueChange={setFilterCategory} value={filterCategory}>
              <SelectTrigger className="w-full sm:w-[150px] bg-secondary/50 border-none h-10">
                <SelectValue placeholder="카테고리 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체</SelectItem>
                {categoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setSearchQuery(""); setFilterCategory(""); }}>
              초기화
            </Button>
          </CardContent>
        </Card>

        {/* 테이블 */}
        <div className="glass-card overflow-hidden shadow-sm border border-border">
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow>
                <TableHead className="w-[250px]">키워드</TableHead>
                <TableHead>카테고리</TableHead>
                <TableHead className="text-center">우선순위</TableHead>
                <TableHead className="text-center">상태</TableHead>
                <TableHead className="text-right w-[100px]">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : keywords.length > 0 ? (
                keywords.map((kw) => (
                  <TableRow key={kw.id} className="hover:bg-secondary/30 transition-colors">
                    <TableCell className="font-semibold">{kw.keyword}</TableCell>
                    <TableCell>
                      {kw.category ? (
                        <Badge variant="outline">{kw.category}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{kw.priority}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={kw.is_active ? "default" : "secondary"}>
                        {kw.is_active ? "활성" : "비활성"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleEditKeyword(kw)}>
                        <Edit2 className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => { setCurrentKeyword(kw); setIsDeleteDialogOpen(true); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">등록된 키워드가 없습니다.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* 추가/수정 Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-md p-0 overflow-hidden flex flex-col">
          <SheetHeader className="p-6 border-b">
            <SheetTitle className="text-xl font-bold flex items-center gap-2">
              <Tags className="w-5 h-5 text-primary" />
              {currentKeyword ? "키워드 수정" : "새 키워드 등록"}
            </SheetTitle>
          </SheetHeader>
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label htmlFor="keyword">키워드 *</Label>
              <Input
                id="keyword"
                placeholder="예: 삼성전자, 갤럭시"
                value={formData.keyword}
                onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">카테고리</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">선택 안 함</SelectItem>
                  {categoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">우선순위 (높을수록 먼저 표시)</Label>
              <Input
                id="priority"
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">활성 상태</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <SheetFooter className="p-6 border-t">
            <SheetClose asChild>
              <Button variant="outline" disabled={isSaving}>취소</Button>
            </SheetClose>
            <Button onClick={handleSave} disabled={isSaving || !formData.keyword}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {currentKeyword ? "수정 완료" : "등록"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* 삭제 확인 Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive font-bold text-xl">키워드를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              "{currentKeyword?.keyword}" 키워드가 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSaving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default KeywordManagement;
