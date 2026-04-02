import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/landing/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer, Legend,
} from "recharts";
import {
  ArrowLeft, TrendingUp, TrendingDown, DollarSign, Target,
  BarChart3, PieChart as PieChartIcon, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface ProjectWithFinance {
  id: string;
  name: string;
  status: string;
  project_type: string | null;
  client_company: string | null;
  contract_amount: number | null;
  budget: number | null;
  artist_name: string | null;
  start_date: string | null;
  end_date: string | null;
  total_approved_expense: number;
  total_pending_expense: number;
  expense_count: number;
}

const statusLabels: Record<string, string> = {
  active: "진행중", pending: "대기", completed: "완료", cancelled: "취소",
};

const CHART_COLORS = [
  "hsl(262, 83%, 58%)", "hsl(210, 96%, 45%)", "hsl(160, 84%, 39%)",
  "hsl(38, 92%, 50%)", "hsl(350, 89%, 60%)", "hsl(190, 90%, 50%)",
  "hsl(280, 65%, 60%)", "hsl(20, 90%, 55%)",
];

const formatKRW = (v: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(v);

const ProjectProfitDashboard = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const [projects, setProjects] = useState<ProjectWithFinance[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (currentTenant) fetchData();
  }, [currentTenant]);

  const fetchData = async () => {
    if (!currentTenant) return;
    setLoading(true);

    // Fetch projects
    const { data: projectData } = await supabase
      .from("projects")
      .select("*")
      .eq("tenant_id", currentTenant.tenant_id)
      .order("created_at", { ascending: false });

    if (!projectData) { setLoading(false); return; }

    // Fetch all expense reports for this tenant
    const { data: expenseData } = await supabase
      .from("expense_reports")
      .select("id, project_id, total_amount, status")
      .eq("tenant_id", currentTenant.tenant_id);

    // Map expenses to projects
    const expenseMap = new Map<string, { approved: number; pending: number; count: number }>();
    (expenseData || []).forEach((e: any) => {
      if (!e.project_id) return;
      const cur = expenseMap.get(e.project_id) || { approved: 0, pending: 0, count: 0 };
      cur.count++;
      if (e.status === "approved") cur.approved += (e.total_amount || 0);
      else if (e.status === "pending") cur.pending += (e.total_amount || 0);
      expenseMap.set(e.project_id, cur);
    });

    const merged: ProjectWithFinance[] = projectData.map((p: any) => {
      const exp = expenseMap.get(p.id) || { approved: 0, pending: 0, count: 0 };
      return {
        ...p,
        total_approved_expense: exp.approved,
        total_pending_expense: exp.pending,
        expense_count: exp.count,
      };
    });

    setProjects(merged);
    setLoading(false);
  };

  const filtered = useMemo(() =>
    statusFilter === "all" ? projects : projects.filter(p => p.status === statusFilter),
    [projects, statusFilter]
  );

  // Aggregated stats
  const stats = useMemo(() => {
    const totalContract = filtered.reduce((s, p) => s + (p.contract_amount || 0), 0);
    const totalExpense = filtered.reduce((s, p) => s + p.total_approved_expense, 0);
    const totalPending = filtered.reduce((s, p) => s + p.total_pending_expense, 0);
    const totalProfit = totalContract - totalExpense;
    const profitRate = totalContract > 0 ? ((totalProfit / totalContract) * 100) : 0;
    const overBudgetCount = filtered.filter(p => p.contract_amount && p.total_approved_expense > p.contract_amount).length;
    return { totalContract, totalExpense, totalPending, totalProfit, profitRate, overBudgetCount };
  }, [filtered]);

  // Bar chart data: top projects by contract vs expense
  const barChartData = useMemo(() =>
    filtered
      .filter(p => (p.contract_amount || 0) > 0 || p.total_approved_expense > 0)
      .slice(0, 10)
      .map(p => ({
        name: p.name.length > 8 ? p.name.substring(0, 8) + "…" : p.name,
        계약금: p.contract_amount || 0,
        지출: p.total_approved_expense,
        손익: (p.contract_amount || 0) - p.total_approved_expense,
      })),
    [filtered]
  );

  // Pie chart data: expense distribution
  const pieChartData = useMemo(() =>
    filtered
      .filter(p => p.total_approved_expense > 0)
      .map(p => ({ name: p.name, value: p.total_approved_expense }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    [filtered]
  );

  const barChartConfig = {
    계약금: { label: "계약금", color: "hsl(210, 96%, 45%)" },
    지출: { label: "지출", color: "hsl(350, 89%, 60%)" },
    손익: { label: "손익", color: "hsl(160, 84%, 39%)" },
  };

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
              <BarChart3 className="w-8 h-8 text-indigo-600" /> 프로젝트별 수익 현황
            </h1>
            <p className="text-muted-foreground mt-1">계약금 대비 지출 비율 및 프로젝트별 손익 분석</p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="active">진행중</SelectItem>
              <SelectItem value="completed">완료</SelectItem>
              <SelectItem value="pending">대기</SelectItem>
            </SelectContent>
          </Select>
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
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-muted-foreground">총 계약금</span>
                  </div>
                  <p className="text-xl font-bold">{formatKRW(stats.totalContract)}</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-muted-foreground">총 승인 지출</span>
                  </div>
                  <p className="text-xl font-bold">{formatKRW(stats.totalExpense)}</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    {stats.totalProfit >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    <span className="text-xs text-muted-foreground">총 손익</span>
                  </div>
                  <p className={`text-xl font-bold ${stats.totalProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {formatKRW(stats.totalProfit)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-violet-600" />
                    <span className="text-xs text-muted-foreground">수익률</span>
                  </div>
                  <p className={`text-xl font-bold ${stats.profitRate >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {stats.profitRate.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-muted-foreground">초과 프로젝트</span>
                  </div>
                  <p className="text-xl font-bold text-amber-600">{stats.overBudgetCount}건</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Bar Chart */}
              <Card className="lg:col-span-2 border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" /> 프로젝트별 계약금 vs 지출
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {barChartData.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">데이터가 없습니다</div>
                  ) : (
                    <ChartContainer config={barChartConfig} className="h-[320px] w-full">
                      <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                        <ChartTooltip
                          content={<ChartTooltipContent formatter={(value) => formatKRW(Number(value))} />}
                        />
                        <Bar dataKey="계약금" fill="var(--color-계약금)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="지출" fill="var(--color-지출)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* Pie Chart */}
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4" /> 지출 비중
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pieChartData.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">데이터가 없습니다</div>
                  ) : (
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%" cy="45%"
                            innerRadius={50} outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {pieChartData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Legend
                            verticalAlign="bottom"
                            formatter={(value) => <span className="text-[11px]">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Project Detail Table */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">프로젝트별 손익 상세</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>프로젝트</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">계약금</TableHead>
                      <TableHead className="text-right">승인 지출</TableHead>
                      <TableHead className="text-right">대기 지출</TableHead>
                      <TableHead className="text-right">손익</TableHead>
                      <TableHead>집행률</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          프로젝트가 없습니다
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map(p => {
                        const contract = p.contract_amount || 0;
                        const profit = contract - p.total_approved_expense;
                        const ratio = contract > 0 ? (p.total_approved_expense / contract) * 100 : 0;
                        const isOver = ratio > 100;

                        return (
                          <TableRow
                            key={p.id}
                            className="cursor-pointer hover:bg-accent/50"
                            onClick={() => navigate("/admin/projects")}
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium">{p.name}</p>
                                {p.client_company && (
                                  <p className="text-xs text-muted-foreground">{p.client_company}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{p.project_type || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">
                                {statusLabels[p.status] || p.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {contract > 0 ? formatKRW(contract) : "-"}
                            </TableCell>
                            <TableCell className="text-right font-medium text-red-600">
                              {p.total_approved_expense > 0 ? formatKRW(p.total_approved_expense) : "-"}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {p.total_pending_expense > 0 ? formatKRW(p.total_pending_expense) : "-"}
                            </TableCell>
                            <TableCell className={`text-right font-bold ${profit >= 0 ? "text-green-700" : "text-red-600"}`}>
                              {contract > 0 ? formatKRW(profit) : "-"}
                            </TableCell>
                            <TableCell className="w-[140px]">
                              {contract > 0 ? (
                                <div className="flex items-center gap-2">
                                  <Progress
                                    value={Math.min(ratio, 100)}
                                    className={`h-2 flex-1 ${isOver ? "[&>div]:bg-red-500" : "[&>div]:bg-blue-500"}`}
                                  />
                                  <span className={`text-xs font-medium w-10 text-right ${isOver ? "text-red-600" : ""}`}>
                                    {ratio.toFixed(0)}%
                                  </span>
                                  {isOver && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
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

export default ProjectProfitDashboard;
