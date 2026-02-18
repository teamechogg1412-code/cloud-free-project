import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetFooter
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Users, Plus, Search, Filter, MoreHorizontal, Mail, Phone, Globe,
  Loader2, Save, Edit2, Trash2, ArrowLeft, Terminal, Upload, Download
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import * as XLSX from "xlsx";

// DB 타입 정의
type PressContact = Tables<'press_contacts'>;

// 목적 옵션 (Select 오류 방지를 위해 '전체' 및 '선택 안 함' 항목은 별도로 관리)
const purposeOptions = ["PR (언론 홍보)", "브랜드 마케팅", "광고 제휴", "기타"];

const PressContacts = () => {
  const navigate = useNavigate();
  // user 객체는 useAuth에서 가져오지 않아도 되지만, currentTenant가 필요하다면 가져와야 합니다.
  // 이 페이지는 requireSuperAdmin이므로 user 정보는 보호됩니다.
  const [contacts, setContacts] = useState<PressContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  // filterPurpose의 초기값은 빈 문자열("")이며, 이는 '전체'를 의미합니다.
  const [filterPurpose, setFilterPurpose] = useState<string>("");
  
  // Sheet 및 Dialog 상태
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentContact, setCurrentContact] = useState<PressContact | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 폼 데이터 상태
  const [formData, setFormData] = useState({
    media_company: "",
    reporter_name: "",
    contact_phone: "",
    contact_email: "",
    purpose: "", // DB에 null이 들어가야 하므로 ""을 기본값으로 사용
  });

  // --- 데이터 로드 ---
  const fetchContacts = async () => {
    setLoading(true);
    let query = supabase.from("press_contacts").select("*").order("created_at", { ascending: false });
    
    // 검색 쿼리 적용 (언론사, 기자명 OR 조건 검색)
    if (searchQuery) {
      query = query.or(`media_company.ilike.%${searchQuery}%,reporter_name.ilike.%${searchQuery}%`);
    }
    // 목적 필터 적용: filterPurpose가 ""일 때는 전체 조회
    if (filterPurpose && filterPurpose !== "ALL") { // ALL은 필터링 전체 항목을 위한 임시 값
      query = query.eq("purpose", filterPurpose);
    }
    // '선택 안 함' 항목은 purpose가 null인 경우를 조회합니다.
    if (filterPurpose === "N/A") {
      query = query.is("purpose", null);
    }


    const { data, error } = await query;
    
    if (error) {
      console.error("Error fetching press contacts:", error);
      // RLS 에러는 보통 권한 문제(is_sys_super_admin 함수 오류 등)이므로 디버깅 안내
      toast.error("연락처를 불러오는데 실패했습니다. (DB/RLS 정책 확인 필요)");
    } else {
      setContacts(data as PressContact[]);
    }
    setLoading(false);
  };

  // --- useEffect: 데이터 로드 및 실시간 구독 ---
  useEffect(() => {
    fetchContacts();
    
    // 실시간 업데이트 구독: DB 변경 시 목록 자동 갱신
    const channel = supabase
      .channel('press_contacts_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'press_contacts' }, 
        () => fetchContacts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [searchQuery, filterPurpose]); // 검색/필터 변경 시 재조회

  // --- CRUD 핸들러: 저장 (Create/Update) ---
  const handleSave = async () => {
    if (!formData.media_company || !formData.reporter_name || !formData.contact_email) {
      toast.error("언론사, 기자명, 이메일은 필수 입력 항목입니다.");
      return;
    }

    setIsSaving(true);
    try {
      // DB에 저장할 최종 페이로드
      const payload: Omit<PressContact, 'id' | 'created_at' | 'updated_at' | 'created_by'> = { 
        media_company: formData.media_company,
        reporter_name: formData.reporter_name,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone || null,
        // purpose가 ""이면 DB에 NULL이 들어가도록 처리합니다.
        purpose: formData.purpose === "N/A" || !formData.purpose ? null : formData.purpose, 
      };

      if (currentContact) {
        // Update 모드
        const { error } = await supabase
          .from("press_contacts")
          .update(payload)
          .eq("id", currentContact.id);
        if (error) throw error;
        toast.success(`${formData.media_company} 기자 정보를 수정했습니다.`);
      } else {
        // Create 모드
        const { error } = await supabase
          .from("press_contacts")
          .insert(payload);
        if (error) throw error;
        toast.success(`${formData.media_company} 기자 정보를 새로 등록했습니다.`);
      }

      setIsSheetOpen(false);
    } catch (error: any) {
      console.error("Save error:", error);
      let errorMessage = error.message;
      if (error.code === '23505' && errorMessage.includes('contact_email')) {
          errorMessage = "이미 등록된 이메일 주소입니다. 이메일 주소는 중복될 수 없습니다.";
      }
      toast.error(`저장 실패: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- CRUD 핸들러: 삭제 (Delete) ---
  const handleDelete = async () => {
    if (!currentContact) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("press_contacts")
        .delete()
        .eq("id", currentContact.id);
      if (error) throw error;
      toast.success(`${currentContact.reporter_name} 기자 정보를 삭제했습니다.`);
      setIsDeleteDialogOpen(false);
    } catch (error: any) {
      toast.error(`삭제 실패: ${error.message || "서버 오류가 발생했습니다."}`);
    } finally {
      setIsSaving(false);
      setCurrentContact(null);
    }
  };

  // --- UI 상호작용 ---
  // --- 엑셀 템플릿 다운로드 ---
  const handleDownloadTemplate = () => {
    const templateData = [
      { "언론사": "조선일보", "기자명": "홍길동", "이메일": "hong@chosun.com", "연락처": "010-1234-5678", "목적": "PR (언론 홍보)" },
      { "언론사": "블로터", "기자명": "김철수", "이메일": "kim@bloter.net", "연락처": "010-9876-5432", "목적": "" },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [{ wch: 15 }, { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "연락처");
    XLSX.writeFile(wb, "미디어_연락처_템플릿.xlsx");
    toast.success("템플릿 파일이 다운로드되었습니다.");
  };

  // --- 엑셀 업로드 처리 ---
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 파일 input 초기화
    if (fileInputRef.current) fileInputRef.current.value = "";

    setIsUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

      if (rows.length === 0) {
        toast.error("엑셀 파일에 데이터가 없습니다.");
        setIsUploading(false);
        return;
      }

      // 컬럼 매핑 (한글 헤더 → DB 컬럼)
      const mapped = rows.map((row) => ({
        media_company: (row["언론사"] || "").toString().trim(),
        reporter_name: (row["기자명"] || "").toString().trim(),
        contact_email: (row["이메일"] || "").toString().trim(),
        contact_phone: (row["연락처"] || "").toString().trim() || null,
        purpose: (row["목적"] || "").toString().trim() || null,
      }));

      // 필수값 검증: 누락된 행은 건너뛰고 유효한 행만 처리
      const valid = mapped.filter((r) => r.media_company && r.reporter_name && r.contact_email);
      const skippedCount = mapped.length - valid.length;

      if (valid.length === 0) {
        toast.error("유효한 데이터가 없습니다. 언론사, 기자명, 이메일은 필수입니다.");
        setIsUploading(false);
        return;
      }

      // 기존 연락처 조회 (이메일 기준 중복 체크)
      const { data: existing } = await supabase
        .from("press_contacts")
        .select("id, contact_email");

      const existingMap = new Map<string, string>();
      (existing || []).forEach((c) => existingMap.set(c.contact_email, c.id));

      let insertCount = 0;
      let updateCount = 0;
      let errorCount = 0;
      const processedEmails = new Set<string>();

      // 업서트 처리 (이메일 기준, 엑셀 내 중복도 처리)
      for (const row of valid) {
        // 엑셀 내 같은 이메일 중복 방지: 마지막 행이 우선
        if (processedEmails.has(row.contact_email)) {
          // 이미 이번 업로드에서 처리한 이메일 → 업데이트로 처리
          try {
            const { error } = await supabase
              .from("press_contacts")
              .update({
                media_company: row.media_company,
                reporter_name: row.reporter_name,
                contact_phone: row.contact_phone,
                purpose: row.purpose,
              })
              .eq("contact_email", row.contact_email);
            if (error) throw error;
            updateCount++;
          } catch {
            errorCount++;
          }
          continue;
        }
        processedEmails.add(row.contact_email);

        const existingId = existingMap.get(row.contact_email);
        if (existingId) {
          try {
            const { error } = await supabase
              .from("press_contacts")
              .update({
                media_company: row.media_company,
                reporter_name: row.reporter_name,
                contact_phone: row.contact_phone,
                purpose: row.purpose,
              })
              .eq("id", existingId);
            if (error) throw error;
            updateCount++;
          } catch {
            errorCount++;
          }
        } else {
          try {
            const { error } = await supabase
              .from("press_contacts")
              .insert(row);
            if (error) throw error;
            insertCount++;
          } catch {
            errorCount++;
          }
        }
      }

      let msg = `업로드 완료: 신규 ${insertCount}건, 업데이트 ${updateCount}건`;
      if (skippedCount > 0) msg += `, 누락 건너뜀 ${skippedCount}건`;
      if (errorCount > 0) msg += `, 오류 ${errorCount}건`;
      toast.success(msg);
      fetchContacts();
    } catch (error: any) {
      console.error("Excel upload error:", error);
      toast.error(`업로드 실패: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // --- UI 상호작용 ---
  const handleNewContact = () => {
    setCurrentContact(null);
    setFormData({ media_company: "", reporter_name: "", contact_phone: "", contact_email: "", purpose: "" }); 
    setIsSheetOpen(true);
  };

  const handleEditContact = (contact: PressContact) => {
    setCurrentContact(contact);
    // 폼에 현재 연락처 정보 채우기: purpose가 null이면 빈 문자열("")로 채움
    setFormData({
      media_company: contact.media_company,
      reporter_name: contact.reporter_name,
      contact_phone: contact.contact_phone || "",
      contact_email: contact.contact_email,
      purpose: contact.purpose || "",
    });
    setIsSheetOpen(true);
  };

  const handleOpenDelete = (contact: PressContact) => {
    setCurrentContact(contact);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="pt-24 pb-16 px-4 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/super-admin")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Terminal className="w-6 h-6 text-primary" /> 미디어 연락처 관리
              </h1>
              <p className="text-muted-foreground mt-1">
                전 고객사가 공유할 수 있는 언론사/기자 통합 데이터베이스입니다.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleExcelUpload}
            />
            <Button variant="outline" className="gap-2" onClick={handleDownloadTemplate}>
              <Download className="w-4 h-4" /> 템플릿 다운로드
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              엑셀 업로드
            </Button>
            <Button variant="hero" className="gap-2" size="lg" onClick={handleNewContact}>
              <Plus className="w-5 h-5" /> 새 연락처 등록
            </Button>
          </div>
        </div>

        {/* 필터 및 검색 바 */}
        <Card className="glass-card shadow-sm border border-border mb-8">
          <CardContent className="pt-4 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="언론사, 기자명으로 검색" 
                className="pl-9 bg-secondary/50 border-none h-10 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* [수정 반영] Select 오류 수정 및 필터링 로직 강화 */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <Select onValueChange={setFilterPurpose} value={filterPurpose}>
                <SelectTrigger className="w-full sm:w-[150px] bg-secondary/50 border-none h-10">
                  <SelectValue placeholder="목적 필터" />
                </SelectTrigger>
                <SelectContent>
                  {/* [수정] 빈 문자열 대신 유효한 값을 사용하거나, 아예 제거 */}
                  {/* '전체'와 '선택 안 함'을 필터링 옵션으로 명시 */}
                  <SelectItem value="ALL">전체 목적</SelectItem> 
                  <SelectItem value="N/A">목적 미지정</SelectItem> 
                  {purposeOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
                        
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => { setSearchQuery(""); setFilterPurpose(""); }}>
              초기화
            </Button>
          </CardContent>
        </Card>

        {/* 연락처 목록 테이블 */}
        <div className="glass-card overflow-hidden shadow-sm border border-border">
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow>
                <TableHead className="w-[150px]">언론사</TableHead>
                <TableHead className="w-[120px]">기자명</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>연락처</TableHead>
                <TableHead className="w-[150px]">목적</TableHead>
                <TableHead className="text-right w-[80px]">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : contacts.length > 0 ? (
                contacts.map((contact) => (
                  <TableRow key={contact.id} className="hover:bg-secondary/30 transition-colors">
                    <TableCell className="font-semibold text-sm">{contact.media_company}</TableCell>
                    <TableCell className="text-sm">{contact.reporter_name}</TableCell>
                    <TableCell className="text-sm text-primary flex items-center gap-2">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        {contact.contact_email}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground flex items-center gap-2">
                        <Phone className="w-3 h-3" />
                        {contact.contact_phone || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{contact.purpose || "미지정"}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleEditContact(contact)}>
                            <Edit2 className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => handleOpenDelete(contact)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">등록된 미디어 연락처가 없습니다.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
      
      {/* --- 연락처 추가/수정 Sheet --- */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-md p-0 overflow-hidden flex flex-col">
          <SheetHeader className="p-6 border-b">
            <SheetTitle className="text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> 
                {currentContact ? "연락처 수정" : "새 연락처 등록"}
            </SheetTitle>
          </SheetHeader>
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label htmlFor="media_company">언론사/매체명 *</Label>
              <Input 
                id="media_company" 
                placeholder="예: 조선일보, 블로터" 
                value={formData.media_company} 
                onChange={(e) => setFormData({...formData, media_company: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reporter_name">기자명 *</Label>
              <Input 
                id="reporter_name" 
                placeholder="예: 홍길동" 
                value={formData.reporter_name} 
                onChange={(e) => setFormData({...formData, reporter_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email">이메일 *</Label>
              <Input 
                id="contact_email" 
                type="email"
                placeholder="reporter@media.com" 
                value={formData.contact_email} 
                onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">연락처</Label>
              <Input 
                id="contact_phone" 
                placeholder="010-0000-0000" 
                value={formData.contact_phone} 
                onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purpose">목적 (필터링 용도)</Label>
              <Select value={formData.purpose} onValueChange={(val) => setFormData({...formData, purpose: val})}>
                <SelectTrigger id="purpose">
                  <SelectValue placeholder="목적 선택" />
                </SelectTrigger>
                <SelectContent>
                  {/* [수정] Select 오류를 막기 위해 유효한 값('N/A')을 사용하고, 
                       DB에는 null이 들어가도록 핸들러에서 처리합니다. */}
                  <SelectItem value="N/A">선택 안 함</SelectItem> 
                  {purposeOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="p-6 border-t">
            <SheetClose asChild>
              <Button variant="outline" disabled={isSaving}>취소</Button>
            </SheetClose>
            <Button onClick={handleSave} disabled={isSaving || !formData.media_company || !formData.reporter_name || !formData.contact_email}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {currentContact ? "수정 완료" : "등록"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* --- 삭제 확인 AlertDialog --- */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive font-bold text-xl">연락처를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription className="py-2">
              **{currentContact?.reporter_name} 기자 ({currentContact?.media_company})**의 연락처가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>취소</AlertDialogCancel>
            <AlertDialogAction 
                onClick={handleDelete} 
                disabled={isSaving} 
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              삭제 확정
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default PressContacts;