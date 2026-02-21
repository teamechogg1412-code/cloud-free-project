import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Printer, User, CheckCircle2, FileCheck, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PortalDocTemplate } from "@/components/profile/PortalDocTemplate";

// --- Types ---
export interface Artist {
  id: string;
  name: string;
  stage_name?: string | null;
  birth_date: string;
  gender: string;
  contact_phone?: string | null;
  email?: string | null;
  address: string;
  resident_number: string;
  id_card_url: string;
  id_card_masked_url: string;
  signature_url: string;
}

export interface Employee {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  department?: string;
  job_title?: string;
  join_date?: string;
  birth_date?: string;
  address?: string;
}

export interface TenantInfo {
  name: string;
  rep_name: string;
  address: string;
}

export interface ExtraInfo {
  empBirth: string;
  empAddress: string;
  relation: string;
  date: string;
  usage: string;
}

const ProfileManagement = () => {
  const { currentTenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo>({ name: "", rep_name: "", address: "" });

  const [selectedArtistId, setSelectedArtistId] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const [extraInfo, setExtraInfo] = useState<ExtraInfo>({
    empBirth: "",
    empAddress: "",
    relation: "소속사 담당자",
    date: new Date().toISOString().split("T")[0],
    usage: "포털 사이트 인물정보 등록 및 수정 요청",
  });

  const printRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"naver" | "daum" | "certificate">("naver");

  // 1. 데이터 로드 로직 수정
  useEffect(() => {
    const fetchData = async () => {
      if (!currentTenant) return;
      setLoading(true);

      try {
        // 배우 정보 로드
        const { data: artistData } = await supabase
          .from("artists")
          .select(
            "id, name, stage_name, birth_date, gender, contact_phone, email, address, resident_number, id_card_url, id_card_masked_url, signature_url",
          )
          .eq("tenant_id", currentTenant.tenant_id)
          .eq("is_active", true);

        // [수정] !inner 제거하여 정보 미등록 직원도 모두 불러옴 (Left Join)
        const { data: memberData, error: memberError } = await supabase
          .from("tenant_memberships")
          .select(
            `
            user_id, role, department, job_title, created_at,
            profiles:user_id ( full_name, phone, email )
          `,
          )
          .eq("tenant_id", currentTenant.tenant_id);

        if (memberError) throw memberError;

        // 직원 상세 정보(주소, 주민번호) 별도 로드하여 매핑 (안정성 강화)
        const userIds = memberData.map((m) => m.user_id);
        const { data: detailsData } = await supabase
          .from("employee_details")
          .select("user_id, resident_number, address")
          .in("user_id", userIds);

        const detailsMap = new Map(detailsData?.map((d) => [d.user_id, d]));

        // 회사 정보
        const { data: tInfo } = await supabase
          .from("tenants")
          .select("name, rep_name, address")
          .eq("id", currentTenant.tenant_id)
          .single();

        if (artistData) setArtists(artistData as unknown as Artist[]);

        if (memberData) {
          const formattedEmployees = memberData.map((m: any) => {
            const detail = detailsMap.get(m.user_id);
            const resNum = (detail as any)?.resident_number || "";
            let birth = "";
            if (resNum.length >= 6) {
              const yearPrefix = parseInt(resNum.substring(0, 2)) > 30 ? "19" : "20";
              birth = `${yearPrefix}${resNum.substring(0, 2)}-${resNum.substring(2, 4)}-${resNum.substring(4, 6)}`;
            }

            return {
              id: m.user_id,
              full_name: m.profiles?.full_name || "이름 없음",
              phone: m.profiles?.phone || "",
              email: m.profiles?.email || "",
              department: m.department,
              job_title: m.job_title,
              join_date: m.created_at,
              birth_date: birth,
              address: (detail as any)?.address || "",
            };
          });
          setEmployees(formattedEmployees);
        }

        if (tInfo) setTenantInfo({ name: tInfo.name, rep_name: tInfo.rep_name || "", address: tInfo.address || "" });
      } catch (err) {
        console.error("Data Load Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentTenant]);

  // 2. 수임인 선택 시 정보 자동 반영
  useEffect(() => {
    if (selectedEmployeeId) {
      const emp = employees.find((e) => e.id === selectedEmployeeId);
      if (emp) {
        setExtraInfo((prev) => ({
          ...prev,
          empBirth: emp.birth_date || "",
          empAddress: emp.address || "",
        }));
        if (emp.birth_date || emp.address) {
          toast.success(`${emp.full_name}님의 정보를 자동 입력했습니다.`);
        }
      }
    }
  }, [selectedEmployeeId, employees]);

  const selectedArtist = artists.find((a) => a.id === selectedArtistId) || null;
  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId) || null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    const existingStyles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
      .map((node) => node.outerHTML)
      .join("");
    doc.open();
    doc.write(
      `<html><head><meta charset="UTF-8" />${existingStyles}<style>@page { size: A4; margin: 0; } .page-break-before-always { page-break-before: always; }</style></head><body>${printContent.innerHTML}<script>window.onload = function() { window.print(); }</script></body></html>`,
    );
    doc.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
      <div className="p-8 md:p-12 max-w-7xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <FileCheck className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">인물정보 등록 관리</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium ml-12">
            인사 데이터 연동을 통해 위임장을 자동으로 완성합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
          <div className="space-y-6">
            <Card className="border-none shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50 border-b py-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                  <User className="w-4 h-4 text-blue-600" /> 1. 대상 선택
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {activeTab !== "certificate" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">위임인 (배우/아티스트)</Label>
                    <Select value={selectedArtistId} onValueChange={setSelectedArtistId}>
                      <SelectTrigger className="rounded-xl h-11 border-slate-200">
                        <SelectValue placeholder="배우 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {artists.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">
                    {activeTab === "certificate" ? "발급 대상자 (직원)" : "수임인 (담당 매니저)"}
                  </Label>
                  <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                    <SelectTrigger className="rounded-xl h-11 border-slate-200">
                      <SelectValue placeholder="직원 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.full_name} ({e.department || "소속"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50 border-b py-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" /> 2. 자동 완성 데이터
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500">대리인 생년월일</Label>
                  <Input
                    type="date"
                    className="rounded-xl h-11 border-slate-200 bg-slate-50 font-medium"
                    value={extraInfo.empBirth}
                    onChange={(e) => setExtraInfo({ ...extraInfo, empBirth: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500">대리인 주소</Label>
                  <Input
                    className="rounded-xl h-11 border-slate-200 bg-slate-50 text-sm"
                    value={extraInfo.empAddress}
                    onChange={(e) => setExtraInfo({ ...extraInfo, empAddress: e.target.value })}
                    placeholder="주소 정보 없음"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500">관계</Label>
                  <Input
                    className="rounded-xl h-11 border-slate-200"
                    value={extraInfo.relation}
                    onChange={(e) => setExtraInfo({ ...extraInfo, relation: e.target.value })}
                  />
                </div>
                <Separator className="my-4" />
                <Button
                  onClick={handlePrint}
                  className="w-full h-12 rounded-xl bg-slate-900 hover:bg-black text-white font-bold shadow-xl transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4 mr-2" /> 위임장 PDF 생성
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col min-h-0">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
              className="w-full h-full flex flex-col"
            >
              <div className="flex items-center justify-between mb-4 shrink-0">
                <TabsList className="bg-slate-100 p-1 rounded-xl">
                  <TabsTrigger value="naver" className="rounded-lg px-6 font-bold">
                    NAVER
                  </TabsTrigger>
                  <TabsTrigger value="daum" className="rounded-lg px-6 font-bold">
                    DAUM
                  </TabsTrigger>
                  <TabsTrigger value="certificate" className="rounded-lg px-6 font-bold">
                    재직증명
                  </TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 font-bold text-[11px] uppercase">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Data Synced
                </div>
              </div>
              <div className="flex-1 bg-slate-100 rounded-[2.5rem] p-12 overflow-auto shadow-inner border-[6px] border-white">
                <div ref={printRef} className="mx-auto bg-white shadow-2xl origin-top">
                  <PortalDocTemplate
                    type={activeTab}
                    artist={selectedArtist}
                    employee={selectedEmployee}
                    tenantInfo={tenantInfo}
                    extraInfo={extraInfo}
                  />
                </div>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
  );
};

export default ProfileManagement;
