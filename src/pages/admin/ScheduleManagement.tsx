import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Calendar, Plus, Loader2, Edit2, Trash2, Clock, MapPin, User, List, CalendarDays,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ScheduleCalendar } from "@/components/schedule/ScheduleCalendar";

interface Schedule {
  id: string;
  artist_id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  schedule_type: string;
  location: string | null;
  created_at: string;
  artist?: { id: string; name: string; stage_name: string | null };
}

interface Artist {
  id: string;
  name: string;
  stage_name: string | null;
}

const SCHEDULE_TYPES = [
  { value: "schedule", label: "일반 일정" },
  { value: "filming", label: "촬영" },
  { value: "meeting", label: "미팅" },
  { value: "event", label: "행사" },
  { value: "rehearsal", label: "리허설" },
  { value: "interview", label: "인터뷰" },
  { value: "travel", label: "이동" },
  { value: "rest", label: "휴식" },
];

const ScheduleManagement = () => {
  const { currentTenant, profile } = useAuth();
  const navigate = useNavigate();
  const myTenantId = currentTenant?.tenant_id;

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);
  const [processing, setProcessing] = useState(false);
  const [filterArtistId, setFilterArtistId] = useState("all");
  const [pageView, setPageView] = useState<"list" | "calendar">("calendar");

  // Form state
  const [form, setForm] = useState({
    artist_id: "",
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    is_all_day: false,
    schedule_type: "schedule",
    location: "",
  });

  const fetchData = async () => {
    if (!myTenantId) return;
    setLoading(true);
    try {
      const [scheduleRes, artistRes] = await Promise.all([
        supabase
          .from("artist_schedules")
          .select("*, artist:artist_id ( id, name, stage_name )" as any)
          .eq("tenant_id", myTenantId)
          .order("start_time", { ascending: false }),
        supabase
          .from("artists")
          .select("id, name, stage_name")
          .eq("tenant_id", myTenantId)
          .eq("is_active", true)
          .order("name"),
      ]);

      if (scheduleRes.error) throw scheduleRes.error;
      setSchedules((scheduleRes.data || []) as unknown as Schedule[]);
      setArtists((artistRes.data || []) as Artist[]);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [myTenantId]);

  const resetForm = () => {
    setForm({
      artist_id: "",
      title: "",
      description: "",
      start_time: "",
      end_time: "",
      is_all_day: false,
      schedule_type: "schedule",
      location: "",
    });
    setEditingSchedule(null);
  };

  const openCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEdit = (s: Schedule) => {
    setEditingSchedule(s);
    setForm({
      artist_id: s.artist_id,
      title: s.title,
      description: s.description || "",
      start_time: s.start_time.slice(0, 16),
      end_time: s.end_time.slice(0, 16),
      is_all_day: s.is_all_day,
      schedule_type: s.schedule_type || "schedule",
      location: s.location || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.artist_id || !form.title || !form.start_time || !form.end_time) {
      toast.error("배우, 제목, 시작/종료 시간을 입력해주세요.");
      return;
    }
    if (new Date(form.end_time) <= new Date(form.start_time)) {
      toast.error("종료 시간은 시작 시간 이후여야 합니다.");
      return;
    }

    setProcessing(true);
    try {
      const payload = {
        artist_id: form.artist_id,
        tenant_id: myTenantId,
        title: form.title,
        description: form.description || null,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        is_all_day: form.is_all_day,
        schedule_type: form.schedule_type,
        location: form.location || null,
        ...(editingSchedule ? {} : { created_by: profile?.id }),
      };

      if (editingSchedule) {
        const { error } = await supabase
          .from("artist_schedules")
          .update(payload as any)
          .eq("id", editingSchedule.id);
        if (error) throw error;
        toast.success("일정이 수정되었습니다.");
      } else {
        const { error } = await supabase
          .from("artist_schedules")
          .insert(payload as any);
        if (error) throw error;
        toast.success("일정이 등록되었습니다.");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error("저장 실패: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("artist_schedules")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("일정이 삭제되었습니다.");
      setDeleteTarget(null);
      fetchData();
    } catch (error: any) {
      toast.error("삭제 실패: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const filteredSchedules = filterArtistId === "all"
    ? schedules
    : schedules.filter(s => s.artist_id === filterArtistId);

  const getTypeLabel = (type: string) =>
    SCHEDULE_TYPES.find(t => t.value === type)?.label || type;

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      filming: "bg-red-100 text-red-700",
      meeting: "bg-blue-100 text-blue-700",
      event: "bg-purple-100 text-purple-700",
      rehearsal: "bg-amber-100 text-amber-700",
      interview: "bg-cyan-100 text-cyan-700",
      travel: "bg-green-100 text-green-700",
      rest: "bg-slate-100 text-slate-500",
    };
    return colors[type] || "bg-slate-100 text-slate-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="pt-28 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="pt-28 pb-16 px-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1">
              <Calendar className="w-5 h-5" /> Schedule Hub
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">배우 스케줄 관리</h1>
            <p className="text-slate-500 mt-1">배우별 일정을 등록하고 관리합니다.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate("/admin")} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> 관리 시스템
            </Button>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="w-4 h-4" /> 일정 등록
            </Button>
          </div>
        </div>

        {/* Filter & View Toggle */}
        <div className="mb-6 flex items-center justify-between">
          <Select value={filterArtistId} onValueChange={setFilterArtistId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="배우 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 배우</SelectItem>
              {artists.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}{a.stage_name ? ` (${a.stage_name})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            <Button
              variant={pageView === "calendar" ? "default" : "ghost"}
              size="sm"
              className="gap-1.5 h-8 text-xs"
              onClick={() => setPageView("calendar")}
            >
              <CalendarDays className="w-3.5 h-3.5" /> 캘린더
            </Button>
            <Button
              variant={pageView === "list" ? "default" : "ghost"}
              size="sm"
              className="gap-1.5 h-8 text-xs"
              onClick={() => setPageView("list")}
            >
              <List className="w-3.5 h-3.5" /> 목록
            </Button>
          </div>
        </div>

        {/* Calendar View */}
        {pageView === "calendar" && (
          <div className="mb-6">
            <ScheduleCalendar
              schedules={filteredSchedules}
              onEventClick={(s) => openEdit(s as any)}
            />
          </div>
        )}

        {/* Schedule List */}
        {pageView === "list" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> 일정 목록 ({filteredSchedules.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSchedules.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">등록된 일정이 없습니다.</p>
                <p className="text-sm mt-1">일정 등록 버튼으로 새 일정을 추가하세요.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSchedules.map(s => (
                  <div
                    key={s.id}
                    className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-xs ${getTypeBadgeColor(s.schedule_type)}`}>
                          {getTypeLabel(s.schedule_type)}
                        </Badge>
                        {s.is_all_day && (
                          <Badge variant="outline" className="text-xs">종일</Badge>
                        )}
                      </div>
                      <h3 className="font-bold text-lg text-slate-900 truncate">{s.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {(s.artist as any)?.name || "알 수 없음"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {format(new Date(s.start_time), "MM/dd HH:mm")} ~ {format(new Date(s.end_time), "MM/dd HH:mm")}
                        </span>
                        {s.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {s.location}
                          </span>
                        )}
                      </div>
                      {s.description && (
                        <p className="text-sm text-slate-400 mt-1 truncate">{s.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="ghost" className="gap-1" onClick={() => openEdit(s)}>
                        <Edit2 className="w-4 h-4" /> 수정
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-red-500 hover:text-red-700"
                        onClick={() => setDeleteTarget(s)}
                      >
                        <Trash2 className="w-4 h-4" /> 삭제
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {editingSchedule ? "일정 수정" : "일정 등록"}
              </DialogTitle>
              <DialogDescription>
                배우의 스케줄을 {editingSchedule ? "수정" : "등록"}합니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>배우 *</Label>
                <Select value={form.artist_id} onValueChange={v => setForm(f => ({ ...f, artist_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="배우를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {artists.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}{a.stage_name ? ` (${a.stage_name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>제목 *</Label>
                <Input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="일정 제목"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>일정 유형</Label>
                  <Select value={form.schedule_type} onValueChange={v => setForm(f => ({ ...f, schedule_type: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULE_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>장소</Label>
                  <Input
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="장소 (선택)"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={form.is_all_day}
                  onCheckedChange={v => setForm(f => ({ ...f, is_all_day: v }))}
                />
                <Label>종일 일정</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>시작 *</Label>
                  <Input
                    type="datetime-local"
                    value={form.start_time}
                    onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>종료 *</Label>
                  <Input
                    type="datetime-local"
                    value={form.end_time}
                    onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>설명 (선택)</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="상세 내용을 입력하세요..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>취소</Button>
              <Button
                onClick={handleSave}
                disabled={processing || !form.artist_id || !form.title || !form.start_time || !form.end_time}
                className="gap-2"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                {editingSchedule ? "수정" : "등록"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>일정 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                "{deleteTarget?.title}" 일정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default ScheduleManagement;
