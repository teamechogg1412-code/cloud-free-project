import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Flower2, Plus, ArrowLeft, Send, Check, X, Clock, FileText, Loader2, ExternalLink, PenTool, MapPin, Search,
} from "lucide-react";
import { toast } from "sonner";

interface FlowerRequest {
  id: string;
  tenant_id: string;
  requester_user_id: string;
  request_date: string;
  category: string;
  request_type: string;
  recipient_name: string;
  amount: number;
  has_receipt: boolean;
  receipt_link: string | null;
  relationship: string | null;
  recipient_contact: string | null;
  delivery_address: string | null;
  message_text: string | null;
  notes: string | null;
  flower_shop_url: string | null;
  status: string;
  approvers: ApproverInfo[];
  payment_date: string | null;
  created_at: string;
}

interface ApproverInfo {
  user_id: string;
  name: string;
  job_title: string;
  step: number;
  status: "pending" | "approved" | "rejected";
  signed_at: string | null;
  signature_url: string | null;
  comment: string | null;
}

interface TenantMember {
  user_id: string;
  full_name: string | null;
  job_title: string | null;
  department: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "작성중", color: "bg-slate-100 text-slate-700" },
  pending: { label: "결재대기", color: "bg-yellow-100 text-yellow-800" },
  approved: { label: "승인완료", color: "bg-green-100 text-green-800" },
  rejected: { label: "반려", color: "bg-red-100 text-red-800" },
  completed: { label: "처리완료", color: "bg-blue-100 text-blue-800" },
};

const FlowerRequestPage = () => {
  const { user, profile, currentTenant, isCompanyAdmin } = useAuth();
  const [requests, setRequests] = useState<FlowerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<FlowerRequest | null>(null);
  const [tenantMembers, setTenantMembers] = useState<TenantMember[]>([]);
  const [userApprovalLines, setUserApprovalLines] = useState<{ user_id: string; name: string; job_title: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("my-requests");
  const [approvalComment, setApprovalComment] = useState("");

  // Form state
  const [form, setForm] = useState({
    category: "경조",
    request_type: "화환",
    recipient_name: "",
    amount: 100000,
    relationship: "",
    recipient_contact: "",
    delivery_address: "",
    message_text: "",
    flower_shop_url: "https://primeflower.kr/",
    receipt_link: "",
    notes: "",
  });

  // Custom approvers for this request
  const [selectedApprovers, setSelectedApprovers] = useState<{ user_id: string; name: string; job_title: string }[]>([]);

  useEffect(() => {
    if (!user || !currentTenant) return;
    loadData();
  }, [user, currentTenant]);

  const loadData = async () => {
    if (!user || !currentTenant) return;
    setLoading(true);

    try {
      // Load requests (my requests + requests where I'm an approver)
      const { data: myRequests } = await supabase
        .from("flower_requests")
        .select("*")
        .eq("tenant_id", currentTenant.tenant_id)
        .order("created_at", { ascending: false });

      if (myRequests) setRequests(myRequests as unknown as FlowerRequest[]);

      // Load tenant members for approver selection
      const { data: members } = await supabase
        .from("tenant_memberships")
        .select("user_id, job_title, department")
        .eq("tenant_id", currentTenant.tenant_id);

      if (members) {
        const memberIds = members.map((m: any) => m.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", memberIds);

        const nameMap = new Map((profilesData || []).map((p: any) => [p.id, p.full_name]));
        setTenantMembers(
          members.map((m: any) => ({
            ...m,
            full_name: nameMap.get(m.user_id) || "이름 없음",
          }))
        );
      }

      // Load user's default approval lines
      const { data: approvalData } = await supabase
        .from("approval_lines")
        .select("approver_user_id, step_order")
        .eq("user_id", user.id)
        .eq("tenant_id", currentTenant.tenant_id)
        .order("step_order", { ascending: true });

      if (approvalData && approvalData.length > 0) {
        const approverIds = approvalData.map((a: any) => a.approver_user_id);
        const { data: approverProfiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", approverIds);

        const nameMap2 = new Map((approverProfiles || []).map((p: any) => [p.id, p.full_name]));

        const lines = approvalData.map((a: any) => {
          const member = members?.find((m: any) => m.user_id === a.approver_user_id);
          return {
            user_id: a.approver_user_id,
            name: nameMap2.get(a.approver_user_id) || "이름 없음",
            job_title: member?.job_title || "",
          };
        });
        setUserApprovalLines(lines);
        setSelectedApprovers(lines);
      }
    } catch (err: any) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      category: "경조",
      request_type: "화환",
      recipient_name: "",
      amount: 100000,
      relationship: "",
      recipient_contact: "",
      delivery_address: "",
      message_text: "",
      flower_shop_url: "https://primeflower.kr/",
      receipt_link: "",
      notes: "",
    });
    setSelectedApprovers([...userApprovalLines]);
  };

  const openNewForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openAddressSearch = () => {
    const daum = (window as any).daum;
    if (!daum?.Postcode) {
      toast.error("주소 검색 서비스를 불러올 수 없습니다.");
      return;
    }
    new daum.Postcode({
      oncomplete: (data: any) => {
        const fullAddr = data.roadAddress || data.jibunAddress;
        setForm((prev) => ({ ...prev, delivery_address: fullAddr }));
      },
    }).open();
  };

  const addApprover = () => {
    setSelectedApprovers((prev) => [...prev, { user_id: "", name: "", job_title: "" }]);
  };

  const removeApprover = (index: number) => {
    setSelectedApprovers((prev) => prev.filter((_, i) => i !== index));
  };

  const updateApprover = (index: number, userId: string) => {
    const member = tenantMembers.find((m) => m.user_id === userId);
    setSelectedApprovers((prev) =>
      prev.map((a, i) =>
        i === index
          ? { user_id: userId, name: member?.full_name || "", job_title: member?.job_title || "" }
          : a
      )
    );
  };

  const handleSubmit = async () => {
    if (!user || !currentTenant) return;
    if (!form.recipient_name.trim()) {
      toast.error("대상자 이름을 입력해주세요.");
      return;
    }
    if (selectedApprovers.length === 0 || selectedApprovers.some((a) => !a.user_id)) {
      toast.error("결재자를 모두 지정해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const approvers: ApproverInfo[] = selectedApprovers.map((a, i) => ({
        user_id: a.user_id,
        name: a.name,
        job_title: a.job_title,
        step: i + 1,
        status: "pending",
        signed_at: null,
        signature_url: null,
        comment: null,
      }));

      const payload = {
        tenant_id: currentTenant.tenant_id,
        requester_user_id: user.id,
        category: form.category,
        request_type: form.request_type,
        recipient_name: form.recipient_name,
        amount: form.amount,
        relationship: form.relationship || null,
        recipient_contact: form.recipient_contact || null,
        delivery_address: form.delivery_address || null,
        message_text: form.message_text || null,
        flower_shop_url: form.flower_shop_url || null,
        receipt_link: form.receipt_link || null,
        notes: form.notes || null,
        status: "pending",
        approvers,
      };

      const { error } = await supabase.from("flower_requests").insert(payload);
      if (error) throw error;

      toast.success("화환 신청서가 제출되었습니다.");
      setShowForm(false);
      await loadData();
    } catch (err: any) {
      toast.error("제출 실패: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproval = async (request: FlowerRequest, action: "approved" | "rejected") => {
    if (!user) return;

    try {
      const updatedApprovers = request.approvers.map((a) => {
        if (a.user_id === user.id && a.status === "pending") {
          return {
            ...a,
            status: action,
            signed_at: new Date().toISOString(),
            comment: approvalComment || null,
          };
        }
        return a;
      });

      // Check if all approvers have approved
      const allApproved = updatedApprovers.every((a) => a.status === "approved");
      const anyRejected = updatedApprovers.some((a) => a.status === "rejected");

      const newStatus = anyRejected ? "rejected" : allApproved ? "approved" : "pending";

      const { error } = await supabase
        .from("flower_requests")
        .update({
          approvers: updatedApprovers,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (error) throw error;

      toast.success(action === "approved" ? "승인되었습니다." : "반려되었습니다.");
      setSelectedRequest(null);
      setApprovalComment("");
      await loadData();
    } catch (err: any) {
      toast.error("처리 실패: " + err.message);
    }
  };

  const myRequests = requests.filter((r) => r.requester_user_id === user?.id);
  const pendingApprovals = requests.filter(
    (r) =>
      r.status === "pending" &&
      r.approvers.some((a) => a.user_id === user?.id && a.status === "pending")
  );
  const allRequests = requests;

  const getRequesterName = (userId: string) => {
    const member = tenantMembers.find((m) => m.user_id === userId);
    return member?.full_name || "알 수 없음";
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount) + "원";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Flower2 className="w-7 h-7 text-pink-500" />
            화환 · 경조사비 신청
          </h1>
          <p className="text-muted-foreground mt-1">경조사비 최대 20만원 · 화환금액 10만원 고정</p>
        </div>
        <Button onClick={openNewForm} className="gap-2">
          <Plus className="w-4 h-4" /> 새 신청
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="my-requests" className="gap-2">
            <FileText className="w-4 h-4" /> 내 신청 ({myRequests.length})
          </TabsTrigger>
          <TabsTrigger value="pending-approvals" className="gap-2">
            <Clock className="w-4 h-4" /> 결재대기 ({pendingApprovals.length})
          </TabsTrigger>
          {isCompanyAdmin && (
            <TabsTrigger value="all" className="gap-2">
              <Flower2 className="w-4 h-4" /> 전체 ({allRequests.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-requests">
          <RequestTable
            requests={myRequests}
            getRequesterName={getRequesterName}
            formatAmount={formatAmount}
            onSelect={setSelectedRequest}
          />
        </TabsContent>

        <TabsContent value="pending-approvals">
          <RequestTable
            requests={pendingApprovals}
            getRequesterName={getRequesterName}
            formatAmount={formatAmount}
            onSelect={setSelectedRequest}
          />
        </TabsContent>

        {isCompanyAdmin && (
          <TabsContent value="all">
            <RequestTable
              requests={allRequests}
              getRequesterName={getRequesterName}
              formatAmount={formatAmount}
              onSelect={setSelectedRequest}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* New Request Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flower2 className="w-5 h-5 text-pink-500" />
              화환 · 경조사비 신청서
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* 신청 정보 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground border-b pb-2">신청 정보</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>신청자</Label>
                  <Input value={profile?.full_name || ""} disabled className="bg-muted" />
                </div>
                <div>
                  <Label>신청일</Label>
                  <Input value={new Date().toISOString().split("T")[0]} disabled className="bg-muted" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>구분</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="경조">경조</SelectItem>
                      <SelectItem value="조의">조의</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>내역</Label>
                  <Select value={form.request_type} onValueChange={(v) => setForm({ ...form, request_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="화환">화환</SelectItem>
                      <SelectItem value="조의금">조의금</SelectItem>
                      <SelectItem value="축의금">축의금</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>대상자</Label>
                  <Input
                    placeholder="예: 홍길동"
                    value={form.recipient_name}
                    onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>금액</Label>
                  <Input value="100,000원" disabled className="bg-muted" />
                </div>
              </div>
            </div>

            {/* 발송 정보 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground border-b pb-2">발송 정보 (화환)</h3>

              <div>
                <Label>관계</Label>
                <Input
                  placeholder="예: [코카콜라] 에이전시 담당자"
                  value={form.relationship}
                  onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>화환받는 사람 / 연락처</Label>
                  <Input
                    placeholder="XXX-XXXX-XXXX"
                    value={form.recipient_contact}
                    onChange={(e) => setForm({ ...form, recipient_contact: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>발송지 주소 <span className="text-xs text-muted-foreground ml-1">(상호명·건물명으로도 검색 가능)</span></Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="상호명, 건물명 또는 도로명으로 검색"
                      value={form.delivery_address}
                      readOnly
                      className="flex-1 cursor-pointer"
                      onClick={() => openAddressSearch()}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => openAddressSearch()}
                      title="주소 검색"
                    >
                      <MapPin className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <Label>문구</Label>
                <Input
                  placeholder="예: (주) 에코글로벌그룹 마틴대표,다니엘헤니"
                  value={form.message_text}
                  onChange={(e) => setForm({ ...form, message_text: e.target.value })}
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  화환업체
                  {form.flower_shop_url && (
                    <a href={form.flower_shop_url} target="_blank" rel="noopener noreferrer" className="text-primary">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="업체 URL 직접 입력 또는 검색"
                    value={form.flower_shop_url}
                    onChange={(e) => setForm({ ...form, flower_shop_url: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1"
                    onClick={() => {
                      const query = encodeURIComponent("꽃배달 " + (form.delivery_address || ""));
                      window.open(`https://map.naver.com/p/search/${query}`, "_blank");
                    }}
                  >
                    <Search className="w-3.5 h-3.5" /> 꽃집 검색
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">네이버 지도에서 꽃집을 검색한 뒤 URL을 붙여넣으세요</p>
              </div>

              <div>
                <Label>증빙 링크</Label>
                <Input
                  placeholder="https://mcard.itscard.co.kr/"
                  value={form.receipt_link}
                  onChange={(e) => setForm({ ...form, receipt_link: e.target.value })}
                />
              </div>

              <div>
                <Label>비고</Label>
                <Textarea
                  placeholder="추가 메모사항"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            {/* 결재선 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-muted-foreground border-b pb-2 flex-1">결재선 지정</h3>
                <Button variant="outline" size="sm" onClick={addApprover} className="gap-1">
                  <Plus className="w-3 h-3" /> 추가
                </Button>
              </div>

              {selectedApprovers.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  마이페이지에서 기본 결재선을 설정하거나, 여기서 직접 추가하세요.
                </p>
              )}

              {selectedApprovers.map((approver, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <Badge variant="secondary" className="shrink-0">{idx + 1}차</Badge>
                  <Select value={approver.user_id} onValueChange={(v) => updateApprover(idx, v)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="결재자 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenantMembers
                        .filter((m) => m.user_id !== user?.id)
                        .map((m) => (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {m.full_name} {m.job_title ? `(${m.job_title})` : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => removeApprover(idx)}>
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowForm(false)}>취소</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              제출
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Detail / Approval Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => { setSelectedRequest(null); setApprovalComment(""); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Flower2 className="w-5 h-5 text-pink-500" />
                  화환 · 경조사비 신청서 상세
                  <Badge className={statusConfig[selectedRequest.status]?.color || ""}>
                    {statusConfig[selectedRequest.status]?.label || selectedRequest.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* 기본 정보 테이블 */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-slate-800 text-white px-4 py-2 text-sm font-semibold">신청 정보</div>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium w-32 bg-sky-50">신청자</TableCell>
                        <TableCell>{getRequesterName(selectedRequest.requester_user_id)}</TableCell>
                        <TableCell className="font-medium w-32 bg-sky-50">신청일</TableCell>
                        <TableCell>{selectedRequest.request_date}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-sky-50">구분</TableCell>
                        <TableCell>{selectedRequest.category}</TableCell>
                        <TableCell className="font-medium bg-sky-50">내역</TableCell>
                        <TableCell>{selectedRequest.request_type}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-sky-50">대상자</TableCell>
                        <TableCell>{selectedRequest.recipient_name}</TableCell>
                        <TableCell className="font-medium bg-sky-50">금액</TableCell>
                        <TableCell className="font-bold">{formatAmount(selectedRequest.amount)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* 발송 정보 */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-slate-800 text-white px-4 py-2 text-sm font-semibold">발송 정보</div>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium w-32 bg-sky-50">관계</TableCell>
                        <TableCell>{selectedRequest.relationship || "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-sky-50">연락처</TableCell>
                        <TableCell>{selectedRequest.recipient_contact || "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-sky-50">발송지 주소</TableCell>
                        <TableCell>{selectedRequest.delivery_address || "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-sky-50">문구</TableCell>
                        <TableCell>{selectedRequest.message_text || "-"}</TableCell>
                      </TableRow>
                      {selectedRequest.flower_shop_url && (
                        <TableRow>
                          <TableCell className="font-medium bg-sky-50">화환업체</TableCell>
                          <TableCell>
                            <a href={selectedRequest.flower_shop_url} target="_blank" rel="noopener noreferrer" className="text-primary underline flex items-center gap-1">
                              {selectedRequest.flower_shop_url} <ExternalLink className="w-3 h-3" />
                            </a>
                          </TableCell>
                        </TableRow>
                      )}
                      {selectedRequest.receipt_link && (
                        <TableRow>
                          <TableCell className="font-medium bg-sky-50">증빙</TableCell>
                          <TableCell>
                            <a href={selectedRequest.receipt_link} target="_blank" rel="noopener noreferrer" className="text-primary underline flex items-center gap-1">
                              증빙 링크 <ExternalLink className="w-3 h-3" />
                            </a>
                          </TableCell>
                        </TableRow>
                      )}
                      {selectedRequest.notes && (
                        <TableRow>
                          <TableCell className="font-medium bg-sky-50">비고</TableCell>
                          <TableCell className="whitespace-pre-wrap">{selectedRequest.notes}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* 결재선 */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-slate-800 text-white px-4 py-2 text-sm font-semibold">결재선</div>
                  <div className="p-4 space-y-3">
                    {selectedRequest.approvers.map((approver, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Badge variant="outline">{approver.step}차</Badge>
                        <div className="flex-1">
                          <span className="font-medium">{approver.name}</span>
                          {approver.job_title && (
                            <span className="text-muted-foreground ml-1">({approver.job_title})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {approver.status === "approved" && (
                            <>
                              <Check className="w-4 h-4 text-green-600" />
                              <Badge className="bg-green-100 text-green-800">승인</Badge>
                            </>
                          )}
                          {approver.status === "rejected" && (
                            <>
                              <X className="w-4 h-4 text-red-600" />
                              <Badge className="bg-red-100 text-red-800">반려</Badge>
                            </>
                          )}
                          {approver.status === "pending" && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <Clock className="w-3 h-3 mr-1" /> 대기
                            </Badge>
                          )}
                        </div>
                        {approver.signed_at && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(approver.signed_at).toLocaleDateString("ko-KR")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Approval actions for approvers */}
                {selectedRequest.status === "pending" &&
                  selectedRequest.approvers.some((a) => a.user_id === user?.id && a.status === "pending") && (
                    <div className="space-y-3 border rounded-lg p-4 bg-amber-50/50">
                      <h4 className="font-semibold flex items-center gap-2">
                        <PenTool className="w-4 h-4" /> 결재 처리
                      </h4>
                      <Textarea
                        placeholder="코멘트 (선택사항)"
                        value={approvalComment}
                        onChange={(e) => setApprovalComment(e.target.value)}
                        rows={2}
                      />
                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleApproval(selectedRequest, "approved")}
                          className="gap-2 flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4" /> 승인
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleApproval(selectedRequest, "rejected")}
                          className="gap-2 flex-1"
                        >
                          <X className="w-4 h-4" /> 반려
                        </Button>
                      </div>
                    </div>
                  )}

                {/* Admin: Mark as completed */}
                {isCompanyAdmin && selectedRequest.status === "approved" && (
                  <div className="flex justify-end">
                    <Button
                      onClick={async () => {
                        await supabase
                          .from("flower_requests")
                          .update({ status: "completed", payment_date: new Date().toISOString().split("T")[0] })
                          .eq("id", selectedRequest.id);
                        toast.success("처리 완료로 변경되었습니다.");
                        setSelectedRequest(null);
                        await loadData();
                      }}
                      className="gap-2"
                    >
                      <Check className="w-4 h-4" /> 처리 완료
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Request List Table Component
const RequestTable = ({
  requests,
  getRequesterName,
  formatAmount,
  onSelect,
}: {
  requests: FlowerRequest[];
  getRequesterName: (id: string) => string;
  formatAmount: (n: number) => string;
  onSelect: (r: FlowerRequest) => void;
}) => {
  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <Flower2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>신청 내역이 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>신청일</TableHead>
              <TableHead>신청자</TableHead>
              <TableHead>구분</TableHead>
              <TableHead>내역</TableHead>
              <TableHead>대상자</TableHead>
              <TableHead className="text-right">금액</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSelect(r)}
              >
                <TableCell className="text-sm">{r.request_date}</TableCell>
                <TableCell>{getRequesterName(r.requester_user_id)}</TableCell>
                <TableCell>{r.category}</TableCell>
                <TableCell>{r.request_type}</TableCell>
                <TableCell className="font-medium">{r.recipient_name}</TableCell>
                <TableCell className="text-right">{formatAmount(r.amount)}</TableCell>
                <TableCell>
                  <Badge className={statusConfig[r.status]?.color || ""}>
                    {statusConfig[r.status]?.label || r.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default FlowerRequestPage;
