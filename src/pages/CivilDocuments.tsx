import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollText, Download, FileText, Loader2, ArrowLeft, Eye, Stamp } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const SUPABASE_URL = "https://matcnptzugnaisuhowbk.supabase.co";

const DOC_TYPES = [
  { value: "employment", label: "재직증명서" },
  { value: "career", label: "경력증명서" },
];

const CivilDocuments = () => {
  const { user, currentTenant, profile } = useAuth();
  const navigate = useNavigate();
  const tenantId = currentTenant?.tenant_id;

  const [docType, setDocType] = useState("employment");
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Company data
  const [company, setCompany] = useState<any>(null);
  // User membership data
  const [membership, setMembership] = useState<any>(null);
  // Issued history
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!tenantId || !user) return;
    const load = async () => {
      setLoading(true);
      const [companyRes, memberRes, historyRes] = await Promise.all([
        supabase.from("tenants").select("*").eq("id", tenantId).single(),
        supabase.from("tenant_memberships").select("*, profiles:user_id(full_name, phone)").eq("tenant_id", tenantId).eq("user_id", user.id).maybeSingle(),
        (supabase as any).from("civil_documents").select("*").eq("tenant_id", tenantId).eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      if (companyRes.data) setCompany(companyRes.data);
      if (memberRes.data) setMembership(memberRes.data);
      setHistory(historyRes.data || []);
      setLoading(false);
    };
    load();
  }, [tenantId, user]);

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const generatePDF = async (type: string, purposeText: string, forcedDocNumber?: string) => {
    if (!company || !user) return null;

    const isEmployment = type === "employment";
    const today = new Date();
    const dateStr = format(today, "yyyy년 MM월 dd일", { locale: ko });
    const docNumber = forcedDocNumber || `${format(today, "yyyyMMdd")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const title = isEmployment ? "재 직 증 명 서" : "경 력 증 명 서";
    const userName = membership?.profiles?.full_name || (profile as any)?.full_name || "이름 없음";
    const department = membership?.department || "-";
    const jobTitle = membership?.job_title || "-";

    let sealDataUrl = "";
    if (company.seal_url) {
      try {
        const sealUrl = company.seal_url.startsWith("http")
          ? company.seal_url
          : `${SUPABASE_URL}/storage/v1/object/public/${company.seal_url}`;
        const imgRes = await fetch(sealUrl);
        if (imgRes.ok) {
          const blob = await imgRes.blob();
          const reader = new FileReader();
          sealDataUrl = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
      } catch (e) {
        console.warn("Seal image load failed:", e);
      }
    }

    const rows: Array<[string, string]> = [
      ["성 명", userName],
      ["부 서", department],
      ["직 위", jobTitle],
      ["생년월일", "-"],
      ["용 도", purposeText || "제출용"],
    ];

    if (!isEmployment) {
      rows.push(["재직기간", `입사일 ~ ${dateStr}`]);
      rows.push(["담당업무", jobTitle]);
    }

    const rowsHtml = rows
      .map(
        ([label, value]) => `
          <tr>
            <td class="label">${escapeHtml(label)}</td>
            <td class="value">${escapeHtml(value || "-")}</td>
          </tr>
        `,
      )
      .join("");

    const bodyText = isEmployment
      ? "위 사람은 현재 당사에 재직하고 있음을 증명합니다."
      : "위 사람은 당사에서 위와 같이 근무한 경력이 있음을 증명합니다.";

    const html = `
      <div class="pdf-page">
        <div class="pdf-content">
          <div style="text-align:right;font-size:14px;letter-spacing:0.3px;margin-bottom:48px;">문서번호 : ${escapeHtml(docNumber)}</div>

          <h1 style="text-align:center;font-size:56px;letter-spacing:10px;font-weight:700;margin:0 0 72px;">${title}</h1>

          <table style="width:100%;border-collapse:collapse;margin-bottom:84px;font-size:26px;">
            ${rowsHtml}
          </table>

          <p style="text-align:center;font-size:33px;line-height:1.8;margin:0 0 56px;">${bodyText}</p>

          <p style="text-align:center;font-size:42px;letter-spacing:6px;margin:0 0 84px;">${escapeHtml(dateStr)}</p>

          <div style="text-align:center;position:relative;display:flex;align-items:center;justify-content:center;gap:18px;">
            <span style="font-size:38px;font-weight:700;letter-spacing:2px;">${escapeHtml(company.name || "회사명")}</span>
            <span style="font-size:28px;">대표이사 ${escapeHtml(company.rep_name || "")}</span>
            ${sealDataUrl ? `<img src="${sealDataUrl}" alt="company seal" style="width:120px;height:120px;object-fit:contain;position:absolute;right:100px;top:-44px;opacity:0.92;" />` : ""}
          </div>
        </div>
      </div>

      <style>
        .pdf-page {
          width: 794px;
          height: 1123px;
          box-sizing: border-box;
          background: #ffffff;
          color: #111827;
          font-family: 'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif;
          overflow: hidden;
        }
        .pdf-content {
          padding: 72px 80px;
          box-sizing: border-box;
          width: 100%;
          min-height: 100%;
          position: relative;
        }
        table, td { border: 1px solid #9ca3af; }
        td { padding: 18px 22px; }
        td.label { width: 180px; text-align: center; background: #f3f4f6; font-weight: 600; }
        td.value { text-align: left; }
      </style>
    `;

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-99999px";
    container.style.top = "0";
    container.innerHTML = html;
    document.body.appendChild(container);

    try {
      const pageElement = container.querySelector(".pdf-page") as HTMLElement | null;
      const contentElement = container.querySelector(".pdf-content") as HTMLElement | null;

      if (!pageElement || !contentElement) {
        return null;
      }

      const availableHeight = pageElement.clientHeight;
      const contentHeight = contentElement.scrollHeight;

      if (contentHeight > availableHeight) {
        const scale = availableHeight / contentHeight;
        contentElement.style.transform = `scale(${scale})`;
        contentElement.style.transformOrigin = "top left";
        contentElement.style.width = `${100 / scale}%`;
      }

      const canvas = await html2canvas(pageElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      doc.addImage(imgData, "PNG", 0, 0, 210, 297);

      return { doc, docNumber };
    } finally {
      document.body.removeChild(container);
    }
  };

  const handleGenerate = async () => {
    if (!user || !tenantId) return;
    setGenerating(true);
    try {
      const result = await generatePDF(docType, purpose);
      if (!result) {
        toast.error("PDF 생성에 실패했습니다.");
        return;
      }

      const { doc, docNumber } = result;
      const label = DOC_TYPES.find((d) => d.value === docType)?.label || docType;

      // Download PDF first
      doc.save(`${label}_${docNumber}.pdf`);
      toast.success(`${label}이(가) 발급되었습니다.`);

      // Save to DB (non-blocking)
      try {
        await (supabase as any).from("civil_documents").insert({
          tenant_id: tenantId,
          user_id: user.id,
          doc_type: docType,
          doc_number: docNumber,
          purpose: purpose || "제출용",
        });

        // Refresh history
        const { data } = await (supabase as any)
          .from("civil_documents")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        setHistory(data || []);
      } catch (dbErr) {
        console.warn("발급 이력 저장 실패 (테이블 미생성 가능):", dbErr);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("발급 중 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  const handleRedownload = async (record: any) => {
    setGenerating(true);
    try {
      const result = await generatePDF(record.doc_type, record.purpose, record.doc_number);
      if (result) {
        const label = DOC_TYPES.find((d) => d.value === record.doc_type)?.label || record.doc_type;
        result.doc.save(`${label}_${record.doc_number}.pdf`);
        toast.success("재다운로드 완료");
      }
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-slate-600" />
            민원서류 발급
          </h1>
          <p className="text-sm text-muted-foreground">재직증명서, 경력증명서를 발급합니다</p>
        </div>
      </div>

      {/* Company info card */}
      {company && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">발급 기관 정보</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">회사명</span>
              <p className="font-medium">{company.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">대표이사</span>
              <p className="font-medium">{company.rep_name || "-"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">사업자번호</span>
              <p className="font-medium">{company.biz_number || "-"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">직인</span>
              {company.seal_url ? (
                <Badge variant="default" className="bg-emerald-500">
                  <Stamp className="w-3 h-3 mr-1" /> 등록됨
                </Badge>
              ) : (
                <Badge variant="destructive">미등록</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issue form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">서류 발급</CardTitle>
          <CardDescription>발급할 서류 종류와 용도를 선택하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>서류 종류</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((dt) => (
                    <SelectItem key={dt.value} value={dt.value}>
                      {dt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>용도</Label>
              <Input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="예: 은행 제출용, 비자 신청용"
              />
            </div>
          </div>

          {/* Applicant info */}
          <div className="bg-muted/50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">성명</span>
              <p className="font-medium">{membership?.profiles?.full_name || (profile as any)?.full_name || "-"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">부서</span>
              <p className="font-medium">{membership?.department || "-"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">직위</span>
              <p className="font-medium">{membership?.job_title || "-"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">이메일</span>
              <p className="font-medium text-xs">{user?.email || "-"}</p>
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={generating} className="w-full">
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 발급 중...</>
            ) : (
              <><Download className="w-4 h-4 mr-2" /> PDF 발급 및 다운로드</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">발급 이력</CardTitle>
          <CardDescription>그동안 발급한 민원서류 목록입니다</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">발급 이력이 없습니다</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>서류종류</TableHead>
                  <TableHead>문서번호</TableHead>
                  <TableHead>용도</TableHead>
                  <TableHead>발급일</TableHead>
                  <TableHead className="text-right">재발급</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {DOC_TYPES.find((d) => d.value === h.doc_type)?.label || h.doc_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{h.doc_number}</TableCell>
                    <TableCell>{h.purpose}</TableCell>
                    <TableCell>{format(new Date(h.created_at), "yyyy.MM.dd HH:mm")}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => handleRedownload(h)} disabled={generating}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CivilDocuments;
