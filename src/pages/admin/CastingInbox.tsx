import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Inbox, Check, X, Loader2, Building2, User, MessageSquare, FolderOpen, ExternalLink, Trash2, ArchiveRestore,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { writeAuditLog } from "@/lib/auditLog";

interface WorkFileItem {
  id: string;
  work_id: string;
  file_name: string;
  file_type: string;
  drive_view_link: string | null;
  drive_download_link: string | null;
  drive_file_id: string | null;
}

interface IncomingOffer {
  id: string;
  work_id: string;
  from_tenant_id: string;
  to_tenant_id: string;
  artist_id: string | null;
  role_name: string | null;
  message: string | null;
  status: string;
  response_note: string | null;
  responded_at: string | null;
  created_at: string;
  is_deleted?: boolean;
  deleted_by?: string | null;
  deleted_at?: string | null;
  // enriched
  workTitle?: string;
  workCategory?: string;
  workDirector?: string;
  workWriter?: string;
  workProductionCompany?: string;
  workNotes?: string;
  workDriveFolderLink?: string | null;
  fromTenantName?: string;
  artistName?: string;
  deletedByName?: string;
  workFiles?: WorkFileItem[];
}

const CastingInbox = () => {
  const { currentTenant, user } = useAuth();
  const navigate = useNavigate();
  const myTenantId = currentTenant?.tenant_id;

  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<IncomingOffer[]>([]);
  const [tabFilter, setTabFilter] = useState("pending");

  // Response dialog
  const [isResponseDialog, setIsResponseDialog] = useState(false);
  const [responseOffer, setResponseOffer] = useState<IncomingOffer | null>(null);
  const [responseAction, setResponseAction] = useState<"accepted" | "rejected">("accepted");
  const [responseNote, setResponseNote] = useState("");
  const [processing, setProcessing] = useState(false);

  // Delete dialog
  const [isDeleteDialog, setIsDeleteDialog] = useState(false);
  const [deleteOffer, setDeleteOffer] = useState<IncomingOffer | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (myTenantId) fetchOffers();
  }, [myTenantId]);

  const fetchOffers = async () => {
    if (!myTenantId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("casting_offers")
        .select("*")
        .eq("to_tenant_id", myTenantId)
        .order("created_at", { ascending: false });

      const rawOffers = (data || []) as any[];

      // Enrich with work info and tenant names
      const workIds = [...new Set(rawOffers.map(o => o.work_id))];
      const tenantIds = [...new Set(rawOffers.map(o => o.from_tenant_id))];
      const artistIds = [...new Set(rawOffers.filter(o => o.artist_id).map(o => o.artist_id))];
      const deletedByIds = [...new Set(rawOffers.filter(o => o.deleted_by).map(o => o.deleted_by))];

      const [worksRes, tenantsRes, artistsRes, workFilesRes, deletedByRes] = await Promise.all([
        workIds.length > 0
          ? supabase.from("works").select("id,title,category,director,writer,production_company,notes,drive_folder_link").in("id", workIds)
              .then(res => {
                if (res.error?.message?.includes("drive_folder_link")) {
                  return supabase.from("works").select("id,title,category,director,writer,production_company,notes").in("id", workIds);
                }
                return res;
              })
          : Promise.resolve({ data: [] }),
        tenantIds.length > 0
          ? supabase.from("tenants").select("id,name").in("id", tenantIds)
          : Promise.resolve({ data: [] }),
        artistIds.length > 0
          ? supabase.from("artists").select("id,name").in("id", artistIds)
          : Promise.resolve({ data: [] }),
        workIds.length > 0
          ? supabase
              .from("work_files")
              .select("id,work_id,file_name,file_type,drive_view_link,drive_download_link,drive_file_id")
              .in("work_id", workIds)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
        deletedByIds.length > 0
          ? supabase.from("profiles").select("id,full_name").in("id", deletedByIds)
          : Promise.resolve({ data: [] }),
      ]);

      const worksMap = new Map((worksRes.data || []).map((w: any) => [w.id, w]));
      const tenantsMap = new Map((tenantsRes.data || []).map((t: any) => [t.id, t.name as string]));
      const artistsMap = new Map((artistsRes.data || []).map((a: any) => [a.id, a.name as string]));
      const deletedByMap = new Map((deletedByRes.data || []).map((p: any) => [p.id, p.full_name as string]));
      const workFilesByWorkId = new Map<string, WorkFileItem[]>();

      (workFilesRes.data || []).forEach((file: any) => {
        const list = workFilesByWorkId.get(file.work_id) || [];
        list.push(file as WorkFileItem);
        workFilesByWorkId.set(file.work_id, list);
      });

      const enriched: IncomingOffer[] = rawOffers.map(o => {
        const work = worksMap.get(o.work_id) as any;
        return {
          ...o,
          workTitle: work?.title || "알 수 없는 작품",
          workCategory: work?.category,
          workDirector: work?.director,
          workWriter: work?.writer,
          workProductionCompany: work?.production_company,
          workNotes: work?.notes,
          workDriveFolderLink: work?.drive_folder_link,
          fromTenantName: tenantsMap.get(o.from_tenant_id) || "알 수 없음",
          artistName: o.artist_id ? artistsMap.get(o.artist_id) : null,
          deletedByName: o.deleted_by ? deletedByMap.get(o.deleted_by) || "알 수 없음" : null,
          workFiles: workFilesByWorkId.get(o.work_id) || [],
        };
      });

      setOffers(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openResponse = (offer: IncomingOffer, action: "accepted" | "rejected") => {
    setResponseOffer(offer);
    setResponseAction(action);
    setResponseNote("");
    setIsResponseDialog(true);
  };

  const handleRespond = async () => {
    if (!responseOffer) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("casting_offers")
        .update({
          status: responseAction,
          response_note: responseNote || null,
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", responseOffer.id);

      if (error) throw error;

      // 승인 시 자동으로 프로젝트 생성
      if (responseAction === "accepted" && myTenantId) {
        try {
          await supabase.from("projects").insert({
            tenant_id: myTenantId,
            name: responseOffer.workTitle || "작품 연동 프로젝트",
            source_work_id: responseOffer.work_id,
            source_offer_id: responseOffer.id,
            project_type: responseOffer.workCategory || "드라마",
            director: responseOffer.workDirector || null,
            writer: responseOffer.workWriter || null,
            client_company: responseOffer.workProductionCompany || responseOffer.fromTenantName || null,
            artist_name: responseOffer.artistName || null,
            role_name: responseOffer.role_name || null,
            notes: responseOffer.workNotes || null,
            status: "active",
          } as any);
        } catch {
          // 프로젝트 자동 등록 실패해도 승인 자체는 성공
          console.warn("프로젝트 자동 등록 실패");
        }
      }

      toast.success(responseAction === "accepted" ? "캐스팅 제안을 승인했습니다" : "캐스팅 제안을 거절했습니다");
      setIsResponseDialog(false);
      fetchOffers();
    } catch (err: any) {
      toast.error("처리 실패: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const openDeleteDialog = (offer: IncomingOffer) => {
    setDeleteOffer(offer);
    setIsDeleteDialog(true);
  };

  const handleSoftDelete = async () => {
    if (!deleteOffer || !user) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("casting_offers")
        .update({
          is_deleted: true,
          deleted_by: user.id,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", deleteOffer.id);

      if (error) throw error;

      writeAuditLog({
        tenantId: myTenantId || "",
        userId: user.id,
        action: "delete",
        entity: "casting_offer",
        entityId: deleteOffer.id,
        before: {
          workTitle: deleteOffer.workTitle,
          roleName: deleteOffer.role_name,
          artistName: deleteOffer.artistName,
          fromTenant: deleteOffer.fromTenantName,
        },
      });

      toast.success("캐스팅 제안이 삭제되었습니다");
      setIsDeleteDialog(false);
      fetchOffers();
    } catch (err: any) {
      toast.error("삭제 실패: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async (offer: IncomingOffer) => {
    try {
      const { error } = await supabase
        .from("casting_offers")
        .update({
          is_deleted: false,
          deleted_by: null,
          deleted_at: null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", offer.id);

      if (error) throw error;
      toast.success("제안이 복원되었습니다");
      fetchOffers();
    } catch (err: any) {
      toast.error("복원 실패: " + err.message);
    }
  };

  // Split active vs deleted
  const activeOffers = offers.filter(o => !o.is_deleted);
  const deletedOffers = offers.filter(o => o.is_deleted);

  const filtered = activeOffers.filter(o => {
    if (tabFilter === "pending") return o.status === "pending";
    if (tabFilter === "accepted") return o.status === "accepted";
    if (tabFilter === "rejected") return o.status === "rejected";
    if (tabFilter === "deleted") return false; // handled separately
    return true;
  });

  const showDeleted = tabFilter === "deleted";

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderOfferCard = (o: IncomingOffer, isDeletedView = false) => (
    <Card key={o.id} className={`transition-shadow ${isDeletedView ? "opacity-70 border-dashed" : ""} ${o.status === "pending" && !isDeletedView ? "border-l-4 border-l-amber-400" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className="text-xs">{o.workCategory}</Badge>
              <h3 className="font-bold text-lg">{o.workTitle}</h3>
              {o.role_name && <Badge variant="secondary" className="text-xs">{o.role_name}</Badge>}
              {!isDeletedView && o.status === "pending" && <Badge className="bg-amber-100 text-amber-700 text-xs">검토 대기</Badge>}
              {!isDeletedView && o.status === "accepted" && <Badge className="bg-emerald-100 text-emerald-700 text-xs">승인</Badge>}
              {!isDeletedView && o.status === "rejected" && <Badge variant="destructive" className="text-xs">거절</Badge>}
              {isDeletedView && <Badge variant="outline" className="text-xs border-destructive text-destructive">삭제됨</Badge>}
            </div>

            {/* Work details */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2">
              {o.workDirector && <span>🎬 감독: {o.workDirector}</span>}
              {o.workWriter && <span>✍️ 작가: {o.workWriter}</span>}
              {o.workProductionCompany && <span>🏢 제작: {o.workProductionCompany}</span>}
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 flex-wrap">
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {o.fromTenantName}
              </span>
              {o.artistName && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" /> 대상: {o.artistName}
                </span>
              )}
              <span>{format(new Date(o.created_at), "yyyy.MM.dd HH:mm", { locale: ko })}</span>
            </div>

            {/* Deleted info */}
            {isDeletedView && o.deleted_at && (
              <div className="flex items-center gap-2 text-xs text-destructive mb-2">
                <Trash2 className="w-3 h-3" />
                <span>
                  삭제: {format(new Date(o.deleted_at), "yyyy.MM.dd HH:mm", { locale: ko })}
                  {o.deletedByName && ` · 삭제자: ${o.deletedByName}`}
                </span>
              </div>
            )}

            {/* Message */}
            {o.message && (
              <div className="bg-muted p-3 rounded text-sm text-foreground mb-2 whitespace-pre-wrap">
                <MessageSquare className="w-3 h-3 inline mr-1" />
                {o.message.split(/(https:\/\/drive\.google\.com\/\S+)/g).map((part, i) =>
                  part.match(/^https:\/\/drive\.google\.com\//) ? (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
                      {part}
                    </a>
                  ) : part
                )}
              </div>
            )}

            {/* Shared folder link button */}
            {!isDeletedView && (o.workDriveFolderLink || o.message?.includes("drive.google.com/drive/folders")) && (() => {
              const link = o.workDriveFolderLink || o.message?.match(/(https:\/\/drive\.google\.com\/drive\/folders\/[^\s]+)/)?.[1];
              return link ? (
                <a href={link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/60 hover:bg-accent text-sm text-primary font-medium transition-colors mb-2">
                  <FolderOpen className="w-4 h-4" />
                  시나리오 / 대본 공유 폴더 열기
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : null;
            })()}

            {/* Uploaded files (work_files) */}
            {!isDeletedView && o.workFiles && o.workFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {o.workFiles.map((f) => {
                  const href = f.drive_view_link || f.drive_download_link;
                  return href ? (
                    <a key={f.id} href={href} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm text-foreground font-medium transition-colors"
                      title={f.file_name}>
                      <FolderOpen className="w-4 h-4 text-primary" />
                      <span className="max-w-[240px] truncate">{f.file_name}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </a>
                  ) : (
                    <span key={f.id} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-sm text-muted-foreground" title={f.file_name}>
                      <FolderOpen className="w-4 h-4" />
                      <span className="max-w-[240px] truncate">{f.file_name}</span>
                    </span>
                  );
                })}
              </div>
            )}

            {o.response_note && (
              <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                💬 응답 메모: {o.response_note}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0 ml-4">
            {!isDeletedView && o.status === "pending" && (
              <>
                <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => openResponse(o, "accepted")}>
                  <Check className="w-4 h-4" /> 승인
                </Button>
                <Button size="sm" variant="destructive" className="gap-1" onClick={() => openResponse(o, "rejected")}>
                  <X className="w-4 h-4" /> 거절
                </Button>
              </>
            )}
            {!isDeletedView && (
              <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground hover:text-destructive" onClick={() => openDeleteDialog(o)}>
                <Trash2 className="w-4 h-4" /> 삭제
              </Button>
            )}
            {isDeletedView && (
              <Button size="sm" variant="outline" className="gap-1" onClick={() => handleRestore(o)}>
                <ArchiveRestore className="w-4 h-4" /> 복원
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1">
            <Inbox className="w-5 h-5" /> Casting Inbox
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">캐스팅 제안함</h1>
          <p className="text-muted-foreground mt-1">파트너 에이전시로부터 받은 캐스팅 제안을 확인하고 응답합니다.</p>
        </div>
        <Button variant="ghost" onClick={() => navigate("/admin")} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> 관리 시스템
        </Button>
      </div>

      <Tabs value={tabFilter} onValueChange={setTabFilter}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="gap-1">
            대기중 ({activeOffers.filter(o => o.status === "pending").length})
          </TabsTrigger>
          <TabsTrigger value="accepted" className="gap-1">
            승인 ({activeOffers.filter(o => o.status === "accepted").length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-1">
            거절 ({activeOffers.filter(o => o.status === "rejected").length})
          </TabsTrigger>
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="deleted" className="gap-1 text-destructive data-[state=active]:text-destructive">
            <Trash2 className="w-3.5 h-3.5" /> 삭제된 제안 ({deletedOffers.length})
          </TabsTrigger>
        </TabsList>

        {["pending", "accepted", "rejected", "all"].map(tab => (
          <TabsContent key={tab} value={tab}>
            {filtered.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <Inbox className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>{tab === "pending" ? "대기 중인 제안이 없습니다." : "해당 제안이 없습니다."}</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {filtered.map(o => renderOfferCard(o, false))}
              </div>
            )}
          </TabsContent>
        ))}

        <TabsContent value="deleted">
          {deletedOffers.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Trash2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>삭제된 제안이 없습니다.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {deletedOffers.map(o => renderOfferCard(o, true))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Response Dialog */}
      <Dialog open={isResponseDialog} onOpenChange={setIsResponseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {responseAction === "accepted" ? "캐스팅 제안 승인" : "캐스팅 제안 거절"}
            </DialogTitle>
            <DialogDescription>
              「{responseOffer?.workTitle}」 - {responseOffer?.artistName || "배우"}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="응답 메모를 입력하세요 (선택사항)..."
            value={responseNote}
            onChange={e => setResponseNote(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResponseDialog(false)}>취소</Button>
            <Button
              onClick={handleRespond}
              disabled={processing}
              className={responseAction === "accepted" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              variant={responseAction === "rejected" ? "destructive" : "default"}
            >
              {processing && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {responseAction === "accepted" ? "승인" : "거절"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialog} onOpenChange={setIsDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>캐스팅 제안 삭제</DialogTitle>
            <DialogDescription>
              「{deleteOffer?.workTitle}」 {deleteOffer?.role_name ? `- ${deleteOffer.role_name}` : ""} 제안을 삭제하시겠습니까?
              <br />삭제된 제안은 '삭제된 제안' 탭에서 확인하고 복원할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialog(false)}>취소</Button>
            <Button variant="destructive" onClick={handleSoftDelete} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CastingInbox;
