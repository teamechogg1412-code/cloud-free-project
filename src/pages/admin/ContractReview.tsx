import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft, FileText, Upload, RefreshCw, Loader2,
  CheckCircle2, XCircle, Clock, Eye, AlertTriangle, Download, Plus,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const STATUS_CONFIG: Record<string, { label: string; color: string; Icon: any }> = {
  pending:   { label: "검토 대기", color: "bg-gray-100 text-gray-600 border-gray-200",     Icon: Clock },
  reviewing: { label: "검토 중",   color: "bg-blue-100 text-blue-700 border-blue-200",     Icon: Eye },
  approved:  { label: "승인",      color: "bg-green-100 text-green-700 border-green-200",  Icon: CheckCircle2 },
  rejected:  { label: "반려",      color: "bg-red-100 text-red-700 border-red-200",        Icon: XCircle },
  revision:  { label: "수정 요청", color: "bg-orange-100 text-orange-700 border-orange-200", Icon: AlertTriangle },
};

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
];

const ContractReview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [reviews, setReviews] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 업로드 다이얼로그
  const [uploadOpen, setUploadOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [artistId, setArtistId] = useState("");
  const [notes, setNotes] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 검토 다이얼로그
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const [reviewStatus, setReviewStatus] = useState("");
  const [reviewerNote, setReviewerNote] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: membership } = await supabase
        .from("tenant_memberships")
        .select("tenant_id")
        .eq("user_id", user.id)
        .single();
      if (!membership) return;
      setTenantId(membership.tenant_id);

      const [{ data: reviewsData }, { data: artistsData }, { data: membersData }] = await Promise.all([
        supabase
          .from("contract_reviews")
          .select(`
            *,
            artist:artists!artist_id(name),
            reviewer:profiles!reviewer_id(full_name, telegram_chat_id),
            creator:profiles!created_by(full_name)
          `)
          .eq("tenant_id", membership.tenant_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("artists")
          .select("id, name")
          .eq("tenant_id", membership.tenant_id)
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("tenant_memberships")
          .select("profiles(id, full_name, telegram_chat_id)")
          .eq("tenant_id", membership.tenant_id),
      ]);

      setReviews(reviewsData || []);
      setArtists(artistsData || []);
      setMembers(
        (membersData || [])
          .map((m: any) => m.profiles)
          .filter(Boolean)
      );
    } catch {
      toast.error("데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && ACCEPTED_TYPES.includes(dropped.type)) {
      setFile(dropped);
    } else {
      toast.error("PDF, Word, 이미지 파일만 업로드 가능합니다");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const openFile = async (filePath: string) => {
    const { data } = await supabase.storage
      .from("contract-reviews")
      .createSignedUrl(filePath, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("파일 열기 실패");
  };

  const handleSubmit = async () => {
    if (!file) return toast.error("파일을 첨부해주세요");
    if (!title.trim()) return toast.error("제목을 입력해주세요");
    if (!reviewerId) return toast.error("검토 담당자를 선택해주세요");
    if (!tenantId) return;

    setSubmitting(true);
    try {
      const path = `${tenantId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("contract-reviews")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: inserted, error: insertError } = await supabase
        .from("contract_reviews")
        .insert({
          tenant_id: tenantId,
          artist_id: artistId || null,
          title: title.trim(),
          notes: notes.trim() || null,
          file_path: path,
          file_name: file.name,
          file_size: file.size,
          reviewer_id: reviewerId,
          created_by: user?.id,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      // 텔레그램 DM 발송
      await invokeEdgeFunction("telegram-alerts", {
        body: {
          action: "notify_reviewer",
          reviewer_id: reviewerId,
          review_title: title.trim(),
          artist_name: artists.find((a) => a.id === artistId)?.name,
          notes: notes.trim() || null,
          review_id: inserted?.id,
        },
      }).catch(() => {});

      toast.success("검토 요청이 전송됐습니다");
      setUploadOpen(false);
      resetForm();
      await fetchData();
    } catch (e: any) {
      toast.error("제출 실패: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async () => {
    if (!selectedReview || !reviewStatus) return toast.error("검토 결과를 선택해주세요");
    setReviewing(true);
    try {
      await supabase
        .from("contract_reviews")
        .update({
          status: reviewStatus,
          reviewer_note: reviewerNote.trim() || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedReview.id);
      toast.success("검토 결과가 저장됐습니다");
      setReviewOpen(false);
      await fetchData();
    } catch {
      toast.error("저장 실패");
    } finally {
      setReviewing(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setArtistId("");
    setNotes("");
    setReviewerId("");
  };

  const openReviewDialog = (review: any) => {
    setSelectedReview(review);
    setReviewStatus(review.status);
    setReviewerNote(review.reviewer_note || "");
    setReviewOpen(true);
  };

  const fmt = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">계약서 검토</h1>
              <p className="text-sm text-gray-500">담당자에게 검토 요청 및 승인 관리</p>
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              새로고침
            </Button>
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              검토 요청
            </Button>
          </div>
        </div>

        {/* 안내 */}
        <Card className="mb-6 border-indigo-200 bg-indigo-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-indigo-800">
              계약서를 업로드하고 담당자를 지정하면 텔레그램으로 알림이 전송됩니다.
              담당자가 텔레그램을 등록하려면 봇에 <code className="bg-indigo-100 px-1 rounded">/register 이메일</code>을 입력하세요.
            </p>
          </CardContent>
        </Card>

        {/* 목록 */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <FileText className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">등록된 검토 요청이 없습니다</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>제목</TableHead>
                    <TableHead>아티스트</TableHead>
                    <TableHead>특이사항</TableHead>
                    <TableHead>검토 담당자</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>검토 의견</TableHead>
                    <TableHead>요청일</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((r) => {
                    const s = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          <button
                            className="flex items-center gap-2 hover:text-indigo-600 text-left"
                            onClick={() => openFile(r.file_path)}
                          >
                            <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span className="line-clamp-1">{r.title}</span>
                            <Download className="w-3 h-3 text-gray-300 shrink-0" />
                          </button>
                          <p className="text-xs text-gray-400 mt-0.5">{r.file_name} {r.file_size && `(${fmt(r.file_size)})`}</p>
                        </TableCell>
                        <TableCell className="text-sm">{r.artist?.name || <span className="text-gray-400">-</span>}</TableCell>
                        <TableCell className="text-sm max-w-xs">
                          {r.notes
                            ? <span className="line-clamp-2">{r.notes}</span>
                            : <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{r.reviewer?.full_name || "-"}</div>
                          {!r.reviewer?.telegram_chat_id && (
                            <span className="text-xs text-orange-500">텔레그램 미등록</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${s.color} gap-1 text-xs`}>
                            <s.Icon className="w-3 h-3" />
                            {s.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-xs">
                          {r.reviewer_note
                            ? <span className="line-clamp-2">{r.reviewer_note}</span>
                            : <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell className="text-sm text-gray-400 whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString("ko-KR")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost" size="sm"
                            className="text-xs"
                            onClick={() => openReviewDialog(r)}
                          >
                            검토
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 업로드 다이얼로그 */}
      <Dialog open={uploadOpen} onOpenChange={(o) => { if (!o) { setUploadOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-500" />
              계약서 검토 요청
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 파일 드래그 영역 */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragOver ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-indigo-300"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-indigo-500" />
                  <div className="text-left">
                    <p className="font-medium text-gray-800">{file.name}</p>
                    <p className="text-sm text-gray-400">{fmt(file.size)}</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">파일을 드래그하거나 클릭해서 선택</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, Word, 이미지 (최대 50MB)</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
              />
            </div>

            {/* 제목 */}
            <div className="space-y-1.5">
              <Label>제목 <span className="text-red-500">*</span></Label>
              <Input
                placeholder="예: 홍길동 전속 계약서 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* 아티스트 */}
            <div className="space-y-1.5">
              <Label>아티스트</Label>
              <Select value={artistId} onValueChange={setArtistId}>
                <SelectTrigger>
                  <SelectValue placeholder="선택 안 함" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">선택 안 함</SelectItem>
                  {artists.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 특이사항 및 의견 */}
            <div className="space-y-1.5">
              <Label>특이사항 및 의견</Label>
              <Textarea
                placeholder="검토 시 주의할 사항, 배경, 요청 사항을 자유롭게 작성하세요"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* 검토 담당자 */}
            <div className="space-y-1.5">
              <Label>검토 담당자 <span className="text-red-500">*</span></Label>
              <Select value={reviewerId} onValueChange={setReviewerId}>
                <SelectTrigger>
                  <SelectValue placeholder="담당자 선택" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name}
                      {!m.telegram_chat_id && " (텔레그램 미등록)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {reviewerId && !members.find((m: any) => m.id === reviewerId)?.telegram_chat_id && (
                <p className="text-xs text-orange-500">
                  이 담당자는 텔레그램을 등록하지 않아 알림이 전송되지 않습니다.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadOpen(false); resetForm(); }}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              검토 요청 전송
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 검토 결과 다이얼로그 */}
      <Dialog open={reviewOpen} onOpenChange={(o) => !o && setReviewOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              검토 결과 입력
            </DialogTitle>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4 py-2">
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <p className="font-medium text-sm">{selectedReview.title}</p>
                {selectedReview.artist?.name && (
                  <p className="text-xs text-gray-500">아티스트: {selectedReview.artist.name}</p>
                )}
                {selectedReview.notes && (
                  <p className="text-xs text-gray-500">특이사항: {selectedReview.notes}</p>
                )}
                <button
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-1"
                  onClick={() => openFile(selectedReview.file_path)}
                >
                  <Download className="w-3 h-3" /> 파일 열기
                </button>
              </div>

              <div className="space-y-1.5">
                <Label>검토 결과 <span className="text-red-500">*</span></Label>
                <Select value={reviewStatus} onValueChange={setReviewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="결과 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reviewing">검토 중</SelectItem>
                    <SelectItem value="approved">승인</SelectItem>
                    <SelectItem value="rejected">반려</SelectItem>
                    <SelectItem value="revision">수정 요청</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>검토 의견</Label>
                <Textarea
                  placeholder="검토 의견, 수정 요청 사항 등을 입력하세요"
                  value={reviewerNote}
                  onChange={(e) => setReviewerNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>취소</Button>
            <Button onClick={handleReview} disabled={reviewing}>
              {reviewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractReview;
