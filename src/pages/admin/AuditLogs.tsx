import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ScrollArea,
} from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Search, FileText, ChevronLeft, ChevronRight, Eye, RefreshCw,
  Plus, Pencil, Trash2, CheckCircle, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string;
  user_name: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  before: any;
  after: any;
  ip_address: string | null;
  created_at: string;
}

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  create: { label: "생성", color: "bg-emerald-100 text-emerald-700", icon: Plus },
  update: { label: "수정", color: "bg-blue-100 text-blue-700", icon: Pencil },
  delete: { label: "삭제", color: "bg-red-100 text-red-700", icon: Trash2 },
  approve: { label: "승인", color: "bg-violet-100 text-violet-700", icon: CheckCircle },
  login: { label: "로그인", color: "bg-slate-100 text-slate-700", icon: ShieldCheck },
};

const ENTITY_LABELS: Record<string, string> = {
  card_transaction: "법인카드 거래",
  contract: "계약",
  project: "프로젝트",
  member: "인사 정보",
  artist: "배우",
  vehicle: "차량",
  leave: "휴가",
  schedule: "스케줄",
  finance: "재무",
  settings: "설정",
};

const PAGE_SIZE = 20;

const AuditLogs = () => {
  const { currentTenant } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const tenantId = currentTenant?.tenant_id;

  const fetchLogs = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (actionFilter !== "all") query = query.eq("action", actionFilter);
      if (entityFilter !== "all") query = query.eq("entity", entityFilter);
      if (search) {
        query = query.or(
          `user_name.ilike.%${search}%,entity.ilike.%${search}%,entity_id.ilike.%${search}%`
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;
      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      toast.error("로그를 불러오지 못했습니다: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [tenantId, page, actionFilter, entityFilter]);

  const handleSearch = () => {
    setPage(0);
    fetchLogs();
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getActionBadge = (action: string) => {
    const config = ACTION_CONFIG[action] || { label: action, color: "bg-slate-100 text-slate-600", icon: FileText };
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const getEntityLabel = (entity: string) => ENTITY_LABELS[entity] || entity;

  const renderJsonDiff = (before: any, after: any) => {
    if (!before && !after) return <p className="text-sm text-muted-foreground">변경 데이터 없음</p>;

    const allKeys = new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {}),
    ]);

    return (
      <div className="space-y-1">
        {Array.from(allKeys).map((key) => {
          const bVal = before?.[key];
          const aVal = after?.[key];
          const changed = JSON.stringify(bVal) !== JSON.stringify(aVal);
          return (
            <div key={key} className={`text-xs p-1.5 rounded ${changed ? "bg-amber-50 border border-amber-200" : "bg-slate-50"}`}>
              <span className="font-semibold text-slate-700">{key}: </span>
              {before && (
                <span className={changed ? "line-through text-red-400 mr-2" : "text-slate-500"}>
                  {JSON.stringify(bVal ?? "—")}
                </span>
              )}
              {after && changed && (
                <span className="text-emerald-600 font-medium">→ {JSON.stringify(aVal)}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">감사 로그</h1>
          <p className="text-muted-foreground text-sm mt-1">시스템 내 모든 변경 이력을 조회합니다.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-2">
          <RefreshCw className="w-4 h-4" /> 새로고침
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">검색</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="사용자명, 대상, ID로 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-[140px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">액션</label>
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="create">생성</SelectItem>
                  <SelectItem value="update">수정</SelectItem>
                  <SelectItem value="delete">삭제</SelectItem>
                  <SelectItem value="approve">승인</SelectItem>
                  <SelectItem value="login">로그인</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[160px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">대상</label>
              <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(0); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch} size="sm">조회</Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">일시</TableHead>
                <TableHead className="w-[120px]">사용자</TableHead>
                <TableHead className="w-[80px]">액션</TableHead>
                <TableHead className="w-[120px]">대상</TableHead>
                <TableHead>대상 ID</TableHead>
                <TableHead className="w-[60px] text-center">상세</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    기록된 로그가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {format(new Date(log.created_at), "yyyy.MM.dd HH:mm:ss", { locale: ko })}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{log.user_name || log.user_id.slice(0, 8)}</TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell className="text-sm">{getEntityLabel(log.entity)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                      {log.entity_id || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                전체 {totalCount}건 중 {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              감사 로그 상세
              {selectedLog && getActionBadge(selectedLog.action)}
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">일시</p>
                    <p className="font-medium">{format(new Date(selectedLog.created_at), "yyyy.MM.dd HH:mm:ss")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">사용자</p>
                    <p className="font-medium">{selectedLog.user_name || selectedLog.user_id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">대상</p>
                    <p className="font-medium">{getEntityLabel(selectedLog.entity)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">대상 ID</p>
                    <p className="font-mono text-xs break-all">{selectedLog.entity_id || "—"}</p>
                  </div>
                  {selectedLog.ip_address && (
                    <div>
                      <p className="text-xs text-muted-foreground">IP 주소</p>
                      <p className="font-mono text-xs">{selectedLog.ip_address}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">변경 내역</p>
                  {renderJsonDiff(selectedLog.before, selectedLog.after)}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogs;
