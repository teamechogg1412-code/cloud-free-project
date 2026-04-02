import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/landing/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Line, ComposedChart,
} from "recharts";
import {
  ArrowLeft, Wallet, TrendingUp, TrendingDown, AlertTriangle,
  Clock, CheckCircle2, FileText, Landmark, ChevronLeft, ChevronRight,
  ArrowDownCircle, ArrowUpCircle, Banknote,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { format, startOfMonth, endOfMonth, subMonths, addMonths, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

const formatKRW = (v: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(v);

const statusLabels: Record<string, string> = {
  pending: "대기", approved: "승인", rejected: "반려", draft: "임시저장", recalled: "회수",
};
const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  draft: "bg-slate-100 text-slate-600",
  recalled: "bg-orange-100 text-orange-600",
};

const MonthlyBudget = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expenseReports, setExpenseReports] = useState<any[]>([]);
  const [expenseItems, setExpenseItems] = useState<any[]>([]);
  const [bankBalance, setBankBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // For cumulative chart: last 6 months
  const [monthlyHistory, setMonthlyHistory] = useState<any[]>([]);

  useEffect(() => {
    if (currentTenant) fetchAll();
  }, [currentTenant, currentMonth]);

  const fetchAll = async () => {
    if (!currentTenant) return;
    setLoading(true);

    const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    // 1. Expense reports for current month (by expense_date or created_at)
    const { data: reports } = await supabase
      .from("expense_reports")
      .select("*")
      .eq("tenant_id", currentTenant.tenant_id)
      .gte("created_at", monthStart)
      .lte("created_at", monthEnd + "T23:59:59")
      .order("created_at", { ascending: false });

    setExpenseReports(reports || []);

    // 2. Get items for pending/draft reports
    const pendingIds = (reports || [])
      .filter((r: any) => ["pending", "draft"].includes(r.status))
      .map((r: any) => r.id);
    
    if (pendingIds.length > 0) {
      const { data: items } = await supabase
        .from("expense_report_items")
        .select("*")
        .in("expense_report_id", pendingIds)
        .order("sort_order");
      setExpenseItems(items || []);
    } else {
      setExpenseItems([]);
    }

    // 3. Bank balance - get latest transaction balance
    const { data: latestTx } = await supabase
      .from("bank_transactions")
      .select("balance, transaction_date")
      .eq("tenant_id", currentTenant.tenant_id)
      .order("transaction_date", { ascending: false })
      .limit(1);
    
    setBankBalance(latestTx?.[0]?.balance ?? null);

    // 4. Monthly history (last 6 months for cumulative chart)
    const sixMonthsAgo = format(startOfMonth(subMonths(currentMonth, 5)), "yyyy-MM-dd");
    const { data: historyData } = await supabase
      .from("expense_reports")
      .select("total_amount, status, created_at")
      .eq("tenant_id", currentTenant.tenant_id)
      .gte("created_at", sixMonthsAgo)
      .lte("created_at", monthEnd + "T23:59:59");

    // Group by month
    const monthMap = new Map<string, { approved: number; pending: number; total: number }>();
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(currentMonth, i);
      const key = format(m, "yyyy-MM");
      monthMap.set(key, { approved: 0, pending: 0, total: 0 });
    }
    (historyData || []).forEach((r: any) => {
      const key = format(parseISO(r.created_at), "yyyy-MM");
      const entry = monthMap.get(key);
      if (!entry) return;
      entry.total += r.total_amount || 0;
      if (r.status === "approved") entry.approved += r.total_amount || 0;
      else if (["pending", "draft"].includes(r.status)) entry.pending += r.total_amount || 0;
    });

    let cumulative = 0;
    const history = Array.from(monthMap.entries()).map(([key, val]) => {
      cumulative += val.approved;
      return {
        month: format(parseISO(key + "-01"), "M월", { locale: ko }),
        승인지출: val.approved,
        미처리: val.pending,
        누적지출: cumulative,
      };
    });
    setMonthlyHistory(history);

    setLoading(false);
  };

  // Current month stats
  const stats = useMemo(() => {
    const approved = expenseReports
      .filter((r: any) => r.status === "approved")
      .reduce((s: number, r: any) => s + (r.total_amount || 0), 0);
    const pending = expenseReports
      .filter((r: any) => r.status === "pending")
      .reduce((s: number, r: any) => s + (r.total_amount || 0), 0);
    const draft = expenseReports
      .filter((r: any) => r.status === "draft")
      .reduce((s: number, r: any) => s + (r.total_amount || 0), 0);
    const total = expenseReports.reduce((s: number, r: any) => s + (r.total_amount || 0), 0);
    const projectedBalance = bankBalance !== null ? bankBalance - pending - draft : null;

    return { approved, pending, draft, total, projectedBalance };
  }, [expenseReports, bankBalance]);

  // Pending + draft reports for detail list
  const pendingReports = useMemo(() =>
    expenseReports.filter((r: any) => ["pending", "draft"].includes(r.status)),
    [expenseReports]
  );

  const chartConfig = {
    승인지출: { label: "승인 지출", color: "hsl(210, 96%, 45%)" },
    미처리: { label: "미처리", color: "hsl(38, 92%, 50%)" },
    누적지출: { label: "누적 지출", color: "hsl(350, 89%, 60%)" },
  };

  const prevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="pt-28 pb-16 px-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Wallet className="w-8 h-8 text-emerald-600" /> 월간예산
            </h1>
            <p className="text-muted-foreground mt-1">
              결의서 기반 월별 지출 현황 및 예상 잔액 분석
            </p>
          </div>
          {/* Month Navigator */}
          <div className="flex items-center gap-2 bg-white rounded-lg border px-2 py-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-semibold text-sm min-w-[100px] text-center">
              {format(currentMonth, "yyyy년 M월", { locale: ko })}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">로딩 중...</div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <Card className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Landmark className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-muted-foreground">현재 잔고</span>
                  </div>
                  <p className="text-xl font-bold">
                    {bankBalance !== null ? formatKRW(bankBalance) : "미연동"}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-muted-foreground">승인 지출</span>
                  </div>
                  <p className="text-xl font-bold">{formatKRW(stats.approved)}</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-muted-foreground">미처리 결의서</span>
                  </div>
                  <p className="text-xl font-bold text-amber-600">{formatKRW(stats.pending + stats.draft)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    대기 {formatKRW(stats.pending)} · 임시 {formatKRW(stats.draft)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-violet-600" />
                    <span className="text-xs text-muted-foreground">이달 총 지출</span>
                  </div>
                  <p className="text-xl font-bold">{formatKRW(stats.total)}</p>
                </CardContent>
              </Card>
              <Card className={`border-none shadow-sm ${stats.projectedBalance !== null && stats.projectedBalance < 0 ? "ring-2 ring-red-300" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    {stats.projectedBalance !== null && stats.projectedBalance < 0 ? (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    ) : (
                      <Banknote className="w-4 h-4 text-emerald-600" />
                    )}
                    <span className="text-xs text-muted-foreground">예상 잔액</span>
                  </div>
                  <p className={`text-xl font-bold ${stats.projectedBalance !== null && stats.projectedBalance < 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {stats.projectedBalance !== null ? formatKRW(stats.projectedBalance) : "미연동"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">잔고 - 미처리 합계</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Monthly Trend */}
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> 6개월 지출 추이 (누적)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {monthlyHistory.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">데이터가 없습니다</div>
                  ) : (
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                      <ComposedChart data={monthlyHistory} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                        <ChartTooltip
                          content={<ChartTooltipContent formatter={(value) => formatKRW(Number(value))} />}
                        />
                        <Bar dataKey="승인지출" fill="var(--color-승인지출)" radius={[4, 4, 0, 0]} barSize={28} />
                        <Bar dataKey="미처리" fill="var(--color-미처리)" radius={[4, 4, 0, 0]} barSize={28} />
                        <Line
                          type="monotone"
                          dataKey="누적지출"
                          stroke="var(--color-누적지출)"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      </ComposedChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* This month breakdown */}
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="w-4 h-4" /> 이달 예산 구성
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {bankBalance !== null && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">통장 잔고</span>
                        <span className="font-semibold">{formatKRW(bankBalance)}</span>
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-1.5">
                        <ArrowDownCircle className="w-3.5 h-3.5 text-green-600" /> 승인된 지출
                      </span>
                      <span className="font-semibold">{formatKRW(stats.approved)}</span>
                    </div>
                    {bankBalance !== null && bankBalance > 0 && (
                      <Progress
                        value={Math.min((stats.approved / bankBalance) * 100, 100)}
                        className="h-2 [&>div]:bg-green-500"
                      />
                    )}
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" /> 미처리 (예정 지출)
                      </span>
                      <span className="font-semibold text-amber-600">{formatKRW(stats.pending + stats.draft)}</span>
                    </div>
                    {bankBalance !== null && bankBalance > 0 && (
                      <Progress
                        value={Math.min(((stats.pending + stats.draft) / bankBalance) * 100, 100)}
                        className="h-2 [&>div]:bg-amber-400"
                      />
                    )}
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-1.5">
                        <ArrowUpCircle className="w-3.5 h-3.5 text-blue-600" /> 가용 예산 (예상)
                      </span>
                      <span className={`font-bold ${stats.projectedBalance !== null && stats.projectedBalance < 0 ? "text-red-600" : "text-emerald-700"}`}>
                        {stats.projectedBalance !== null ? formatKRW(stats.projectedBalance) : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Category breakdown */}
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">카테고리별 지출</p>
                    {(() => {
                      const catMap = new Map<string, number>();
                      expenseReports.forEach((r: any) => {
                        const cat = r.category || "일반";
                        catMap.set(cat, (catMap.get(cat) || 0) + (r.total_amount || 0));
                      });
                      const cats = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
                      if (cats.length === 0) return <p className="text-xs text-muted-foreground">없음</p>;
                      return cats.map(([cat, amt]) => (
                        <div key={cat} className="flex justify-between text-sm py-1">
                          <span>{cat}</span>
                          <span className="font-medium">{formatKRW(amt)}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pending Expense Reports Detail */}
            <Card className="border-none shadow-sm mb-8">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  미처리 결의서 상세 ({pendingReports.length}건)
                  <Badge variant="outline" className="ml-auto text-xs">
                    합계: {formatKRW(stats.pending + stats.draft)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>제목</TableHead>
                      <TableHead>카테고리</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>작성일</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingReports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          미처리 결의서가 없습니다
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingReports.map((r: any) => (
                        <TableRow
                          key={r.id}
                          className="cursor-pointer hover:bg-accent/50"
                          onClick={() => navigate("/expense-report")}
                        >
                          <TableCell className="font-medium">{r.title}</TableCell>
                          <TableCell className="text-sm">{r.category || "일반"}</TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${statusStyles[r.status] || ""}`}>
                              {statusLabels[r.status] || r.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(parseISO(r.created_at), "MM/dd", { locale: ko })}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatKRW(r.total_amount || 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* All expense reports this month */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  이달 전체 결의서 ({expenseReports.length}건)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>제목</TableHead>
                      <TableHead>카테고리</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>작성일</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseReports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          이달 결의서가 없습니다
                        </TableCell>
                      </TableRow>
                    ) : (
                      expenseReports.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.title}</TableCell>
                          <TableCell className="text-sm">{r.category || "일반"}</TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${statusStyles[r.status] || ""}`}>
                              {statusLabels[r.status] || r.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(parseISO(r.created_at), "MM/dd", { locale: ko })}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatKRW(r.total_amount || 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default MonthlyBudget;
