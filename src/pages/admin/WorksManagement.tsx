import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Film, Plus, Edit2, Trash2, Send, Loader2, Search, Building2, Users,
  FileText, Upload, ExternalLink, X, FolderOpen,
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { uploadFileToDrive } from "@/lib/driveApi";

interface Work {
  id: string;
  tenant_id: string;
  category: string;
  channel: string | null;
  title: string;
  received_date: string | null;
  is_rejected: boolean;
  director: string | null;
  director_detail: string | null;
  writer: string | null;
  writer_detail: string | null;
  production_company: string | null;
  production_detail: string | null;
  current_casting: string | null;
  notes: string | null;
  contact_person: string | null;
  status: string;
  created_at: string;
  drive_folder_id: string | null;
  drive_folder_link: string | null;
}


interface PartnerArtist {
  id: string;
  name: string;
  stage_name: string | null;
  tenant_id: string;
  tenantName: string;
}

interface CastingOffer {
  id: string;
  work_id: string;
  to_tenant_id: string;
  artist_id: string | null;
  role_name: string | null;
  message: string | null;
  status: string;
  response_note: string | null;
  created_at: string;
  work?: Work;
  tenantName?: string;
  artistName?: string;
}

const CATEGORIES = ["드라마", "영화", "예능", "광고", "뮤직비디오", "기타"];

const WorksManagement = () => {
  const { currentTenant, user } = useAuth();
  const navigate = useNavigate();
  const myTenantId = currentTenant?.tenant_id;

  const [loading, setLoading] = useState(true);
  const [works, setWorks] = useState<Work[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tabFilter, setTabFilter] = useState("active");
  const [accessDenied, setAccessDenied] = useState(false);

  // Work form
  const [isWorkDialog, setIsWorkDialog] = useState(false);
  const [editingWork, setEditingWork] = useState<Work | null>(null);
  const [workForm, setWorkForm] = useState({
    category: "드라마", channel: "", title: "", received_date: "",
    director: "", director_detail: "", writer: "", writer_detail: "",
    production_company: "", production_detail: "", current_casting: "",
    notes: "", contact_person: "", is_rejected: false,
  });

  // Casting offer
  const [isOfferDialog, setIsOfferDialog] = useState(false);
  const [offerWork, setOfferWork] = useState<Work | null>(null);
  const [partnerArtists, setPartnerArtists] = useState<PartnerArtist[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [offerMessage, setOfferMessage] = useState("");
  const [offerRole, setOfferRole] = useState("");

  // Sent offers
  const [sentOffers, setSentOffers] = useState<CastingOffer[]>([]);

  // File upload
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  

  const [processing, setProcessing] = useState(false);

  // 회사 유형 체크: production_agency만 접근 가능
  useEffect(() => {
    const checkAccess = async () => {
      if (!myTenantId) return;
      const { data: tenant } = await supabase
        .from("tenants" as any)
        .select("company_type")
        .eq("id", myTenantId)
        .single() as any;
      if (!tenant || tenant.company_type !== "production_agency") {
        setAccessDenied(true);
        toast.error("작품 관리는 작품 에이전시만 이용할 수 있습니다.");
        navigate("/dashboard");
      }
    };
    checkAccess();
  }, [myTenantId, navigate]);

  useEffect(() => {
    if (myTenantId && !accessDenied) fetchAll();
  }, [myTenantId, accessDenied]);

  const fetchAll = async () => {
    if (!myTenantId) return;
    setLoading(true);
    try {
      const [worksRes, offersRes] = await Promise.all([
        supabase.from("works").select("*").eq("tenant_id", myTenantId).order("created_at", { ascending: false }),
        supabase.from("casting_offers").select("*").eq("from_tenant_id", myTenantId).order("created_at", { ascending: false }),
      ]);
      setWorks((worksRes.data || []) as any);

      // Enrich offers with work titles
      const offers = (offersRes.data || []) as any[];
      const worksMap = new Map((worksRes.data || []).map((w: any) => [w.id, w]));
      const enriched = offers.map((o: any) => ({
        ...o,
        work: worksMap.get(o.work_id),
      }));
      setSentOffers(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openNewWork = () => {
    setEditingWork(null);
    setPendingFiles([]);
    setWorkForm({
      category: "드라마", channel: "", title: "", received_date: format(new Date(), "yyyy-MM-dd"),
      director: "", director_detail: "", writer: "", writer_detail: "",
      production_company: "", production_detail: "", current_casting: "",
      notes: "", contact_person: "", is_rejected: false,
    });
    setIsWorkDialog(true);
  };

  const openEditWork = (w: Work) => {
    setEditingWork(w);
    setPendingFiles([]);
    setWorkForm({
      category: w.category, channel: w.channel || "", title: w.title,
      received_date: w.received_date || "", director: w.director || "",
      director_detail: w.director_detail || "", writer: w.writer || "",
      writer_detail: w.writer_detail || "", production_company: w.production_company || "",
      production_detail: w.production_detail || "", current_casting: w.current_casting || "",
      notes: w.notes || "", contact_person: w.contact_person || "", is_rejected: w.is_rejected,
    });
    setIsWorkDialog(true);
  };

  const ensureWorkFolder = async (workId: string, tenantId: string, title: string): Promise<string | null> => {
    // Check if work already has a drive folder
    const { data: work } = await supabase.from("works").select("drive_folder_id, drive_folder_link").eq("id", workId).single() as any;
    if (work?.drive_folder_id) return work.drive_folder_link;

    // Create shared folder via edge function
    const { data, error } = await invokeEdgeFunction("create-work-folder", {
      body: { tenantId, workId, workTitle: title },
    });

    if (error || !data?.success) {
      console.error("공유 폴더 생성 실패:", error || data?.error);
      toast.error("공유 폴더 생성 실패: " + (data?.error || error?.message));
      return null;
    }

    return data.folderLink;
  };

  const uploadFilesForWork = async (workId: string, tenantId: string) => {
    if (pendingFiles.length === 0) return;
    setUploadingFiles(true);
    const subfolder = `작품/${workForm.title}`;
    for (const file of pendingFiles) {
      try {
        const result = await uploadFileToDrive(tenantId, file, subfolder);
        if (!result.success) {
          toast.error(`${file.name} 업로드 실패: ${result.error}`);
        }
      } catch (err: any) {
        toast.error(`${file.name} 업로드 실패: ${err.message}`);
      }
    }
    setUploadingFiles(false);
    setPendingFiles([]);
  };

  const handleSaveWork = async () => {
    if (!workForm.title || !myTenantId) {
      toast.error("제목을 입력해주세요");
      return;
    }
    setProcessing(true);
    try {
      const payload = {
        ...workForm,
        tenant_id: myTenantId,
        received_date: workForm.received_date || null,
        channel: workForm.channel || null,
        director: workForm.director || null,
        director_detail: workForm.director_detail || null,
        writer: workForm.writer || null,
        writer_detail: workForm.writer_detail || null,
        production_company: workForm.production_company || null,
        production_detail: workForm.production_detail || null,
        current_casting: workForm.current_casting || null,
        notes: workForm.notes || null,
        contact_person: workForm.contact_person || null,
        status: workForm.is_rejected ? "rejected" : "active",
        updated_at: new Date().toISOString(),
      };

      let savedWorkId: string;
      if (editingWork) {
        const { error } = await supabase.from("works").update(payload as any).eq("id", editingWork.id);
        if (error) throw error;
        savedWorkId = editingWork.id;
        toast.success("작품이 수정되었습니다");
      } else {
        const { data, error } = await supabase.from("works").insert({ ...payload, created_by: user?.id } as any).select("id").single();
        if (error) throw error;
        savedWorkId = (data as any).id;
        toast.success("작품이 등록되었습니다");
      }

      // Upload pending files to Google Drive
      if (pendingFiles.length > 0) {
        toast.info("공유 폴더 생성 및 파일 업로드 중...");
        // Ensure shared folder exists
        await ensureWorkFolder(savedWorkId, myTenantId, workForm.title);
        await uploadFilesForWork(savedWorkId, myTenantId);
        toast.success("파일 업로드 완료");
      }

      setIsWorkDialog(false);
      fetchAll();
    } catch (err: any) {
      toast.error("저장 실패: " + err.message);
    } finally {
      setProcessing(false);
    }
  };


  const handleDeleteWork = async (id: string) => {
    if (!confirm("이 작품을 삭제하시겠습니까? 관련 캐스팅 제안도 함께 삭제됩니다.")) return;
    try {
      // 연결된 캐스팅 제안 먼저 삭제 (FK 제약)
      await supabase.from("casting_offers").delete().eq("work_id", id);
      const { error } = await supabase.from("works").delete().eq("id", id);
      if (error) throw error;
      toast.success("삭제되었습니다");
      fetchAll();
    } catch (err: any) {
      toast.error("삭제 실패: " + (err.message || "알 수 없는 오류"));
    }
  };

  // Casting offer flow
  const openOfferDialog = async (work: Work) => {
    setOfferWork(work);
    setSelectedArtists([]);
    setOfferMessage("");
    setOfferRole("");

    // Fetch partner artists from talent agencies
    try {
      const { data: partnerships } = await supabase
        .from("tenant_partnerships")
        .select("*, requester_tenant:requester_tenant_id(id,name,company_type), target_tenant:target_tenant_id(id,name,company_type)" as any)
        .eq("status", "active")
        .or(`requester_tenant_id.eq.${myTenantId},target_tenant_id.eq.${myTenantId}`);

      const partnerTenants = ((partnerships || []) as any[]).map((p: any) => {
        const isReq = p.requester_tenant_id === myTenantId;
        const other = isReq ? p.target_tenant : p.requester_tenant;
        return other;
      }).filter((t: any) => t && t.company_type === "talent_agency");

      const artistPromises = partnerTenants.map((t: any) =>
        supabase.from("artists").select("id,name,stage_name,tenant_id").eq("tenant_id", t.id).eq("is_active", true)
          .then(({ data }) => (data || []).map((a: any) => ({ ...a, tenantName: t.name })))
      );

      const allArtists = (await Promise.all(artistPromises)).flat();
      setPartnerArtists(allArtists);
    } catch (err) {
      console.error(err);
    }
    setIsOfferDialog(true);
  };

  const handleSendOffers = async () => {
    if (!offerWork || selectedArtists.length === 0) {
      toast.error("배우를 선택해주세요");
      return;
    }
    setProcessing(true);
    try {
      // Build offer message with shared folder link if available
      let fullMessage = offerMessage || "";
      if (offerWork.drive_folder_link) {
        fullMessage += `\n\n📁 시나리오/대본 공유 폴더: ${offerWork.drive_folder_link}`;
      }

      const inserts = selectedArtists.map(artistId => {
        const artist = partnerArtists.find(a => a.id === artistId);
        return {
          work_id: offerWork.id,
          from_tenant_id: myTenantId,
          to_tenant_id: artist?.tenant_id,
          artist_id: artistId,
          role_name: offerRole || null,
          message: fullMessage || null,
          status: "pending",
          created_by: user?.id,
        };
      });

      const { error } = await supabase.from("casting_offers").insert(inserts as any);
      if (error) throw error;

      toast.success(`${selectedArtists.length}건의 캐스팅 제안이 발송되었습니다`);
      if (offerWork.drive_folder_link) {
        toast.info("공유 폴더 링크가 제안 메시지에 포함되었습니다");
      }
      setIsOfferDialog(false);
      fetchAll();
    } catch (err: any) {
      toast.error("발송 실패: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const filteredWorks = works.filter(w => {
    if (tabFilter === "active" && (w.status === "rejected" || w.is_rejected)) return false;
    if (tabFilter === "rejected" && !w.is_rejected && w.status !== "rejected") return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return w.title.toLowerCase().includes(q) || w.director?.toLowerCase().includes(q) || w.production_company?.toLowerCase().includes(q);
    }
    return true;
  });

  const getOfferStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="secondary">검토중</Badge>;
      case "accepted": return <Badge className="bg-emerald-500 text-white">승인</Badge>;
      case "rejected": return <Badge variant="destructive">거절</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1">
            <Film className="w-5 h-5" /> Works Management
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">작품 관리</h1>
          <p className="text-slate-500 mt-1">작품을 등록하고 파트너 매니지먼트사에 캐스팅을 제안합니다.</p>
        </div>
        <Button variant="ghost" onClick={() => navigate("/admin")} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> 관리 시스템
        </Button>
      </div>

      <Tabs value={tabFilter} onValueChange={setTabFilter}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="active">진행중 ({works.filter(w => !w.is_rejected && w.status !== "rejected").length})</TabsTrigger>
            <TabsTrigger value="rejected">거절 ({works.filter(w => w.is_rejected || w.status === "rejected").length})</TabsTrigger>
            <TabsTrigger value="offers">발송된 제안 ({sentOffers.length})</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="작품 검색..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 w-64 bg-white" />
            </div>
            <Button onClick={openNewWork} className="gap-1">
              <Plus className="w-4 h-4" /> 작품 등록
            </Button>
          </div>
        </div>

        {/* Works list */}
        <TabsContent value="active">
          <WorksList works={filteredWorks} onEdit={openEditWork} onDelete={handleDeleteWork} onOffer={openOfferDialog} sentOffers={sentOffers} />
        </TabsContent>
        <TabsContent value="rejected">
          <WorksList works={filteredWorks} onEdit={openEditWork} onDelete={handleDeleteWork} onOffer={openOfferDialog} sentOffers={sentOffers} />
        </TabsContent>
        <TabsContent value="offers">
          <SentOffersList offers={sentOffers} getStatusBadge={getOfferStatusBadge} />
        </TabsContent>
      </Tabs>

      {/* Work Dialog */}
      <Dialog open={isWorkDialog} onOpenChange={setIsWorkDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingWork ? "작품 수정" : "작품 등록"}</DialogTitle>
            <DialogDescription>작품 정보를 입력합니다.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>종류 *</Label>
              <Select value={workForm.category} onValueChange={v => setWorkForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>채널/투배</Label>
              <Input value={workForm.channel} onChange={e => setWorkForm(f => ({ ...f, channel: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>제목 *</Label>
              <Input value={workForm.title} onChange={e => setWorkForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <Label>입고일</Label>
              <Input type="date" value={workForm.received_date} onChange={e => setWorkForm(f => ({ ...f, received_date: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox checked={workForm.is_rejected} onCheckedChange={v => setWorkForm(f => ({ ...f, is_rejected: !!v }))} />
              <Label>거절</Label>
            </div>
            <div>
              <Label>감독</Label>
              <Input value={workForm.director} onChange={e => setWorkForm(f => ({ ...f, director: e.target.value }))} />
            </div>
            <div>
              <Label>감독 상세</Label>
              <Input value={workForm.director_detail} onChange={e => setWorkForm(f => ({ ...f, director_detail: e.target.value }))} />
            </div>
            <div>
              <Label>작가</Label>
              <Input value={workForm.writer} onChange={e => setWorkForm(f => ({ ...f, writer: e.target.value }))} />
            </div>
            <div>
              <Label>작가 상세</Label>
              <Input value={workForm.writer_detail} onChange={e => setWorkForm(f => ({ ...f, writer_detail: e.target.value }))} />
            </div>
            <div>
              <Label>제작사</Label>
              <Input value={workForm.production_company} onChange={e => setWorkForm(f => ({ ...f, production_company: e.target.value }))} />
            </div>
            <div>
              <Label>제작사 상세</Label>
              <Input value={workForm.production_detail} onChange={e => setWorkForm(f => ({ ...f, production_detail: e.target.value }))} />
            </div>
            <div>
              <Label>현재 캐스팅</Label>
              <Input value={workForm.current_casting} onChange={e => setWorkForm(f => ({ ...f, current_casting: e.target.value }))} />
            </div>
            <div>
              <Label>컨택/담당</Label>
              <Input value={workForm.contact_person} onChange={e => setWorkForm(f => ({ ...f, contact_person: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>비고</Label>
              <Textarea value={workForm.notes} onChange={e => setWorkForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            {/* File Upload Section */}
            <div className="col-span-2 border-t pt-4 mt-2">
              <Label className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4" /> 시나리오 / 대본 첨부
              </Label>
              
              {/* Existing drive folder link (edit mode) */}
              {editingWork?.drive_folder_link && (
                <div className="flex items-center gap-2 text-sm bg-muted rounded-md px-3 py-2 mb-3">
                  <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                  <span className="flex-1">공유 폴더가 생성되어 있습니다</span>
                  <a href={editingWork.drive_folder_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Pending new files */}
              {pendingFiles.length > 0 && (
                <div className="space-y-1 mb-3">
                  {pendingFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm bg-accent/50 rounded-md px-3 py-2">
                      <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground">{(f.size / 1024 / 1024).toFixed(1)}MB</span>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed rounded-lg p-4 hover:bg-accent/30 transition-colors">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">클릭하여 시나리오/대본 파일 첨부 (PDF, Word, HWP 등)</span>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.doc,.docx,.hwp,.txt,.csv,.xlsx"
                  onChange={e => {
                    if (e.target.files) {
                      setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                파일은 Google Drive 공유 폴더에 업로드됩니다. 캐스팅 제안 시 공유 폴더 링크가 자동 포함됩니다.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWorkDialog(false)}>취소</Button>
            <Button onClick={handleSaveWork} disabled={processing}>
              {processing && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {editingWork ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Casting Offer Dialog */}
      <Dialog open={isOfferDialog} onOpenChange={setIsOfferDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>캐스팅 제안 발송</DialogTitle>
            <DialogDescription>
              「{offerWork?.title}」 작품에 대한 캐스팅 제안을 파트너 매니지먼트사 배우에게 보냅니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Shared folder link info */}
            {offerWork?.drive_folder_link && (
              <div className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg text-sm">
                <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                <span className="flex-1">공유 폴더 링크가 제안 메시지에 자동 포함됩니다.</span>
                <a href={offerWork.drive_folder_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
                  미리보기
                </a>
              </div>
            )}
            <div>
              <Label>역할명</Label>
              <Input placeholder="예: 주연, 조연 등" value={offerRole} onChange={e => setOfferRole(e.target.value)} />
            </div>
            <div>
              <Label>메시지</Label>
              <Textarea placeholder="캐스팅 제안 메시지를 입력하세요..." value={offerMessage} onChange={e => setOfferMessage(e.target.value)} rows={3} />
            </div>
            <div>
              <Label className="mb-2 block">배우 선택 ({selectedArtists.length}명 선택)</Label>
              {partnerArtists.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">연결된 매니지먼트사의 배우가 없습니다.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                  {partnerArtists.map(a => (
                    <label key={a.id} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer">
                      <Checkbox
                        checked={selectedArtists.includes(a.id)}
                        onCheckedChange={v => {
                          setSelectedArtists(prev => v ? [...prev, a.id] : prev.filter(id => id !== a.id));
                        }}
                      />
                      <div className="flex-1">
                        <span className="font-medium">{a.name}</span>
                        {a.stage_name && <span className="text-xs text-slate-500 ml-1">({a.stage_name})</span>}
                      </div>
                      <Badge variant="outline" className="text-xs gap-1">
                        <Building2 className="w-3 h-3" />{a.tenantName}
                      </Badge>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOfferDialog(false)}>취소</Button>
            <Button onClick={handleSendOffers} disabled={processing || selectedArtists.length === 0} className="gap-1">
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {selectedArtists.length}명에게 제안 발송
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Sub-components
const WorksList = ({ works, onEdit, onDelete, onOffer, sentOffers }: {
  works: Work[];
  onEdit: (w: Work) => void;
  onDelete: (id: string) => void;
  onOffer: (w: Work) => void;
  sentOffers: CastingOffer[];
}) => {
  if (works.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center text-slate-400">
        <Film className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p>등록된 작품이 없습니다.</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-3">
      {works.map(w => {
        const offerCount = sentOffers.filter(o => o.work_id === w.id).length;
        const acceptedCount = sentOffers.filter(o => o.work_id === w.id && o.status === "accepted").length;
        return (
          <Card key={w.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{w.category}</Badge>
                    {w.channel && <Badge variant="secondary" className="text-xs">{w.channel}</Badge>}
                    <h3 className="font-bold text-base">{w.title}</h3>
                    {w.is_rejected && <Badge variant="destructive" className="text-xs">거절</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                    {w.director && <span>감독: {w.director}</span>}
                    {w.writer && <span>작가: {w.writer}</span>}
                    {w.production_company && <span>제작: {w.production_company}</span>}
                    {w.current_casting && <span>캐스팅: {w.current_casting}</span>}
                    {w.contact_person && <span>담당: {w.contact_person}</span>}
                  </div>
                  {w.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{w.notes}</p>}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {w.drive_folder_link && (
                      <a href={w.drive_folder_link} target="_blank" rel="noopener noreferrer">
                        <Badge variant="outline" className="text-xs gap-1 cursor-pointer hover:bg-accent">
                          <FolderOpen className="w-3 h-3" /> 공유 폴더
                        </Badge>
                      </a>
                    )}
                    {offerCount > 0 && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Send className="w-3 h-3" /> 제안 {offerCount}건
                      </Badge>
                    )}
                    {acceptedCount > 0 && (
                      <Badge className="text-xs bg-emerald-500 text-white gap-1">
                        <Users className="w-3 h-3" /> 승인 {acceptedCount}건
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-4">
                  {w.received_date && <span className="text-xs text-slate-400 mr-2">{w.received_date}</span>}
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => onOffer(w)}>
                    <Send className="w-3 h-3" /> 제안
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onEdit(w)}>
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(w.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

const SentOffersList = ({ offers, getStatusBadge }: {
  offers: CastingOffer[];
  getStatusBadge: (status: string) => JSX.Element;
}) => {
  if (offers.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center text-slate-400">
        <Send className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p>발송된 캐스팅 제안이 없습니다.</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-3">
      {offers.map(o => (
        <Card key={o.id} className="hover:shadow-sm transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold">{o.work?.title || "알 수 없는 작품"}</p>
                {o.role_name && <Badge variant="outline" className="text-xs">{o.role_name}</Badge>}
                {getStatusBadge(o.status)}
              </div>
              {o.message && <p className="text-xs text-slate-500 line-clamp-1">{o.message}</p>}
              {o.response_note && (
                <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded">
                  💬 응답: {o.response_note}
                </p>
              )}
            </div>
            <span className="text-xs text-slate-400 shrink-0 ml-4">
              {format(new Date(o.created_at), "MM.dd")}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default WorksManagement;
