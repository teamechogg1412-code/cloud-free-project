import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FolderOpen, Loader2, FileCheck2, FileText, CalendarClock, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "임시저장", variant: "secondary" },
  pending: { label: "결재대기", variant: "outline" },
  approved: { label: "승인", variant: "default" },
  rejected: { label: "반려", variant: "destructive" },
  cancelled: { label: "취소", variant: "secondary" },
};

interface DocItem {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  type: "expense" | "proposal" | "fixed_expense";
  type_label: string;
  amount?: number;
}

const MyDocuments = () => {
  const { user, currentTenant } = useAuth();
  const tenantId = currentTenant?.tenant_id;
  const navigate = useNavigate();

  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    if (tenantId && user) loadDocs();
  }, [tenantId, user]);

  const loadDocs = async () => {
    if (!tenantId || !user) return;
    setLoading(true);

    const [expenseRes, proposalRes] = await Promise.all([
      supabase.from("expense_reports").select("id, title, category, status, created_at, total_amount").eq("tenant_id", tenantId).eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("proposals").select("id, title, category, status, created_at, amount").eq("tenant_id", tenantId).eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    const expenseDocs: DocItem[] = (expenseRes.data || []).map((e: any) => ({
      id: e.id, title: e.title, category: e.category, status: e.status,
      created_at: e.created_at, type: "expense" as const, type_label: "지출결의서",
      amount: Number(e.total_amount),
    }));

    const proposalDocs: DocItem[] = (proposalRes.data || []).map((p: any) => ({
      id: p.id, title: p.title, category: p.category, status: p.status,
      created_at: p.created_at, type: "proposal" as const, type_label: "기안서",
      amount: Number(p.amount) || undefined,
    }));

    const allDocs = [...expenseDocs, ...proposalDocs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setDocs(allDocs);
    setLoading(false);
  };

  const filtered = tab === "all" ? docs : docs.filter(d => d.type === tab);

  const typeCounts = {
    all: docs.length,
    expense: docs.filter(d => d.type === "expense").length,
    proposal: docs.filter(d => d.type === "proposal").length,
  };

  const navigateToDoc = (doc: DocItem) => {
    if (doc.type === "expense") navigate("/expense-report");
    else if (doc.type === "proposal") navigate("/proposal-request");
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2"><FolderOpen className="w-6 h-6" /> 내 문서함</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab("all")}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{typeCounts.all}</div>
            <div className="text-sm text-muted-foreground">전체 문서</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab("expense")}>
          <CardContent className="p-4 text-center">
            <FileCheck2 className="w-5 h-5 mx-auto mb-1 text-orange-500" />
            <div className="text-2xl font-bold">{typeCounts.expense}</div>
            <div className="text-sm text-muted-foreground">지출결의서</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab("proposal")}>
          <CardContent className="p-4 text-center">
            <FileText className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <div className="text-2xl font-bold">{typeCounts.proposal}</div>
            <div className="text-sm text-muted-foreground">기안서</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {docs.filter(d => d.status === "pending").length}
            </div>
            <div className="text-sm text-muted-foreground">결재 대기</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">전체 ({typeCounts.all})</TabsTrigger>
          <TabsTrigger value="expense">지출결의서 ({typeCounts.expense})</TabsTrigger>
          <TabsTrigger value="proposal">기안서 ({typeCounts.proposal})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          <Card>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">문서가 없습니다.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>유형</TableHead>
                      <TableHead>제목</TableHead>
                      <TableHead>카테고리</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                      <TableHead>제출일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">바로가기</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(doc => {
                      const st = STATUS_MAP[doc.status] || STATUS_MAP.draft;
                      return (
                        <TableRow key={`${doc.type}-${doc.id}`}>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {doc.type === "expense" && <FileCheck2 className="w-3 h-3 mr-1" />}
                              {doc.type === "proposal" && <FileText className="w-3 h-3 mr-1" />}
                              {doc.type_label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{doc.title}</TableCell>
                          <TableCell>{doc.category}</TableCell>
                          <TableCell className="text-right">{doc.amount ? `${doc.amount.toLocaleString()}원` : "-"}</TableCell>
                          <TableCell>{format(new Date(doc.created_at), "yyyy-MM-dd")}</TableCell>
                          <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => navigateToDoc(doc)}>
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyDocuments;
