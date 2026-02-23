import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/landing/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CreditCard, Calendar, ArrowLeft, Receipt, Store,
  TrendingUp, AlertCircle, Loader2, Download, Plus, FileText, RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AddTransactionDialog } from "@/components/finance/AddTransactionDialog";
import { ExpenseReportDialog } from "@/components/finance/ExpenseReportDialog";
import { toast } from "sonner";

const CARD_COMPANY_TO_CODE: Record<string, string> = {
  "국민카드": "0301", "현대카드": "0302", "삼성카드": "0303", "신한카드": "0304",
  "롯데카드": "0305", "BC카드": "0306", "하나카드": "0307", "우리카드": "0308",
};

interface MyCard {
  id: string;
  card_number: string;
  card_name: string | null;
  card_company: string | null;
  monthly_limit: number | null;
  expiry_date: string | null;
}

interface Transaction {
  id: string;
  transaction_date: string;
  merchant_name: string | null;
  amount: number;
  category: string | null;
  status: string | null;
  receipt_url: string | null;
  memo: string | null;
}

const MyCardExpenses = () => {
  const { user, currentTenant } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<MyCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentMonthSpend, setCurrentMonthSpend] = useState(0);

  // 수동 등록 다이얼로그
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // 체크박스 선택 & 청구서
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    const fetchMyCards = async () => {
      if (!user || !currentTenant) return;
      try {
        const { data, error } = await supabase
          .from("corporate_cards")
          .select("*")
          .eq("tenant_id", currentTenant.tenant_id)
          .eq("holder_user_id", user.id)
          .eq("is_active", true);
        if (error) throw error;
        if (data && data.length > 0) {
          setCards(data);
          setSelectedCardId(data[0].id);
        }
      } catch (error) {
        console.error("Error fetching cards:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMyCards();
  }, [user, currentTenant]);

  const fetchTransactions = async () => {
    if (!selectedCardId) return;
    const { data, error } = await supabase
      .from("card_transactions")
      .select("*")
      .eq("card_id", selectedCardId)
      .order("transaction_date", { ascending: false });

    if (!error && data) {
      setTransactions(data);
      const now = new Date();
      const thisMonthTotal = data
        .filter(t => {
          const tDate = new Date(t.transaction_date);
          return tDate.getMonth() === now.getMonth() &&
            tDate.getFullYear() === now.getFullYear() &&
            t.status !== "cancelled";
        })
        .reduce((sum, t) => sum + Number(t.amount), 0);
      setCurrentMonthSpend(thisMonthTotal);
    }
    setSelectedIds(new Set());
  };

  useEffect(() => {
    fetchTransactions();
  }, [selectedCardId]);

  const selectedCard = cards.find(c => c.id === selectedCardId);
  const limitPercentage = selectedCard?.monthly_limit
    ? Math.min((currentMonthSpend / selectedCard.monthly_limit) * 100, 100)
    : 0;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" }).format(amount);

  const maskCardNumber = (num: string) => {
    if (num.length < 8) return num;
    return num.slice(0, 4) + "-****-****-" + num.slice(-4);
  };

  // 체크박스 핸들러
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map(t => t.id)));
    }
  };

  const selectedTransactions = transactions.filter(t => selectedIds.has(t.id));

  const handleOpenReport = () => {
    if (selectedTransactions.length === 0) {
      toast.warning("청구서에 포함할 내역을 선택해주세요.");
      return;
    }
    setReportOpen(true);
  };

  // CODEF API로 카드 사용내역 동기화
  const handleSyncFromCodef = async () => {
    if (!selectedCard || !currentTenant) return;

    const orgCode = CARD_COMPANY_TO_CODE[selectedCard.card_company || ""];
    if (!orgCode) {
      toast.error("카드사 코드를 찾을 수 없습니다: " + selectedCard.card_company);
      return;
    }

    setSyncing(true);
    try {
      // 1. tenant_api_configs에서 Connected ID + CODEF 인증정보 조회
      const connectedIdKey = `CONNECTED_ID_CD_${orgCode}`;
      const { data: configs } = await supabase
        .from("tenant_api_configs")
        .select("config_key, config_value")
        .eq("tenant_id", currentTenant.tenant_id)
        .in("config_key", [connectedIdKey, "CODEF_CLIENT_ID", "CODEF_CLIENT_SECRET"]);

      const configMap: Record<string, string> = {};
      (configs || []).forEach((c: any) => { configMap[c.config_key] = c.config_value; });

      if (!configMap[connectedIdKey]) {
        toast.error(`${selectedCard.card_company} 연동 ID가 없습니다. 금융 연동 마스터에서 먼저 카드사 연동을 해주세요.`);
        return;
      }
      if (!configMap["CODEF_CLIENT_ID"] || !configMap["CODEF_CLIENT_SECRET"]) {
        toast.error("CODEF API 설정(CLIENT_ID, CLIENT_SECRET)이 누락되었습니다.");
        return;
      }

      // 2. 최근 3개월 기간 설정
      const now = new Date();
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const startDate = format(threeMonthsAgo, "yyyyMMdd");
      const endDate = format(now, "yyyyMMdd");

      // 3. Cloud 에지 함수 직접 호출 (외부 Supabase 우회)
      const cloudUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/codef-card-sync`;
      const response = await fetch(cloudUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          clientId: configMap["CODEF_CLIENT_ID"],
          clientSecret: configMap["CODEF_CLIENT_SECRET"],
          connectedId: configMap[connectedIdKey],
          organization: orgCode,
          startDate,
          endDate,
          orderBy: "0",
          inquiryType: "1",
          memberStoreInfoType: "3",
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "CODEF API 호출 실패");
      if (data?.result?.code !== "CF-00000") {
        throw new Error(data?.result?.message || "CODEF API 오류");
      }

      // 4. 결과를 card_transactions에 저장
      const resList = Array.isArray(data?.data) ? data.data : (data?.data?.resTrHistoryList || data?.data?.resApprovalList || []);
      if (resList.length === 0) {
        toast.info("조회된 카드 사용 내역이 없습니다.");
        return;
      }

      let insertCount = 0;
      for (const item of resList) {
        const txDate = item.resUsedDate || item.resTranDate || item.resApprovalDate || "";
        const txTime = item.resUsedTime || item.resApprovalTime || "";
        const dateStr = txDate
          ? `${txDate.slice(0, 4)}-${txDate.slice(4, 6)}-${txDate.slice(6, 8)}T${txTime.slice(0, 2) || "00"}:${txTime.slice(2, 4) || "00"}:00`
          : new Date().toISOString();

        const amount = Math.abs(Number(item.resUsedAmount || item.resTranAmount || item.resApprovalAmount || 0));
        const merchantName = item.resMemberStoreName || item.resStoreName || item.resStoreBizNo || "알 수 없음";

        // 중복 체크
        const { data: existing } = await supabase
          .from("card_transactions")
          .select("id")
          .eq("card_id", selectedCard.id)
          .eq("amount", amount)
          .eq("merchant_name", merchantName)
          .gte("transaction_date", dateStr.split("T")[0])
          .lte("transaction_date", dateStr.split("T")[0] + "T23:59:59")
          .limit(1);

        if (existing && existing.length > 0) continue;

        await supabase.from("card_transactions").insert({
          card_id: selectedCard.id,
          transaction_date: dateStr,
          merchant_name: merchantName,
          amount,
          category: item.resCategory || null,
          status: "pending",
          memo: item.resInstallmentCount && item.resInstallmentCount !== "0"
            ? `할부 ${item.resInstallmentCount}개월`
            : null,
        });
        insertCount++;
      }

      toast.success(`${insertCount}건의 새로운 카드 내역을 가져왔습니다.`);
      fetchTransactions();
    } catch (e: any) {
      console.error("CODEF sync error:", e);
      toast.error("내역 가져오기 실패: " + e.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="pt-28 pb-16 px-6 max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/apps/finance")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-emerald-600" /> 내 법인카드 사용 내역
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              본인에게 지급된 법인카드의 한도 및 승인 내역을 확인합니다.
            </p>
          </div>
        </div>

        {cards.length === 0 ? (
          <Card className="border-none shadow-lg py-16">
            <CardContent className="text-center text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">사용 가능한 법인카드가 없습니다.</p>
              <p className="text-sm">관리자에게 카드 지급 여부를 확인해주세요.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 왼쪽: 카드 정보 */}
            <div className="space-y-6">
              {cards.length > 1 && (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                  <label className="text-xs font-bold text-slate-500 mb-2 block">카드 선택</label>
                  <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                    <SelectTrigger><SelectValue placeholder="카드를 선택하세요" /></SelectTrigger>
                    <SelectContent>
                      {cards.map(card => (
                        <SelectItem key={card.id} value={card.id}>
                          {card.card_company} ({card.card_number.slice(-4)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 카드 비주얼 */}
              <div className="relative h-56 w-full rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl" />
                <div className="flex justify-between items-start z-10">
                  <div>
                    <p className="text-xs text-white/60 font-medium">Corporate Card</p>
                    <p className="font-bold text-lg mt-1">{selectedCard?.card_company}</p>
                  </div>
                  <div className="w-10 h-8 bg-yellow-200/80 rounded-md" />
                </div>
                <div className="z-10">
                  <p className="font-mono text-2xl tracking-widest">
                    {maskCardNumber(selectedCard?.card_number || "")}
                  </p>
                </div>
                <div className="flex justify-between items-end z-10">
                  <div>
                    <p className="text-[10px] text-white/60 uppercase">Card Holder</p>
                    <p className="font-medium tracking-wide">{user?.user_metadata.full_name || selectedCard?.card_name}</p>
                  </div>
                  {selectedCard?.expiry_date && (
                    <div className="text-right">
                      <p className="text-[10px] text-white/60 uppercase">Expires</p>
                      <p className="font-medium tracking-wide">
                        {format(new Date(selectedCard.expiry_date), "MM/yy")}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 이번 달 사용 현황 */}
              <Card className="border-none shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex justify-between items-center">
                    <span>이번 달 사용 현황</span>
                    <Badge variant="outline" className="text-emerald-600 bg-emerald-50">
                      {format(new Date(), "M월")}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-2xl font-bold text-slate-900">
                        {formatCurrency(currentMonthSpend)}
                      </span>
                      <span className="text-xs text-muted-foreground mb-1">
                        / 한도 {selectedCard?.monthly_limit ? formatCurrency(selectedCard.monthly_limit) : "무제한"}
                      </span>
                    </div>
                    <Progress value={limitPercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2 text-right">
                      {limitPercentage.toFixed(1)}% 사용 중
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg flex gap-3 text-xs text-slate-600">
                    <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    <p>법인카드 사용 후 영수증은 반드시 전자결재 시스템을 통해 제출해야 합니다.</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 오른쪽: 승인 내역 */}
            <Card className="lg:col-span-2 border-none shadow-lg h-fit">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-lg">승인 내역</CardTitle>
                  <CardDescription>최근 결제된 내역입니다. 선택 후 청구서를 생성할 수 있습니다.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleSyncFromCodef}
                    disabled={!selectedCardId || syncing}
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "가져오는 중..." : "CODEF 내역 가져오기"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setAddDialogOpen(true)}
                    disabled={!selectedCardId}
                  >
                    <Plus className="w-4 h-4" /> 수동 등록
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={handleOpenReport}
                    disabled={selectedIds.size === 0}
                  >
                    <FileText className="w-4 h-4" /> 청구서 생성 ({selectedIds.size})
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={transactions.length > 0 && selectedIds.size === transactions.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-[110px]">승인일시</TableHead>
                      <TableHead>사용처</TableHead>
                      <TableHead>용도 (프로젝트)</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                      <TableHead className="text-center w-[80px]">증빙</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                          사용 내역이 없습니다. 'CODEF 내역 가져오기' 버튼으로 카드사에서 내역을 불러오세요.
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((tx) => (
                        <TableRow key={tx.id} className="group hover:bg-slate-50">
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(tx.id)}
                              onCheckedChange={() => toggleSelect(tx.id)}
                            />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <div className="font-medium text-slate-700">
                              {format(new Date(tx.transaction_date), "MM.dd")}
                            </div>
                            {format(new Date(tx.transaction_date), "HH:mm")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-full bg-slate-100 text-slate-500">
                                <Store className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-medium text-sm">{tx.merchant_name}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 ml-7">
                              {tx.category || "일반"}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {tx.memo || "-"}
                          </TableCell>
                          <TableCell className="text-right font-bold text-sm">
                            {formatCurrency(tx.amount)}
                          </TableCell>
                          <TableCell className="text-center">
                            {tx.receipt_url ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => window.open(tx.receipt_url || "", "_blank")}
                              >
                                <Receipt className="w-4 h-4" />
                              </Button>
                            ) : (
                              <span className="text-[10px] text-red-400 bg-red-50 px-2 py-0.5 rounded-full">
                                미제출
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* 선택 요약 바 */}
                {selectedIds.size > 0 && (
                  <div className="border-t bg-slate-50 px-6 py-3 flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      <strong>{selectedIds.size}건</strong> 선택됨 · 합계{" "}
                      <strong className="text-slate-900">
                        {formatCurrency(selectedTransactions.reduce((s, t) => s + Number(t.amount), 0))}
                      </strong>
                    </span>
                    <Button size="sm" onClick={handleOpenReport} className="gap-2">
                      <FileText className="w-4 h-4" /> 청구서 생성
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* 수동 등록 다이얼로그 */}
      <AddTransactionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        cardId={selectedCardId}
        onSaved={() => {
          fetchTransactions();
          toast.success("내역이 등록되었습니다.");
        }}
        supabaseClient={supabase}
      />

      {/* 청구서 미리보기 다이얼로그 */}
      <ExpenseReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        transactions={selectedTransactions}
        cardNumber={selectedCard?.card_number || ""}
        cardCompany={selectedCard?.card_company || ""}
        holderName={user?.user_metadata.full_name || ""}
      />
    </div>
  );
};

export default MyCardExpenses;
