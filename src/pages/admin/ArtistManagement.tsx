import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
  SheetDescription,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  UserCircle,
  Plus,
  Search,
  Loader2,
  Save,
  Edit2,
  Trash2,
  AlertCircle,
  Star,
  Calendar,
  Globe,
  Instagram,
  Youtube,
  FileImage,
  UploadCloud,
  User,
  Printer,
  Mail,
  Phone,
  ArrowLeft,
  Heart,
  CheckCircle2,
  Shield,
  MapPin,
  Briefcase,
} from "lucide-react";

// --- Types ---
interface Artist {
  id: string;
  tenant_id: string;
  name: string;
  stage_name: string | null;
  birth_date: string | null;
  gender: string | null;
  bio: string | null;
  agency: string | null;
  debut_date: string | null;
  is_active: boolean | null;
  profile_image_url: string | null;
  social_links: any;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  email: string | null;
  contact_phone: string | null;
  resident_number: string | null;
  address: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  namuwiki_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  id_card_url: string | null;
  id_card_masked_url: string | null;
  signature_url: string | null;
}

// --- 인쇄용 컴포넌트 ---
const ArtistProfileDocument = ({ data, tenantName }: { data: any; tenantName: string }) => {
  return (
    <div className="w-[210mm] min-h-[297mm] p-[15mm] bg-white text-black font-sans box-border flex flex-col relative">
      <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black mb-1">ARTIST PROFILE</h1>
          <p className="text-sm font-bold text-gray-600 tracking-widest">{tenantName?.toUpperCase()}</p>
        </div>
        <p className="text-xs text-gray-400">Printed: {new Date().toLocaleDateString()}</p>
      </div>
      <div className="flex gap-6 mb-6">
        <div className="w-[60mm] h-[80mm] bg-gray-100 border border-gray-300 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
          {data.profile_image_url ? (
            <img src={data.profile_image_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-400 text-xs">사진 없음</span>
          )}
        </div>
        <div className="flex-1">
          <table className="w-full text-sm border-collapse border-t-2 border-black">
            <tbody>
              <tr className="border-b border-gray-300">
                <th className="text-left py-3 px-2 w-28 bg-gray-50 font-bold border-r border-gray-200">성명 (본명)</th>
                <td className="py-3 px-4 font-bold text-lg">{data.name}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <th className="text-left py-3 px-2 bg-gray-50 font-bold border-r border-gray-200">활동명 (예명)</th>
                <td className="py-3 px-4 text-base">{data.stage_name || "-"}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <th className="text-left py-3 px-2 bg-gray-50 font-bold border-r border-gray-200">생년월일 / 성별</th>
                <td className="py-3 px-4">
                  {data.birth_date} / {data.gender === "male" ? "남성" : "여성"}
                </td>
              </tr>
              <tr className="border-b border-gray-300">
                <th className="text-left py-3 px-2 bg-gray-50 font-bold border-r border-gray-200">연락처</th>
                <td className="py-3 px-4">
                  HP: {data.contact_phone || "-"} / {data.email || "-"}
                </td>
              </tr>
              <tr className="border-b border-gray-300">
                <th className="text-left py-3 px-2 bg-gray-50 font-bold border-r border-gray-200">주민등록번호</th>
                <td className="py-3 px-4 font-mono tracking-wider">{data.resident_number || "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="mb-8">
        <h3 className="text-sm font-bold border-l-4 border-black pl-2 mb-2 uppercase">상세 정보 (Details)</h3>
        <table className="w-full text-sm border-t border-black border-b border-black">
          <tbody>
            <tr className="border-b border-gray-200">
              <th className="py-3 px-3 bg-gray-50 w-32 text-left font-bold border-r border-gray-200 align-top">
                거주지 주소
              </th>
              <td className="py-3 px-4">{data.address || "-"}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="py-3 px-3 bg-gray-50 text-left font-bold border-r border-gray-200">전속계약 기간</th>
              <td className="py-3 px-4 font-mono">
                {data.contract_start_date || "미정"} ~ {data.contract_end_date || "미정"}
              </td>
            </tr>
            <tr>
              <th className="py-3 px-3 bg-gray-50 text-left font-bold border-r border-gray-200 align-top h-32">
                소개 (Bio)
              </th>
              <td className="py-3 px-4 align-top text-xs whitespace-pre-wrap">{data.bio || "-"}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-auto pt-4 border-t-2 border-gray-200 text-center text-[10px] text-gray-400 font-bold">
        System Generated by Boteda OS
      </div>
    </div>
  );
};

const ArtistManagement = () => {
  const navigate = useNavigate();
  const { currentTenant, isCompanyAdmin } = useAuth();

  // 데이터 상태
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // UI 상태
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentArtist, setCurrentArtist] = useState<Artist | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 미리보기 및 파일 상태
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [tempFiles, setTempFiles] = useState<Record<string, File>>({});

  const printRef = useRef<HTMLDivElement>(null);

  // [수정] 객체 내부에 정의된 참조
  const fileInputRefs = {
    profile: useRef<HTMLInputElement>(null),
    idCard: useRef<HTMLInputElement>(null),
    idMasked: useRef<HTMLInputElement>(null),
    signature: useRef<HTMLInputElement>(null),
  };

  const [formData, setFormData] = useState<Partial<Artist>>({
    name: "",
    stage_name: "",
    birth_date: "",
    gender: "male",
    bio: "",
    is_active: true,
    email: "",
    contact_phone: "",
    resident_number: "",
    address: "",
    contract_start_date: "",
    contract_end_date: "",
    namuwiki_url: "",
    instagram_url: "",
    youtube_url: "",
    profile_image_url: "",
    id_card_url: "",
    id_card_masked_url: "",
    signature_url: "",
  });

  const fetchArtists = async () => {
    if (!currentTenant) return;
    setLoading(true);
    const { data } = await supabase.from("artists").select("*").eq("tenant_id", currentTenant.tenant_id).order("name");
    if (data) setArtists(data as Artist[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchArtists();
  }, [currentTenant]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setTempFiles((prev) => ({ ...prev, [field]: file }));
      setPreviews((prev) => ({ ...prev, [field]: previewUrl }));
    }
  };

  const uploadToStorage = async (file: File, folder: string) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `${currentTenant?.tenant_id}/artists/${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("artist-assets")
      .upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;

    const { data: signedData, error: signedError } = await supabase.storage
      .from("artist-assets")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year for artist assets
    if (signedError) throw signedError;
    return signedData.signedUrl;
  };

  const uploadToDrive = async (file: File, artistName: string, field: string) => {
    try {
      const reader = new FileReader();
      const base64Content = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      const fieldLabels: Record<string, string> = {
        profile_image_url: "프로필",
        id_card_url: "신분증_원본",
        id_card_masked_url: "신분증_마스킹",
        signature_url: "서명",
      };

      const label = fieldLabels[field] || field;
      const ext = file.name.split(".").pop();
      const driveFileName = `${artistName}_${label}_${new Date().toISOString().slice(0, 10)}.${ext}`;

      await supabase.functions.invoke("upload-to-drive", {
        body: {
          tenantId: currentTenant?.tenant_id,
          fileName: driveFileName,
          fileContent: base64Content,
          mimeType: file.type,
          subfolder: `아티스트/${artistName}`,
        },
      });
    } catch (driveErr) {
      console.warn("Google Drive 업로드 실패 (무시):", driveErr);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("이름을 입력해주세요.");
      return;
    }
    setIsSaving(true);
    try {
      let finalData = { ...formData };
      const uploadedFiles: { file: File; field: string }[] = [];

      for (const [field, file] of Object.entries(tempFiles)) {
        const publicUrl = await uploadToStorage(file, field);
        (finalData as any)[field] = publicUrl;
        uploadedFiles.push({ file, field });
      }

      const { id, created_at, updated_at, ...cleanData } = finalData as any;
      const payload = { ...cleanData, tenant_id: currentTenant?.tenant_id, bio: formData.bio || "" };

      const { error } = currentArtist
        ? await supabase.from("artists").update(payload).eq("id", currentArtist.id)
        : await supabase.from("artists").insert([payload]);
      if (error) throw error;

      toast.success("저장되었습니다.");

      // Google Drive 자동 업로드 (백그라운드)
      if (uploadedFiles.length > 0) {
        toast.info("Google Drive에 파일 동기화 중...");
        const drivePromises = uploadedFiles.map(({ file, field }) =>
          uploadToDrive(file, formData.name || "unknown", field)
        );
        Promise.all(drivePromises).then(() => {
          toast.success("Google Drive 동기화 완료");
        }).catch(() => {
          toast.warning("일부 파일의 Drive 동기화에 실패했습니다.");
        });
      }

      setIsSheetOpen(false);
      setTempFiles({});
      setPreviews({});
      fetchArtists();
    } catch (e: any) {
      toast.error(`저장 실패: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentArtist) return;
    setIsSaving(true);
    const { error } = await supabase.from("artists").delete().eq("id", currentArtist.id);
    if (!error) {
      toast.success("삭제 완료");
      setIsDeleteDialogOpen(false);
      setIsSheetOpen(false);
      fetchArtists();
    }
    setIsSaving(false);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const win = window.open("", "", "height=800,width=1000");
    if (win) {
      win.document.write(
        "<html><head><title>Artist Profile</title><style>body{font-family:sans-serif;}</style></head><body>",
      );
      win.document.write(printContent.innerHTML);
      win.document.write("</body></html>");
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 500);
    }
  };

  if (!isCompanyAdmin) return <div className="p-20 text-center text-slate-400 font-bold">권한이 없습니다.</div>;

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Header />
      <main className="pt-24 pb-16 px-6 max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg bg-white border border-slate-300 w-9 h-9"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </Button>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                배우 관리{" "}
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 bg-indigo-50 border-indigo-200 text-indigo-600 font-black uppercase"
                >
                  Talent DB
                </Badge>
              </h1>
              <p className="text-slate-500 text-[11px] font-bold">아티스트 프로필 및 계약 증빙 통합 관리</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setCurrentArtist(null);
              setFormData({ name: "", stage_name: "", birth_date: "", gender: "male", bio: "", is_active: true });
              setTempFiles({});
              setPreviews({});
              setIsSheetOpen(true);
            }}
            size="sm"
            className="bg-blue-600 h-9 font-bold px-5 rounded-lg shadow-md active:scale-95"
          >
            <Plus className="mr-1.5 w-4 h-4" /> 배우 등록
          </Button>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "전체 아티스트", val: artists.length, icon: Star, color: "text-indigo-600", bg: "bg-indigo-50" },
            {
              label: "활동중",
              val: artists.filter((a) => a.is_active).length,
              icon: CheckCircle2,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              label: "비활동",
              val: artists.filter((a) => !a.is_active).length,
              icon: AlertCircle,
              color: "text-slate-400",
              bg: "bg-slate-50",
            },
            { label: "만료 임박", val: 0, icon: Calendar, color: "text-orange-600", bg: "bg-orange-50" },
          ].map((s, i) => (
            <Card key={i} className="border border-slate-300 shadow-sm bg-white overflow-hidden">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center ${s.color}`}>
                  <s.icon size={20} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">{s.label}</p>
                  <p className="text-lg font-black text-slate-800">{s.val}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mb-6 relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500" />
          <Input
            placeholder="이름 또는 활동명 검색..."
            className="pl-10 h-10 rounded-lg border border-slate-300 bg-white text-xs font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 아티스트 그리드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {artists
            .filter((a) => a.name.includes(searchQuery))
            .map((artist) => (
              <Card
                key={artist.id}
                className="border border-slate-300 shadow-sm overflow-hidden bg-white hover:border-blue-500 transition-all cursor-pointer group"
                onClick={() => {
                  setCurrentArtist(artist);
                  setFormData(artist);
                  setTempFiles({});
                  setPreviews({});
                  setIsSheetOpen(true);
                }}
              >
                <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden">
                  {artist.profile_image_url ? (
                    <img
                      src={artist.profile_image_url}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      alt={artist.name}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <UserCircle size={48} />
                    </div>
                  )}
                  <Badge
                    className={`absolute top-2 left-2 ${artist.is_active ? "bg-emerald-500" : "bg-slate-400"} border-none text-[8px] h-4 font-black`}
                  >
                    {artist.is_active ? "ACTIVE" : "INACTIVE"}
                  </Badge>
                </div>
                <div className="p-3">
                  <p className="font-black text-slate-800 text-sm tracking-tight">{artist.name}</p>
                  <p className="text-[10px] font-bold text-blue-600">{artist.stage_name || "-"}</p>
                </div>
              </Card>
            ))}
        </div>
      </main>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-4xl p-0 flex flex-col bg-[#F8FAFC]">
          <SheetHeader className="p-4 border-b bg-white flex flex-row items-center justify-between">
            <SheetTitle className="text-md font-black flex items-center gap-2">
              <Star size={18} className="text-indigo-500" /> {currentArtist ? "아티스트 정보 수정" : "신규 등록"}
            </SheetTitle>
            <SheetDescription className="hidden">에디터</SheetDescription>
            <div className="flex items-center gap-3 mr-8">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Status</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 p-6">
            <div className="space-y-8 pb-10">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                <div className="md:col-span-3">
                  <Label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Profile Image</Label>
                  <div
                    onClick={() => fileInputRefs.profile.current?.click()}
                    className="aspect-[3/4] bg-white border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all overflow-hidden relative"
                  >
                    {previews.profile_image_url || formData.profile_image_url ? (
                      <img
                        src={previews.profile_image_url || formData.profile_image_url || ""}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UploadCloud className="text-slate-300" />
                    )}
                    <input
                      type="file"
                      ref={fileInputRefs.profile}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "profile_image_url")}
                    />
                  </div>
                </div>
                <div className="md:col-span-9 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-500">본명 *</Label>
                    <Input
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="h-9 text-sm font-bold border-slate-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-500">활동명</Label>
                    <Input
                      value={formData.stage_name || ""}
                      onChange={(e) => setFormData({ ...formData, stage_name: e.target.value })}
                      className="h-9 text-sm font-bold border-slate-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-500">생년월일</Label>
                    <Input
                      type="date"
                      value={formData.birth_date || ""}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                      className="h-9 border-slate-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-500">성별</Label>
                    <Select
                      value={formData.gender || "male"}
                      onValueChange={(v) => setFormData({ ...formData, gender: v })}
                    >
                      <SelectTrigger className="h-9 border-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">남성</SelectItem>
                        <SelectItem value="female">여성</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-500">연락처</Label>
                    <div className="relative">
                      <Phone size={12} className="absolute left-3 top-2.5 text-slate-400" />
                      <Input
                        value={formData.contact_phone || ""}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                        className="h-9 pl-8 border-slate-300"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-500">이메일</Label>
                    <div className="relative">
                      <Mail size={12} className="absolute left-3 top-2.5 text-slate-400" />
                      <Input
                        value={formData.email || ""}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="h-9 pl-8 border-slate-300"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-200" />

              <div className="space-y-4">
                <h4 className="text-xs font-black flex items-center gap-2 text-slate-700 uppercase">
                  <Shield size={14} className="text-blue-500" /> Personal & Confidential
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-500">주민등록번호</Label>
                    <Input
                      value={formData.resident_number || ""}
                      onChange={(e) => setFormData({ ...formData, resident_number: e.target.value })}
                      className="h-9 font-mono tracking-widest border-slate-300"
                      placeholder="000000-0000000"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-500">거주지 주소</Label>
                    <div className="relative">
                      <MapPin size={12} className="absolute left-3 top-2.5 text-slate-400" />
                      <Input
                        value={formData.address || ""}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="h-9 pl-8 border-slate-300"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-200" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-black flex items-center gap-2 text-slate-700 uppercase">
                    <Briefcase size={14} className="text-orange-500" /> Contract Info
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-500 font-bold uppercase">Start</Label>
                      <Input
                        type="date"
                        value={formData.contract_start_date || ""}
                        onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
                        className="h-9 border-slate-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-500 font-bold uppercase">End</Label>
                      <Input
                        type="date"
                        value={formData.contract_end_date || ""}
                        onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
                        className="h-9 border-slate-300"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-black flex items-center gap-2 text-slate-700 uppercase">
                    <Globe size={14} className="text-emerald-500" /> Social Links
                  </h4>
                  <div className="space-y-2">
                    <div className="relative">
                      <Instagram size={12} className="absolute left-3 top-2.5 text-pink-500" />
                      <Input
                        value={formData.instagram_url || ""}
                        onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                        className="h-8 pl-8 text-xs border-slate-300"
                        placeholder="Instagram URL"
                      />
                    </div>
                    <div className="relative">
                      <Youtube size={12} className="absolute left-3 top-2.5 text-red-500" />
                      <Input
                        value={formData.youtube_url || ""}
                        onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                        className="h-8 pl-8 text-xs border-slate-300"
                        placeholder="YouTube URL"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1.5 text-[9px] font-black text-green-600">N</span>
                      <Input
                        value={formData.namuwiki_url || ""}
                        onChange={(e) => setFormData({ ...formData, namuwiki_url: e.target.value })}
                        className="h-8 pl-8 text-xs border-slate-300"
                        placeholder="Namuwiki URL"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500">아티스트 소개 (Bio)</Label>
                <Textarea
                  value={formData.bio || ""}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="min-h-[80px] text-xs leading-relaxed border-slate-300"
                />
              </div>

              <Separator className="bg-slate-200" />

              <div className="space-y-4">
                <h4 className="text-xs font-black flex items-center gap-2 text-slate-700 uppercase">
                  <FileImage size={14} className="text-blue-500" /> Documents & Signature
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "신분증 원본", field: "id_card_url", ref: fileInputRefs.idCard },
                    { label: "신분증(마스킹)", field: "id_card_masked_url", ref: fileInputRefs.idMasked },
                    { label: "자필 서명", field: "signature_url", ref: fileInputRefs.signature },
                  ].map((f, i) => (
                    <div key={i} className="space-y-1">
                      <Label className="text-[9px] font-bold text-slate-400 uppercase">{f.label}</Label>
                      <div
                        onClick={() => (f.ref.current as any)?.click()}
                        className="h-24 bg-white border border-slate-300 rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-50 relative overflow-hidden transition-all"
                      >
                        {previews[f.field] || (formData as any)[f.field] ? (
                          <img
                            src={previews[f.field] || (formData as any)[f.field]}
                            className="h-full object-contain p-1"
                            alt={f.label}
                          />
                        ) : (
                          <UploadCloud size={16} className="text-slate-300" />
                        )}
                        <input
                          type="file"
                          ref={f.ref as any}
                          className="hidden"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileChange(e, f.field)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="hidden">
            <div ref={printRef}>
              <ArtistProfileDocument data={formData} tenantName={currentTenant?.tenant.name || ""} />
            </div>
          </div>

          <SheetFooter className="p-4 border-t bg-white flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-9 px-4 font-black text-[10px] uppercase tracking-tighter"
            >
              <Printer size={14} className="mr-1.5" /> Export PDF
            </Button>
            <div className="flex-1" />
            <SheetClose asChild>
              <Button variant="ghost" size="sm" className="font-bold text-xs text-slate-500">
                취소
              </Button>
            </SheetClose>
            {currentArtist && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-rose-500 font-bold text-xs hover:bg-rose-50"
              >
                삭제
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="bg-blue-600 px-8 font-bold text-xs min-w-[100px]"
            >
              {isSaving ? <Loader2 className="animate-spin w-3.5 h-3.5 mr-1.5" /> : null}
              {isSaving ? "저장중" : "정보 저장"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600 font-black flex items-center gap-2 text-xl">
              <Trash2 size={24} /> 데이터 영구 삭제
            </AlertDialogTitle>
            <AlertDialogDescription className="py-4 font-bold text-slate-500 leading-relaxed italic">
              "{currentArtist?.name}" 아티스트의 모든 정보와 증빙 서류가 삭제됩니다. 계속하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel className="rounded-xl font-bold flex-1 border-slate-300">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 rounded-xl font-bold flex-1"
            >
              삭제 확정
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ArtistManagement;
