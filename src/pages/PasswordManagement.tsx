import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  KeyRound, Eye, EyeOff, Search, ExternalLink, Copy,
  AlertTriangle, Loader2, Calendar, ShieldCheck, Lock
} from "lucide-react";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip";

interface VisibleCredential {
  id: string;
  service_name: string;
  login_id: string;
  login_password: string;
  domain_url: string | null;
  category: string;
  notes: string | null;
  expires_at?: string | null;
  created_at: string;
  access_type: string;
}

const PasswordManagement = () => {
  const { user, currentTenant, isCompanyAdmin } = useAuth();
  const [credentials, setCredentials] = useState<VisibleCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState("all");

  const tenantId = currentTenant?.tenant_id;
  const userId = user?.id;
  const userDept = currentTenant?.department;

  const fetchCredentials = useCallback(async () => {
    if (!tenantId || !userId) return;
    setLoading(true);

    try {
      const { data: allCreds, error: credError } = await (supabase as any)
        .from("shared_credentials")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("category")
        .order("service_name");

      if (credError) throw credError;
      if (!allCreds || allCreds.length === 0) {
        setCredentials([]);
        setLoading(false);
        return;
      }

      if (isCompanyAdmin) {
        setCredentials(allCreds);
        setLoading(false);
        return;
      }

      const credIds = allCreds.map((c: any) => c.id);
      const { data: accessRules } = await (supabase as any)
        .from("credential_access")
        .select("*")
        .in("credential_id", credIds);

      const { data: deptData } = await supabase
        .from("departments")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .eq("is_active", true);

      const userDeptId = (deptData || []).find((d: any) => d.name === userDept)?.id;

      const { data: managerData } = await (supabase as any)
        .from("credential_managers")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .maybeSingle();

      const isManager = !!managerData;

      const rules = accessRules || [];
      const visible = allCreds.filter((cred: any) => {
        if (isManager) return true;
        if (cred.created_by === userId) return true;
        const credRules = rules.filter((r: any) => r.credential_id === cred.id);
        if (credRules.length === 0) return false;
        if (credRules.some((r: any) => r.access_type === "all")) return true;
        if (userDeptId && credRules.some((r: any) => r.access_type === "department" && r.target_id === userDeptId)) return true;
        if (credRules.some((r: any) => r.access_type === "individual" && r.target_id === userId)) return true;
        return false;
      });

      setCredentials(visible);
    } catch (e: any) {
      toast.error("데이터를 불러오지 못했습니다.");
    }
    setLoading(false);
  }, [tenantId, userId, isCompanyAdmin, userDept]);

  useEffect(() => { fetchCredentials(); }, [fetchCredentials]);

  const togglePassword = (id: string) => setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} 복사됨`);
  };

  const isExpiringSoon = (date: string | null | undefined) => {
    if (!date) return false;
    const diff = new Date(date).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  };
  const isExpired = (date: string | null | undefined) => {
    if (!date) return false;
    return new Date(date).getTime() < Date.now();
  };

  const allCategories = ["all", ...Array.from(new Set(credentials.map(c => c.category).filter(Boolean)))];
  const filtered = credentials.filter(c => {
    const matchCat = selectedCategory === "all" || c.category === selectedCategory;
    const matchSearch = !search || c.service_name.toLowerCase().includes(search.toLowerCase()) || c.login_id.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <TooltipProvider>
      <div className="pb-12 px-6 max-w-6xl mx-auto py-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">공유 비밀번호</h1>
                <p className="text-sm text-muted-foreground">관리자가 등록한 공유 계정을 확인합니다</p>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="gap-1 text-xs font-normal text-muted-foreground">
            <ShieldCheck className="w-3 h-3" /> 읽기 전용
          </Badge>
        </div>

        {/* Filters - compact */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="검색..."
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat === "all" ? "전체" : cat}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length}건</span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Lock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{credentials.length === 0 ? "열람 가능한 공유 계정이 없습니다." : "검색 결과가 없습니다."}</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[80px] text-xs font-semibold">분류</TableHead>
                  <TableHead className="text-xs font-semibold">서비스</TableHead>
                  <TableHead className="text-xs font-semibold">아이디</TableHead>
                  <TableHead className="text-xs font-semibold">비밀번호</TableHead>
                  <TableHead className="text-xs font-semibold">URL</TableHead>
                  <TableHead className="w-[80px] text-xs font-semibold">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(cred => (
                  <TableRow key={cred.id} className="group">
                    <TableCell>
                      <Badge variant="secondary" className="text-[11px] font-normal whitespace-nowrap">
                        {cred.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-foreground">{cred.service_name}</span>
                        {cred.notes && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[11px] text-muted-foreground truncate max-w-[180px] cursor-help">{cred.notes}</span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs">
                              <p className="text-xs">{cred.notes}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{cred.login_id}</code>
                        <button
                          onClick={() => copyToClipboard(cred.login_id, "아이디")}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded min-w-[70px]">
                          {showPasswords[cred.id] ? cred.login_password : "••••••"}
                        </code>
                        <button
                          onClick={() => togglePassword(cred.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {showPasswords[cred.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(cred.login_password, "비밀번호")}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {cred.domain_url ? (
                        <a
                          href={cred.domain_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1 max-w-[200px] truncate"
                        >
                          {cred.domain_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isExpired(cred.expires_at) ? (
                        <Badge variant="destructive" className="text-[10px] gap-0.5 px-1.5">
                          <AlertTriangle className="w-2.5 h-2.5" /> 만료
                        </Badge>
                      ) : isExpiringSoon(cred.expires_at) ? (
                        <Badge className="text-[10px] gap-0.5 px-1.5 bg-amber-500 hover:bg-amber-600">
                          <Calendar className="w-2.5 h-2.5" /> 임박
                        </Badge>
                      ) : cred.expires_at ? (
                        <span className="text-[11px] text-muted-foreground">
                          ~{new Date(cred.expires_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default PasswordManagement;
