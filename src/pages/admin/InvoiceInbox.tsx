import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  ArrowLeft, Copy, Plus, Link2, Loader2, FileText, ExternalLink,
  Sparkles, Eye, Receipt, Bell, BellDot
} from "lucide-react";
import { toast } from "sonner";

interface InvoiceLink {
  id: string;
  token: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
}

interface ExternalInvoice {
  id: string;
  vendor_name: string;
  vendor_company: string | null;
  vendor_email: string | null;
  vendor_phone: string | null;
  description: string | null;
  total_amount: number;
  file_urls: string[];
  extracted_data: any;
  status: string;
  created_at: string;
  link_token: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  metadata: any;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "대기", variant: "default" },
  reviewing: { label: "검토중", variant: "secondary" },
  converted: { label: "결의서 전환", variant: "outline" },
  rejected: { label: "반려", variant: "destructive" },
};

const InvoiceInbox = () => {
  const navigate = useNavigate();
  const { user, currentTenant } = useAuth();
  const [links, setLinks] = useState<InvoiceLink[]>([]);
  const [invoices, setInvoices] = useState<ExternalInvoice[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("inbox");
  const [selectedInvoice, setSelectedInvoice] = useState<ExternalInvoice | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);

  const tenantId = currentTenant?.tenant_id;

  const fetchData = useCallback(async () => {
    if (!user || !tenantId) return;
    setLoading(true);
    const [linksRes, invoicesRes, notifRes] = await Promise.all([
      supabase.from("invoice_links").select("*").eq("tenant_id", tenantId).eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("external_invoices").select("*").eq("tenant_id", tenantId).eq("assigned_to", user.id).order("created_at", { ascending: false }),
      supabase.from("notifications").select("*").eq("user_id", user.id).eq("type", "invoice_received").eq("is_read", false).order("created_at", { ascending: false }).limit(20),
    ]);
    setLinks(linksRes.data || []);
    setInvoices(invoicesRes.data || []);
    setNotifications(notifRes.data || []);
    setLoading(false);
  }, [user, tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Mark notifications as read when viewing inbox
  useEffect(() => {
    if (tab === "inbox" && notifications.length > 0 && user) {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length > 0) {
        supabase.from("notifications").update({ is_read: true }).in("id", unreadIds).then(() => {
          setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        });
      }
    }
  }, [tab, notifications.length]);

  const createLink = async () => {
    if (!user || !tenantId) return;
    setCreatingLink(true);
    const { error } = await supabase.from("invoice_links").insert({
      tenant_id: tenantId,
      user_id: user.id,
      label: newLinkLabel.trim() || null,
    });
    if (error) { toast.error("링크 생성 실패"); }
    else { toast.success("청구 링크가 생성되었습니다."); setShowLinkDialog(false); setNewLinkLabel(""); }
    setCreatingLink(false);
    fetchData();
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/invoice/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("링크가 복사되었습니다.");
  };

  const toggleLink = async (link: InvoiceLink) => {
    await supabase.from("invoice_links").update({ is_active: !link.is_active }).eq("id", link.id);
    fetchData();
  };

  const extractInvoice = async (invoice: ExternalInvoice) => {
    if (!invoice.file_urls?.length) { toast.error("첨부 파일이 없습니다."); return; }
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-invoice", {
        body: { file_urls: invoice.file_urls, invoice_id: invoice.id },
      });
      if (error) throw error;
      if (data?.extracted) {
        await supabase.from("external_invoices")
          .update({ extracted_data: data.extracted, status: "reviewing" })
          .eq("id", invoice.id);
        toast.success("AI 추출이 완료되었습니다.");
        fetchData();
        setSelectedInvoice({ ...invoice, extracted_data: data.extracted, status: "reviewing" });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("AI 추출 중 오류가 발생했습니다.");
    } finally {
      setExtracting(false);
    }
  };

  const convertToExpense = async (invoice: ExternalInvoice) => {
    const extracted = invoice.extracted_data;
    const params = new URLSearchParams({
      from_invoice: invoice.id,
      title: `[외부청구] ${invoice.vendor_company || invoice.vendor_name}`,
      amount: String(invoice.total_amount || extracted?.total || 0),
      description: invoice.description || "",
    });

    // Pass extracted items as JSON for auto-fill
    if (extracted?.items?.length) {
      params.set("items", JSON.stringify(extracted.items.map((item: any) => ({
        description: item.description || "",
        amount: item.amount || 0,
        item_date: extracted.invoice_date || new Date().toISOString().split("T")[0],
      }))));
    }

    if (extracted?.invoice_date) {
      params.set("requested_date", extracted.invoice_date);
    }

    // Mark as converted
    await supabase.from("external_invoices")
      .update({ status: "converted" })
      .eq("id", invoice.id);

    navigate(`/expense-report?${params.toString()}`);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="pb-16 px-6 max-w-6xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">외부 청구함</h1>
          <p className="text-muted-foreground mt-1">거래처로부터 수신된 청구서를 관리하고 지출결의서로 전환합니다.</p>
        </div>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> 뒤로
        </Button>
      </div>

      {/* Unread notification banner */}
      {unreadCount > 0 && tab !== "inbox" && (
        <div className="mb-4 p-3 bg-primary/5 border border-primary/10 rounded-lg flex items-center gap-3 cursor-pointer" onClick={() => setTab("inbox")}>
          <BellDot className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">새 청구서 {unreadCount}건이 도착했습니다.</span>
          <Badge variant="default" className="ml-auto">{unreadCount}</Badge>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="inbox" className="relative">
            수신함 ({invoices.length})
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="links">내 청구 링크 ({links.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "links" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowLinkDialog(true)}>
              <Plus className="w-4 h-4 mr-1" /> 새 청구 링크 생성
            </Button>
          </div>

          {links.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Link2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>생성된 청구 링크가 없습니다.</p>
                <p className="text-sm mt-1">거래처에 공유할 청구 링크를 만들어보세요.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {links.map(link => (
                <Card key={link.id}>
                  <CardContent className="py-4 flex items-center gap-4">
                    <Link2 className={`w-5 h-5 shrink-0 ${link.is_active ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{link.label || "기본 링크"}</span>
                        <Badge variant={link.is_active ? "default" : "secondary"}>
                          {link.is_active ? "활성" : "비활성"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {window.location.origin}/invoice/{link.token}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => copyLink(link.token)}>
                        <Copy className="w-3.5 h-3.5 mr-1" /> 복사
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleLink(link)}>
                        {link.is_active ? "비활성화" : "활성화"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 청구 링크 생성</DialogTitle>
                <DialogDescription>
                  거래처에 공유할 고유 링크를 생성합니다. 이 링크로 접속하면 회사명이나 직원 목록이 노출되지 않습니다.
                </DialogDescription>
              </DialogHeader>
              <div>
                <Input
                  placeholder="링크 라벨 (예: 인쇄비 청구용)"
                  value={newLinkLabel}
                  onChange={e => setNewLinkLabel(e.target.value)}
                  maxLength={100}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowLinkDialog(false)}>취소</Button>
                <Button onClick={createLink} disabled={creatingLink}>
                  {creatingLink && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  생성
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {tab === "inbox" && (
        <div className="space-y-3">
          {invoices.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>수신된 청구서가 없습니다.</p>
                <p className="text-sm mt-1">"내 청구 링크" 탭에서 링크를 생성하여 거래처에 공유하세요.</p>
              </CardContent>
            </Card>
          ) : (
            invoices.map(inv => {
              const st = STATUS_MAP[inv.status] || STATUS_MAP.pending;
              return (
                <Card key={inv.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                  <CardContent className="py-4 flex items-center gap-4">
                    <FileText className="w-5 h-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{inv.vendor_company || inv.vendor_name}</span>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {inv.description || "설명 없음"} · ₩{Number(inv.total_amount).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(inv.created_at).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedInvoice && (
            <>
              <DialogHeader>
                <DialogTitle>청구서 상세</DialogTitle>
                <DialogDescription>
                  {selectedInvoice.vendor_company || selectedInvoice.vendor_name} 으로부터 수신
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">담당자</span>
                    <p className="font-medium">{selectedInvoice.vendor_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">업체명</span>
                    <p className="font-medium">{selectedInvoice.vendor_company || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">이메일</span>
                    <p className="font-medium">{selectedInvoice.vendor_email || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">연락처</span>
                    <p className="font-medium">{selectedInvoice.vendor_phone || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">청구 금액</span>
                    <p className="font-medium text-lg">₩{Number(selectedInvoice.total_amount).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">제출일</span>
                    <p className="font-medium">{new Date(selectedInvoice.created_at).toLocaleDateString("ko-KR")}</p>
                  </div>
                </div>

                {selectedInvoice.description && (
                  <div>
                    <span className="text-sm text-muted-foreground">비고</span>
                    <p className="text-sm mt-1 bg-muted/50 p-3 rounded-md">{selectedInvoice.description}</p>
                  </div>
                )}

                {/* Attached Files */}
                <div>
                  <span className="text-sm text-muted-foreground">첨부 파일</span>
                  <div className="mt-1 space-y-1">
                    {(selectedInvoice.file_urls || []).map((url: string, i: number) => {
                      const name = decodeURIComponent(url.split("/").pop() || `파일 ${i + 1}`);
                      return (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline">
                          <FileText className="w-4 h-4" />
                          <span className="truncate">{name}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      );
                    })}
                  </div>
                </div>

                {/* AI Extracted Data */}
                {selectedInvoice.extracted_data && Object.keys(selectedInvoice.extracted_data).length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> AI 추출 결과
                    </span>
                    <div className="mt-1 bg-primary/5 border border-primary/10 rounded-md p-3 text-sm space-y-1">
                      {selectedInvoice.extracted_data.items?.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between">
                          <span>{item.description}</span>
                          <span className="font-medium">₩{Number(item.amount || 0).toLocaleString()}</span>
                        </div>
                      ))}
                      {selectedInvoice.extracted_data.total && (
                        <div className="flex justify-between border-t pt-1 mt-1 font-bold">
                          <span>합계</span>
                          <span>₩{Number(selectedInvoice.extracted_data.total).toLocaleString()}</span>
                        </div>
                      )}
                      {selectedInvoice.extracted_data.vendor_info && (
                        <p className="text-xs text-muted-foreground mt-2">
                          발행자: {selectedInvoice.extracted_data.vendor_info}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                {selectedInvoice.status === "pending" && (
                  <Button variant="outline" onClick={() => extractInvoice(selectedInvoice)} disabled={extracting}>
                    {extracting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                    AI 자동 추출
                  </Button>
                )}
                {(selectedInvoice.status === "pending" || selectedInvoice.status === "reviewing") && (
                  <Button onClick={() => convertToExpense(selectedInvoice)}>
                    <Receipt className="w-4 h-4 mr-1" /> 지출결의서로 전환
                  </Button>
                )}
                {selectedInvoice.status === "converted" && (
                  <Badge variant="outline" className="text-sm py-2 px-4">✓ 지출결의서 전환 완료</Badge>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceInbox;
