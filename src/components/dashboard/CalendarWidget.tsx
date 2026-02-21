import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Clock,
  Edit2,
  Trash2,
  MapPin,
  User,
  Loader2,
} from "lucide-react";
import { format, isSameDay, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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
  created_by: string | null;
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

const TYPE_COLORS: Record<string, string> = {
  filming: "bg-red-500",
  meeting: "bg-blue-500",
  event: "bg-purple-500",
  rehearsal: "bg-amber-500",
  interview: "bg-cyan-500",
  travel: "bg-green-500",
  rest: "bg-slate-400",
  schedule: "bg-primary",
};

export const CalendarWidget = () => {
  const { currentTenant, profile } = useAuth();
  const myTenantId = currentTenant?.tenant_id;

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  // CRUD state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);
  const [processing, setProcessing] = useState(false);
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
    if (!myTenantId) { setLoading(false); return; }
    try {
      const [scheduleRes, artistRes] = await Promise.all([
        supabase
          .from("artist_schedules")
          .select("*, artist:artist_id ( id, name, stage_name )" as any)
          .eq("tenant_id", myTenantId)
          .order("start_time", { ascending: true }),
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
    } catch (e) {
      console.error("Calendar fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [myTenantId]);

  // Schedules for selected date
  const daySchedules = schedules.filter((s) =>
    isSameDay(parseISO(s.start_time), selectedDate)
  );

  // Dates with schedules for dot indicators
  const scheduledDates = [...new Set(
    schedules.map((s) => format(parseISO(s.start_time), "yyyy-MM-dd"))
  )].map((d) => new Date(d));

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Form helpers
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
    // Pre-fill date from selected date
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    setForm((f) => ({
      ...f,
      start_time: `${dateStr}T09:00`,
      end_time: `${dateStr}T10:00`,
    }));
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

  const getTypeLabel = (type: string) =>
    SCHEDULE_TYPES.find((t) => t.value === type)?.label || type;

  return (
    <>
      <div className="grid md:grid-cols-2 gap-4">
        {/* Calendar Section */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={handlePrevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
            <h3 className="font-semibold text-lg">
              {format(currentMonth, "yyyy.MM", { locale: ko })}
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={handleNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            locale={ko}
            className="p-0 pointer-events-auto"
            classNames={{
              months: "w-full",
              month: "w-full space-y-4",
              caption: "hidden",
              caption_label: "text-sm font-medium",
              nav: "hidden",
              table: "w-full border-collapse",
              head_row: "flex w-full",
              head_cell: "text-muted-foreground rounded-md w-full font-normal text-xs",
              row: "flex w-full mt-1",
              cell: cn(
                "relative w-full p-0 text-center text-sm focus-within:relative focus-within:z-20",
                "[&:has([aria-selected])]:bg-transparent"
              ),
              day: cn(
                "h-9 w-9 p-0 font-normal mx-auto rounded-full hover:bg-secondary transition-colors",
                "aria-selected:opacity-100"
              ),
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              day_today: "bg-primary/10 text-primary font-semibold",
              day_outside: "text-muted-foreground/50",
              day_disabled: "text-muted-foreground opacity-50",
            }}
            modifiers={{ scheduled: scheduledDates }}
            modifiersClassNames={{
              scheduled: "after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full",
            }}
          />
        </div>

        {/* Schedule List Section */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">
              {format(selectedDate, "MM.dd(eee)", { locale: ko })} 일정
            </h3>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={openCreate}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : daySchedules.length > 0 ? (
            <div className="space-y-3 max-h-[360px] overflow-y-auto">
              {daySchedules.map((s) => (
                <div
                  key={s.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                >
                  <div className={`w-1 self-stretch min-h-[40px] ${TYPE_COLORS[s.schedule_type] || "bg-primary"} rounded-full`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {getTypeLabel(s.schedule_type)}
                      </Badge>
                      {s.is_all_day && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">종일</Badge>
                      )}
                    </div>
                    <div className="font-medium text-sm">{s.title}</div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-0.5">
                        <User className="w-3 h-3" />
                        {(s.artist as any)?.name || "미지정"}
                      </span>
                      {!s.is_all_day && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {format(parseISO(s.start_time), "HH:mm")} - {format(parseISO(s.end_time), "HH:mm")}
                        </span>
                      )}
                      {s.location && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />
                          {s.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(s)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => setDeleteTarget(s)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <CalendarDays className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">등록된 일정이 없습니다</p>
              <Button variant="link" size="sm" className="mt-2" onClick={openCreate}>
                <Plus className="w-3 h-3 mr-1" /> 일정 등록하기
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              {editingSchedule ? "일정 수정" : "일정 등록"}
            </DialogTitle>
            <DialogDescription>
              배우 스케줄을 {editingSchedule ? "수정" : "등록"}합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>배우 *</Label>
              <Select value={form.artist_id} onValueChange={(v) => setForm((f) => ({ ...f, artist_id: v }))}>
                <SelectTrigger><SelectValue placeholder="배우 선택" /></SelectTrigger>
                <SelectContent>
                  {artists.map((a) => (
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
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="일정 제목"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>유형</Label>
                <Select value={form.schedule_type} onValueChange={(v) => setForm((f) => ({ ...f, schedule_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>장소</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="선택 입력"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_all_day}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_all_day: v }))}
              />
              <Label>종일 일정</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>시작 *</Label>
                <Input
                  type="datetime-local"
                  value={form.start_time}
                  onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>종료 *</Label>
                <Input
                  type="datetime-local"
                  value={form.end_time}
                  onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="메모 (선택)"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave} disabled={processing}>
              {processing && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {editingSchedule ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>일정 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" 일정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {processing && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
