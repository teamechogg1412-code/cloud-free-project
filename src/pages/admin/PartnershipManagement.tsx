import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Handshake, Plus, Check, X, Loader2, Send, Building2, Eye, Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getCompanyTypeBadge } from "@/lib/companyTypes";

interface Partnership {
  id: string;
  requester_tenant_id: string;
  target_tenant_id: string;
  status: string;
  data_scopes: string[];
  message: string | null;
  invited_by: string | null;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
  requester_tenant?: { id: string; name: string; company_type: string | null };
  target_tenant?: { id: string; name: string; company_type: string | null };
}

const DATA_SCOPE_OPTIONS = [
  { value: "artists", label: "배우/아티스트 정보", desc: "프로필, 포트폴리오" },
  { value: "schedules", label: "배우 스케줄", desc: "일정 가용성 공유 (상세 내용 비공개)" },
  { value: "projects", label: "프로젝트 정보", desc: "진행 사업 및 일정" },
  { value: "production", label: "제작 정보", desc: "제작 관련 데이터 공유" },
  { value: "hr", label: "인사 정보", desc: "직원 명부 및 조직도" },
  { value: "finance", label: "재무 정보", desc: "카드 내역, 청구서, 정산" },
  { value: "keywords", label: "키워드/미디어", desc: "모니터링 키워드 및 언론 데이터" },
];

const PartnershipManagement = () => {
  const { currentTenant, profile } = useAuth();
  const navigate = useNavigate();
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [allTenants, setAllTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  // 새 파트너십 폼
  const [targetTenantId, setTargetTenantId] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [inviteMessage, setInviteMessage] = useState("");

  const myTenantId = currentTenant?.tenant_id;

  const fetchData = async () => {
    if (!myTenantId) return;
    setLoading(true);
    try {
      // 파트너십 목록 (양방향 조회)
      const { data: pData, error: pError } = await supabase
        .from("tenant_partnerships")
        .select(`
          *,
          requester_tenant:requester_tenant_id ( id, name, company_type ),
          target_tenant:target_tenant_id ( id, name, company_type )
        ` as any)
        .or(`requester_tenant_id.eq.${myTenantId},target_tenant_id.eq.${myTenantId}`)
        .order("created_at", { ascending: false });

      if (pError) throw pError;
      setPartnerships((pData || []) as unknown as Partnership[]);

      // 전체 테넌트 목록 (초대 대상 선택용)
      const { data: tData } = await supabase
        .from("tenants")
        .select("id, name, company_type")
        .neq("id", myTenantId)
        .order("name");
      setAllTenants(tData || []);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [myTenantId]);

  const handleInvite = async () => {
    if (!targetTenantId || selectedScopes.length === 0) {
      toast.error("대상 회사와 공유할 데이터를 선택해주세요.");
      return;
    }
    setProcessing(true);
    try {
      const { error } = await supabase.from("tenant_partnerships").insert({
        requester_tenant_id: myTenantId,
        target_tenant_id: targetTenantId,
        data_scopes: selectedScopes,
        message: inviteMessage || null,
        invited_by: profile?.id,
      } as any);

      if (error) {
        if (error.code === "23505") {
          toast.error("이미 해당 회사와의 파트너십이 존재합니다.");
        } else {
          throw error;
        }
      } else {
        toast.success("파트너십 초대가 전송되었습니다.");
        setIsDialogOpen(false);
        resetForm();
        fetchData();
      }
    } catch (error: any) {
      toast.error("초대 실패: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleAccept = async (partnership: Partnership) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("tenant_partnerships")
        .update({
          status: "active",
          accepted_by: profile?.id,
          accepted_at: new Date().toISOString(),
        } as any)
        .eq("id", partnership.id);
      if (error) throw error;
      toast.success("파트너십이 수락되었습니다!");
      fetchData();
    } catch (error: any) {
      toast.error("수락 실패: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (partnership: Partnership) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("tenant_partnerships")
        .update({ status: "rejected" } as any)
        .eq("id", partnership.id);
      if (error) throw error;
      toast.success("파트너십을 거절했습니다.");
      fetchData();
    } catch (error: any) {
      toast.error("거절 실패: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleRevoke = async (partnership: Partnership) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("tenant_partnerships")
        .update({ status: "revoked" } as any)
        .eq("id", partnership.id);
      if (error) throw error;
      toast.success("파트너십이 해제되었습니다.");
      fetchData();
    } catch (error: any) {
      toast.error("해제 실패: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setTargetTenantId("");
    setSelectedScopes([]);
    setInviteMessage("");
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  // 파트너십 분류
  const pendingReceived = partnerships.filter(p => p.status === "pending" && p.target_tenant_id === myTenantId);
  const pendingSent = partnerships.filter(p => p.status === "pending" && p.requester_tenant_id === myTenantId);
  const activePartners = partnerships.filter(p => p.status === "active");
  const inactivePartners = partnerships.filter(p => ["rejected", "revoked"].includes(p.status));

  const getPartnerName = (p: Partnership) => {
    const other = p.requester_tenant_id === myTenantId ? p.target_tenant : p.requester_tenant;
    return other?.name || "알 수 없음";
  };

  const getPartnerType = (p: Partnership) => {
    const other = p.requester_tenant_id === myTenantId ? p.target_tenant : p.requester_tenant;
    return other?.company_type || "talent_agency";
  };

  const getScopeLabel = (scope: string) => {
    return DATA_SCOPE_OPTIONS.find(o => o.value === scope)?.label || scope;
  };

  // 이미 파트너십이 있는 테넌트 제외
  const existingPartnerIds = new Set(partnerships.filter(p => p.status !== "rejected" && p.status !== "revoked").map(p =>
    p.requester_tenant_id === myTenantId ? p.target_tenant_id : p.requester_tenant_id
  ));
  const availableTenants = allTenants.filter(t => !existingPartnerIds.has(t.id));

  const statusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">활성</Badge>;
      case "pending": return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">대기중</Badge>;
      case "rejected": return <Badge variant="destructive">거절됨</Badge>;
      case "revoked": return <Badge variant="secondary">해제됨</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="pt-28 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="pt-28 pb-16 px-6 max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1">
              <Handshake className="w-5 h-5" /> Partnership Hub
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">파트너사 관리</h1>
            <p className="text-slate-500 mt-1">외부 파트너 회사와의 데이터 공유 및 협업을 관리합니다.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate("/admin")} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> 관리 시스템
            </Button>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" /> 파트너 초대
            </Button>
          </div>
        </div>

        {/* 수신된 초대 */}
        {pendingReceived.length > 0 && (
          <Card className="mb-6 border-2 border-amber-400 bg-amber-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
                <Send className="w-5 h-5" /> 받은 파트너십 요청 ({pendingReceived.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingReceived.map((p) => (
                <div key={p.id} className="bg-white rounded-xl p-5 border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg">{getPartnerName(p)}</span>
                      <Badge variant="outline" className="text-xs">{getCompanyTypeBadge(getPartnerType(p))}</Badge>
                    </div>
                    {p.message && <p className="text-sm text-slate-600 mb-2">"{p.message}"</p>}
                    <div className="flex flex-wrap gap-1.5">
                      {p.data_scopes.map(s => (
                        <Badge key={s} variant="secondary" className="text-xs">{getScopeLabel(s)}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700" onClick={() => handleAccept(p)} disabled={processing}>
                      <Check className="w-4 h-4" /> 수락
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1 text-red-500 hover:text-red-700" onClick={() => handleReject(p)} disabled={processing}>
                      <X className="w-4 h-4" /> 거절
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 활성 파트너십 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Handshake className="w-5 h-5 text-green-600" /> 활성 파트너십 ({activePartners.length})
            </CardTitle>
            <CardDescription>현재 데이터를 공유하고 있는 파트너 회사입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {activePartners.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Handshake className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">아직 활성화된 파트너십이 없습니다.</p>
                <p className="text-sm mt-1">파트너 초대 버튼으로 협업할 회사를 연결하세요.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activePartners.map(p => (
                  <div key={p.id} className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-slate-400" />
                          <span className="font-bold text-lg">{getPartnerName(p)}</span>
                        </div>
                        <Badge variant="outline" className="text-xs mt-1">{getCompanyTypeBadge(getPartnerType(p))}</Badge>
                      </div>
                      {statusBadge(p.status)}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {p.data_scopes.map(s => (
                        <Badge key={s} className="bg-blue-50 text-blue-700 hover:bg-blue-50 text-xs">{getScopeLabel(s)}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>연결일: {p.accepted_at ? new Date(p.accepted_at).toLocaleDateString() : "-"}</span>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 h-7 text-xs" onClick={() => handleRevoke(p)}>
                        파트너 해제
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 보낸 초대 (대기중) */}
        {pendingSent.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-slate-600">
                <Send className="w-5 h-5" /> 보낸 요청 ({pendingSent.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingSent.map(p => (
                <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{getPartnerName(p)}</span>
                    <Badge variant="outline" className="text-xs">{getCompanyTypeBadge(getPartnerType(p))}</Badge>
                    {statusBadge(p.status)}
                  </div>
                  <span className="text-xs text-slate-400">{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 비활성 파트너십 */}
        {inactivePartners.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-slate-400">종료된 파트너십 ({inactivePartners.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {inactivePartners.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50/50 opacity-60">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{getPartnerName(p)}</span>
                    {statusBadge(p.status)}
                  </div>
                  <span className="text-xs text-slate-400">{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 초대 다이얼로그 */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Handshake className="w-5 h-5 text-primary" /> 파트너십 초대
              </DialogTitle>
              <DialogDescription>
                협업할 회사를 선택하고, 공유할 데이터 범위를 지정하세요.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label>대상 회사 *</Label>
                <Select value={targetTenantId} onValueChange={setTargetTenantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="파트너 회사를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTenants.length === 0 ? (
                      <SelectItem value="__none" disabled>초대 가능한 회사가 없습니다</SelectItem>
                    ) : (
                      availableTenants.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({getCompanyTypeBadge(t.company_type || "talent_agency")})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>공유 데이터 범위 *</Label>
                <div className="space-y-2">
                  {DATA_SCOPE_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-slate-50 cursor-pointer transition-colors">
                      <Checkbox
                        checked={selectedScopes.includes(opt.value)}
                        onCheckedChange={() => toggleScope(opt.value)}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="font-medium text-sm">{opt.label}</span>
                        <p className="text-xs text-slate-500">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>초대 메시지 (선택)</Label>
                <Textarea
                  placeholder="파트너사에 전달할 메시지를 입력하세요..."
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>취소</Button>
              <Button onClick={handleInvite} disabled={processing || !targetTenantId || selectedScopes.length === 0} className="gap-2">
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                초대 전송
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default PartnershipManagement;
