import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Landmark, RefreshCw, Search, ArrowUpCircle, ArrowDownCircle, 
  Wallet, Settings, HardDrive, Zap, FileText,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { toast } from "sonner";

interface FinanceAccount {
  id: string;
  connected_id_key: string;
  business_type: string;
  organization: string;
  account_number: string | null;
  account_alias: string | null;
}

const BANK_NAMES: Record<string, string> = {
  "0002": "산업은행", "0003": "기업은행", "0004": "국민은행", "0007": "수협은행",
  "0011": "농협은행", "0020": "우리은행", "0023": "SC제일은행", "0027": "씨티은행",
  "0031": "대구은행", "0032": "부산은행", "0034": "광주은행", "0035": "제주은행",
  "0037": "전북은행", "0039": "경남은행", "0045": "새마을금고", "0048": "신협은행",
  "0071": "우체국", "0081": "하나은행", "0088": "신한은행", "0089": "K뱅크",
};

const BankTransactions = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [connectedIdMap, setConnectedIdMap] = useState<Record<string, string>>({});
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dataSource, setDataSource] = useState<"drive" | "realtime" | "openbanking">("drive");
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [hasDriveMapping, setHasDriveMapping] = useState(false);

  const today = new Date();
  const [startDate, setStartDate] = useState(format(subDays(today, 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(today, "yyyy-MM-dd"));

  useEffect(() => {
    if (!currentTenant) return;
    const load = async () => {
      const [accRes, configRes, mappingRes] = await Promise.all([
        supabase.from("finance_accounts").select("*")
          .eq("tenant_id", currentTenant.tenant_id)
          .in("business_type", ["BK", "OB"]).eq("is_active", true),
        supabase.from("tenant_api_configs").select("config_key, config_value")
          .eq("tenant_id", currentTenant.tenant_id)
          .like("config_key", "CONNECTED_ID_BK_%"),
        supabase.from("drive_folder_mappings").select("id")
          .eq("tenant_id", currentTenant.tenant_id)
          .eq("folder_key", "bank_transactions")
          .eq("is_active", true),
      ]);

      const accs = (accRes.data || []) as FinanceAccount[];
      setAccounts(accs);
      setHasDriveMapping((mappingRes.data || []).length > 0);

      const idMap: Record<string, string> = {};
      (configRes.data || []).forEach((c: any) => { idMap[c.config_key] = c.config_value; });
      setConnectedIdMap(idMap);

      if (accs.length > 0) setSelectedAccountId(accs[0].id);
    };
    load();
  }, [currentTenant]);

  // Fetch from Drive CSV files
  const fetchFromDrive = async () => {
    setLoading(true);
    try {
      const { data, error } = await invokeEdgeFunction("read-drive-csv", {
        body: {
          tenantId: currentTenant?.tenant_id,
          folderKey: "bank_transactions",
          dateRange: {
            startDate: startDate,
            endDate: endDate,
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setDriveFiles(data.files || []);

      // Map CSV rows to transaction-like format
      const rows = (data.data || []).map((row: any) => ({
        resAccountTrDate: row["거래일"] || "",
        resAccountTrTime: row["거래시간"] || "",
        resAccountIn: row["입금"] || "0",
        resAccountOut: row["출금"] || "0",
        resAfterTranBalance: row["거래후잔액"] || "0",
        resAccountDesc1: row["적요1"] || "",
        resAccountDesc2: row["적요2"] || "",
        resAccountDesc3: row["적요3"] || "",
        _fileName: row["_fileName"] || "",
        _accountNumber: row["계좌번호"] || "",
        _accountName: row["계좌명"] || "",
      }));

      setTransactions(rows);
      if (rows.length === 0) toast.info("해당 기간 Drive 데이터가 없습니다.");
      else toast.success(`Drive에서 ${rows.length}건 로드 (${data.files?.length || 0}개 파일)`);

    } catch (e: any) {
      toast.error("Drive 조회 실패: " + e.message);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch realtime from CODEF
  const fetchRealtime = async () => {
    const account = accounts.find((a) => a.id === selectedAccountId);
    if (!account) return toast.error("조회할 계좌를 선택하세요.");

    const connectedId = connectedIdMap[account.connected_id_key];
    if (!connectedId) return toast.error("Connected ID를 찾을 수 없습니다.");

    setLoading(true);
    try {
      const { data, error } = await invokeEdgeFunction("codef-api", {
        body: {
          action: "transaction_list",
          tenantId: currentTenant?.tenant_id,
          connectedId,
          organization: account.organization,
          account: account.account_number || "",
          startDate: startDate.replace(/-/g, ""),
          endDate: endDate.replace(/-/g, ""),
          orderBy: "0",
        },
      });
      if (error) throw error;
      if (data?.result?.code === "CF-00000") {
        const list = Array.isArray(data.data) ? data.data : (data.data?.resTrHistoryList || []);
        setTransactions(list);
        if (list.length === 0) toast.info("해당 기간 거래내역이 없습니다.");
      } else {
        throw new Error(data?.result?.message || "조회 실패");
      }
    } catch (e: any) {
      toast.error("실시간 조회 실패: " + e.message);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOpenBanking = async () => {
    const account = accounts.find((a) => a.id === selectedAccountId);
    if (!account) return toast.error("조회할 계좌를 선택하세요.");
    if (!account.account_number) return toast.error("fintech_use_num(계좌번호)가 필요합니다.");

    setLoading(true);
    try {
      const { data, error } = await invokeEdgeFunction("openbanking-api", {
        body: {
          action: "transaction_list",
          tenantId: currentTenant?.tenant_id,
          fintechUseNum: account.account_number,
          fromDate: startDate.replace(/-/g, ""),
          toDate: endDate.replace(/-/g, ""),
          sortOrder: "D",
        },
      });

      if (error) throw error;

      const list = Array.isArray(data?.res_list) ? data.res_list : (Array.isArray(data?.transaction_list) ? data.transaction_list : []);
      const items = list.map((item: any) => ({
        resAccountTrDate: item.tran_date || item.tranDtime?.slice(0, 8) || "",
        resAccountTrTime: item.tran_time || item.tranDtime?.slice(8, 14) || "",
        resAccountIn: item.inout_type === "IN" ? item.tran_amt || "0" : "0",
        resAccountOut: item.inout_type === "OUT" ? item.tran_amt || "0" : "0",
        resAfterTranBalance: item.after_balance_amt || "0",
        resAccountDesc1: item.print_content || item.bank_tran_desc || "",
        resAccountDesc2: item.remark || "",
        resAccountDesc3: "",
      }));

      setTransactions(items);
      if (items.length === 0) toast.info("해당 기간 거래내역이 없습니다.");

    } catch (e: any) {
      toast.error("오픈뱅킹 조회 실패: " + e.message);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFetch = () => {
    if (dataSource === "drive") fetchFromDrive();
    else if (dataSource === "openbanking") fetchOpenBanking();
    else fetchRealtime();
  };

  const formatCurrency = (val: string | number) => {
    const num = typeof val === "string" ? parseInt(val, 10) : val;
    if (isNaN(num) || num === 0) return "-";
    return new Intl.NumberFormat("ko-KR").format(num) + "원";
  };

  const totalIn = transactions.reduce((sum, t) => sum + (parseInt(t.resAccountIn || "0", 10)), 0);
  const totalOut = transactions.reduce((sum, t) => sum + (parseInt(t.resAccountOut || "0", 10)), 0);
  const lastBalance = transactions.length > 0 ? parseInt(transactions[0].resAfterTranBalance || "0", 10) : 0;

  const filtered = transactions.filter((t) => {
    if (!searchTerm) return true;
    const desc = [t.resAccountDesc1, t.resAccountDesc2, t.resAccountDesc3].filter(Boolean).join(" ");
    return desc.includes(searchTerm);
  });

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-200">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">거래내역조회 (통장)</h1>
            <p className="text-sm text-muted-foreground font-medium">
              {dataSource === "drive" ? "Google Drive CSV에서 조회" : dataSource === "openbanking" ? "OpenBanking 실시간 조회" : "CODEF 실시간 조회"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/admin/drive-settings")} className="gap-2">
            <Settings className="w-4 h-4" /> 저장소 설정
          </Button>
          <Button onClick={handleFetch} disabled={loading} className="gap-2">
            <RefreshCw className={loading ? "animate-spin w-4 h-4" : "w-4 h-4"} /> 조회
          </Button>
        </div>
      </div>

      {/* Data source selector */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4 space-y-4">
          <Tabs value={dataSource} onValueChange={(v) => setDataSource(v as "drive" | "realtime" | "openbanking")}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="drive" className="gap-2">
                <HardDrive className="w-4 h-4" /> Drive (저장된 데이터)
              </TabsTrigger>
              <TabsTrigger value="realtime" className="gap-2">
                <Zap className="w-4 h-4" /> 실시간 (CODEF)
              </TabsTrigger>
              <TabsTrigger value="openbanking" className="gap-2">
                <Wallet className="w-4 h-4" /> OpenBanking
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap gap-4 items-end">
            {(dataSource === "realtime" || dataSource === "openbanking") && (
              <div className="flex-1 min-w-[200px] space-y-1">
                <label className="text-xs font-bold text-muted-foreground">계좌 선택</label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger><SelectValue placeholder="계좌를 선택하세요" /></SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((a) => dataSource === "realtime" ? a.business_type === "BK" : a.business_type === "OB")
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {BANK_NAMES[a.organization] || a.organization} - {a.account_alias || a.account_number || "전체"}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">시작일</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">종료일</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
            </div>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input placeholder="적요 검색..." className="pl-9" value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>

          {/* Drive mapping warning */}
          {dataSource === "drive" && !hasDriveMapping && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span>
                은행 거래내역 Drive 폴더가 미설정입니다. 
                <Button variant="link" className="text-amber-800 underline h-auto p-0 ml-1"
                  onClick={() => navigate("/admin/drive-settings")}>
                  저장소 설정
                </Button>에서 'bank_transactions' 폴더를 등록하세요.
              </span>
            </div>
          )}

          {/* Drive file info */}
          {dataSource === "drive" && driveFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {driveFiles.map((f, i) => (
                <Badge key={i} variant="secondary" className="text-xs font-mono">
                  📄 {f.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary cards */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600"><Wallet /></div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">최근 잔액</p>
                <p className="text-2xl font-black text-foreground">{formatCurrency(lastBalance)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600"><ArrowUpCircle /></div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">기간 입금</p>
                <p className="text-2xl font-black text-emerald-600">+ {formatCurrency(totalIn)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-rose-50 text-rose-600"><ArrowDownCircle /></div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">기간 출금</p>
                <p className="text-2xl font-black text-rose-600">- {formatCurrency(totalOut)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {accounts.length === 0 && !loading && dataSource === "realtime" && (
        <Card className="border-none shadow-md">
          <CardContent className="p-12 text-center space-y-3">
            <Landmark className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-lg font-bold text-foreground">등록된 계좌가 없습니다</p>
            <p className="text-sm text-muted-foreground">금융 연동 설정에서 계좌를 등록해주세요.</p>
            <Button onClick={() => navigate("/admin/finance-settings")} className="mt-2">금융 연동 설정</Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {(transactions.length > 0 || loading) && (
        <Card className="border-none shadow-lg rounded-2xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-32">거래일시</TableHead>
                <TableHead>적요</TableHead>
                <TableHead className="text-right">입금</TableHead>
                <TableHead className="text-right">출금</TableHead>
                <TableHead className="text-right">잔액</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                    <RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2" />
                    {dataSource === "drive" ? "Drive에서 데이터를 불러오는 중..." : "거래내역을 조회 중..."}
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                    거래내역이 없습니다.
                  </TableCell>
                </TableRow>
              ) : filtered.map((t, idx) => {
                const inAmt = parseInt(t.resAccountIn || "0", 10);
                const outAmt = parseInt(t.resAccountOut || "0", 10);
                return (
                  <TableRow key={idx} className="hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {t.resAccountTrDate || ""} {t.resAccountTrTime || ""}
                    </TableCell>
                    <TableCell className="font-bold text-foreground">
                      {[t.resAccountDesc2, t.resAccountDesc3].filter(Boolean).join(" / ") || t.resAccountDesc1 || "-"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-blue-600">
                      {inAmt > 0 ? `+ ${formatCurrency(inAmt)}` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-rose-600">
                      {outAmt > 0 ? `- ${formatCurrency(outAmt)}` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-muted-foreground">
                      {formatCurrency(t.resAfterTranBalance || "0")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default BankTransactions;
