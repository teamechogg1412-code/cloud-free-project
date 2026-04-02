import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/landing/Header";
import {
  ArrowLeft, CheckCircle, Trash2, Settings2, Info,
  Link, FolderTree, Database, Edit2, Save, Upload,
  XCircle, AlertCircle, RefreshCw, Sparkles, FolderSync, ShieldCheck,
  Loader2 // <-- 이 부분이 추가되었습니다.
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
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

const DriveSettings = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [lastBackupResult, setLastBackupResult] = useState<any>(null);

  const [folderId, setFolderId] = useState("");
  const [hasExistingCredentials, setHasExistingCredentials] = useState(false);
  const [mappings, setMappings] = useState<FolderMapping[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ folder_id: "", folder_name: "" });

  // Credential upload state
  const [credentialJson, setCredentialJson] = useState("");
  const [newFolderIdInput, setNewFolderIdInput] = useState("");
  const [savingCredentials, setSavingCredentials] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchSettings(); }, [currentTenant]);

  const fetchSettings = async () => {
    if (!currentTenant) return;
    setLoading(true);
    try {
      const [tenantRes, mappingsRes] = await Promise.all([
        supabase.from("tenants").select("drive_folder_id, google_credentials").eq("id", currentTenant.tenant_id).single(),
        supabase.from("drive_folder_mappings").select("*").eq("tenant_id", currentTenant.tenant_id).order("folder_path"),
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

  const handleSyncStandardFolders = async () => {
    if (!currentTenant?.tenant_id) return;
    if (!hasExistingCredentials) {
      toast.error("Google Drive 연동을 먼저 완료해주세요.");
      return;
    }

    setSyncing(true);
    const toastId = toast.loading("본사 표준 폴더 구조를 생성하고 매핑하는 중입니다...");

    try {
      const { data, error } = await invokeEdgeFunction("sync-standard-folders", {
        body: { tenantId: currentTenant.tenant_id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success("표준 구조 동기화 완료!", { id: toastId });
      fetchSettings(); 
    } catch (e: any) {
      toast.error("동기화 실패: " + e.message, { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  const handleCredentialFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        JSON.parse(text);
        setCredentialJson(text);
        toast.success("JSON 파일이 로드되었습니다.");
      } catch {
        toast.error("올바른 JSON 파일이 아닙니다.");
      }
    };
    reader.readAsText(file);
  };

  const handleSaveCredentials = async () => {
    if (!credentialJson) return;
    setSavingCredentials(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const updatePayload: any = {
        google_credentials: credentialJson,
        drive_connected_at: new Date().toISOString(),
        drive_connected_by: user?.id
      };
      if (newFolderIdInput) updatePayload.drive_folder_id = newFolderIdInput;

      const { error } = await supabase.from("tenants").update(updatePayload).eq("id", currentTenant!.tenant_id);
      if (error) throw error;
      
      toast.success("구글 드라이브 연동 완료");
      setCredentialJson("");
      fetchSettings();
    } catch (e: any) {
      toast.error("연동 실패: " + e.message);
    } finally {
      setSavingCredentials(false);
    }
  };

  const handleStartEdit = (m: FolderMapping) => {
    setEditingId(m.id);
    setEditValues({ folder_id: m.folder_id, folder_name: m.folder_name || "" });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const { error } = await supabase.from("drive_folder_mappings").update({
        folder_id: editValues.folder_id,
        folder_name: editValues.folder_name,
      }).eq("id", id);
      if (error) throw error;
      toast.success("수정되었습니다.");
      setEditingId(null);
      fetchSettings();
    } catch (e) { toast.error("수정 실패"); }
  };

  const handleDeleteMapping = async (id: string) => {
    if (!confirm("매핑을 해제하시겠습니까? (실제 폴더는 삭제되지 않습니다)")) return;
    await supabase.from("drive_folder_mappings").delete().eq("id", id);
    fetchSettings();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-primary w-8 h-8" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <Header />
      <div className="max-w-6xl mx-auto p-6 pt-28 space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="bg-white border shadow-sm rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">통합 저장소 설정</h1>
            <p className="text-primary font-bold flex items-center gap-1.5">
              <Database className="w-4 h-4" /> {currentTenant?.tenant.name} · 데이터 주권 관리
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            
            {/* 1. 인증 섹션 */}
            <Card className="shadow-xl border-none rounded-[2rem] overflow-hidden bg-white">
              <CardHeader className="bg-slate-900 text-white p-8">
                <CardTitle className="text-xl flex items-center gap-3"><Settings2 className="h-6 w-6 text-blue-400" /> Google Drive 연동</CardTitle>
                <CardDescription className="text-slate-400">서비스 계정(JSON)을 등록하여 전사 드라이브 권한을 확보합니다.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${hasExistingCredentials ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"}`}>
                    {hasExistingCredentials ? <CheckCircle size={24} /> : <XCircle size={24} />}
                  </div>
                  <div>
                    <p className="font-black text-slate-900">상태: {hasExistingCredentials ? "연결됨" : "미연결"}</p>
                    {hasExistingCredentials && <p className="text-xs text-slate-500 mt-1">Master Folder ID: {folderId || "루트 권한 확보됨"}</p>}
                  </div>
                </div>

                <div className="space-y-4">
                  <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer hover:border-primary hover:bg-blue-50/50 transition-all group">
                    <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleCredentialFileUpload} />
                    {credentialJson ? (
                      <div className="text-primary font-bold"><CheckCircle size={32} className="mx-auto mb-2" /> 파일 로드 완료</div>
                    ) : (
                      <div className="text-slate-400">
                        <Upload size={32} className="mx-auto mb-3" />
                        <p className="text-sm font-bold text-slate-600">JSON 키 파일 선택</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 uppercase ml-1">Master Folder ID</Label>
                    <Input placeholder="최상위 폴더 ID (공백 시 루트)" value={newFolderIdInput} onChange={(e) => setNewFolderIdInput(e.target.value)} className="h-12 rounded-xl" />
                  </div>
                  <Button className="w-full h-12 rounded-xl font-bold" onClick={handleSaveCredentials} disabled={!credentialJson || savingCredentials}>
                    {savingCredentials ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} 설정 저장 및 연동
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 2. 자동 동기화 엔진 섹션 */}
            <Card className="shadow-xl border-none rounded-[2rem] overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1 space-y-2">
                    <h3 className="text-xl font-black flex items-center gap-2">
                      <Sparkles className="text-yellow-300" /> 본사 표준 구조 자동 생성
                    </h3>
                    <p className="text-indigo-100 text-sm leading-relaxed">
                      별도의 설정 없이 버튼 클릭 한 번으로 모든 메뉴(재무/인사/홍보 등)에 대응하는 폴더 구조를 드라이브에 구축합니다.
                    </p>
                  </div>
                  <Button 
                    onClick={handleSyncStandardFolders} 
                    disabled={syncing || !hasExistingCredentials}
                    className="bg-white text-indigo-700 hover:bg-indigo-50 h-14 px-8 rounded-2xl font-black shadow-lg shrink-0"
                  >
                    {syncing ? <Loader2 className="animate-spin mr-2" /> : <FolderSync className="mr-2" />}
                    자동 매핑 시작
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 3. 현재 매핑 목록 */}
            <Card className="shadow-xl border-none rounded-[2rem] overflow-hidden bg-white">
              <CardHeader className="border-b p-8">
                <CardTitle className="text-lg flex items-center gap-2"><FolderTree className="h-5 w-5 text-primary" /> 활성 폴더 매핑 현황</CardTitle>
                <CardDescription>시스템 메뉴별 실제 데이터 저장 위치입니다.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {mappings.length === 0 ? (
                    <div className="p-20 text-center text-slate-300 font-bold">매핑된 폴더가 없습니다.</div>
                  ) : (
                    mappings.map((m) => {
                      const isEditing = editingId === m.id;
                      return (
                        <div key={m.id} className="p-5 hover:bg-slate-50 flex items-center justify-between group transition-colors">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <Database size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {isEditing ? (
                                  <Input className="h-7 text-xs font-bold w-40" value={editValues.folder_name} onChange={e => setEditValues({...editValues, folder_name: e.target.value})} />
                                ) : (
                                  <span className="font-black text-slate-800">{m.folder_name}</span>
                                )}
                                <Badge variant="outline" className="text-[9px] font-mono opacity-50 uppercase">{m.folder_key}</Badge>
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                                <Link size={12} /> 
                                {isEditing ? (
                                  <Input className="h-7 text-xs font-mono w-full" value={editValues.folder_id} onChange={e => setEditValues({...editValues, folder_id: e.target.value})} />
                                ) : (
                                  <span className="truncate">{m.folder_id}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            {isEditing ? (
                              <Button size="sm" variant="default" onClick={() => handleSaveEdit(m.id)} className="h-8 px-3">저장</Button>
                            ) : (
                              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 text-slate-400" onClick={() => handleStartEdit(m)}><Edit2 size={16} /></Button>
                            )}
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 text-rose-400" onClick={() => handleDeleteMapping(m.id)}><Trash2 size={16} /></Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 우측: 가이드 + 백업 */}
          <div className="space-y-6">
            {/* 백업 카드 */}
            <Card className="border-none shadow-lg rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Database className="w-5 h-5 text-emerald-600" /> 전체 데이터 백업</CardTitle>
                <CardDescription>모든 테넌트 데이터를 Google Drive에 JSON으로 백업합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={async () => {
                    if (!currentTenant || !hasExistingCredentials || !folderId) {
                      toast.error("Google Drive 연동이 먼저 필요합니다.");
                      return;
                    }
                    setBackingUp(true);
                    try {
                      const { data: result, error } = await invokeEdgeFunction("backup-to-drive", {
                        body: { tenantId: currentTenant.tenant_id }
                      });
                      if (error) throw error;
                      if (result?.success) {
                        setLastBackupResult(result);
                        toast.success(`백업 완료! ${result.totalTables}개 테이블, ${result.totalRecords}건`);
                      } else {
                        toast.error("백업 실패: " + (result?.error || "Unknown error"));
                      }
                    } catch (e: any) {
                      toast.error("백업 오류: " + e.message);
                    }
                    setBackingUp(false);
                  }}
                  disabled={backingUp || !hasExistingCredentials}
                  className="w-full gap-2"
                  variant="default"
                >
                  {backingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  {backingUp ? "백업 진행 중..." : "지금 백업 실행"}
                </Button>

                {lastBackupResult && (
                  <div className="bg-white rounded-xl p-4 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold">
                      <CheckCircle className="w-4 h-4" /> 최근 백업 완료
                    </div>
                    <p className="text-muted-foreground">{new Date(lastBackupResult.backupTimestamp).toLocaleString("ko-KR")}</p>
                    <p className="text-muted-foreground">{lastBackupResult.totalTables}개 테이블 · {lastBackupResult.totalRecords}건</p>
                    {lastBackupResult.webViewLink && (
                      <a href={lastBackupResult.webViewLink} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                        드라이브에서 보기 <Link className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                {!hasExistingCredentials && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Google 인증을 먼저 설정하세요.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-indigo-50 rounded-3xl p-6">
              <h4 className="font-black text-indigo-900 mb-4 flex items-center gap-2"><ShieldCheck size={18} /> 관리 원칙</h4>
              <div className="space-y-4 text-xs text-indigo-900/70 leading-relaxed">
                <p>• 모든 데이터는 본사가 규정한 표준 디렉토리 구조에 따라 자동으로 분류 저장됩니다.</p>
                <p>• 매핑된 폴더 ID를 변경하면 해당 메뉴의 파일 업로드 경로가 변경됩니다.</p>
                <p>• 시스템 연동을 해제하더라도 구글 드라이브에 저장된 실제 파일은 삭제되지 않습니다.</p>
              </div>
            </Card>
            <Card className="border-none shadow-lg rounded-3xl overflow-hidden bg-slate-900 text-white p-6">
               <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-4">Standard Structure</p>
               <div className="text-[11px] font-mono space-y-1 text-slate-400">
                  <p className="text-white">📁 {currentTenant?.tenant.name}</p>
                  <p className="pl-3">├── 📁 매니지먼트</p>
                  <p className="pl-3">├── 📁 홍보</p>
                  <p className="pl-3">├── 📁 마케팅</p>
                  <p className="pl-3">├── 📁 재무</p>
                  <p className="pl-3">├── 📁 인사</p>
                  <p className="pl-3">├── 📁 본사 관리</p>
                  <p className="pl-3">└── 📁 Backups</p>
               </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriveSettings;