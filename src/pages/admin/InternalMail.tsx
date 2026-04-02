import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { 
  Mail, Inbox, Send, Star, Trash2, Search, ArrowLeft, 
  Paperclip, Reply, Forward, Loader2, AlertCircle, Settings,
  ExternalLink, CheckSquare, Square, Archive, Tag, PenSquare, X
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MailItem {
  id: string;
  subject: string;
  sender: string;
  date: string;
  snippet: string;
  unread: boolean;
}

interface MailDetail {
  id: string;
  subject: string;
  sender: string;
  to: string;
  date: string;
  body: string;
  attachments: { id: string; filename: string; mimeType: string; size: number }[];
}

interface MailConfig {
  id: string;
  provider: string;
  is_active: boolean;
  google_email: string | null;
  nw_user_id: string | null;
}

type MailFolder = "INBOX" | "STARRED" | "SENT" | "TRASH";

const FOLDER_CONFIG: { key: MailFolder; label: string; icon: typeof Inbox }[] = [
  { key: "INBOX", label: "수신함", icon: Inbox },
  { key: "STARRED", label: "중요 메일", icon: Star },
  { key: "SENT", label: "보낸 메일함", icon: Send },
  { key: "TRASH", label: "휴지통", icon: Trash2 },
];

const InternalMail = () => {
  const navigate = useNavigate();
  const { user, currentTenant } = useAuth();
  const [configs, setConfigs] = useState<MailConfig[]>([]);
  const [activeConfig, setActiveConfig] = useState<MailConfig | null>(null);
  const [mails, setMails] = useState<MailItem[]>([]);
  const [selectedMailId, setSelectedMailId] = useState<string | null>(null);
  const [mailDetail, setMailDetail] = useState<MailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFolder, setActiveFolder] = useState<MailFolder>("INBOX");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  // Compose state
  const [composeMode, setComposeMode] = useState<"new" | "reply" | "forward" | null>(null);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);

  // Load mail configs
  useEffect(() => {
    if (!user || !currentTenant) return;
    const load = async () => {
      const { data } = await supabase
        .from("user_mail_configs")
        .select("id, provider, is_active, google_email, nw_user_id")
        .eq("user_id", user.id)
        .eq("tenant_id", currentTenant.tenant_id)
        .eq("is_active", true);

      if (data && data.length > 0) {
        setConfigs(data as MailConfig[]);
        setActiveConfig(data[0] as MailConfig);
      }
      setLoading(false);
    };
    load();
  }, [user, currentTenant]);

  // Fetch mails when active config or folder changes
  useEffect(() => {
    if (!activeConfig) return;
    fetchMails();
  }, [activeConfig, activeFolder]);

  const fetchMails = async () => {
    if (!activeConfig) return;
    setLoading(true);
    setSelectedMailId(null);
    setMailDetail(null);
    try {
      const res = await invokeEdgeFunction("fetch-mail", {
        body: {
          action: "list",
          configId: activeConfig.id,
          provider: activeConfig.provider,
          maxResults: 20,
          folder: activeFolder,
        },
      });

      if (res.error) throw res.error;
      if (res.data?.mails) {
        setMails(res.data.mails);
      } else if (res.data?.error) {
        toast.error(res.data.error);
      }
    } catch (e: any) {
      toast.error("메일 목록 불러오기 실패: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const readMail = async (mailId: string) => {
    if (!activeConfig) return;
    setSelectedMailId(mailId);
    setLoadingDetail(true);
    try {
      const res = await invokeEdgeFunction("fetch-mail", {
        body: {
          action: "read",
          configId: activeConfig.id,
          provider: activeConfig.provider,
          messageId: mailId,
        },
      });

      if (res.error) throw res.error;
      if (res.data) {
        setMailDetail(res.data as MailDetail);
      }
    } catch (e: any) {
      toast.error("메일 읽기 실패: " + e.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredMails = searchQuery
    ? mails.filter(m => 
        m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.sender.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : mails;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMails.map(m => m.id)));
    }
  };

  const getGmailBaseUrl = () => {
    if (activeConfig?.provider === "gmail" && activeConfig.google_email) {
      return `https://mail.google.com/mail/u/${activeConfig.google_email}`;
    }
    return "https://mail.google.com/mail";
  };

  const openInGmail = (messageId: string) => {
    window.open(`${getGmailBaseUrl()}/#inbox/${messageId}`, "_blank");
  };

  const handleCompose = () => {
    if (activeConfig?.provider !== "gmail") {
      toast.info("현재 Gmail만 메일 작성을 지원합니다.");
      return;
    }
    setComposeMode("new");
    setComposeTo("");
    setComposeSubject("");
    setComposeBody("");
    setSelectedMailId(null);
    setMailDetail(null);
  };

  const handleReply = () => {
    if (!mailDetail || activeConfig?.provider !== "gmail") return;
    const senderEmail = mailDetail.sender.match(/<(.+?)>/)?.[1] || mailDetail.sender;
    setComposeMode("reply");
    setComposeTo(senderEmail);
    setComposeSubject(`Re: ${mailDetail.subject}`);
    setComposeBody(`\n\n--- 원본 메시지 ---\n보낸 사람: ${mailDetail.sender}\n날짜: ${mailDetail.date}\n\n${mailDetail.body.replace(/<[^>]*>/g, "")}`);
  };

  const handleForward = () => {
    if (!mailDetail || activeConfig?.provider !== "gmail") return;
    setComposeMode("forward");
    setComposeTo("");
    setComposeSubject(`Fwd: ${mailDetail.subject}`);
    setComposeBody(`\n\n--- 전달된 메시지 ---\n보낸 사람: ${mailDetail.sender}\n날짜: ${mailDetail.date}\n받는 사람: ${mailDetail.to}\n\n${mailDetail.body.replace(/<[^>]*>/g, "")}`);
  };

  const handleSend = async () => {
    if (!activeConfig || !composeTo.trim() || !composeSubject.trim()) {
      toast.error("받는 사람과 제목을 입력해 주세요.");
      return;
    }
    setSending(true);
    try {
      const res = await invokeEdgeFunction("fetch-mail", {
        body: {
          action: "send",
          configId: activeConfig.id,
          provider: activeConfig.provider,
          to: composeTo.trim(),
          subject: composeSubject.trim(),
          htmlBody: composeBody.replace(/\n/g, "<br>"),
        },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("메일이 발송되었습니다.");
      setComposeMode(null);
      if (activeFolder === "SENT") fetchMails();
    } catch (e: any) {
      toast.error("메일 발송 실패: " + e.message);
    } finally {
      setSending(false);
    }
  };

  const handleTrash = async (ids: string[]) => {
    if (!activeConfig || ids.length === 0) return;
    setActionLoading(true);
    try {
      const res = await invokeEdgeFunction("fetch-mail", {
        body: {
          action: "trash",
          configId: activeConfig.id,
          provider: activeConfig.provider,
          messageIds: ids,
        },
      });
      if (res.error) throw res.error;
      toast.success(`${ids.length}개 메일을 휴지통으로 이동했습니다.`);
      setMails(prev => prev.filter(m => !ids.includes(m.id)));
      setSelectedIds(new Set());
      if (ids.includes(selectedMailId || "")) {
        setSelectedMailId(null);
        setMailDetail(null);
      }
    } catch (e: any) {
      toast.error("삭제 실패: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStar = async (ids: string[]) => {
    if (!activeConfig || ids.length === 0) return;
    setActionLoading(true);
    try {
      const res = await invokeEdgeFunction("fetch-mail", {
        body: {
          action: "modify",
          configId: activeConfig.id,
          provider: activeConfig.provider,
          messageIds: ids,
          addLabelIds: ["STARRED"],
        },
      });
      if (res.error) throw res.error;
      toast.success(`${ids.length}개 메일에 별표를 추가했습니다.`);
      setSelectedIds(new Set());
    } catch (e: any) {
      toast.error("별표 추가 실패: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // No config - show setup prompt
  if (!loading && configs.length === 0) {
    return (
      <div className="h-full flex flex-col bg-background overflow-hidden">
        <div className="h-14 border-b flex items-center px-6 shrink-0 bg-muted/30">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> 뒤로가기
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-primary/50" />
            </div>
            <h2 className="text-xl font-bold mb-2">메일 연동이 필요합니다</h2>
            <p className="text-sm text-muted-foreground mb-6">
              사내 메일함을 사용하려면 먼저 마이페이지에서 Gmail 또는 네이버웍스 계정을 연동해주세요.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate("/my-page")} className="rounded-xl gap-2">
                <Settings className="w-4 h-4" /> 마이페이지에서 설정
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* 상단 컨트롤 바 */}
      <div className="h-14 border-b flex items-center justify-between px-6 shrink-0 bg-muted/30">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> 뒤로가기
          </Button>
          <div className="h-4 w-px bg-border" />
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Inbox className="w-4 h-4 text-primary" /> {FOLDER_CONFIG.find(f => f.key === activeFolder)?.label || "수신함"}
          </h2>
          {/* Provider selector */}
          {configs.length > 1 && (
            <div className="flex gap-1">
              {configs.map(c => (
                <Button
                  key={c.id}
                  variant={activeConfig?.id === c.id ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs rounded-full px-3"
                  onClick={() => { setActiveConfig(c); setSelectedMailId(null); setMailDetail(null); }}
                >
                  {c.provider === "gmail" ? "Gmail" : "네이버웍스"}
                </Button>
              ))}
            </div>
          )}
          {activeConfig && (
            <Badge variant="secondary" className="text-[10px]">
              {activeConfig.provider === "gmail" ? activeConfig.google_email : activeConfig.nw_user_id}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="default" className="gap-2 rounded-xl" onClick={handleCompose}>
            <PenSquare className="w-4 h-4" /> 메일 쓰기
          </Button>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="메일 검색..." 
              className="pl-9 h-9 text-xs border-border rounded-xl"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Button size="sm" variant="ghost" onClick={fetchMails} disabled={loading}>
            <Loader2 className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* 메인 레이아웃 */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* 폴더 목록 */}
        <ResizablePanel defaultSize={15} minSize={12} className="bg-muted/20 border-r">
          <div className="p-4 space-y-1">
            {FOLDER_CONFIG.map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 rounded-xl h-11",
                  activeFolder === key
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-muted-foreground hover:bg-muted"
                )}
                onClick={() => setActiveFolder(key)}
              >
                <Icon className="w-4 h-4" /> {label}
                {key === "INBOX" && mails.filter(m => m.unread).length > 0 && activeFolder === "INBOX" && (
                  <Badge className="ml-auto">{mails.filter(m => m.unread).length}</Badge>
                )}
              </Button>
            ))}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* 메일 리스트 */}
        <ResizablePanel defaultSize={35} minSize={25}>
          <div className="h-full flex flex-col">
            {/* 선택 액션 바 */}
            {selectedIds.size > 0 && (
              <div className="p-2 border-b bg-primary/5 flex items-center gap-2 shrink-0">
                <Checkbox
                  checked={selectedIds.size === filteredMails.length}
                  onCheckedChange={toggleSelectAll}
                  className="ml-2"
                />
                <span className="text-xs font-bold text-primary">{selectedIds.size}개 선택</span>
                <div className="flex-1" />
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => handleStar([...selectedIds])} disabled={actionLoading}>
                  <Star className="w-3 h-3" /> 별표
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => handleTrash([...selectedIds])} disabled={actionLoading}>
                  <Trash2 className="w-3 h-3" /> 삭제
                </Button>
                {activeConfig?.provider === "gmail" && selectedIds.size === 1 && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => openInGmail([...selectedIds][0])}>
                    <ExternalLink className="w-3 h-3" /> Gmail
                  </Button>
                )}
              </div>
            )}
            {selectedIds.size === 0 && filteredMails.length > 0 && (
              <div className="p-2 border-b flex items-center gap-2 shrink-0">
                <Checkbox
                  checked={false}
                  onCheckedChange={toggleSelectAll}
                  className="ml-2"
                />
                <span className="text-xs text-muted-foreground">전체선택</span>
              </div>
            )}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">메일을 불러오는 중...</p>
                </div>
              ) : filteredMails.length === 0 ? (
                <div className="p-8 text-center">
                  <Mail className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">메일이 없습니다.</p>
                </div>
              ) : (
                <div className="divide-y border-r">
                  {filteredMails.map((mail) => (
                    <div
                      key={mail.id}
                      className={cn(
                        "p-4 cursor-pointer transition-all hover:bg-muted/50 flex gap-3 items-start relative",
                        selectedMailId === mail.id ? "bg-primary/5 border-l-4 border-l-primary" : "bg-background",
                        selectedIds.has(mail.id) && "bg-primary/5"
                      )}
                    >
                      <Checkbox
                        checked={selectedIds.has(mail.id)}
                        onCheckedChange={() => toggleSelect(mail.id)}
                        className="mt-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0" onClick={() => readMail(mail.id)}>
                        <div className="flex justify-between items-center">
                          <span className={cn("text-xs font-bold", mail.unread ? "text-primary" : "text-muted-foreground")}>
                            {mail.sender.replace(/<.*>/, "").trim()}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{formatDate(mail.date)}</span>
                        </div>
                        <h4 className={cn("text-sm truncate", mail.unread ? "font-black text-foreground" : "font-medium text-foreground/80")}>
                          {mail.subject}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">{mail.snippet}</p>
                      </div>
                      {mail.unread && (
                        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* 메일 본문 */}
        <ResizablePanel defaultSize={50}>
          {composeMode ? (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-1 duration-300">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="font-black text-lg text-foreground">
                  {composeMode === "new" ? "새 메일 작성" : composeMode === "reply" ? "답장" : "전달"}
                </h2>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setComposeMode(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 flex flex-col p-6 gap-4 overflow-auto">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">받는 사람</label>
                  <Input
                    placeholder="email@example.com"
                    value={composeTo}
                    onChange={e => setComposeTo(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">제목</label>
                  <Input
                    placeholder="메일 제목"
                    value={composeSubject}
                    onChange={e => setComposeSubject(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1 flex-1 flex flex-col">
                  <label className="text-xs font-bold text-muted-foreground">본문</label>
                  <Textarea
                    placeholder="메일 내용을 입력하세요..."
                    value={composeBody}
                    onChange={e => setComposeBody(e.target.value)}
                    className="rounded-xl flex-1 min-h-[200px] resize-none"
                  />
                </div>
              </div>
              <div className="p-6 border-t bg-muted/20 flex gap-3">
                <Button className="rounded-xl flex-1 gap-2" onClick={handleSend} disabled={sending}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? "발송 중..." : "보내기"}
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => setComposeMode(null)}>
                  취소
                </Button>
              </div>
            </div>
          ) : loadingDetail ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : mailDetail ? (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-1 duration-300">
              <div className="p-8 border-b">
                <div className="flex justify-between items-start mb-6">
                  <h1 className="text-2xl font-black text-foreground tracking-tight leading-tight flex-1 mr-4">
                    {mailDetail.subject}
                  </h1>
                  <div className="flex gap-2 shrink-0">
                    {activeConfig?.provider === "gmail" && (
                      <Button variant="outline" size="icon" className="rounded-full w-8 h-8 text-muted-foreground hover:text-primary" title="Gmail에서 열기" onClick={() => openInGmail(mailDetail.id)}>
                        <ExternalLink className="w-4 h-4"/>
                      </Button>
                    )}
                    <Button variant="outline" size="icon" className="rounded-full w-8 h-8 text-muted-foreground hover:text-primary" onClick={() => handleStar([mailDetail.id])} disabled={actionLoading}>
                      <Star className="w-4 h-4"/>
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full w-8 h-8 text-muted-foreground hover:text-destructive" onClick={() => handleTrash([mailDetail.id])} disabled={actionLoading}>
                      <Trash2 className="w-4 h-4"/>
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
                    {mailDetail.sender.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-foreground">{mailDetail.sender.replace(/<.*>/, "").trim()}</div>
                    <div className="text-xs text-muted-foreground">
                      받는 사람: {mailDetail.to} · {formatDate(mailDetail.date)}
                    </div>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 p-8">
                <div 
                  className="max-w-3xl text-foreground/80 leading-relaxed whitespace-pre-wrap text-[15px]"
                  dangerouslySetInnerHTML={
                    mailDetail.body.includes("<") 
                      ? { __html: sanitizeHtml(mailDetail.body) } 
                      : undefined
                  }
                >
                  {!mailDetail.body.includes("<") ? mailDetail.body : undefined}
                </div>
                
                {mailDetail.attachments.length > 0 && (
                  <div className="mt-8 space-y-2">
                    <p className="text-xs font-bold text-muted-foreground">첨부파일 ({mailDetail.attachments.length})</p>
                    {mailDetail.attachments.map(att => (
                      <div key={att.id} className="p-3 rounded-2xl border bg-muted/30 flex items-center gap-3 w-fit">
                        <div className="w-10 h-10 bg-background rounded-lg border flex items-center justify-center">
                          <Paperclip className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground">{att.filename}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">
                            {formatFileSize(att.size)} · {att.mimeType}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              
              <div className="p-6 border-t bg-muted/20 flex gap-3">
                <Button variant="outline" className="rounded-xl flex-1 gap-2" onClick={handleReply}>
                  <Reply className="w-4 h-4"/> 답장하기
                </Button>
                <Button variant="outline" className="rounded-xl flex-1 gap-2" onClick={handleForward}>
                  <Forward className="w-4 h-4"/> 전달하기
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground flex-col gap-4">
              <Mail className="w-16 h-16 opacity-10" />
              <p className="font-bold text-muted-foreground">조회할 메일을 선택해 주세요.</p>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

// Helpers
function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);
    
    if (days === 0) {
      return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "어제";
    } else if (days < 7) {
      return `${days}일 전`;
    }
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + "B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + "KB";
  return (bytes / 1048576).toFixed(1) + "MB";
}

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "b", "i", "u", "strong", "em", "a", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "span", "div",
      "table", "thead", "tbody", "tr", "th", "td", "pre", "code", "hr",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "style", "class"],
    FORBID_TAGS: ["script", "object", "embed", "form", "input", "iframe", "svg"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
    ALLOW_DATA_ATTR: false,
  });
}

export default InternalMail;
