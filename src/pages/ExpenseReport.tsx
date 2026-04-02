import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "react-router-dom";
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
  Plus, Trash2, Loader2, FileCheck2, ChevronDown, ChevronUp, UserCheck, Clock, Check, X,
  Upload, FileImage, Download, Eye, RotateCcw, Pencil,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { writeAuditLog } from "@/lib/auditLog";
import jsPDF from "jspdf";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "임시저장", variant: "secondary" },
  pending: { label: "대기", variant: "outline" },
  approved: { label: "승인", variant: "default" },
  rejected: { label: "반려", variant: "destructive" },
  cancelled: { label: "취소", variant: "secondary" },
};

const CATEGORIES = ["일반", "출장비", "접대비", "교통비", "식대", "소모품", "기타"];
const PAYMENT_METHODS = ["법인카드", "개인카드", "현금", "계좌이체"];

const SUPABASE_URL = "https://matcnptzugnaisuhowbk.supabase.co";

interface ExpenseItem {
  id?: string;
  item_date: string;
  description: string;
  amount: number;
  payment_method: string;
  receipt_note: string;
  receipt_file?: File | null;
  receipt_file_url?: string | null;
}

interface ApprovalLineItem {
  user_id: string;
  name: string;
  job_title: string;
  step_order: number;
}

const ExpenseReport = () => {
  const { user, currentTenant, isCompanyAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tenantId = currentTenant?.tenant_id;

  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("my");

  // Project list for selector
  const [projectList, setProjectList] = useState<{ id: string; name: string; code: string | null }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // Create dialog
  const [createDialog, setCreateDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("일반");
  const [requestedDate, setRequestedDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<ExpenseItem[]>([
    { item_date: new Date().toISOString().split("T")[0], description: "", amount: 0, payment_method: "법인카드", receipt_note: "", receipt_file: null },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Approval line
  const [approvalLines, setApprovalLines] = useState<ApprovalLineItem[]>([]);

  // Admin: pending
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [pendingApprovalLines, setPendingApprovalLines] = useState<Record<string, { approver_user_id: string; step_order: number }[]>>({});

  // Detail/expand
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<any[]>([]);

  // PDF generation
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Edit mode
  const [editingReportId, setEditingReportId] = useState<string | null>(null);

  // Auto-fill from external invoice query params
  useEffect(() => {
    const fromInvoice = searchParams.get("from_invoice");
    if (fromInvoice) {
      const paramTitle = searchParams.get("title") || "";
      const paramDesc = searchParams.get("description") || "";
      const paramAmount = searchParams.get("amount") || "0";
      const paramDate = searchParams.get("requested_date") || new Date().toISOString().split("T")[0];
      const paramItems = searchParams.get("items");

      setTitle(paramTitle);
      setDescription(paramDesc);
      setRequestedDate(paramDate);

      if (paramItems) {
        try {
          const parsed = JSON.parse(paramItems);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems(parsed.map((item: any) => ({
              item_date: item.item_date || paramDate,
              description: item.description || "",
              amount: Number(item.amount) || 0,
              payment_method: "법인카드",
              receipt_note: "",
              receipt_file: null,
            })));
          }
        } catch {
          // fallback: single item
          setItems([{
            item_date: paramDate,
            description: paramDesc,
            amount: Number(paramAmount) || 0,
            payment_method: "법인카드",
            receipt_note: "",
            receipt_file: null,
          }]);
        }
      } else if (Number(paramAmount) > 0) {
        setItems([{
          item_date: paramDate,
          description: paramDesc,
          amount: Number(paramAmount) || 0,
          payment_method: "법인카드",
          receipt_note: "",
          receipt_file: null,
        }]);
      }

      setCreateDialog(true);
      // Clear query params
      setSearchParams({}, { replace: true });
    }
  }, []);

  useEffect(() => {
    if (tenantId && user) {
      loadAll();
      // Load projects for selector
      supabase.from("projects").select("id, name, code").eq("tenant_id", tenantId).eq("is_active", true).order("name").then(({ data }) => {
        setProjectList((data as any[]) || []);
      });
    }
  }, [tenantId, user]);

  const loadAll = async () => {
    if (!tenantId || !user) return;
    setLoading(true);

    const { data: myData } = await supabase
      .from("expense_reports")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setReports(myData || []);

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
        .from("expense_reports")
        .select("*, profile:profiles!expense_reports_user_id_fkey(full_name, email)")
        .eq("tenant_id", tenantId)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      setPendingReports(pending || []);

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

  // Items management
  const addItem = () => {
    setItems([...items, { item_date: new Date().toISOString().split("T")[0], description: "", amount: 0, payment_method: "법인카드", receipt_note: "", receipt_file: null }]);
  };
  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };
  const updateItem = (idx: number, field: keyof ExpenseItem, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  };

  const totalAmount = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  // Upload receipt file to storage
  const uploadReceiptFile = async (file: File, reportId: string, itemIndex: number): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${tenantId}/${reportId}/${itemIndex}_${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("expense-receipts")
      .upload(path, file, { upsert: true });

    if (error) {
      console.error("File upload error:", error);
      return null;
    }

    return `${SUPABASE_URL}/storage/v1/object/public/expense-receipts/${path}`;
  };

  // Submit
  const submitReport = async () => {
    if (!tenantId || !user) return;
    if (!title.trim()) { toast.error("제목을 입력해주세요."); return; }
    if (items.some(i => !i.description.trim() || !i.amount)) { toast.error("모든 항목의 내역과 금액을 입력해주세요."); return; }

    setSubmitting(true);
    try {
      const { data: report, error } = await supabase
        .from("expense_reports")
        .insert({
          tenant_id: tenantId,
          user_id: user.id,
          title: title.trim(),
          category,
          total_amount: totalAmount,
          requested_date: requestedDate,
          description: description.trim() || null,
          project_id: selectedProjectId || null,
        } as any)
        .select()
        .single();

      if (error || !report) throw error || new Error("생성 실패");

      // Upload files and build item inserts
      const itemInserts = [];
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        let receiptFileUrl: string | null = null;

        if (item.receipt_file) {
          receiptFileUrl = await uploadReceiptFile(item.receipt_file, report.id, idx);
        }

        itemInserts.push({
          expense_report_id: report.id,
          item_date: item.item_date,
          description: item.description.trim(),
          amount: Number(item.amount),
          payment_method: item.payment_method,
          receipt_note: item.receipt_note.trim() || null,
          sort_order: idx,
          receipt_file_url: receiptFileUrl,
        });
      }

      const { error: itemErr } = await supabase.from("expense_report_items").insert(itemInserts as any);
      if (itemErr) throw itemErr;

      writeAuditLog({
        tenantId, userId: user.id, action: "create",
        entity: "expense_report", entityId: report.id,
        after: { title, category, totalAmount },
      });

      toast.success("지출결의서가 제출되었습니다");
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
    setTitle(""); setCategory("일반"); setDescription(""); setRequestedDate(new Date().toISOString().split("T")[0]);
    setItems([{ item_date: new Date().toISOString().split("T")[0], description: "", amount: 0, payment_method: "법인카드", receipt_note: "", receipt_file: null }]);
    setEditingReportId(null);
    setSelectedProjectId("");
  };

  const cancelReport = async (id: string) => {
    if (!confirm("취소하시겠습니까?")) return;
    await supabase.from("expense_reports").update({ status: "cancelled", updated_at: new Date().toISOString() } as any).eq("id", id);
    toast.success("취소 완료");
    loadAll();
  };

  // Recall (회수) — pending → draft
  const recallReport = async (id: string) => {
    if (!confirm("결재 요청을 회수하시겠습니까? 수정 후 다시 제출할 수 있습니다.")) return;
    await supabase.from("expense_reports").update({
      status: "draft", approved_by: null, approved_at: null, reject_reason: null, updated_at: new Date().toISOString(),
    } as any).eq("id", id);
    writeAuditLog({ tenantId: tenantId!, userId: user!.id, action: "update", entity: "expense_report", entityId: id });
    toast.success("회수되었습니다. 수정 후 다시 제출하세요.");
    loadAll();
  };

  // Open edit dialog with existing report data
  const openEditDialog = async (report: any) => {
    setEditingReportId(report.id);
    setTitle(report.title);
    setCategory(report.category);
    setDescription(report.description || "");
    setRequestedDate(report.requested_date || new Date().toISOString().split("T")[0]);

    const { data: existingItems } = await supabase
      .from("expense_report_items")
      .select("*")
      .eq("expense_report_id", report.id)
      .order("sort_order", { ascending: true });

    if (existingItems && existingItems.length > 0) {
      setItems(existingItems.map((it: any) => ({
        id: it.id,
        item_date: it.item_date,
        description: it.description,
        amount: Number(it.amount),
        payment_method: it.payment_method || "법인카드",
        receipt_note: it.receipt_note || "",
        receipt_file: null,
        receipt_file_url: it.receipt_file_url || null,
      })));
    } else {
      setItems([{ item_date: new Date().toISOString().split("T")[0], description: "", amount: 0, payment_method: "법인카드", receipt_note: "", receipt_file: null }]);
    }

    setCreateDialog(true);
  };

  // Update & resubmit existing report
  const updateAndResubmit = async () => {
    if (!tenantId || !user || !editingReportId) return;
    if (!title.trim()) { toast.error("제목을 입력해주세요."); return; }
    if (items.some(i => !i.description.trim() || !i.amount)) { toast.error("모든 항목의 내역과 금액을 입력해주세요."); return; }

    setSubmitting(true);
    try {
      // Update report header
      await supabase.from("expense_reports").update({
        title: title.trim(),
        category,
        total_amount: totalAmount,
        requested_date: requestedDate,
        description: description.trim() || null,
        status: "pending",
        approved_by: null,
        approved_at: null,
        reject_reason: null,
        updated_at: new Date().toISOString(),
      } as any).eq("id", editingReportId);

      // Delete old items
      await supabase.from("expense_report_items").delete().eq("expense_report_id", editingReportId);

      // Re-insert items
      const itemInserts = [];
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        let receiptFileUrl: string | null = item.receipt_file_url || null;

        if (item.receipt_file) {
          const uploaded = await uploadReceiptFile(item.receipt_file, editingReportId, idx);
          if (uploaded) receiptFileUrl = uploaded;
        }

        itemInserts.push({
          expense_report_id: editingReportId,
          item_date: item.item_date,
          description: item.description.trim(),
          amount: Number(item.amount),
          payment_method: item.payment_method,
          receipt_note: item.receipt_note.trim() || null,
          sort_order: idx,
          receipt_file_url: receiptFileUrl,
        });
      }

      await supabase.from("expense_report_items").insert(itemInserts as any);

      writeAuditLog({
        tenantId, userId: user.id, action: "update",
        entity: "expense_report", entityId: editingReportId,
        after: { title, category, totalAmount },
      });

      toast.success("수정 후 다시 제출되었습니다");
      setCreateDialog(false);
      setEditingReportId(null);
      resetForm();
      loadAll();
    } catch (err: any) {
      toast.error("수정 실패: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Expand to see items
  const toggleExpand = async (reportId: string) => {
    if (expandedRow === reportId) {
      setExpandedRow(null);
      return;
    }
    const { data } = await supabase
      .from("expense_report_items")
      .select("*")
      .eq("expense_report_id", reportId)
      .order("sort_order", { ascending: true });
    setExpandedItems(data || []);
    setExpandedRow(reportId);
  };

  // Approval flow
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

  const approveReport = async (id: string) => {
    if (!user || !tenantId) return;
    const req = pendingReports.find(r => r.id === id);
    if (!req) return;

    const lines = await getRequesterApprovalLine(req.user_id);
    const { nextApproverId, nextIndex } = getNextApprover(lines, req.approved_by || null);

    if (nextApproverId && nextApproverId !== user.id) {
      toast.error("현재 결재 차례가 아닙니다.");
      return;
    }

    const isFinal = lines.length === 0 || nextIndex >= lines.length - 1;

    if (!isFinal) {
      await supabase.from("expense_reports").update({ approved_by: user.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any).eq("id", id);
      toast.success(`${nextIndex + 1}차 승인 완료 (다음 결재자 대기)`);
    } else {
      await supabase.from("expense_reports").update({ status: "approved", approved_by: user.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any).eq("id", id);
      toast.success("최종 승인 완료");
    }
    loadAll();
  };

  const rejectReport = async (id: string) => {
    if (!user || !tenantId) return;
    const req = pendingReports.find(r => r.id === id);
    if (!req) return;

    const lines = await getRequesterApprovalLine(req.user_id);
    const { nextApproverId } = getNextApprover(lines, req.approved_by || null);
    if (nextApproverId && nextApproverId !== user.id) {
      toast.error("현재 결재 차례가 아닙니다.");
      return;
    }

    const reason = prompt("반려 사유를 입력하세요:");
    if (reason === null) return;

    await supabase.from("expense_reports").update({
      status: "rejected", approved_by: user.id, approved_at: new Date().toISOString(),
      reject_reason: reason, updated_at: new Date().toISOString(),
    } as any).eq("id", id);

    toast.success("반려 완료");
    loadAll();
  };

  // ─── PDF Generation via html2canvas ───
  const generatePdf = async (report: any) => {
    setGeneratingPdf(true);
    try {
      // Fetch items + company info + approval line + requester profile in parallel
      const [{ data: pdfItems }, { data: companyData }, { data: approvalLinesData }, { data: requesterProfile }] = await Promise.all([
        supabase
          .from("expense_report_items")
          .select("*")
          .eq("expense_report_id", report.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("tenants")
          .select("name, address, biz_number, rep_name, contact_email, logo_url, seal_url")
          .eq("id", report.tenant_id || tenantId)
          .single(),
        supabase
          .from("approval_lines")
          .select("approver_user_id, step_order")
          .eq("user_id", report.user_id)
          .eq("tenant_id", report.tenant_id || tenantId)
          .order("step_order", { ascending: true }),
        supabase
          .from("profiles")
          .select("full_name, signature_url")
          .eq("id", report.user_id)
          .single(),
      ]);

      // Fetch approver profiles with signatures
      const approverIds = (approvalLinesData || []).map((a: any) => a.approver_user_id);
      let approverProfiles: any[] = [];
      let approverTitles: Map<string, string> = new Map();
      if (approverIds.length > 0) {
        const [{ data: profiles }, { data: memberships }] = await Promise.all([
          supabase.from("profiles").select("id, full_name, signature_url").in("id", approverIds),
          supabase.from("tenant_memberships").select("user_id, job_title").eq("tenant_id", report.tenant_id || tenantId).in("user_id", approverIds),
        ]);
        approverProfiles = profiles || [];
        (memberships || []).forEach((m: any) => approverTitles.set(m.user_id, m.job_title || ""));
      }

      const itemsList = pdfItems || [];
      const company = companyData || {} as any;
      const formatAmt = (n: number) => n.toLocaleString("ko-KR") + "원";
      const statusLabel = STATUS_MAP[report.status]?.label || report.status;

      // Build HTML string
      const receiptImages = itemsList
        .filter((it: any) => it.receipt_file_url)
        .map((it: any) => `
          <div style="margin-bottom:16px;">
            <p style="font-size:12px;color:#555;margin-bottom:6px;">${it.item_date} — ${it.description}</p>
            <img src="${it.receipt_file_url}" style="max-width:500px;max-height:400px;border:1px solid #ddd;border-radius:4px;" crossorigin="anonymous" />
          </div>
        `).join("");

      const logoHtml = company.logo_url
        ? `<img src="${company.logo_url}" style="height:48px;object-fit:contain;" crossorigin="anonymous" />`
        : `<div style="width:48px;height:48px;background:#1e293b;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:20px;">${(company.name || "C").charAt(0)}</div>`;

      // Build approval line signature boxes
      const requesterName = requesterProfile?.full_name || "신청자";
      const requesterSigUrl = requesterProfile?.signature_url;
      const requesterSigHtml = requesterSigUrl
        ? `<img src="${requesterSigUrl}" style="max-height:40px;max-width:80px;object-fit:contain;" crossorigin="anonymous" />`
        : "";

      const approvalBoxes = (approvalLinesData || []).map((line: any, idx: number) => {
        const profile = approverProfiles.find((p: any) => p.id === line.approver_user_id);
        const name = profile?.full_name || "결재자";
        const jobTitle = approverTitles.get(line.approver_user_id) || "";
        const sigUrl = profile?.signature_url;
        const sigHtml = sigUrl
          ? `<img src="${sigUrl}" style="max-height:40px;max-width:80px;object-fit:contain;" crossorigin="anonymous" />`
          : "";
        const label = `${idx + 1}차 결재`;
        return `
          <td style="border:1px solid #cbd5e1;text-align:center;width:110px;">
            <div style="padding:6px 4px;">
              <div style="font-size:10px;color:#64748b;margin-bottom:4px;">${label}</div>
              <div style="height:50px;display:flex;align-items:center;justify-content:center;">
                ${sigHtml}
              </div>
              <div style="border-top:1px solid #e2e8f0;padding-top:4px;margin-top:4px;">
                <div style="font-size:12px;font-weight:600;">${name}</div>
                ${jobTitle ? `<div style="font-size:10px;color:#64748b;">${jobTitle}</div>` : ""}
              </div>
            </div>
          </td>
        `;
      }).join("");

      const html = `
        <div id="pdf-render-target" style="width:720px;padding:40px;font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif;background:#fff;color:#111;">
          
          <!-- Company Header -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #1e293b;">
            <div style="display:flex;align-items:center;gap:14px;">
              ${logoHtml}
              <div>
                <div style="font-size:18px;font-weight:800;color:#1e293b;">${company.name || ""}</div>
                <div style="font-size:11px;color:#64748b;margin-top:2px;">${company.address || ""}</div>
                ${company.contact_email ? `<div style="font-size:11px;color:#64748b;">Tel/Email: ${company.contact_email}</div>` : ""}
                ${company.biz_number ? `<div style="font-size:11px;color:#64748b;">사업자등록번호: ${company.biz_number}</div>` : ""}
              </div>
            </div>
            <!-- Approval Stamp Table (top-right) -->
            <table style="border-collapse:collapse;font-size:11px;">
              <tr>
                <td style="border:1px solid #cbd5e1;text-align:center;width:110px;">
                  <div style="padding:6px 4px;">
                    <div style="font-size:10px;color:#64748b;margin-bottom:4px;">신청자</div>
                    <div style="height:50px;display:flex;align-items:center;justify-content:center;">
                      ${requesterSigHtml}
                    </div>
                    <div style="border-top:1px solid #e2e8f0;padding-top:4px;margin-top:4px;">
                      <div style="font-size:12px;font-weight:600;">${requesterName}</div>
                    </div>
                  </div>
                </td>
                ${approvalBoxes}
              </tr>
            </table>
          </div>

          <h1 style="font-size:22px;font-weight:800;margin:0 0 4px 0;text-align:center;">지 출 결 의 서</h1>
          <p style="font-size:12px;color:#888;margin:0 0 24px 0;text-align:center;">EXPENSE REPORT</p>

          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;border:1px solid #cbd5e1;">
            <tr>
              <td style="padding:8px 12px;color:#475569;background:#f8fafc;width:100px;border:1px solid #cbd5e1;font-weight:600;">제목</td>
              <td style="padding:8px 12px;border:1px solid #cbd5e1;">${report.title}</td>
              <td style="padding:8px 12px;color:#475569;background:#f8fafc;width:100px;border:1px solid #cbd5e1;font-weight:600;">분류</td>
              <td style="padding:8px 12px;border:1px solid #cbd5e1;">${report.category}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;color:#475569;background:#f8fafc;border:1px solid #cbd5e1;font-weight:600;">상태</td>
              <td style="padding:8px 12px;border:1px solid #cbd5e1;font-weight:600;">${statusLabel}</td>
              <td style="padding:8px 12px;color:#475569;background:#f8fafc;border:1px solid #cbd5e1;font-weight:600;">신청일</td>
              <td style="padding:8px 12px;border:1px solid #cbd5e1;">${format(new Date(report.created_at), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}</td>
            </tr>
            ${report.requested_date ? `
            <tr>
              <td style="padding:8px 12px;color:#475569;background:#f8fafc;border:1px solid #cbd5e1;font-weight:600;">지출요청일</td>
              <td colspan="3" style="padding:8px 12px;border:1px solid #cbd5e1;">${report.requested_date}</td>
            </tr>` : ""}
            ${report.description ? `
            <tr>
              <td style="padding:8px 12px;color:#475569;background:#f8fafc;border:1px solid #cbd5e1;font-weight:600;">비고</td>
              <td colspan="3" style="padding:8px 12px;border:1px solid #cbd5e1;">${report.description}</td>
            </tr>` : ""}
          </table>

          <table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #cbd5e1;">
            <thead>
              <tr style="background:#1e293b;color:#fff;">
                <th style="padding:8px 10px;border:1px solid #334155;text-align:center;width:40px;">No.</th>
                <th style="padding:8px 10px;border:1px solid #334155;text-align:left;">날짜</th>
                <th style="padding:8px 10px;border:1px solid #334155;text-align:left;">내역</th>
                <th style="padding:8px 10px;border:1px solid #334155;text-align:left;">결제수단</th>
                <th style="padding:8px 10px;border:1px solid #334155;text-align:right;">금액</th>
                <th style="padding:8px 10px;border:1px solid #334155;text-align:left;">비고</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList.map((it: any, idx: number) => `
                <tr style="background:${idx % 2 === 0 ? '#fff' : '#f8fafc'};">
                  <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:center;">${idx + 1}</td>
                  <td style="padding:8px 10px;border:1px solid #e2e8f0;">${it.item_date}</td>
                  <td style="padding:8px 10px;border:1px solid #e2e8f0;">${it.description}</td>
                  <td style="padding:8px 10px;border:1px solid #e2e8f0;">${it.payment_method || ""}</td>
                  <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:right;font-family:monospace;">${formatAmt(Number(it.amount))}</td>
                  <td style="padding:8px 10px;border:1px solid #e2e8f0;color:#666;">${it.receipt_note || "-"}</td>
                </tr>
              `).join("")}
              <tr style="background:#f1f5f9;">
                <td colspan="4" style="padding:10px 12px;border:1px solid #cbd5e1;text-align:right;font-weight:700;">합 계</td>
                <td style="padding:10px 12px;border:1px solid #cbd5e1;text-align:right;font-weight:700;font-size:14px;color:#1e293b;font-family:monospace;">${formatAmt(Number(report.total_amount))}</td>
                <td style="border:1px solid #cbd5e1;"></td>
              </tr>
            </tbody>
          </table>

          ${receiptImages ? `
            <div style="margin-top:32px;border-top:2px solid #e2e8f0;padding-top:20px;">
              <h2 style="font-size:16px;font-weight:700;margin-bottom:16px;">📎 증빙 자료</h2>
              ${receiptImages}
            </div>
          ` : ""}

          <!-- Footer -->
          <div style="margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;color:#94a3b8;">
            ${company.name || ""} | ${company.address || ""} | 본 문서는 전자적으로 생성되었습니다.
          </div>
        </div>
      `;

      // Create offscreen container
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.innerHTML = html;
      document.body.appendChild(container);

      const target = container.querySelector("#pdf-render-target") as HTMLElement;

      // Wait for images to load
      const imgs = target.querySelectorAll("img");
      await Promise.all(Array.from(imgs).map(img =>
        new Promise<void>(resolve => {
          if (img.complete) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
      ));

      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(target, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      document.body.removeChild(container);

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const doc = new jsPDF("p", "mm", "a4");
      const pageW = 210;
      const pageH = 297;
      const margin = 10;
      const contentW = pageW - margin * 2;
      const imgRatio = canvas.height / canvas.width;
      const totalH = contentW * imgRatio;
      const usableH = pageH - margin * 2;

      if (totalH <= usableH) {
        doc.addImage(imgData, "JPEG", margin, margin, contentW, totalH);
      } else {
        // Multi-page: slice the canvas
        let srcY = 0;
        const sliceH = Math.floor(canvas.width * (usableH / contentW));
        let page = 0;
        while (srcY < canvas.height) {
          if (page > 0) doc.addPage();
          const thisSliceH = Math.min(sliceH, canvas.height - srcY);
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = thisSliceH;
          const ctx = sliceCanvas.getContext("2d")!;
          ctx.drawImage(canvas, 0, srcY, canvas.width, thisSliceH, 0, 0, canvas.width, thisSliceH);
          const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.92);
          const renderH = contentW * (thisSliceH / canvas.width);
          doc.addImage(sliceData, "JPEG", margin, margin, contentW, renderH);
          srcY += thisSliceH;
          page++;
        }
      }

      doc.save(`지출결의서_${report.title || report.id}.pdf`);
      toast.success("PDF가 다운로드되었습니다");
    } catch (err: any) {
      toast.error("PDF 생성 실패: " + err.message);
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const formatAmount = (n: number) => n.toLocaleString("ko-KR") + "원";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1">
            <FileCheck2 className="w-5 h-5" /> Expense Report
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">지출결의서</h1>
          <p className="text-muted-foreground mt-1">지출 내역을 등록하고 결재를 요청합니다.</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateDialog(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> 지출결의서 작성
        </Button>
      </div>

      {/* Approval line display */}
      {approvalLines.length > 0 && (
        <Card className="mb-4">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-sm">
              <UserCheck className="w-4 h-4 text-primary" />
              <span className="font-medium">내 결재라인:</span>
              {approvalLines.map((a, i) => (
                <span key={a.user_id} className="flex items-center gap-1">
                  {i > 0 && <span className="text-muted-foreground">→</span>}
                  <Badge variant="outline" className="text-xs">{i + 1}차</Badge>
                  <span>{a.name}</span>
                  {a.job_title && <span className="text-muted-foreground text-xs">({a.job_title})</span>}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="my">내 지출결의서</TabsTrigger>
          {isCompanyAdmin && (
            <TabsTrigger value="approve">
              결재 대기 ({pendingReports.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* My reports */}
        <TabsContent value="my">
          {reports.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <FileCheck2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>등록된 지출결의서가 없습니다.</p>
            </CardContent></Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>제목</TableHead>
                    <TableHead>분류</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>지출요청일</TableHead>
                    <TableHead>신청일</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r: any) => (
                    <React.Fragment key={r.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(r.id)}>
                        <TableCell>
                          {expandedRow === r.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </TableCell>
                        <TableCell className="font-medium">{r.title}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{r.category}</Badge></TableCell>
                        <TableCell className="text-right font-mono">{formatAmount(Number(r.total_amount))}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_MAP[r.status]?.variant || "outline"}>
                            {STATUS_MAP[r.status]?.label || r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {r.requested_date || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(r.created_at), "yyyy.MM.dd", { locale: ko })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <Button size="sm" variant="ghost" className="gap-1" onClick={() => generatePdf(r)} disabled={generatingPdf}>
                              {generatingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                              PDF
                            </Button>
                            {r.status === "pending" && (
                              <>
                                <Button size="sm" variant="ghost" className="gap-1 text-amber-600" onClick={() => recallReport(r.id)}>
                                  <RotateCcw className="w-3.5 h-3.5" /> 회수
                                </Button>
                                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => cancelReport(r.id)}>
                                  취소
                                </Button>
                              </>
                            )}
                            {(r.status === "draft" || r.status === "rejected") && (
                              <Button size="sm" variant="ghost" className="gap-1 text-primary" onClick={() => openEditDialog(r)}>
                                <Pencil className="w-3.5 h-3.5" /> 수정
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedRow === r.id && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30 p-4">
                            {r.description && <p className="text-sm text-muted-foreground mb-3">{r.description}</p>}
                            {r.reject_reason && <p className="text-sm text-destructive mb-3">반려 사유: {r.reject_reason}</p>}
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>날짜</TableHead>
                                  <TableHead>내역</TableHead>
                                  <TableHead>결제수단</TableHead>
                                  <TableHead className="text-right">금액</TableHead>
                                  <TableHead>비고</TableHead>
                                  <TableHead>증빙</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {expandedItems.map((item: any) => (
                                  <TableRow key={item.id}>
                                    <TableCell className="text-sm">{item.item_date}</TableCell>
                                    <TableCell className="text-sm">{item.description}</TableCell>
                                    <TableCell className="text-sm">{item.payment_method}</TableCell>
                                    <TableCell className="text-right font-mono text-sm">{formatAmount(Number(item.amount))}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{item.receipt_note || "-"}</TableCell>
                                    <TableCell>
                                      {item.receipt_file_url ? (
                                        <a href={item.receipt_file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-sm">
                                          <Eye className="w-3.5 h-3.5" /> 보기
                                        </a>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">-</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Admin approval */}
        {isCompanyAdmin && (
          <TabsContent value="approve">
            {pendingReports.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>대기 중인 결의서가 없습니다.</p>
              </CardContent></Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>신청자</TableHead>
                      <TableHead>제목</TableHead>
                      <TableHead>분류</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                      <TableHead>신청일</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingReports.map((r: any) => (
                      <React.Fragment key={r.id}>
                        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(r.id)}>
                          <TableCell>
                            {expandedRow === r.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </TableCell>
                          <TableCell className="font-medium">{r.profile?.full_name || "알 수 없음"}</TableCell>
                          <TableCell>{r.title}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{r.category}</Badge></TableCell>
                          <TableCell className="text-right font-mono">{formatAmount(Number(r.total_amount))}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(r.created_at), "yyyy.MM.dd", { locale: ko })}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                              <Button size="sm" variant="ghost" className="gap-1" onClick={() => generatePdf(r)} disabled={generatingPdf}>
                                <Download className="w-3.5 h-3.5" /> PDF
                              </Button>
                              <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => approveReport(r.id)}>
                                <Check className="w-3.5 h-3.5" /> 승인
                              </Button>
                              <Button size="sm" variant="destructive" className="gap-1" onClick={() => rejectReport(r.id)}>
                                <X className="w-3.5 h-3.5" /> 반려
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedRow === r.id && (
                          <TableRow>
                            <TableCell colSpan={8} className="bg-muted/30 p-4">
                              {r.description && <p className="text-sm text-muted-foreground mb-3">{r.description}</p>}
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>날짜</TableHead>
                                    <TableHead>내역</TableHead>
                                    <TableHead>결제수단</TableHead>
                                    <TableHead className="text-right">금액</TableHead>
                                    <TableHead>비고</TableHead>
                                    <TableHead>증빙</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {expandedItems.map((item: any) => (
                                    <TableRow key={item.id}>
                                      <TableCell className="text-sm">{item.item_date}</TableCell>
                                      <TableCell className="text-sm">{item.description}</TableCell>
                                      <TableCell className="text-sm">{item.payment_method}</TableCell>
                                      <TableCell className="text-right font-mono text-sm">{formatAmount(Number(item.amount))}</TableCell>
                                      <TableCell className="text-sm text-muted-foreground">{item.receipt_note || "-"}</TableCell>
                                      <TableCell>
                                        {item.receipt_file_url ? (
                                          <a href={item.receipt_file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-sm">
                                            <Eye className="w-3.5 h-3.5" /> 보기
                                          </a>
                                        ) : (
                                          <span className="text-xs text-muted-foreground">-</span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={(open) => { setCreateDialog(open); if (!open) { setEditingReportId(null); resetForm(); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReportId ? "지출결의서 수정" : "지출결의서 작성"}</DialogTitle>
            <DialogDescription>{editingReportId ? "수정 후 다시 결재를 요청합니다." : "지출 내역과 증빙 파일을 등록하고 결재를 요청합니다."}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title & Category */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>제목 *</Label>
                <Input placeholder="예: 3월 출장비 정산" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div>
                <Label>분류</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>지출 요청일 *</Label>
                <Input type="date" value={requestedDate} onChange={e => setRequestedDate(e.target.value)} />
              </div>
            </div>

            {/* Project selector */}
            <div>
              <Label>프로젝트 (선택)</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger><SelectValue placeholder="프로젝트를 선택하세요" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">미지정</SelectItem>
                  {projectList.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>비고 (선택)</Label>
              <Textarea placeholder="추가 설명..." value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>

            {/* Approval line preview */}
            {approvalLines.length > 0 && (
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm">
                  <UserCheck className="w-4 h-4 text-primary" />
                  <span className="font-medium">결재라인:</span>
                  {approvalLines.map((a, i) => (
                    <span key={a.user_id} className="flex items-center gap-1">
                      {i > 0 && <span className="text-muted-foreground">→</span>}
                      <Badge variant="outline" className="text-xs">{i + 1}차</Badge>
                      <span>{a.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">지출 항목</Label>
                <Button size="sm" variant="outline" onClick={addItem} className="gap-1">
                  <Plus className="w-3.5 h-3.5" /> 항목 추가
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <Card key={idx} className="p-3">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-2">
                        <Label className="text-xs">날짜</Label>
                        <Input type="date" value={item.item_date} onChange={e => updateItem(idx, "item_date", e.target.value)} />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">내역 *</Label>
                        <Input placeholder="지출 내역" value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">금액 *</Label>
                        <Input type="number" placeholder="0" value={item.amount || ""} onChange={e => updateItem(idx, "amount", e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">결제수단</Label>
                        <Select value={item.payment_method} onValueChange={v => updateItem(idx, "payment_method", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">비고</Label>
                        <Input placeholder="영수증 등" value={item.receipt_note} onChange={e => updateItem(idx, "receipt_note", e.target.value)} />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {items.length > 1 && (
                          <Button size="icon" variant="ghost" className="text-destructive h-9 w-9" onClick={() => removeItem(idx)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* File upload row */}
                    <div className="mt-2 flex items-center gap-3">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">
                        <FileImage className="w-3.5 h-3.5 inline mr-1" />증빙 파일
                      </Label>
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        className="text-xs h-8 max-w-[250px]"
                        onChange={e => {
                          const file = e.target.files?.[0] || null;
                          updateItem(idx, "receipt_file", file);
                        }}
                      />
                      {item.receipt_file && (
                        <span className="text-xs text-emerald-600 flex items-center gap-1">
                          <Upload className="w-3 h-3" />
                          {item.receipt_file.name}
                        </span>
                      )}
                      {!item.receipt_file && item.receipt_file_url && (
                        <a href={item.receipt_file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                          <Eye className="w-3 h-3" /> 기존 파일 보기
                        </a>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-end">
              <div className="bg-primary/10 rounded-lg px-4 py-2 text-right">
                <span className="text-sm text-muted-foreground mr-2">합계:</span>
                <span className="text-xl font-bold text-primary">{formatAmount(totalAmount)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialog(false); setEditingReportId(null); resetForm(); }}>취소</Button>
            {editingReportId ? (
              <Button onClick={updateAndResubmit} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                수정 후 재제출
              </Button>
            ) : (
              <Button onClick={submitReport} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                제출
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpenseReport;
