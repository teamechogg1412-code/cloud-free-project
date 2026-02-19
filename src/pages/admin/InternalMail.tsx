import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { 
  Mail, Inbox, Send, Star, Trash2, Search, ArrowLeft, 
  Paperclip, Reply, Forward, Loader2, AlertCircle, Settings
} from "lucide-react";
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

  // Fetch mails when active config changes
  useEffect(() => {
    if (!activeConfig) return;
    fetchMails();
  }, [activeConfig]);

  const fetchMails = async () => {
    if (!activeConfig) return;
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("fetch-mail", {
        body: {
          action: "list",
          configId: activeConfig.id,
          provider: activeConfig.provider,
          maxResults: 20,
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
      const res = await supabase.functions.invoke("fetch-mail", {
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
            <Inbox className="w-4 h-4 text-primary" /> 수신함
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
            <Button variant="ghost" className="w-full justify-start gap-3 bg-primary/10 text-primary font-bold rounded-xl h-11">
              <Inbox className="w-4 h-4" /> 수신함
              {mails.filter(m => m.unread).length > 0 && (
                <Badge className="ml-auto">{mails.filter(m => m.unread).length}</Badge>
              )}
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:bg-muted rounded-xl h-11">
              <Star className="w-4 h-4" /> 중요 메일
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:bg-muted rounded-xl h-11">
              <Send className="w-4 h-4" /> 보낸 메일함
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:bg-muted rounded-xl h-11">
              <Trash2 className="w-4 h-4" /> 휴지통
            </Button>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* 메일 리스트 */}
        <ResizablePanel defaultSize={35} minSize={25}>
          <ScrollArea className="h-full">
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
                    onClick={() => readMail(mail.id)}
                    className={cn(
                      "p-5 cursor-pointer transition-all hover:bg-muted/50 flex flex-col gap-1 relative",
                      selectedMailId === mail.id ? "bg-primary/5 border-l-4 border-l-primary" : "bg-background"
                    )}
                  >
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
                    {mail.unread && (
                      <div className="absolute top-5 right-5 w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* 메일 본문 */}
        <ResizablePanel defaultSize={50}>
          {loadingDetail ? (
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
                    <Button variant="outline" size="icon" className="rounded-full w-8 h-8 text-muted-foreground hover:text-primary">
                      <Reply className="w-4 h-4"/>
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full w-8 h-8 text-muted-foreground hover:text-amber-500">
                      <Star className="w-4 h-4"/>
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full w-8 h-8 text-muted-foreground hover:text-destructive">
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
                
                {/* 첨부파일 */}
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
                <Button variant="outline" className="rounded-xl flex-1 gap-2">
                  <Reply className="w-4 h-4"/> 답장하기
                </Button>
                <Button variant="outline" className="rounded-xl flex-1 gap-2">
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
