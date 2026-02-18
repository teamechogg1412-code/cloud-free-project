import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/landing/Header";
import {
  ArrowLeft, CheckCircle, Trash2, Settings2, Info,
  Plus, Link, FolderTree, Database, Edit2, Save, Upload,
  XCircle, AlertCircle, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface FolderMapping {
  id: string;
  folder_key: string;
  folder_id: string;
  folder_name: string | null;
  folder_path: string | null;
  is_active: boolean;
}

const PRESET_KEYS = [
  { key: "bank_transactions", label: "은행 거래내역", icon: "🏦" },
  { key: "card_transactions", label: "카드 이용내역", icon: "💳" },
  { key: "hr_documents", label: "인사 서류", icon: "👤" },
  { key: "artist_assets", label: "아티스트 자산", icon: "🎭" },
  { key: "invoices", label: "세금계산서/청구서", icon: "📄" },
  { key: "contracts", label: "계약서", icon: "📝" },
  { key: "backups", label: "시스템 백업", icon: "💾" },
];

const DriveSettings = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [folderId, setFolderId] = useState("");
  const [hasExistingCredentials, setHasExistingCredentials] = useState(false);
  const [mappings, setMappings] = useState<FolderMapping[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ folder_id: "", folder_name: "", folder_path: "" });

  // Credential upload state
  const [credentialJson, setCredentialJson] = useState("");
  const [newFolderIdInput, setNewFolderIdInput] = useState("");
  const [savingCredentials, setSavingCredentials] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New mapping form
  const [newKey, setNewKey] = useState("");
  const [newCustomKey, setNewCustomKey] = useState("");
  const [newFolderId, setNewFolderId] = useState("");
  const [newName, setNewName] = useState("");
  const [newPath, setNewPath] = useState("");

  useEffect(() => { fetchSettings(); }, [currentTenant]);

  const fetchSettings = async () => {
    if (!currentTenant) return;
    setLoading(true);
    try {
      const [tenantRes, mappingsRes] = await Promise.all([
        supabase.from("tenants").select("drive_folder_id, google_credentials").eq("id", currentTenant.tenant_id).single(),
        supabase.from("drive_folder_mappings").select("*").eq("tenant_id", currentTenant.tenant_id).order("created_at"),
      ]);

      if (tenantRes.data) {
        setFolderId(tenantRes.data.drive_folder_id || "");
        setHasExistingCredentials(!!tenantRes.data.google_credentials);
      }
      setMappings((mappingsRes.data || []) as FolderMapping[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        JSON.parse(text); // validate JSON
        setCredentialJson(text);
        toast.success("JSON 파일이 로드되었습니다. 저장 버튼을 눌러 연동하세요.");
      } catch {
        toast.error("올바른 JSON 파일이 아닙니다.");
      }
    };
    reader.readAsText(file);
  };

  const handleSaveCredentials = async () => {
    if (!credentialJson) {
      toast.error("Service Account JSON을 업로드해주세요.");
      return;
    }
    setSavingCredentials(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatePayload: any = {
        google_credentials: credentialJson,
        drive_connected_at: new Date().toISOString(),
      };
      if (newFolderIdInput) updatePayload.drive_folder_id = newFolderIdInput;
      if (user?.id) updatePayload.drive_connected_by = user.id;

      const { error } = await supabase.from("tenants").update(updatePayload).eq("id", currentTenant!.tenant_id);


      if (error) throw error;
      toast.success("Google Drive 연동이 완료되었습니다.");
      setCredentialJson("");
      setNewFolderIdInput("");
      fetchSettings();
    } catch (e: any) {
      toast.error("연동 실패: " + e.message);
    } finally {
      setSavingCredentials(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Google Drive 연동을 해제하시겠습니까?")) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("tenants").update({
        google_credentials: null,
        drive_folder_id: null,
      } as any).eq("id", currentTenant!.tenant_id);
      if (error) throw error;
      toast.success("연동이 해제되었습니다.");
      setFolderId("");
      fetchSettings();
    } catch (e: any) {
      toast.error("해제 실패: " + e.message);
    }
  };

  const handleAddMapping = async () => {
    const key = newKey === "custom" ? newCustomKey.toLowerCase().replace(/\s+/g, "_") : newKey;
    if (!key || !newFolderId) {
      toast.error("분류와 폴더 ID를 입력해주세요.");
      return;
    }

    if (mappings.some(m => m.folder_key === key)) {
      toast.error("이미 등록된 분류입니다.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("drive_folder_mappings").insert({
        tenant_id: currentTenant?.tenant_id,
        folder_key: key,
        folder_id: newFolderId,
        folder_name: newName || (PRESET_KEYS.find(p => p.key === key)?.label || key),
        folder_path: newPath || null,
      });
      if (error) throw error;
      toast.success("폴더 매핑이 추가되었습니다.");
      setNewKey(""); setNewCustomKey(""); setNewFolderId(""); setNewName(""); setNewPath("");
      fetchSettings();
    } catch (e: any) {
      toast.error("추가 실패: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMapping = async (id: string) => {
    try {
      const { error } = await supabase.from("drive_folder_mappings").delete().eq("id", id);
      if (error) throw error;
      toast.success("삭제되었습니다.");
      fetchSettings();
    } catch (e: any) {
      toast.error("삭제 실패");
    }
  };

  const handleStartEdit = (m: FolderMapping) => {
    setEditingId(m.id);
    setEditValues({ folder_id: m.folder_id, folder_name: m.folder_name || "", folder_path: m.folder_path || "" });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const { error } = await supabase.from("drive_folder_mappings").update({
        folder_id: editValues.folder_id,
        folder_name: editValues.folder_name,
        folder_path: editValues.folder_path || null,
      }).eq("id", id);
      if (error) throw error;
      toast.success("수정되었습니다.");
      setEditingId(null);
      fetchSettings();
    } catch (e: any) {
      toast.error("수정 실패");
    }
  };

  const getPresetInfo = (key: string) => PRESET_KEYS.find(p => p.key === key);
  const usedKeys = mappings.map(m => m.folder_key);
  const availablePresets = PRESET_KEYS.filter(p => !usedKeys.includes(p.key));

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground">
      <Header />
      <div className="max-w-5xl mx-auto p-6 pt-28 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black tracking-tight">통합 저장소 설정</h1>
            <p className="text-primary font-bold flex items-center gap-1.5">
              <Database className="w-4 h-4" /> {currentTenant?.tenant.name} · 데이터 소유권 관리
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Master connection status */}
            <Card className="shadow-md border-none rounded-2xl overflow-hidden">
              <CardHeader className="bg-primary text-primary-foreground">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings2 className="h-5 w-5" /> Google Drive 마스터 연동
                </CardTitle>
                <CardDescription className="text-primary-foreground/70">
                  Service Account JSON 키로 Google Drive를 연동하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {/* Connection status badge */}
                <div className="p-4 rounded-xl bg-muted/50 border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${hasExistingCredentials ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                      {hasExistingCredentials ? <CheckCircle size={20} /> : <XCircle size={20} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold">
                        인증 상태: {hasExistingCredentials
                          ? <span className="text-primary">연결됨</span>
                          : <span className="text-destructive">미연결</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {hasExistingCredentials
                          ? (folderId ? `마스터 폴더: ${folderId.substring(0, 28)}...` : "Service Account JSON 연동됨")
                          : "Service Account JSON이 없습니다. 아래에서 업로드하세요."}
                      </p>
                    </div>
                  </div>
                  {hasExistingCredentials && (
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1.5" onClick={handleDisconnect}>
                      <XCircle size={14} /> 연동 해제
                    </Button>
                  )}
                </div>

                {/* Upload section - always visible */}
                <div className="space-y-3 p-4 rounded-xl border bg-muted/20">
                  <p className="text-sm font-bold flex items-center gap-2">
                    <Upload size={14} />
                    {hasExistingCredentials ? "Service Account JSON 재업로드" : "Service Account JSON 업로드로 연동 시작"}
                  </p>

                  {/* File picker */}
                  <div
                    className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={handleCredentialFileUpload}
                    />
                    {credentialJson ? (
                      <div className="flex items-center justify-center gap-2 text-primary">
                        <CheckCircle size={18} />
                        <span className="text-sm font-medium">JSON 파일 로드 완료 — 저장 버튼을 눌러 연동하세요</span>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        <Upload size={24} className="mx-auto mb-2 group-hover:text-primary transition-colors" />
                        <p className="text-sm">클릭하여 JSON 파일 선택</p>
                        <p className="text-xs mt-1 opacity-60">Google Cloud Console에서 발급한 Service Account Key (.json)</p>
                      </div>
                    )}
                  </div>

                  {/* Optional master folder ID */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">마스터 폴더 ID (선택)</Label>
                    <Input
                      placeholder="최상위 Drive 폴더 ID (선택 사항)"
                      value={newFolderIdInput}
                      onChange={(e) => setNewFolderIdInput(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">폴더 매핑을 통해 기능별로 지정하는 경우 생략 가능합니다.</p>
                  </div>

                  <Button
                    className="w-full gap-2 font-bold"
                    onClick={handleSaveCredentials}
                    disabled={!credentialJson || savingCredentials}
                  >
                    {savingCredentials ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    {hasExistingCredentials ? "재연동 저장" : "Google Drive 연동하기"}
                  </Button>

                  {!hasExistingCredentials && (
                    <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <span>Service Account JSON이 없으면 아래 폴더 매핑 및 자동 동기화가 작동하지 않습니다.</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>


            {/* Folder Mappings */}
            <Card className="shadow-md border-none rounded-2xl overflow-hidden">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderTree className="h-5 w-5 text-primary" /> 메뉴별 저장 경로 매핑
                </CardTitle>
                <CardDescription>
                  각 기능(은행, 카드, 인사 등)에서 발생한 데이터가 저장될 Google Drive 폴더를 지정하세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Add form */}
                <div className="p-4 rounded-2xl bg-muted/30 border space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">분류 선택</Label>
                      <Select value={newKey} onValueChange={(v) => { setNewKey(v); if (v !== "custom") setNewName(PRESET_KEYS.find(p => p.key === v)?.label || ""); }}>
                        <SelectTrigger><SelectValue placeholder="분류를 선택하세요" /></SelectTrigger>
                        <SelectContent>
                          {availablePresets.map(p => (
                            <SelectItem key={p.key} value={p.key}>{p.icon} {p.label}</SelectItem>
                          ))}
                          <SelectItem value="custom">✏️ 직접 입력</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newKey === "custom" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-muted-foreground uppercase">커스텀 키</Label>
                        <Input placeholder="예: monthly_reports" value={newCustomKey}
                          onChange={(e) => setNewCustomKey(e.target.value)} />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Google Drive 폴더 ID</Label>
                      <Input placeholder="Drive 폴더 URL의 마지막 부분" value={newFolderId}
                        onChange={(e) => setNewFolderId(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">표시 이름</Label>
                      <Input placeholder="예: 재무팀 은행 내역" value={newName}
                        onChange={(e) => setNewName(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">경로 메모 (선택)</Label>
                      <Input placeholder="예: 재무/은행거래/2026" value={newPath}
                        onChange={(e) => setNewPath(e.target.value)} />
                    </div>
                    <Button onClick={handleAddMapping} disabled={saving} className="gap-2 font-bold">
                      <Plus className="w-4 h-4" /> 추가
                    </Button>
                  </div>
                </div>

                {/* Mapping list */}
                <div className="space-y-3">
                  {mappings.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground text-sm italic">
                      등록된 폴더 매핑이 없습니다.
                    </div>
                  ) : mappings.map((m) => {
                    const preset = getPresetInfo(m.folder_key);
                    const isEditing = editingId === m.id;

                    return (
                      <div key={m.id} className="p-4 border rounded-2xl hover:bg-muted/20 group transition-all space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg">
                              {preset?.icon || "📁"}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{m.folder_name || preset?.label || m.folder_key}</span>
                                <Badge variant="outline" className="text-[10px] font-mono opacity-50">
                                  {m.folder_key}
                                </Badge>
                              </div>
                              {m.folder_path && (
                                <p className="text-xs text-muted-foreground mt-0.5">📂 {m.folder_path}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {isEditing ? (
                              <Button size="icon" variant="ghost" onClick={() => handleSaveEdit(m.id)} className="text-primary">
                                <Save size={16} />
                              </Button>
                            ) : (
                              <Button size="icon" variant="ghost" onClick={() => handleStartEdit(m)}
                                className="opacity-0 group-hover:opacity-100">
                                <Edit2 size={16} />
                              </Button>
                            )}
                            <Button size="icon" variant="ghost"
                              className="opacity-0 group-hover:opacity-100 text-destructive"
                              onClick={() => handleDeleteMapping(m.id)}>
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2">
                            <Input placeholder="폴더 ID" value={editValues.folder_id}
                              onChange={(e) => setEditValues({ ...editValues, folder_id: e.target.value })} />
                            <Input placeholder="표시 이름" value={editValues.folder_name}
                              onChange={(e) => setEditValues({ ...editValues, folder_name: e.target.value })} />
                            <Input placeholder="경로 메모" value={editValues.folder_path}
                              onChange={(e) => setEditValues({ ...editValues, folder_path: e.target.value })} />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono pl-13">
                            <Link size={12} /> {m.folder_id}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            <Card className="border-none shadow-md bg-primary text-primary-foreground rounded-2xl">
              <CardHeader>
                <CardTitle className="text-md flex items-center gap-2">
                  <Info className="h-5 w-5" /> 경로 지정 가이드
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs leading-relaxed opacity-90 space-y-4">
                <div className="space-y-2">
                  <p className="font-bold border-b border-primary-foreground/20 pb-1">📂 폴더 ID 찾는 법</p>
                  <p>Google Drive에서 폴더를 열고, URL 마지막 부분이 폴더 ID입니다.</p>
                  <p className="font-mono bg-primary-foreground/10 rounded p-1 text-[10px] break-all">
                    drive.google.com/drive/folders/<strong>1abc...xyz</strong>
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="font-bold border-b border-primary-foreground/20 pb-1">⏰ 자동 동기화</p>
                  <p>은행/카드 거래내역은 매일 오전 10시에 자동으로 CSV 파일로 저장됩니다.</p>
                </div>
                <div className="space-y-2">
                  <p className="font-bold border-b border-primary-foreground/20 pb-1">💡 분류 활용 예시</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>은행 거래내역:</strong> 재무팀 공유 폴더</li>
                    <li><strong>카드 이용내역:</strong> 증빙 보관 폴더</li>
                    <li><strong>인사 서류:</strong> 보안 인사 폴더</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md rounded-2xl">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-bold">권장 폴더 구조</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 text-xs font-mono text-muted-foreground space-y-1">
                <p>📁 회사명</p>
                <p className="pl-4">├── 📁 재무</p>
                <p className="pl-8">├── 📁 은행거래내역</p>
                <p className="pl-8">└── 📁 카드이용내역</p>
                <p className="pl-4">├── 📁 인사</p>
                <p className="pl-8">└── 📁 입사서류</p>
                <p className="pl-4">├── 📁 아티스트</p>
                <p className="pl-4">└── 📁 계약서</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriveSettings;
