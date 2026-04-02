import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Trash2, Loader2, FileText, ChevronDown, ChevronUp, UserCheck, Clock, Check, X,
  Upload, Paperclip, Download, Eye, RotateCcw, Pencil, Send,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { writeAuditLog } from "@/lib/auditLog";
import jsPDF from "jspdf";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "임시저장", variant: "secondary" },
  pending: { label: "결재대기", variant: "outline" },
  approved: { label: "승인", variant: "default" },
  rejected: { label: "반려", variant: "destructive" },
  cancelled: { label: "취소", variant: "secondary" },
};

const CATEGORIES = ["일반", "예산", "계약", "인사", "구매", "긴급", "기타"];
const SUPABASE_URL = "https://matcnptzugnaisuhowbk.supabase.co";

interface AttachmentFile {
  file?: File;
  file_name: string;
  file_url?: string;
  id?: string;
}

interface ApprovalLineItem {
  user_id: string;
  name: string;
  job_title: string;
  step_order: number;
}

const ProposalRequest = () => {
  const { user, currentTenant, isCompanyAdmin } = useAuth();
  const tenantId = currentTenant?.tenant_id;

  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("my");

  // Create dialog
  const [createDialog, setCreateDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("일반");
  const [content, setContent] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [budgetDate, setBudgetDate] = useState("");
  const [requestedDate, setRequestedDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Approval line
  const [approvalLines, setApprovalLines] = useState<ApprovalLineItem[]>([]);

  // Admin: pending
  const [pendingProposals, setPendingProposals] = useState<any[]>([]);
  const [pendingApprovalLines, setPendingApprovalLines] = useState<Record<string, { approver_user_id: string; step_order: number }[]>>({});

  // Detail
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [expandedAttachments, setExpandedAttachments] = useState<any[]>([]);

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);

  // PDF
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    if (tenantId && user) loadAll();
  }, [tenantId, user]);

  const loadAll = async () => {
    if (!tenantId || !user) return;
    setLoading(true);

    const { data: myData } = await supabase
      .from("proposals")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setProposals(myData || []);

    // Load approval line
    const { data: approvalData } = await supabase
      .from("approval_lines")
      .select("approver_user_id, step_order")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .order("step_order", { ascending: true });

    if (approvalData && approvalData.length > 0) {
      const approverIds = approvalData.map((a: any) => a.approver_user_id);
      const [profilesRes, membersRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", approverIds),
        supabase.from("tenant_memberships").select("user_id, job_title").eq("tenant_id", tenantId).in("user_id", approverIds),
      ]);
      const nameMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p.full_name]));
      const titleMap = new Map((membersRes.data || []).map((m: any) => [m.user_id, m.job_title]));
      setApprovalLines(approvalData.map((a: any) => ({
        user_id: a.approver_user_id,
        name: nameMap.get(a.approver_user_id) || "이름 없음",
        job_title: titleMap.get(a.approver_user_id) || "",
        step_order: a.step_order,
      })));
    } else {
      setApprovalLines([]);
    }

    if (isCompanyAdmin) {
      const { data: pending } = await supabase
        .from("proposals")
        .select("*, profile:profiles!proposals_user_id_fkey(full_name, email)")
        .eq("tenant_id", tenantId)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      setPendingProposals(pending || []);

      const requesterIds = [...new Set((pending || []).map((r: any) => r.user_id))];
      if (requesterIds.length > 0) {
        const { data: linesData } = await supabase
          .from("approval_lines")
          .select("user_id, approver_user_id, step_order")
          .eq("tenant_id", tenantId)
          .in("user_id", requesterIds)
          .order("step_order", { ascending: true });
        const map: Record<string, { approver_user_id: string; step_order: number }[]> = {};
        for (const row of linesData || []) {
          if (!map[row.user_id]) map[row.user_id] = [];
          map[row.user_id].push({ approver_user_id: row.approver_user_id, step_order: row.step_order });
        }
        setPendingApprovalLines(map);
      }
    }

    setLoading(false);
  };

  // File handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAttachments = Array.from(files).map(f => ({ file: f, file_name: f.name }));
    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = "";
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const uploadFile = async (file: File, proposalId: string, idx: number): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${tenantId}/${proposalId}/${idx}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("proposal-attachments").upload(path, file, { upsert: true });
    if (error) { console.error("Upload error:", error); return null; }
    return `${SUPABASE_URL}/storage/v1/object/public/proposal-attachments/${path}`;
  };

  // Submit
  const submitProposal = async () => {
    if (!tenantId || !user) return;
    if (!title.trim()) { toast.error("제목을 입력해주세요."); return; }
    if (!content.trim()) { toast.error("본문을 입력해주세요."); return; }

    setSubmitting(true);
    try {
      const { data: proposal, error } = await supabase
        .from("proposals")
        .insert({
          tenant_id: tenantId,
          user_id: user.id,
          title: title.trim(),
          category,
          content: content.trim(),
          amount: amount || 0,
          budget_date: budgetDate || null,
          requested_date: requestedDate,
          description: description.trim() || null,
          status: "pending",
        } as any)
        .select()
        .single();

      if (error || !proposal) throw error || new Error("생성 실패");

      // Upload attachments
      for (let idx = 0; idx < attachments.length; idx++) {
        const att = attachments[idx];
        if (att.file) {
          const url = await uploadFile(att.file, proposal.id, idx);
          if (url) {
            await supabase.from("proposal_attachments").insert({
              proposal_id: proposal.id,
              file_name: att.file_name,
              file_url: url,
              file_size: att.file.size,
              uploaded_by: user.id,
            } as any);
          }
        }
      }

      writeAuditLog({
        tenantId, userId: user.id, action: "create",
        entity: "proposal", entityId: proposal.id,
        after: { title, category, amount },
      });

      toast.success("기안서가 제출되었습니다");
      setCreateDialog(false);
      resetForm();
      loadAll();
    } catch (err: any) {
      toast.error("제출 실패: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle(""); setCategory("일반"); setContent(""); setAmount(0);
    setBudgetDate(""); setRequestedDate(new Date().toISOString().split("T")[0]);
    setDescription(""); setAttachments([]); setEditingId(null);
  };

  // Recall
  const recallProposal = async (id: string) => {
    if (!confirm("결재 요청을 회수하시겠습니까?")) return;
    await supabase.from("proposals").update({
      status: "draft", approved_by: null, approved_at: null, reject_reason: null,
      updated_at: new Date().toISOString(),
    } as any).eq("id", id);
    toast.success("회수되었습니다.");
    loadAll();
  };

  // Edit
  const openEditDialog = async (proposal: any) => {
    setEditingId(proposal.id);
    setTitle(proposal.title);
    setCategory(proposal.category);
    setContent(proposal.content || "");
    setAmount(Number(proposal.amount) || 0);
    setBudgetDate(proposal.budget_date || "");
    setRequestedDate(proposal.requested_date || new Date().toISOString().split("T")[0]);
    setDescription(proposal.description || "");

    const { data: existingAttachments } = await supabase
      .from("proposal_attachments")
      .select("*")
      .eq("proposal_id", proposal.id);
    setAttachments((existingAttachments || []).map((a: any) => ({
      id: a.id, file_name: a.file_name, file_url: a.file_url,
    })));
    setCreateDialog(true);
  };

  const updateAndResubmit = async () => {
    if (!tenantId || !user || !editingId) return;
    if (!title.trim()) { toast.error("제목을 입력해주세요."); return; }
    if (!content.trim()) { toast.error("본문을 입력해주세요."); return; }

    setSubmitting(true);
    try {
      await supabase.from("proposals").update({
        title: title.trim(), category, content: content.trim(),
        amount: amount || 0, budget_date: budgetDate || null,
        requested_date: requestedDate,
        description: description.trim() || null,
        status: "pending", approved_by: null, approved_at: null, reject_reason: null,
        updated_at: new Date().toISOString(),
      } as any).eq("id", editingId);

      // Upload new files
      for (let idx = 0; idx < attachments.length; idx++) {
        const att = attachments[idx];
        if (att.file) {
          const url = await uploadFile(att.file, editingId, idx);
          if (url) {
            await supabase.from("proposal_attachments").insert({
              proposal_id: editingId, file_name: att.file_name,
              file_url: url, file_size: att.file.size, uploaded_by: user.id,
            } as any);
          }
        }
      }

      toast.success("수정 후 다시 제출되었습니다");
      setCreateDialog(false);
      resetForm();
      loadAll();
    } catch (err: any) {
      toast.error("수정 실패: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Expand
  const toggleExpand = async (proposalId: string) => {
    if (expandedRow === proposalId) { setExpandedRow(null); return; }
    const { data } = await supabase
      .from("proposal_attachments")
      .select("*")
      .eq("proposal_id", proposalId);
    setExpandedAttachments(data || []);
    setExpandedRow(proposalId);
  };

  // Approval
  const getRequesterApprovalLine = async (requesterUserId: string) => {
    if (!tenantId) return [];
    const cached = pendingApprovalLines[requesterUserId];
    if (cached) return [...cached].sort((a, b) => a.step_order - b.step_order);
    const { data } = await supabase
      .from("approval_lines")
      .select("approver_user_id, step_order")
      .eq("tenant_id", tenantId)
      .eq("user_id", requesterUserId)
      .order("step_order", { ascending: true });
    const lines = (data || []).map((l: any) => ({ approver_user_id: l.approver_user_id, step_order: l.step_order }));
    setPendingApprovalLines(prev => ({ ...prev, [requesterUserId]: lines }));
    return lines;
  };

  const getNextApprover = (lines: { approver_user_id: string; step_order: number }[], lastActorUserId: string | null) => {
    if (lines.length === 0) return { nextApproverId: null as string | null, nextIndex: 0 };
    const lastIdx = lastActorUserId ? lines.findIndex(l => l.approver_user_id === lastActorUserId) : -1;
    const nextIndex = lastIdx + 1;
    return { nextApproverId: lines[nextIndex]?.approver_user_id ?? null, nextIndex };
  };

  const approveProposal = async (id: string) => {
    if (!user || !tenantId) return;
    const req = pendingProposals.find(r => r.id === id);
    if (!req) return;
    const lines = await getRequesterApprovalLine(req.user_id);
    const { nextApproverId, nextIndex } = getNextApprover(lines, req.approved_by || null);
    if (nextApproverId && nextApproverId !== user.id) { toast.error("현재 결재 차례가 아닙니다."); return; }
    const isFinal = lines.length === 0 || nextIndex >= lines.length - 1;
    if (!isFinal) {
      await supabase.from("proposals").update({ approved_by: user.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any).eq("id", id);
      toast.success(`${nextIndex + 1}차 승인 완료`);
    } else {
      await supabase.from("proposals").update({ status: "approved", approved_by: user.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any).eq("id", id);
      toast.success("최종 승인 완료");
    }
    loadAll();
  };

  const rejectProposal = async (id: string) => {
    if (!user || !tenantId) return;
    const req = pendingProposals.find(r => r.id === id);
    if (!req) return;
    const lines = await getRequesterApprovalLine(req.user_id);
    const { nextApproverId } = getNextApprover(lines, req.approved_by || null);
    if (nextApproverId && nextApproverId !== user.id) { toast.error("현재 결재 차례가 아닙니다."); return; }
    const reason = prompt("반려 사유를 입력하세요:");
    if (reason === null) return;
    await supabase.from("proposals").update({
      status: "rejected", approved_by: user.id, approved_at: new Date().toISOString(),
      reject_reason: reason, updated_at: new Date().toISOString(),
    } as any).eq("id", id);
    toast.success("반려 완료");
    loadAll();
  };

  // PDF
  const generatePdf = async (proposal: any) => {
    setGeneratingPdf(true);
    try {
      const [{ data: companyData }, { data: approvalLinesData }, { data: requesterProfile }] = await Promise.all([
        supabase.from("tenants").select("name, address, biz_number, rep_name, logo_url, seal_url").eq("id", proposal.tenant_id || tenantId).single(),
        supabase.from("approval_lines").select("approver_user_id, step_order").eq("user_id", proposal.user_id).eq("tenant_id", proposal.tenant_id || tenantId).order("step_order", { ascending: true }),
        supabase.from("profiles").select("full_name, signature_url").eq("id", proposal.user_id).single(),
      ]);

      const company = companyData || { name: "", address: "", biz_number: "", rep_name: "", logo_url: "", seal_url: "" };
      let approverProfiles: any[] = [];
      if (approvalLinesData && approvalLinesData.length > 0) {
        const ids = approvalLinesData.map((a: any) => a.approver_user_id);
        const [pRes, mRes] = await Promise.all([
          supabase.from("profiles").select("id, full_name, signature_url").in("id", ids),
          supabase.from("tenant_memberships").select("user_id, job_title").eq("tenant_id", tenantId).in("user_id", ids),
        ]);
        const titleMap = new Map((mRes.data || []).map((m: any) => [m.user_id, m.job_title]));
        approverProfiles = approvalLinesData.map((line: any) => {
          const p = (pRes.data || []).find((pr: any) => pr.id === line.approver_user_id);
          return { ...line, full_name: p?.full_name || "", signature_url: p?.signature_url || "", job_title: titleMap.get(line.approver_user_id) || "" };
        });
      }

      const requesterName = requesterProfile?.full_name || "";
      const requesterSig = requesterProfile?.signature_url || "";

      const signatureBoxes = [
        `<td style="border:1px solid #cbd5e1;text-align:center;width:100px;padding:4px;">
          <div style="font-size:9px;color:#64748b;">기안자</div>
          <div style="height:40px;display:flex;align-items:center;justify-content:center;">${requesterSig ? `<img src="${requesterSig}" style="max-height:36px;max-width:80px;" crossorigin="anonymous"/>` : ""}</div>
          <div style="font-size:11px;font-weight:600;">${requesterName}</div>
        </td>`,
        ...approverProfiles.map((ap: any) => `
          <td style="border:1px solid #cbd5e1;text-align:center;width:100px;padding:4px;">
            <div style="font-size:9px;color:#64748b;">${ap.job_title || `${ap.step_order}차 결재`}</div>
            <div style="height:40px;display:flex;align-items:center;justify-content:center;">${ap.signature_url ? `<img src="${ap.signature_url}" style="max-height:36px;max-width:80px;" crossorigin="anonymous"/>` : ""}</div>
            <div style="font-size:11px;font-weight:600;">${ap.full_name}</div>
          </td>`),
      ].join("");

      const html = `
        <div style="font-family:'Malgun Gothic',sans-serif;padding:30px;max-width:700px;margin:auto;">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:20px;">
            <div>${company.logo_url ? `<img src="${company.logo_url}" style="max-height:50px;" crossorigin="anonymous"/>` : `<h2>${company.name}</h2>`}</div>
            <table style="border-collapse:collapse;"><tr>${signatureBoxes}</tr></table>
          </div>
          <h1 style="text-align:center;font-size:22px;margin:20px 0;">기 안 서</h1>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <tr><td style="border:1px solid #cbd5e1;padding:8px;background:#f8fafc;width:120px;font-weight:600;">제목</td><td style="border:1px solid #cbd5e1;padding:8px;">${proposal.title}</td></tr>
            <tr><td style="border:1px solid #cbd5e1;padding:8px;background:#f8fafc;font-weight:600;">카테고리</td><td style="border:1px solid #cbd5e1;padding:8px;">${proposal.category}</td></tr>
            <tr><td style="border:1px solid #cbd5e1;padding:8px;background:#f8fafc;font-weight:600;">기안일</td><td style="border:1px solid #cbd5e1;padding:8px;">${proposal.requested_date || format(new Date(proposal.created_at), "yyyy-MM-dd")}</td></tr>
            ${proposal.amount ? `<tr><td style="border:1px solid #cbd5e1;padding:8px;background:#f8fafc;font-weight:600;">금액</td><td style="border:1px solid #cbd5e1;padding:8px;">${Number(proposal.amount).toLocaleString()}원</td></tr>` : ""}
            ${proposal.budget_date ? `<tr><td style="border:1px solid #cbd5e1;padding:8px;background:#f8fafc;font-weight:600;">예산 발생일</td><td style="border:1px solid #cbd5e1;padding:8px;">${proposal.budget_date}</td></tr>` : ""}
          </table>
          <div style="border:1px solid #cbd5e1;padding:16px;min-height:200px;white-space:pre-wrap;line-height:1.8;">${proposal.content || ""}</div>
          ${proposal.description ? `<div style="margin-top:12px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;"><strong>비고:</strong> ${proposal.description}</div>` : ""}
        </div>`;

      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.width = "794px";
      container.innerHTML = html;
      document.body.appendChild(container);

      await new Promise(r => setTimeout(r, 300));
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(container, { scale: 2, useCORS: true });
      document.body.removeChild(container);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pW = pdf.internal.pageSize.getWidth();
      const pH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      let imgW = pW - 20, imgH = imgW / ratio;
      if (imgH > pH - 20) { imgH = pH - 20; imgW = imgH * ratio; }
      pdf.addImage(imgData, "PNG", 10, 10, imgW, imgH);
      pdf.save(`기안서_${proposal.title}_${format(new Date(), "yyyyMMdd")}.pdf`);
      toast.success("PDF 다운로드 완료");
    } catch (err: any) {
      toast.error("PDF 생성 실패: " + err.message);
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6" /> 기안서</h1>
        <Button onClick={() => { resetForm(); setCreateDialog(true); }}><Plus className="w-4 h-4 mr-1" /> 기안서 작성</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="my">내 기안서</TabsTrigger>
          {isCompanyAdmin && <TabsTrigger value="pending">결재 대기 ({pendingProposals.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="my">
          <Card>
            <CardContent className="p-0">
              {proposals.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">제출한 기안서가 없습니다.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>제목</TableHead>
                      <TableHead>카테고리</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                      <TableHead>기안일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proposals.map((p) => {
                      const st = STATUS_MAP[p.status] || STATUS_MAP.draft;
                      const isExpanded = expandedRow === p.id;
                      return (
                        <React.Fragment key={p.id}>
                          <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(p.id)}>
                            <TableCell className="font-medium flex items-center gap-1">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              {p.title}
                            </TableCell>
                            <TableCell>{p.category}</TableCell>
                            <TableCell className="text-right">{Number(p.amount) > 0 ? `${Number(p.amount).toLocaleString()}원` : "-"}</TableCell>
                            <TableCell>{p.requested_date || format(new Date(p.created_at), "yyyy-MM-dd")}</TableCell>
                            <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                                {p.status === "pending" && (
                                  <Button size="sm" variant="outline" onClick={() => recallProposal(p.id)}><RotateCcw className="w-3 h-3 mr-1" />회수</Button>
                                )}
                                {(p.status === "draft" || p.status === "rejected") && (
                                  <Button size="sm" variant="outline" onClick={() => openEditDialog(p)}><Pencil className="w-3 h-3 mr-1" />수정</Button>
                                )}
                                {p.status === "approved" && (
                                  <Button size="sm" variant="outline" onClick={() => generatePdf(p)} disabled={generatingPdf}>
                                    <Download className="w-3 h-3 mr-1" />PDF
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={6} className="bg-muted/30 p-4">
                                <div className="space-y-3">
                                  <div><strong>본문:</strong><p className="whitespace-pre-wrap mt-1 text-sm">{p.content}</p></div>
                                  {p.description && <div><strong>비고:</strong> {p.description}</div>}
                                  {p.reject_reason && <div className="text-destructive"><strong>반려 사유:</strong> {p.reject_reason}</div>}
                                  {expandedAttachments.length > 0 && (
                                    <div>
                                      <strong>첨부파일:</strong>
                                      <ul className="mt-1 space-y-1">
                                        {expandedAttachments.map((att: any) => (
                                          <li key={att.id} className="flex items-center gap-2 text-sm">
                                            <Paperclip className="w-3 h-3" />
                                            <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{att.file_name}</a>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {approvalLines.length > 0 && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <UserCheck className="w-4 h-4" /> 결재라인:
                                      {approvalLines.map((a, i) => (
                                        <span key={i}><Badge variant="outline">{a.step_order}차 {a.name} ({a.job_title})</Badge></span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isCompanyAdmin && (
          <TabsContent value="pending">
            <Card>
              <CardContent className="p-0">
                {pendingProposals.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">결재 대기 중인 기안서가 없습니다.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>제목</TableHead>
                        <TableHead>기안자</TableHead>
                        <TableHead>카테고리</TableHead>
                        <TableHead className="text-right">금액</TableHead>
                        <TableHead>기안일</TableHead>
                        <TableHead className="text-right">결재</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingProposals.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.title}</TableCell>
                          <TableCell>{p.profile?.full_name || p.user_id?.slice(0, 8)}</TableCell>
                          <TableCell>{p.category}</TableCell>
                          <TableCell className="text-right">{Number(p.amount) > 0 ? `${Number(p.amount).toLocaleString()}원` : "-"}</TableCell>
                          <TableCell>{p.requested_date || format(new Date(p.created_at), "yyyy-MM-dd")}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" onClick={() => approveProposal(p.id)}><Check className="w-3 h-3 mr-1" />승인</Button>
                              <Button size="sm" variant="destructive" onClick={() => rejectProposal(p.id)}><X className="w-3 h-3 mr-1" />반려</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={createDialog} onOpenChange={(open) => { if (!open) { setCreateDialog(false); resetForm(); } else setCreateDialog(true); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "기안서 수정" : "기안서 작성"}</DialogTitle>
            <DialogDescription>기안 내용을 입력하고 결재를 올리세요.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>제목 *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="기안 제목" />
              </div>
              <div>
                <Label>카테고리</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>기안일</Label>
                <Input type="date" value={requestedDate} onChange={e => setRequestedDate(e.target.value)} />
              </div>
              <div>
                <Label>금액</Label>
                <Input type="number" value={amount || ""} onChange={e => setAmount(Number(e.target.value))} placeholder="0" />
              </div>
              <div>
                <Label>예산 발생일</Label>
                <Input type="date" value={budgetDate} onChange={e => setBudgetDate(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>본문 *</Label>
              <Textarea value={content} onChange={e => setContent(e.target.value)} rows={8} placeholder="기안 내용을 상세히 입력하세요." />
            </div>

            <div>
              <Label>비고</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="추가 메모" />
            </div>

            {/* Attachments */}
            <div>
              <Label className="flex items-center gap-1 mb-2"><Paperclip className="w-4 h-4" /> 첨부파일</Label>
              <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileSelect} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-1" /> 파일 추가
              </Button>
              {attachments.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {attachments.map((att, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm bg-muted/50 rounded px-2 py-1">
                      <Paperclip className="w-3 h-3" />
                      <span className="flex-1 truncate">{att.file_name}</span>
                      {att.file_url && <a href={att.file_url} target="_blank" rel="noopener noreferrer"><Eye className="w-3 h-3" /></a>}
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeAttachment(idx)}><Trash2 className="w-3 h-3" /></Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Approval Line Preview */}
            {approvalLines.length > 0 && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <Label className="flex items-center gap-1 mb-2"><UserCheck className="w-4 h-4" /> 결재라인</Label>
                <div className="flex gap-2 flex-wrap">
                  {approvalLines.map((a, i) => (
                    <Badge key={i} variant="outline">{a.step_order}차 · {a.name} ({a.job_title})</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialog(false); resetForm(); }}>취소</Button>
            {editingId ? (
              <Button onClick={updateAndResubmit} disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                수정 후 재제출
              </Button>
            ) : (
              <Button onClick={submitProposal} disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                결재 요청
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProposalRequest;
