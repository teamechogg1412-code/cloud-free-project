import { useState, useEffect } from "react";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Send, Users, FileText, CheckCircle2, AlertCircle, 
  Search, Filter, Loader2, RefreshCw, Mail, Sparkles, XCircle 
} from "lucide-react";

// 타입 정의
interface Reporter {
  id: string;
  media_company: string;
  reporter_name: string;
  contact_email: string;
  purpose: string | null;
}

interface SendingLog {
  id: string;
  reporter_name: string;
  email: string;
  status: "pending" | "success" | "failed";
  timestamp: string;
}

const MediaPitching = () => {
  // --- 상태 관리 ---
  const [reporters, setReporters] = useState<Reporter[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState(`안녕하십니까, {{언론사명}} {{기자명}} 기자님.\n\n[보도자료 핵심 내용 요약]\n\n귀사의 무궁한 발전을 기원합니다.`);
  
  // 발송 관련 상태
  const [isSending, setIsSending] = useState(false);
  const [sendingLogs, setSendingLogs] = useState<SendingLog[]>([]);
  const [showResults, setShowResults] = useState(false);

  // AI 처리 상태
  const [isPolishing, setIsPolishing] = useState(false);

  // --- 데이터 로드 ---
  useEffect(() => {
    const fetchReporters = async () => {
      const { data, error } = await supabase
        .from("press_contacts")
        .select("*")
        .order("media_company");
      
      if (data) setReporters(data);
    };
    fetchReporters();
  }, []);

  // --- 필터링 로직 ---
  const filteredReporters = reporters.filter(r => 
    r.media_company.includes(searchQuery) || 
    r.reporter_name.includes(searchQuery) ||
    (r.purpose && r.purpose.includes(searchQuery))
  );

  // --- 핸들러 ---
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredReporters.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReporters.map(r => r.id)));
    }
  };

  // --- AI 문장 다듬기 핸들러 (Edge Function 호출) ---
  const handleAIPolish = async () => {
    // 본문이 비어있으면 실행하지 않음
    if (!emailBody.trim()) {
      toast.error("다듬을 내용을 본문에 입력해주세요.");
      return;
    }

    setIsPolishing(true);
    
    try {
      // Supabase Edge Function 호출 ('polish-text')
      const { data, error } = await supabase.functions.invoke('polish-text', {
        body: { text: emailBody }
      });

      if (error) {
        throw new Error(error.message || "AI 서버 통신 오류");
      }

      // 결과 처리
      if (data && data.result) {
        setEmailBody(data.result); // 본문을 AI 결과로 교체
        toast.success("AI가 문장을 더 세련되게 다듬었습니다!");
      } else {
        throw new Error("AI 응답이 올바르지 않습니다.");
      }

    } catch (error: any) {
      console.error("AI Polish Error:", error);
      toast.error(`AI 요청 실패: ${error.message}`);
    } finally {
      setIsPolishing(false);
    }
  };

  // --- 발송 시뮬레이션 (실제로는 Edge Function 호출) ---
  const handleBulkSend = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error("제목과 본문을 입력해주세요.");
      return;
    }
    if (selectedIds.size === 0) {
      toast.error("발송할 기자를 선택해주세요.");
      return;
    }

    setShowResults(true);
    setIsSending(true);
    
    // 1. 발송 대기 목록 생성
    const targetReporters = reporters.filter(r => selectedIds.has(r.id));
    const initialLogs: SendingLog[] = targetReporters.map(r => ({
      id: r.id,
      reporter_name: r.reporter_name,
      email: r.contact_email,
      status: "pending",
      timestamp: new Date().toLocaleTimeString()
    }));
    setSendingLogs(initialLogs);

    // 2. 순차 발송 시뮬레이션
    for (let i = 0; i < initialLogs.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800)); // 0.8초 딜레이 시뮬레이션

      setSendingLogs(prev => {
        const newLogs = [...prev];
        // 90% 성공 확률 시뮬레이션
        const isSuccess = Math.random() > 0.1;
        newLogs[i] = { 
          ...newLogs[i], 
          status: isSuccess ? "success" : "failed",
          timestamp: new Date().toLocaleTimeString()
        };
        return newLogs;
      });
    }

    setIsSending(false);
    toast.success("발송 작업이 완료되었습니다.");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-16 px-4 pb-4 h-[calc(100vh-theme(spacing.4))]">
        <div className="h-full max-w-[1600px] mx-auto flex flex-col">
          {/* Top Bar */}
          <div className="flex items-center justify-between py-4 shrink-0">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Mail className="w-6 h-6 text-primary" /> 미디어 피칭 센터
              </h1>
              <p className="text-muted-foreground text-sm">슈퍼 어드민이 관리하는 미디어 풀을 활용해 보도자료를 배포합니다.</p>
            </div>
            <div className="flex gap-2">
               <Button variant="outline" onClick={() => {setShowResults(false); setSendingLogs([]);}}>
                <RefreshCw className="w-4 h-4 mr-2" /> 초기화
               </Button>
            </div>
          </div>

          {/* 3-Column Layout */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
            
            {/* Panel 1: 작성 (Write) - 4/12 */}
            <Card className="lg:col-span-4 flex flex-col overflow-hidden border-t-4 border-t-primary shadow-sm h-full">
              <div className="p-4 border-b bg-secondary/20 flex justify-between items-center shrink-0">
                <h3 className="font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> 1. 보도자료 작성
                </h3>
                <Badge variant="outline" className="text-xs">Variable Supported</Badge>
              </div>
              <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
                <div className="space-y-2">














                  
                  <label className="text-sm font-medium">이메일 제목</label>
                  <Input 
                    placeholder="[보도자료] OOO 배우 전속 계약 체결 기사" 
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="font-medium"
                  />
                </div>
                <div className="space-y-2 flex-1 flex flex-col">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">이메일 본문</label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      onClick={handleAIPolish} // AI 함수 연결
                      disabled={isPolishing}   // 로딩 중 비활성화
                    >
                      {isPolishing ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" /> 다듬는 중...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 mr-1" /> AI 문장 다듬기
                        </>
                      )}
                    </Button>
                  </div>
                  <Textarea 
                    placeholder="내용을 입력하세요..." 
                    className="flex-1 min-h-[300px] resize-none leading-relaxed"
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    disabled={isPolishing} // AI 처리 중 입력 방지
                  />
                  <div className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                    <span className="font-bold">Tip:</span> <code>{'{{기자명}}'}</code>, <code>{'{{언론사명}}'}</code>을 입력하면 발송 시 자동으로 대상의 정보로 치환됩니다.
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <label className="text-sm font-medium mb-2 block">첨부파일</label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground hover:bg-secondary/50 cursor-pointer transition-colors">
                    클릭하여 보도자료(PDF, Word) 및 이미지 업로드
                  </div>
                </div>
              </div>
            </Card>

            {/* Panel 2: 선택 (Select) - 4/12 */}
            <Card className="lg:col-span-4 flex flex-col overflow-hidden border-t-4 border-t-blue-500 shadow-sm h-full">
              <div className="p-4 border-b bg-secondary/20 shrink-0">
                <h3 className="font-bold flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-blue-500" /> 2. 수신 기자 선택
                </h3>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input 
                      placeholder="언론사, 기자명 검색" 
                      className="pl-8 h-9 text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* List Header */}
              <div className="px-4 py-2 border-b bg-white flex items-center justify-between text-sm shrink-0">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={selectedIds.size === filteredReporters.length && filteredReporters.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="font-medium text-muted-foreground">전체 선택 ({filteredReporters.length})</span>
                </div>
                <span className="text-blue-600 font-bold">{selectedIds.size}명 선택됨</span>
              </div>

              <ScrollArea className="flex-1 bg-slate-50">
                <div className="divide-y divide-border">
                  {filteredReporters.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">검색 결과가 없습니다.</div>
                  ) : (
                    filteredReporters.map((reporter) => (
                      <div 
                        key={reporter.id} 
                        className={`p-3 flex items-start gap-3 transition-colors hover:bg-white ${selectedIds.has(reporter.id) ? 'bg-blue-50/60' : ''}`}
                        onClick={() => toggleSelection(reporter.id)}
                      >
                        <Checkbox 
                          checked={selectedIds.has(reporter.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0 cursor-pointer">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-semibold text-sm truncate">{reporter.media_company}</span>
                            {reporter.purpose && <Badge variant="secondary" className="text-[10px] h-5">{reporter.purpose}</Badge>}
                          </div>
                          <div className="text-sm font-medium">{reporter.reporter_name} 기자</div>
                          <div className="text-xs text-muted-foreground truncate">{reporter.contact_email}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>

            {/* Panel 3: 결과 (Result) - 4/12 */}
            <Card className="lg:col-span-4 flex flex-col overflow-hidden border-t-4 border-t-green-500 shadow-sm h-full">
              <div className="p-4 border-b bg-secondary/20 shrink-0">
                <h3 className="font-bold flex items-center gap-2">
                  {showResults ? (
                     <><Send className="w-4 h-4 text-green-600 animate-pulse" /> 3. 발송 현황</>
                  ) : (
                     <><CheckCircle2 className="w-4 h-4 text-green-600" /> 3. 발송 및 결과</>
                  )}
                </h3>
              </div>

              {/* A. 발송 전 미리보기 상태 */}
              {!showResults ? (
                <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4 bg-slate-50/50">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-2">
                    <Send className="w-8 h-8 text-green-600 ml-1" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">발송 준비 완료</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      총 <span className="text-foreground font-bold">{selectedIds.size}명</span>의 기자에게 이메일을 발송합니다.<br/>
                      내용을 마지막으로 확인해주세요.
                    </p>
                  </div>
                  
                  <div className="w-full max-w-xs bg-white p-4 rounded-lg border text-left text-xs shadow-sm mt-4">
                    <p className="font-bold mb-1 truncate">받는사람: {Array.from(selectedIds).length}명 (개별 발송)</p>
                    <p className="font-bold mb-2 truncate">제목: {emailSubject || "(제목 없음)"}</p>
                    <div className="text-muted-foreground line-clamp-3">
                      {emailBody.replace("{{기자명}}", "홍길동").replace("{{언론사명}}", "OO일보")}
                    </div>
                  </div>

                  <Button 
                    size="lg" 
                    className="w-full max-w-xs mt-6 bg-green-600 hover:bg-green-700"
                    onClick={handleBulkSend}
                    disabled={selectedIds.size === 0}
                  >
                    일괄 발송 시작
                  </Button>
                </div>
              ) : (
                /* B. 발송 중/완료 로그 상태 */
                <div className="flex-1 flex flex-col h-full">
                  <div className="p-3 bg-slate-100 text-xs font-medium flex justify-between shrink-0">
                    <span>처리 상태: {isSending ? "전송 중..." : "완료"}</span>
                    <span>
                      성공 <span className="text-green-600">{sendingLogs.filter(l => l.status === 'success').length}</span> / 
                      실패 <span className="text-red-600">{sendingLogs.filter(l => l.status === 'failed').length}</span>
                    </span>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="divide-y divide-border">
                      {sendingLogs.map((log) => (
                        <div key={log.id} className="p-3 flex items-center justify-between text-sm">
                          <div className="flex items-center gap-3">
                            {log.status === "pending" && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
                            {log.status === "success" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                            {log.status === "failed" && <XCircle className="w-4 h-4 text-red-500" />}
                            <div>
                              <div className="font-medium">{log.reporter_name}</div>
                              <div className="text-xs text-muted-foreground">{log.email}</div>
                            </div>
                          </div>
                          <div className="text-xs text-right">
                             <span className={`
                                px-2 py-0.5 rounded-full text-[10px] font-bold
                                ${log.status === 'success' ? 'bg-green-100 text-green-700' : 
                                  log.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}
                             `}>
                               {log.status === 'pending' ? '대기중' : log.status === 'success' ? '발송성공' : '오류'}
                             </span>
                             <div className="text-[10px] text-muted-foreground mt-0.5">{log.timestamp}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  {!isSending && (
                    <div className="p-4 border-t bg-white shrink-0">
                      <Button className="w-full" variant="outline" onClick={() => setShowResults(false)}>
                        추가 발송하기
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MediaPitching;