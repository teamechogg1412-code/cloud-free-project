import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Pencil, Trash2, Palmtree, FolderOpen,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface LeaveGroup {
  id: string;
  name: string;
  description: string | null;
  overdraft_limit: number | null;
  is_active: boolean;
  sort_order: number | null;
}

interface LeaveType {
  id: string;
  group_id: string | null;
  name: string;
  display_name: string | null;
  time_option: string;
  paid_hours: number | null;
  deduction_days: number | null;
  special_option: string | null;
  is_paid: boolean | null;
  is_active: boolean;
  min_consecutive_days: number | null;
  max_consecutive_days: number | null;
  include_holidays_in_consecutive: boolean | null;
}

// tenant_id가 NULL인 레코드 = 시스템 기본값
const SYSTEM_TENANT_ID = null;

const DEFAULT_GROUPS = [
  { name: "연차휴가", description: "법정 연차 및 관련 휴가를 관리합니다.", sort_order: 1 },
  { name: "경조휴가", description: "결혼, 조의 등 경조사 관련 휴가입니다.", sort_order: 2 },
  { name: "출산·육아휴가", description: "출산, 육아 관련 법정 휴가입니다.", sort_order: 3 },
  { name: "병가", description: "질병 및 부상으로 인한 휴가입니다.", sort_order: 4 },
  { name: "특별휴가", description: "회사 복지 차원의 특별 휴가입니다.", sort_order: 5 },
  { name: "무급휴가", description: "급여가 지급되지 않는 휴가입니다.", sort_order: 6 },
  { name: "대체휴무", description: "휴일/주말 근무에 대한 대체 휴무입니다.", sort_order: 7 },
];

const DEFAULT_TYPES_BY_GROUP: Record<string, Array<{name: string; display_name?: string; time_option: string; paid_hours: number; deduction_days: number; is_paid: boolean; special_option: string; sort_order: number; min_consecutive_days?: number; max_consecutive_days?: number}>> = {
  "연차휴가": [
    { name: "연차", time_option: "full_day", paid_hours: 8, deduction_days: 1, is_paid: true, special_option: "none", sort_order: 1 },
    { name: "반차", display_name: "반차", time_option: "time_input", paid_hours: 4, deduction_days: 0.5, is_paid: true, special_option: "none", sort_order: 2 },
    { name: "반반차", display_name: "반반차(2시간)", time_option: "time_input", paid_hours: 2, deduction_days: 0.25, is_paid: true, special_option: "none", sort_order: 3 },
    { name: "시간차", display_name: "시간차(1시간)", time_option: "time_input", paid_hours: 1, deduction_days: 0.125, is_paid: true, special_option: "none", sort_order: 4 },
    { name: "대체연차", display_name: "대체연차(휴일근무)", time_option: "full_day", paid_hours: 8, deduction_days: 1, is_paid: true, special_option: "none", sort_order: 5 },
  ],
  "경조휴가": [
    { name: "본인 결혼", time_option: "full_day", paid_hours: 8, deduction_days: 0, is_paid: true, special_option: "long_term", sort_order: 1, min_consecutive_days: 5, max_consecutive_days: 5 },
    { name: "자녀 결혼", time_option: "full_day", paid_hours: 8, deduction_days: 0, is_paid: true, special_option: "none", sort_order: 2 },
    { name: "부모상", time_option: "full_day", paid_hours: 8, deduction_days: 0, is_paid: true, special_option: "long_term", sort_order: 3, min_consecutive_days: 5, max_consecutive_days: 5 },
    { name: "배우자상", time_option: "full_day", paid_hours: 8, deduction_days: 0, is_paid: true, special_option: "long_term", sort_order: 4, min_consecutive_days: 5, max_consecutive_days: 5 },
    { name: "형제자매상", time_option: "full_day", paid_hours: 8, deduction_days: 0, is_paid: true, special_option: "long_term", sort_order: 5, min_consecutive_days: 3, max_consecutive_days: 3 },
    { name: "조부모상", time_option: "full_day", paid_hours: 8, deduction_days: 0, is_paid: true, special_option: "long_term", sort_order: 6, min_consecutive_days: 3, max_consecutive_days: 3 },
    { name: "배우자 출산", time_option: "full_day", paid_hours: 8, deduction_days: 0, is_paid: true, special_option: "long_term", sort_order: 7, min_consecutive_days: 10, max_consecutive_days: 10 },
  ],
  "출산·육아휴가": [
    { name: "출산휴가", time_option: "full_day", paid_hours: 8, deduction_days: 0, is_paid: true, special_option: "long_term", sort_order: 1, min_consecutive_days: 90, max_consecutive_days: 90 },
    { name: "유산·사산휴가", time_option: "full_day", paid_hours: 8, deduction_days: 0, is_paid: true, special_option: "long_term", sort_order: 2 },
    { name: "배우자 출산휴가", time_option: "full_day", paid_hours: 8, deduction_days: 0, is_paid: true, special_option: "long_term", sort_order: 3, min_consecutive_days: 10, max_consecutive_days: 10 },
    { name: "육아휴직", time_option: "full_day", paid_hours: 0, deduction_days: 0, is_paid: false, special_option: "long_term", sort_order: 4 },
    { name: "육아기 근로시간 단축", time_option: "time_input", paid_hours: 0, deduction_days: 0, is_paid: false, special_option: "none", sort_order: 5 },
  ],
  "병가": [
    { name: "병가(유급)", time_option: "full_day", paid_hours: 8, deduction_days: 1, is_paid: true, special_option: "none", sort_order: 1 },
    { name: "병가(무급)", time_option: "full_day", paid_hours: 0, deduction_days: 1, is_paid: false, special_option: "none", sort_order: 2 },
    { name: "장기 병가", time_option: "full_day", paid_hours: 0, deduction_days: 0, is_paid: false, special_option: "long_term", sort_order: 3 },
    { name: "공상병가", time_option: "full_day", paid_hours: 8, deduction_days: 0, is_paid: true, special_option: "long_term", sort_order: 4 },
  ],
  "특별휴가": [
    { name: "생일휴가", time_option: "full_day", paid_hours: 8, deduction_days: 0, is_paid: true, special_option: "none", sort_order: 1 },
    { name: "리프레시 휴가", time_option: "full_day", paid_hours: 8, deduction_days: 0, is_paid: true, special_option: "none", sort_order: 2 },
    { name: "장기근속 휴가", time_option: "full_day", paid_hours: 8, deduction_days: 0, is_paid: true, special_option: "long_term", sort_order: 3 },
    { name: "창립기념일 휴가", time_option: "full_day", paid_hours: 8, deduction_days: 0, is_paid: true, special_option: "holiday", sort_order: 4 },
    { name: "포상휴가", time_option: "full_day", paid_hours: 8, deduction_days: 0, is_paid: true, special_option: "none", sort_order: 5 },
  ],
  "무급휴가": [
    { name: "개인사유 무급휴가", time_option: "full_day", paid_hours: 0, deduction_days: 0, is_paid: false, special_option: "none", sort_order: 1 },
    { name: "학업 무급휴가", time_option: "full_day", paid_hours: 0, deduction_days: 0, is_paid: false, special_option: "long_term", sort_order: 2 },
    { name: "장기 무급휴직", time_option: "full_day", paid_hours: 0, deduction_days: 0, is_paid: false, special_option: "long_term", sort_order: 3 },
  ],
  "대체휴무": [
    { name: "휴일근무 대체휴무", time_option: "full_day", paid_hours: 8, deduction_days: 1, is_paid: true, special_option: "day_off", sort_order: 1 },
    { name: "주말근무 대체휴무", time_option: "full_day", paid_hours: 8, deduction_days: 1, is_paid: true, special_option: "day_off", sort_order: 2 },
    { name: "공휴일 대체휴무", time_option: "full_day", paid_hours: 8, deduction_days: 1, is_paid: true, special_option: "day_off", sort_order: 3 },
  ],
};

const LeaveDefaults = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<LeaveGroup[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // Group dialog
  const [groupDialog, setGroupDialog] = useState(false);
  const [editGroup, setEditGroup] = useState<LeaveGroup | null>(null);
  const [groupForm, setGroupForm] = useState({ name: "", description: "", overdraft_limit: "" });

  // Type dialog
  const [typeDialog, setTypeDialog] = useState(false);
  const [editType, setEditType] = useState<LeaveType | null>(null);
  const [typeForm, setTypeForm] = useState({
    group_id: "", name: "", display_name: "", time_option: "full_day",
    paid_hours: "8", deduction_days: "1", special_option: "none", is_paid: true,
    min_consecutive_days: "1", max_consecutive_days: "",
    include_holidays_in_consecutive: false,
  });

  const [deleteTarget, setDeleteTarget] = useState<{ type: "group" | "type"; id: string; name: string } | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [gRes, tRes] = await Promise.all([
      supabase.from("leave_groups").select("*").is("tenant_id", null).order("sort_order"),
      supabase.from("leave_types").select("*").is("tenant_id", null).order("sort_order"),
    ]);
    console.log("leave_groups response:", gRes);
    console.log("leave_types response:", tRes);
    if (gRes.data) setGroups(gRes.data as LeaveGroup[]);
    if (tRes.data) setTypes(tRes.data as LeaveType[]);
    setLoading(false);
  };

  const seedDefaults = async () => {
    setSeeding(true);
    try {
      // 1. Insert groups
      const groupPayloads = DEFAULT_GROUPS.map(g => ({ ...g, tenant_id: SYSTEM_TENANT_ID }));
      const { data: insertedGroups, error: gError } = await supabase
        .from("leave_groups")
        .insert(groupPayloads)
        .select();
      if (gError) { toast.error("그룹 생성 실패: " + gError.message); setSeeding(false); return; }

      // 2. Build group name -> id map
      const groupMap: Record<string, string> = {};
      for (const g of (insertedGroups || [])) {
        groupMap[g.name] = g.id;
      }

      // 3. Insert types
      const typePayloads: any[] = [];
      for (const [groupName, typesArr] of Object.entries(DEFAULT_TYPES_BY_GROUP)) {
        const groupId = groupMap[groupName] || null;
        for (const t of typesArr) {
          typePayloads.push({
            tenant_id: SYSTEM_TENANT_ID,
            group_id: groupId,
            name: t.name,
            display_name: t.display_name || null,
            time_option: t.time_option,
            paid_hours: t.paid_hours,
            deduction_days: t.deduction_days,
            is_paid: t.is_paid,
            special_option: t.special_option,
            sort_order: t.sort_order,
            min_consecutive_days: t.min_consecutive_days ?? 1,
            max_consecutive_days: t.max_consecutive_days ?? null,
          });
        }
      }
      const { error: tError } = await supabase.from("leave_types").insert(typePayloads);
      if (tError) { toast.error("유형 생성 실패: " + tError.message); setSeeding(false); return; }

      toast.success(`기본값 생성 완료: ${DEFAULT_GROUPS.length}개 그룹, ${typePayloads.length}개 유형`);
      fetchData();
    } catch (err: any) {
      toast.error("기본값 생성 중 오류: " + err.message);
    }
    setSeeding(false);
  };

  // ===== Group CRUD =====
  const openGroupDialog = (group?: LeaveGroup) => {
    if (group) {
      setEditGroup(group);
      setGroupForm({ name: group.name, description: group.description || "", overdraft_limit: group.overdraft_limit?.toString() ?? "" });
    } else {
      setEditGroup(null);
      setGroupForm({ name: "", description: "", overdraft_limit: "" });
    }
    setGroupDialog(true);
  };

  const saveGroup = async () => {
    if (!groupForm.name.trim()) { toast.error("그룹명을 입력하세요."); return; }
    const payload: any = {
      tenant_id: SYSTEM_TENANT_ID,
      name: groupForm.name.trim(),
      description: groupForm.description.trim() || null,
      overdraft_limit: groupForm.overdraft_limit === "" ? null : Number(groupForm.overdraft_limit),
    };
    if (editGroup) {
      const { error } = await supabase.from("leave_groups").update(payload).eq("id", editGroup.id);
      if (error) { toast.error("수정 실패: " + error.message); return; }
      toast.success("수정 완료");
    } else {
      const { error } = await supabase.from("leave_groups").insert(payload);
      if (error) { toast.error("추가 실패: " + error.message); return; }
      toast.success("추가 완료");
    }
    setGroupDialog(false);
    fetchData();
  };

  // ===== Type CRUD =====
  const openTypeDialog = (type?: LeaveType) => {
    if (type) {
      setEditType(type);
      setTypeForm({
        group_id: type.group_id || "", name: type.name, display_name: type.display_name || "",
        time_option: type.time_option, paid_hours: (type.paid_hours ?? 8).toString(),
        deduction_days: (type.deduction_days ?? 1).toString(), special_option: type.special_option || "none",
        is_paid: type.is_paid ?? true,
        min_consecutive_days: (type.min_consecutive_days ?? 1).toString(),
        max_consecutive_days: type.max_consecutive_days?.toString() || "",
        include_holidays_in_consecutive: type.include_holidays_in_consecutive ?? false,
      });
    } else {
      setEditType(null);
      setTypeForm({ group_id: "", name: "", display_name: "", time_option: "full_day", paid_hours: "8", deduction_days: "1", special_option: "none", is_paid: true, min_consecutive_days: "1", max_consecutive_days: "", include_holidays_in_consecutive: false });
    }
    setTypeDialog(true);
  };

  const saveType = async () => {
    if (!typeForm.name.trim()) { toast.error("유형명을 입력하세요."); return; }
    const payload: any = {
      tenant_id: SYSTEM_TENANT_ID,
      group_id: typeForm.group_id || null,
      name: typeForm.name.trim(),
      display_name: typeForm.display_name.trim() || null,
      time_option: typeForm.time_option,
      paid_hours: Number(typeForm.paid_hours),
      deduction_days: Number(typeForm.deduction_days),
      special_option: typeForm.special_option,
      is_paid: typeForm.is_paid,
      min_consecutive_days: Number(typeForm.min_consecutive_days),
      max_consecutive_days: typeForm.max_consecutive_days ? Number(typeForm.max_consecutive_days) : null,
      include_holidays_in_consecutive: typeForm.include_holidays_in_consecutive,
    };
    if (editType) {
      const { error } = await supabase.from("leave_types").update(payload).eq("id", editType.id);
      if (error) { toast.error("수정 실패: " + error.message); return; }
      toast.success("수정 완료");
    } else {
      const { error } = await supabase.from("leave_types").insert(payload);
      if (error) { toast.error("추가 실패: " + error.message); return; }
      toast.success("추가 완료");
    }
    setTypeDialog(false);
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const table = deleteTarget.type === "group" ? "leave_groups" : "leave_types";
    const { error } = await supabase.from(table).delete().eq("id", deleteTarget.id);
    if (error) { toast.error("삭제 실패: " + error.message); }
    else { toast.success("삭제 완료"); }
    setDeleteTarget(null);
    fetchData();
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">로딩 중...</div>;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/super-admin")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Palmtree className="w-6 h-6 text-emerald-600" />
          <h1 className="text-2xl font-bold">휴가 그룹/유형 기본값 관리</h1>
        </div>
      </div>
      <p className="text-sm text-muted-foreground ml-12">
        모든 회사에 기본으로 적용될 휴가 그룹과 유형을 관리합니다. 각 테넌트는 '기본값 불러오기'로 이 데이터를 복사할 수 있습니다.
      </p>

      {groups.length === 0 && types.length === 0 && (
        <div className="ml-12 p-4 border border-dashed rounded-lg flex items-center gap-4">
          <p className="text-sm text-muted-foreground">기본 휴가 데이터가 없습니다. 7개 그룹 + 32개 유형을 자동 생성할 수 있습니다.</p>
          <Button onClick={seedDefaults} disabled={seeding}>
            <FolderOpen className="w-4 h-4 mr-1" />
            {seeding ? "생성 중..." : "기본값 자동 생성"}
          </Button>
        </div>
      )}

      <Tabs defaultValue="groups">
        <TabsList>
          <TabsTrigger value="groups">휴가 그룹</TabsTrigger>
          <TabsTrigger value="types">휴가 유형</TabsTrigger>
        </TabsList>

        {/* 휴가 그룹 */}
        <TabsContent value="groups" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openGroupDialog()}><Plus className="w-4 h-4 mr-1" />휴가 그룹 추가</Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>그룹명</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead>초과사용 제한</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="w-24">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map(g => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell className="text-muted-foreground">{g.description || "-"}</TableCell>
                    <TableCell>
                      {g.overdraft_limit === null ? "제한 없음" : g.overdraft_limit === 0 ? "초과 불가" : `최대 -${g.overdraft_limit}일`}
                    </TableCell>
                    <TableCell><Badge variant={g.is_active ? "default" : "secondary"}>{g.is_active ? "활성" : "비활성"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openGroupDialog(g)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget({ type: "group", id: g.id, name: g.name })}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {groups.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">등록된 기본 휴가 그룹이 없습니다.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* 휴가 유형 */}
        <TabsContent value="types" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openTypeDialog()}><Plus className="w-4 h-4 mr-1" />휴가 유형 추가</Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>유형명</TableHead>
                  <TableHead>그룹</TableHead>
                  <TableHead>시간옵션</TableHead>
                  <TableHead>차감일수</TableHead>
                  <TableHead>유급</TableHead>
                  <TableHead>특별옵션</TableHead>
                  <TableHead className="w-24">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}{t.display_name ? ` (${t.display_name})` : ""}</TableCell>
                    <TableCell>{groups.find(g => g.id === t.group_id)?.name || "-"}</TableCell>
                    <TableCell>{t.time_option === "full_day" ? "하루 종일" : "시간 입력"}</TableCell>
                    <TableCell>{t.deduction_days ?? 1}일</TableCell>
                    <TableCell><Badge variant={t.is_paid ? "default" : "outline"}>{t.is_paid ? "유급" : "무급"}</Badge></TableCell>
                    <TableCell>
                      {{ none: "해당없음", long_term: "장기휴가", day_off: "휴무", holiday: "휴일" }[t.special_option || "none"] || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openTypeDialog(t)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget({ type: "type", id: t.id, name: t.name })}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {types.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">등록된 기본 휴가 유형이 없습니다.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Group Dialog */}
      <Dialog open={groupDialog} onOpenChange={setGroupDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editGroup ? "휴가 그룹 수정" : "휴가 그룹 추가"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>그룹명 *</Label><Input value={groupForm.name} onChange={e => setGroupForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>설명</Label><Textarea value={groupForm.description} onChange={e => setGroupForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div>
              <Label>초과사용 제한 (일)</Label>
              <Input type="number" value={groupForm.overdraft_limit} onChange={e => setGroupForm(p => ({ ...p, overdraft_limit: e.target.value }))} placeholder="비워두면 제한 없음, 0이면 초과 불가" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialog(false)}>취소</Button>
            <Button onClick={saveGroup}>{editGroup ? "수정" : "추가"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Type Dialog */}
      <Dialog open={typeDialog} onOpenChange={setTypeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editType ? "휴가 유형 수정" : "휴가 유형 추가"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label>휴가 그룹</Label>
              <Select value={typeForm.group_id} onValueChange={v => setTypeForm(p => ({ ...p, group_id: v }))}>
                <SelectTrigger><SelectValue placeholder="그룹 선택 (선택사항)" /></SelectTrigger>
                <SelectContent>
                  {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>유형명 *</Label><Input value={typeForm.name} onChange={e => setTypeForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>표시 이름</Label><Input value={typeForm.display_name} onChange={e => setTypeForm(p => ({ ...p, display_name: e.target.value }))} /></div>
            </div>
            <div>
              <Label>시간 옵션</Label>
              <Select value={typeForm.time_option} onValueChange={v => setTypeForm(p => ({ ...p, time_option: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_day">하루 종일</SelectItem>
                  <SelectItem value="time_input">시간 입력</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>유급시간 (h)</Label><Input type="number" value={typeForm.paid_hours} onChange={e => setTypeForm(p => ({ ...p, paid_hours: e.target.value }))} /></div>
              <div><Label>차감일수</Label><Input type="number" step="0.5" value={typeForm.deduction_days} onChange={e => setTypeForm(p => ({ ...p, deduction_days: e.target.value }))} /></div>
            </div>
            <div>
              <Label>특별 옵션</Label>
              <Select value={typeForm.special_option} onValueChange={v => setTypeForm(p => ({ ...p, special_option: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">해당 없음</SelectItem>
                  <SelectItem value="long_term">장기 휴가</SelectItem>
                  <SelectItem value="day_off">휴무</SelectItem>
                  <SelectItem value="holiday">휴일</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={typeForm.is_paid} onCheckedChange={v => setTypeForm(p => ({ ...p, is_paid: v }))} />
              <Label>유급 여부</Label>
            </div>
            {typeForm.time_option === "full_day" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>최소 연속일수</Label><Input type="number" value={typeForm.min_consecutive_days} onChange={e => setTypeForm(p => ({ ...p, min_consecutive_days: e.target.value }))} /></div>
                  <div><Label>최대 연속일수</Label><Input type="number" value={typeForm.max_consecutive_days} onChange={e => setTypeForm(p => ({ ...p, max_consecutive_days: e.target.value }))} placeholder="제한 없음" /></div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={typeForm.include_holidays_in_consecutive} onCheckedChange={v => setTypeForm(p => ({ ...p, include_holidays_in_consecutive: v }))} />
                  <Label>연속일수에 휴무/휴일 포함</Label>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeDialog(false)}>취소</Button>
            <Button onClick={saveType}>{editType ? "수정" : "추가"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>'{deleteTarget?.name}'을(를) 삭제하시겠습니까?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeaveDefaults;
