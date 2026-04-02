import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Calculator, Users, Briefcase, Plus, Trash2, Save, Loader2,
  FileText, CheckCircle, PenTool, BarChart3, Percent, Wallet,
  ArrowRight, DollarSign, TrendingUp, Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// ─── Types ───
interface Artist {
  id: string;
  name: string;
  stage_name: string | null;
}

interface Project {
  id: string;
  title: string;
  category: string;
  contract_amount: number | null;
  artist_id: string | null;
}

interface RevenueRate {
  id?: string;
  artist_id: string;
  category: string;
  artist_rate: number;
  company_rate: number;
  mgmt_fee_rate: number;
  tax_rate: number;
  notes: string;
}

interface Settlement {
  id: string;
  artist_id: string;
  settlement_period: string;
  total_revenue: number;
  artist_amount: number;
  company_amount: number;
  mgmt_fee: number;
  tax_amount: number;
  deductions: number;
  net_artist_amount: number;
  status: string;
  notes: string | null;
  created_at: string;
  items?: SettlementItem[];
  deduction_items?: DeductionItem[];
}

interface SettlementItem {
  id?: string;
  project_id: string | null;
  project_name: string;
  category: string;
  contract_amount: number;
  artist_rate: number;
  artist_amount: number;
  company_rate: number;
  company_amount: number;
  mgmt_fee_rate: number;
  mgmt_fee: number;
  tax_rate: number;
  tax_amount: number;
  sort_order: number;
}

interface DeductionItem {
  id?: string;
  description: string;
  amount: number;
  deduction_type: string;
  sort_order: number;
}

const CATEGORIES = ["드라마", "영화", "광고", "행사", "기타"];
const DEDUCTION_TYPES: Record<string, string> = {
  advance: "선급금",
  training: "교육비",
  costume: "의상비",
  transportation: "교통비",
  etc: "기타",
};

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "작성중", variant: "secondary" },
  confirmed: { label: "확정", variant: "default" },
  paid: { label: "지급완료", variant: "outline" },
};

const RevenueSettlement = () => {
  const { user, currentTenant } = useAuth();
  const tenantId = currentTenant?.tenant_id;

  const [artists, setArtists] = useState<Artist[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<string>("");
  const [rates, setRates] = useState<RevenueRate[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [rateDialog, setRateDialog] = useState(false);
  const [rateForm, setRateForm] = useState<RevenueRate>({
    artist_id: "",
    category: "드라마",
    artist_rate: 70,
    company_rate: 30,
    mgmt_fee_rate: 0,
    tax_rate: 3.3,
    notes: "",
  });
  const [editingRateId, setEditingRateId] = useState<string | null>(null);

  const [settlementDialog, setSettlementDialog] = useState(false);
  const [settlementPeriod, setSettlementPeriod] = useState(format(new Date(), "yyyy-MM"));
  const [settlementItems, setSettlementItems] = useState<SettlementItem[]>([]);
  const [deductionItems, setDeductionItems] = useState<DeductionItem[]>([]);
  const [settlementNotes, setSettlementNotes] = useState("");
  const [generatingSettlement, setGeneratingSettlement] = useState(false);

  const [detailDialog, setDetailDialog] = useState(false);
  const [detailSettlement, setDetailSettlement] = useState<Settlement | null>(null);

  // Fetch initial data
  useEffect(() => {
    if (!tenantId) return;
    const fetchData = async () => {
      setLoading(true);
      const [aRes, pRes] = await Promise.all([
        supabase.from("artists").select("id, name, stage_name").eq("tenant_id", tenantId).eq("is_active", true).order("name"),
        supabase.from("projects").select("id, title, category, contract_amount, artist_id").eq("tenant_id", tenantId).order("title"),
      ]);
      setArtists((aRes.data as any[]) || []);
      setProjects((pRes.data as any[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [tenantId]);

  // Fetch rates & settlements when artist selected
  useEffect(() => {
    if (!tenantId || !selectedArtist) return;
    const fetchArtistData = async () => {
      const [rRes, sRes] = await Promise.all([
        supabase.from("artist_revenue_rates").select("*").eq("tenant_id", tenantId).eq("artist_id", selectedArtist),
        supabase.from("revenue_settlements").select("*").eq("tenant_id", tenantId).eq("artist_id", selectedArtist).order("settlement_period", { ascending: false }),
      ]);
      setRates((rRes.data as any[]) || []);
      setSettlements((sRes.data as any[]) || []);
    };
    fetchArtistData();
  }, [tenantId, selectedArtist]);

  // ─── Rate Management ───
  const openAddRate = () => {
    setRateForm({
      artist_id: selectedArtist,
      category: "드라마",
      artist_rate: 70,
      company_rate: 30,
      mgmt_fee_rate: 0,
      tax_rate: 3.3,
      notes: "",
    });
    setEditingRateId(null);
    setRateDialog(true);
  };

  const openEditRate = (rate: RevenueRate) => {
    setRateForm({ ...rate });
    setEditingRateId(rate.id || null);
    setRateDialog(true);
  };

  const saveRate = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        artist_id: selectedArtist,
        category: rateForm.category,
        artist_rate: rateForm.artist_rate,
        company_rate: rateForm.company_rate,
        mgmt_fee_rate: rateForm.mgmt_fee_rate,
        tax_rate: rateForm.tax_rate,
        notes: rateForm.notes || null,
        updated_at: new Date().toISOString(),
      };

      if (editingRateId) {
        const { error } = await supabase.from("artist_revenue_rates").update(payload).eq("id", editingRateId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("artist_revenue_rates").upsert(payload, { onConflict: "tenant_id,artist_id,category" });
        if (error) throw error;
      }
      toast.success("배분 비율이 저장되었습니다.");
      setRateDialog(false);
      // Refresh
      const { data } = await supabase.from("artist_revenue_rates").select("*").eq("tenant_id", tenantId).eq("artist_id", selectedArtist);
      setRates((data as any[]) || []);
    } catch (e: any) {
      toast.error("저장 실패: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteRate = async (id: string) => {
    if (!confirm("이 배분 비율을 삭제하시겠습니까?")) return;
    await supabase.from("artist_revenue_rates").delete().eq("id", id);
    setRates(rates.filter((r) => r.id !== id));
    toast.success("삭제되었습니다.");
  };

  // ─── Settlement Generation ───
  const openSettlementDialog = () => {
    setSettlementItems([]);
    setDeductionItems([]);
    setSettlementNotes("");
    setSettlementPeriod(format(new Date(), "yyyy-MM"));
    setSettlementDialog(true);
  };

  const generateSettlement = async () => {
    if (!tenantId || !selectedArtist) return;
    setGeneratingSettlement(true);

    try {
      // Get projects for this artist
      const artistProjects = projects.filter((p) => p.artist_id === selectedArtist);

      // Get rates for this artist
      const rateMap = new Map(rates.map((r) => [r.category, r]));

      const items: SettlementItem[] = artistProjects
        .filter((p) => (p.contract_amount || 0) > 0)
        .map((p, i) => {
          const rate = rateMap.get(p.category) || {
            artist_rate: 70,
            company_rate: 30,
            mgmt_fee_rate: 0,
            tax_rate: 3.3,
          };
          const contractAmt = p.contract_amount || 0;
          const artistAmt = Math.round(contractAmt * rate.artist_rate / 100);
          const companyAmt = Math.round(contractAmt * rate.company_rate / 100);
          const mgmtFee = Math.round(contractAmt * rate.mgmt_fee_rate / 100);
          const taxAmt = Math.round(artistAmt * rate.tax_rate / 100);

          return {
            project_id: p.id,
            project_name: p.title,
            category: p.category,
            contract_amount: contractAmt,
            artist_rate: rate.artist_rate,
            artist_amount: artistAmt,
            company_rate: rate.company_rate,
            company_amount: companyAmt,
            mgmt_fee_rate: rate.mgmt_fee_rate,
            mgmt_fee: mgmtFee,
            tax_rate: rate.tax_rate,
            tax_amount: taxAmt,
            sort_order: i,
          };
        });

      setSettlementItems(items);
      if (items.length === 0) {
        toast.info("해당 아티스트에 배정된 프로젝트가 없거나 계약금이 등록되지 않았습니다.");
      }
    } catch (e: any) {
      toast.error("생성 실패: " + e.message);
    } finally {
      setGeneratingSettlement(false);
    }
  };

  const addManualItem = () => {
    setSettlementItems([
      ...settlementItems,
      {
        project_id: null,
        project_name: "",
        category: "드라마",
        contract_amount: 0,
        artist_rate: 70,
        artist_amount: 0,
        company_rate: 30,
        company_amount: 0,
        mgmt_fee_rate: 0,
        mgmt_fee: 0,
        tax_rate: 3.3,
        tax_amount: 0,
        sort_order: settlementItems.length,
      },
    ]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...settlementItems];
    const item = { ...updated[index], [field]: value };

    // Auto-recalculate when amounts or rates change
    if (["contract_amount", "artist_rate", "company_rate", "mgmt_fee_rate", "tax_rate"].includes(field)) {
      item.artist_amount = Math.round(item.contract_amount * item.artist_rate / 100);
      item.company_amount = Math.round(item.contract_amount * item.company_rate / 100);
      item.mgmt_fee = Math.round(item.contract_amount * item.mgmt_fee_rate / 100);
      item.tax_amount = Math.round(item.artist_amount * item.tax_rate / 100);
    }

    updated[index] = item;
    setSettlementItems(updated);
  };

  const removeItem = (index: number) => {
    setSettlementItems(settlementItems.filter((_, i) => i !== index));
  };

  const addDeduction = () => {
    setDeductionItems([
      ...deductionItems,
      { description: "", amount: 0, deduction_type: "etc", sort_order: deductionItems.length },
    ]);
  };

  const updateDeduction = (index: number, field: string, value: any) => {
    const updated = [...deductionItems];
    updated[index] = { ...updated[index], [field]: value };
    setDeductionItems(updated);
  };

  const removeDeduction = (index: number) => {
    setDeductionItems(deductionItems.filter((_, i) => i !== index));
  };

  // Totals
  const totalRevenue = settlementItems.reduce((s, i) => s + i.contract_amount, 0);
  const totalArtistAmount = settlementItems.reduce((s, i) => s + i.artist_amount, 0);
  const totalCompanyAmount = settlementItems.reduce((s, i) => s + i.company_amount, 0);
  const totalMgmtFee = settlementItems.reduce((s, i) => s + i.mgmt_fee, 0);
  const totalTax = settlementItems.reduce((s, i) => s + i.tax_amount, 0);
  const totalDeductions = deductionItems.reduce((s, i) => s + i.amount, 0);
  const netArtistAmount = totalArtistAmount - totalTax - totalDeductions;

  const saveSettlement = async () => {
    if (!tenantId || !selectedArtist || settlementItems.length === 0) {
      toast.error("정산 항목을 추가해주세요.");
      return;
    }
    setSaving(true);
    try {
      const { data: settlement, error } = await supabase
        .from("revenue_settlements")
        .insert({
          tenant_id: tenantId,
          artist_id: selectedArtist,
          settlement_period: settlementPeriod,
          total_revenue: totalRevenue,
          artist_amount: totalArtistAmount,
          company_amount: totalCompanyAmount,
          mgmt_fee: totalMgmtFee,
          tax_amount: totalTax,
          deductions: totalDeductions,
          net_artist_amount: netArtistAmount,
          status: "draft",
          notes: settlementNotes || null,
          created_by: user?.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Insert items
      if (settlementItems.length > 0) {
        const { error: itemErr } = await supabase.from("revenue_settlement_items").insert(
          settlementItems.map((item) => ({
            settlement_id: settlement.id,
            ...item,
          }))
        );
        if (itemErr) throw itemErr;
      }

      // Insert deductions
      if (deductionItems.length > 0) {
        const { error: dedErr } = await supabase.from("revenue_settlement_deductions").insert(
          deductionItems.filter((d) => d.amount > 0).map((d) => ({
            settlement_id: settlement.id,
            ...d,
          }))
        );
        if (dedErr) throw dedErr;
      }

      toast.success("수익정산서가 저장되었습니다.");
      setSettlementDialog(false);

      // Refresh
      const { data: sData } = await supabase.from("revenue_settlements").select("*").eq("tenant_id", tenantId).eq("artist_id", selectedArtist).order("settlement_period", { ascending: false });
      setSettlements((sData as any[]) || []);
    } catch (e: any) {
      toast.error("저장 실패: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // View settlement detail
  const viewSettlement = async (s: Settlement) => {
    const [itemsRes, dedRes] = await Promise.all([
      supabase.from("revenue_settlement_items").select("*").eq("settlement_id", s.id).order("sort_order"),
      supabase.from("revenue_settlement_deductions").select("*").eq("settlement_id", s.id).order("sort_order"),
    ]);
    setDetailSettlement({
      ...s,
      items: (itemsRes.data as any[]) || [],
      deduction_items: (dedRes.data as any[]) || [],
    });
    setDetailDialog(true);
  };

  const confirmSettlement = async (id: string) => {
    await supabase.from("revenue_settlements").update({ status: "confirmed", confirmed_at: new Date().toISOString(), confirmed_by: user?.id }).eq("id", id);
    setSettlements(settlements.map((s) => (s.id === id ? { ...s, status: "confirmed" } : s)));
    if (detailSettlement?.id === id) setDetailSettlement({ ...detailSettlement, status: "confirmed" });
    toast.success("정산서가 확정되었습니다.");
    // 텔레그램 알림
    invokeEdgeFunction("telegram-alerts", { body: { action: "settlement_confirmed", settlement_id: id } }).catch(() => {});
  };

  const markPaid = async (id: string) => {
    await supabase.from("revenue_settlements").update({ status: "paid" }).eq("id", id);
    setSettlements(settlements.map((s) => (s.id === id ? { ...s, status: "paid" } : s)));
    if (detailSettlement?.id === id) setDetailSettlement({ ...detailSettlement, status: "paid" });
    toast.success("지급 완료 처리되었습니다.");
  };

  const fmt = (n: number) => n.toLocaleString("ko-KR");
  const artistName = (id: string) => {
    const a = artists.find((a) => a.id === id);
    return a ? (a.stage_name || a.name) : "-";
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" /> 수익정산 관리
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            아티스트별 수익 배분 비율 관리 및 정산서 생성
          </p>
        </div>
      </div>

      {/* Artist Selector */}
      <Card className="border-none shadow-lg rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Users className="w-5 h-5 text-primary" />
            <div className="flex-1 max-w-sm">
              <Select value={selectedArtist} onValueChange={setSelectedArtist}>
                <SelectTrigger>
                  <SelectValue placeholder="아티스트 선택" />
                </SelectTrigger>
                <SelectContent>
                  {artists.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} {a.stage_name ? `(${a.stage_name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {artists.length === 0 && (
              <p className="text-sm text-muted-foreground">등록된 아티스트가 없습니다.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedArtist && (
        <Tabs defaultValue="rates" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="rates" className="gap-1.5">
              <Percent className="w-3.5 h-3.5" /> 배분 비율
            </TabsTrigger>
            <TabsTrigger value="settlements" className="gap-1.5">
              <Receipt className="w-3.5 h-3.5" /> 정산 내역
            </TabsTrigger>
          </TabsList>

          {/* ─── 배분 비율 탭 ─── */}
          <TabsContent value="rates" className="space-y-4">
            <Card className="border-none shadow-lg rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Percent className="w-4 h-4 text-primary" /> 카테고리별 기본 배분 비율
                  </CardTitle>
                  <Button size="sm" onClick={openAddRate}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> 비율 추가
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  카테고리(드라마, 광고 등)별로 배우/회사 배분 비율, 매니지먼트 수수료, 원천징수 세율을 설정합니다.
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                {rates.length === 0 ? (
                  <div className="text-center py-8">
                    <Percent className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">등록된 배분 비율이 없습니다.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>카테고리</TableHead>
                          <TableHead className="text-right">배우 비율</TableHead>
                          <TableHead className="text-right">회사 비율</TableHead>
                          <TableHead className="text-right">수수료</TableHead>
                          <TableHead className="text-right">원천징수</TableHead>
                          <TableHead className="text-right">비고</TableHead>
                          <TableHead className="w-20"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rates.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <Badge variant="outline">{r.category}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium text-primary">{r.artist_rate}%</TableCell>
                            <TableCell className="text-right">{r.company_rate}%</TableCell>
                            <TableCell className="text-right">{r.mgmt_fee_rate}%</TableCell>
                            <TableCell className="text-right">{r.tax_rate}%</TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground truncate max-w-[120px]">{r.notes || "-"}</TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-end">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditRate(r)}>
                                  <PenTool className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRate(r.id!)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── 정산 내역 탭 ─── */}
          <TabsContent value="settlements" className="space-y-4">
            <Card className="border-none shadow-lg rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-primary" /> 수익정산서 목록
                  </CardTitle>
                  <Button size="sm" onClick={openSettlementDialog}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> 정산서 생성
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {settlements.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">생성된 정산서가 없습니다.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>정산 기간</TableHead>
                          <TableHead className="text-right">총 수익</TableHead>
                          <TableHead className="text-right">배우 몫</TableHead>
                          <TableHead className="text-right">세금</TableHead>
                          <TableHead className="text-right">공제</TableHead>
                          <TableHead className="text-right">순 수령액</TableHead>
                          <TableHead>상태</TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {settlements.map((s) => {
                          const st = STATUS_MAP[s.status] || STATUS_MAP.draft;
                          return (
                            <TableRow key={s.id} className="cursor-pointer hover:bg-accent/50" onClick={() => viewSettlement(s)}>
                              <TableCell className="font-medium">{s.settlement_period}</TableCell>
                              <TableCell className="text-right">₩{fmt(s.total_revenue)}</TableCell>
                              <TableCell className="text-right text-primary font-medium">₩{fmt(s.artist_amount)}</TableCell>
                              <TableCell className="text-right text-muted-foreground">₩{fmt(s.tax_amount)}</TableCell>
                              <TableCell className="text-right text-muted-foreground">₩{fmt(s.deductions)}</TableCell>
                              <TableCell className="text-right font-bold">₩{fmt(s.net_artist_amount)}</TableCell>
                              <TableCell>
                                <Badge variant={st.variant}>{st.label}</Badge>
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* ─── Rate Dialog ─── */}
      <Dialog open={rateDialog} onOpenChange={setRateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRateId ? "배분 비율 수정" : "배분 비율 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">카테고리</Label>
              <Select value={rateForm.category} onValueChange={(v) => setRateForm({ ...rateForm, category: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">배우 비율 (%)</Label>
                <Input type="number" value={rateForm.artist_rate} onChange={(e) => {
                  const v = Number(e.target.value);
                  setRateForm({ ...rateForm, artist_rate: v, company_rate: 100 - v });
                }} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">회사 비율 (%)</Label>
                <Input type="number" value={rateForm.company_rate} onChange={(e) => {
                  const v = Number(e.target.value);
                  setRateForm({ ...rateForm, company_rate: v, artist_rate: 100 - v });
                }} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">매니지먼트 수수료 (%)</Label>
                <Input type="number" value={rateForm.mgmt_fee_rate} onChange={(e) => setRateForm({ ...rateForm, mgmt_fee_rate: Number(e.target.value) })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">원천징수 세율 (%)</Label>
                <Input type="number" step="0.1" value={rateForm.tax_rate} onChange={(e) => setRateForm({ ...rateForm, tax_rate: Number(e.target.value) })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">비고</Label>
              <Input value={rateForm.notes} onChange={(e) => setRateForm({ ...rateForm, notes: e.target.value })} className="mt-1" placeholder="추가 참고사항" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRateDialog(false)}>취소</Button>
            <Button onClick={saveRate} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Settlement Create Dialog ─── */}
      <Dialog open={settlementDialog} onOpenChange={setSettlementDialog}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" /> 수익정산서 생성 — {artistName(selectedArtist)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Period + Generate */}
            <div className="flex items-end gap-3">
              <div>
                <Label className="text-xs">정산 기간</Label>
                <Input type="month" value={settlementPeriod} onChange={(e) => setSettlementPeriod(e.target.value)} className="mt-1 w-48" />
              </div>
              <Button variant="outline" size="sm" onClick={generateSettlement} disabled={generatingSettlement}>
                {generatingSettlement ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5 mr-1" />}
                프로젝트 자동 연동
              </Button>
              <Button variant="outline" size="sm" onClick={addManualItem}>
                <Plus className="w-3.5 h-3.5 mr-1" /> 수동 추가
              </Button>
            </div>

            {/* Items Table */}
            {settlementItems.length > 0 && (
              <div className="overflow-x-auto border rounded-xl">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">프로젝트</TableHead>
                      <TableHead className="w-20">카테고리</TableHead>
                      <TableHead className="text-right w-28">계약금</TableHead>
                      <TableHead className="text-right w-16">배우%</TableHead>
                      <TableHead className="text-right w-28">배우 몫</TableHead>
                      <TableHead className="text-right w-16">세율%</TableHead>
                      <TableHead className="text-right w-28">세금</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlementItems.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Input
                            value={item.project_name}
                            onChange={(e) => updateItem(i, "project_name", e.target.value)}
                            className="h-8 text-sm"
                            placeholder="프로젝트명"
                          />
                        </TableCell>
                        <TableCell>
                          <Select value={item.category} onValueChange={(v) => updateItem(i, "category", v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.contract_amount || ""}
                            onChange={(e) => updateItem(i, "contract_amount", Number(e.target.value))}
                            className="h-8 text-sm text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.artist_rate}
                            onChange={(e) => updateItem(i, "artist_rate", Number(e.target.value))}
                            className="h-8 text-sm text-right w-16"
                          />
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium text-primary">
                          ₩{fmt(item.artist_amount)}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            value={item.tax_rate}
                            onChange={(e) => updateItem(i, "tax_rate", Number(e.target.value))}
                            className="h-8 text-sm text-right w-16"
                          />
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          ₩{fmt(item.tax_amount)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(i)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Deductions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" /> 공제 항목
                </h3>
                <Button variant="outline" size="sm" onClick={addDeduction}>
                  <Plus className="w-3 h-3 mr-1" /> 공제 추가
                </Button>
              </div>
              {deductionItems.length > 0 && (
                <div className="space-y-2">
                  {deductionItems.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Select value={d.deduction_type} onValueChange={(v) => updateDeduction(i, "deduction_type", v)}>
                        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(DEDUCTION_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input
                        value={d.description}
                        onChange={(e) => updateDeduction(i, "description", e.target.value)}
                        className="h-8 text-sm flex-1"
                        placeholder="설명"
                      />
                      <Input
                        type="number"
                        value={d.amount || ""}
                        onChange={(e) => updateDeduction(i, "amount", Number(e.target.value))}
                        className="h-8 text-sm text-right w-32"
                        placeholder="금액"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeDeduction(i)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            {settlementItems.length > 0 && (
              <div className="p-4 rounded-xl bg-muted/50 border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">총 수익 (계약금 합계)</span>
                  <span className="font-medium">₩{fmt(totalRevenue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">배우 몫</span>
                  <span className="font-medium text-primary">₩{fmt(totalArtistAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">회사 몫</span>
                  <span>₩{fmt(totalCompanyAmount)}</span>
                </div>
                {totalMgmtFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">매니지먼트 수수료</span>
                    <span>₩{fmt(totalMgmtFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">원천징수 세금</span>
                  <span className="text-destructive">-₩{fmt(totalTax)}</span>
                </div>
                {totalDeductions > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">공제 합계</span>
                    <span className="text-destructive">-₩{fmt(totalDeductions)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>순 수령액</span>
                  <span className="text-primary">₩{fmt(netArtistAmount)}</span>
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs">비고</Label>
              <Textarea value={settlementNotes} onChange={(e) => setSettlementNotes(e.target.value)} className="mt-1" rows={2} placeholder="정산 관련 참고사항" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSettlementDialog(false)}>취소</Button>
            <Button onClick={saveSettlement} disabled={saving || settlementItems.length === 0}>
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              정산서 저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Settlement Detail Dialog ─── */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          {detailSettlement && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  수익정산서 — {artistName(detailSettlement.artist_id)} ({detailSettlement.settlement_period})
                  <Badge variant={STATUS_MAP[detailSettlement.status]?.variant || "secondary"} className="ml-2">
                    {STATUS_MAP[detailSettlement.status]?.label || detailSettlement.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Items */}
                {detailSettlement.items && detailSettlement.items.length > 0 && (
                  <div className="overflow-x-auto border rounded-xl">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>프로젝트</TableHead>
                          <TableHead>카테고리</TableHead>
                          <TableHead className="text-right">계약금</TableHead>
                          <TableHead className="text-right">배우%</TableHead>
                          <TableHead className="text-right">배우 몫</TableHead>
                          <TableHead className="text-right">세금</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailSettlement.items.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.project_name}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{item.category}</Badge></TableCell>
                            <TableCell className="text-right">₩{fmt(item.contract_amount)}</TableCell>
                            <TableCell className="text-right">{item.artist_rate}%</TableCell>
                            <TableCell className="text-right text-primary font-medium">₩{fmt(item.artist_amount)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">₩{fmt(item.tax_amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Deductions */}
                {detailSettlement.deduction_items && detailSettlement.deduction_items.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">공제 항목</h3>
                    <div className="space-y-1">
                      {detailSettlement.deduction_items.map((d: any) => (
                        <div key={d.id} className="flex justify-between text-sm py-1.5 border-b border-border/50">
                          <span className="text-muted-foreground">
                            <Badge variant="outline" className="text-[10px] mr-2">{DEDUCTION_TYPES[d.deduction_type] || d.deduction_type}</Badge>
                            {d.description}
                          </span>
                          <span className="text-destructive">-₩{fmt(d.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="p-4 rounded-xl bg-muted/50 border space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">총 수익</span><span>₩{fmt(detailSettlement.total_revenue)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">배우 몫</span><span className="text-primary">₩{fmt(detailSettlement.artist_amount)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">회사 몫</span><span>₩{fmt(detailSettlement.company_amount)}</span></div>
                  {detailSettlement.mgmt_fee > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">수수료</span><span>₩{fmt(detailSettlement.mgmt_fee)}</span></div>}
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">세금</span><span className="text-destructive">-₩{fmt(detailSettlement.tax_amount)}</span></div>
                  {detailSettlement.deductions > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">공제</span><span className="text-destructive">-₩{fmt(detailSettlement.deductions)}</span></div>}
                  <Separator />
                  <div className="flex justify-between text-base font-bold"><span>순 수령액</span><span className="text-primary">₩{fmt(detailSettlement.net_artist_amount)}</span></div>
                </div>

                {detailSettlement.notes && (
                  <div className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/30">
                    <strong>비고:</strong> {detailSettlement.notes}
                  </div>
                )}
              </div>

              <DialogFooter>
                {detailSettlement.status === "draft" && (
                  <Button onClick={() => confirmSettlement(detailSettlement.id)}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> 확정
                  </Button>
                )}
                {detailSettlement.status === "confirmed" && (
                  <Button onClick={() => markPaid(detailSettlement.id)}>
                    <DollarSign className="w-3.5 h-3.5 mr-1" /> 지급 완료
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setDetailDialog(false)}>닫기</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RevenueSettlement;
