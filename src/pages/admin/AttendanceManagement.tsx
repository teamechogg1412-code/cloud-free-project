import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, LogIn, LogOut, Calendar, ChevronLeft, ChevronRight, Edit2, TrendingUp, AlertTriangle, Gift } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, startOfWeek, getISOWeek } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AttendanceRecord {
  id: string;
  user_id: string;
  tenant_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  clock_in_method: string;
  clock_out_method: string;
  memo: string | null;
}

interface MonthlyWorkData {
  work_date: string;
  hours_worked: number;
  clock_in_time: string | null;
  clock_out_time: string | null;
  clock_out_method: string | null;
}

const STANDARD_WEEKLY_HOURS = 40;

const AttendanceManagement = () => {
  const { user, currentTenant } = useAuth();
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [monthRecords, setMonthRecords] = useState<AttendanceRecord[]>([]);
  const [monthlyWorkData, setMonthlyWorkData] = useState<MonthlyWorkData[]>([]);
  const [weeklyHours, setWeeklyHours] = useState<number>(0);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [editingMemo, setEditingMemo] = useState(false);
  const [memo, setMemo] = useState("");

  const tenantId = currentTenant?.tenant_id;
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const fetchTodayRecord = useCallback(async () => {
    if (!user || !tenantId) return;
    const { data } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .eq("date", todayStr)
      .maybeSingle();
    setTodayRecord(data as AttendanceRecord | null);
    if (data?.memo) setMemo(data.memo);
  }, [user, tenantId, todayStr]);

  const fetchMonthRecords = useCallback(async () => {
    if (!user || !tenantId) return;
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
    const { data } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true });
    setMonthRecords((data || []) as AttendanceRecord[]);
  }, [user, tenantId, currentMonth]);

  const fetchWeeklyHours = useCallback(async () => {
    if (!user || !tenantId) return;
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const { data, error } = await (supabase.rpc as any)("get_weekly_work_hours", {
      _user_id: user.id,
      _tenant_id: tenantId,
      _week_start: format(weekStart, "yyyy-MM-dd"),
    });
    if (!error && data !== null) setWeeklyHours(Number(data));
  }, [user, tenantId]);

  const fetchMonthlyWorkData = useCallback(async () => {
    if (!user || !tenantId) return;
    const { data, error } = await (supabase.rpc as any)("get_monthly_work_hours", {
      _user_id: user.id,
      _tenant_id: tenantId,
      _year: currentMonth.getFullYear(),
      _month: currentMonth.getMonth() + 1,
    });
    if (!error && data) setMonthlyWorkData(data as MonthlyWorkData[]);
  }, [user, tenantId, currentMonth]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchTodayRecord(), fetchMonthRecords(), fetchWeeklyHours(), fetchMonthlyWorkData()]);
      setLoading(false);
    };
    load();
  }, [fetchTodayRecord, fetchMonthRecords, fetchWeeklyHours, fetchMonthlyWorkData]);

  const handleClockIn = async () => {
    if (!user || !tenantId) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from("attendance_records").upsert({
      user_id: user.id,
      tenant_id: tenantId,
      date: todayStr,
      clock_in: now,
      clock_in_method: "manual",
    }, { onConflict: "user_id,tenant_id,date" });
    if (error) {
      toast.error("출근 기록 실패: " + error.message);
    } else {
      toast.success("출근이 기록되었습니다.");
      await Promise.all([fetchTodayRecord(), fetchMonthRecords(), fetchWeeklyHours(), fetchMonthlyWorkData()]);
    }
  };

  const handleClockOut = async () => {
    if (!user || !tenantId || !todayRecord) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("attendance_records")
      .update({ clock_out: now, clock_out_method: "manual" })
      .eq("id", todayRecord.id);
    if (error) {
      toast.error("퇴근 기록 실패: " + error.message);
    } else {
      toast.success("퇴근이 기록되었습니다.");
      await Promise.all([fetchTodayRecord(), fetchMonthRecords(), fetchWeeklyHours(), fetchMonthlyWorkData()]);
    }
  };

  const handleSaveMemo = async () => {
    if (!todayRecord) return;
    const { error } = await supabase
      .from("attendance_records")
      .update({ memo })
      .eq("id", todayRecord.id);
    if (error) toast.error("메모 저장 실패");
    else {
      toast.success("메모가 저장되었습니다.");
      setEditingMemo(false);
      await fetchTodayRecord();
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "--:--";
    return format(new Date(iso), "HH:mm");
  };

  const getWorkHours = (record: AttendanceRecord) => {
    if (!record.clock_in || !record.clock_out) return null;
    const diff = new Date(record.clock_out).getTime() - new Date(record.clock_in).getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}시간 ${mins}분`;
  };

  const totalMonthlyHours = monthlyWorkData.reduce((sum, d) => sum + (d.hours_worked || 0), 0);
  const overtimeHours = Math.max(0, weeklyHours - STANDARD_WEEKLY_HOURS);
  const weeklyProgress = Math.min((weeklyHours / STANDARD_WEEKLY_HOURS) * 100, 100);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getRecordForDay = (day: Date) =>
    monthRecords.find((r) => isSameDay(new Date(r.date + "T00:00:00"), day));

  const getWorkDataForDay = (day: Date) =>
    monthlyWorkData.find((d) => isSameDay(new Date(d.work_date + "T00:00:00"), day));

  const getStatusBadge = (record: AttendanceRecord | undefined) => {
    if (!record) return null;
    if (record.clock_in && record.clock_out) return <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">완료</Badge>;
    if (record.clock_in && !record.clock_out) return <Badge className="bg-amber-100 text-amber-700 text-[10px]">근무중</Badge>;
    return null;
  };

  const getMethodLabel = (method: string | null) => {
    if (!method) return "";
    switch (method) {
      case "popup": return "자동(팝업)";
      case "schedule": return "일정연동";
      case "auto": return "자동(18시)";
      default: return "수동";
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground">로딩 중...</div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto animate-in fade-in duration-500 space-y-8">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-amber-500 text-white">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">출퇴근 관리</h1>
          <p className="text-sm text-muted-foreground">일일 근태를 기록하고 근무시간을 관리합니다.</p>
        </div>
      </div>

      {/* 주간 근무시간 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-none shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-6 h-6 mx-auto text-blue-600 mb-2" />
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">이번 주 근무</p>
            <p className="text-3xl font-black text-foreground mt-1">{weeklyHours.toFixed(1)}<span className="text-sm font-medium text-muted-foreground">h</span></p>
            <div className="mt-3 h-2 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${weeklyProgress}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{STANDARD_WEEKLY_HOURS}시간 기준 {weeklyProgress.toFixed(0)}%</p>
          </CardContent>
        </Card>

        <Card className={cn("rounded-2xl border-none shadow-md", overtimeHours > 0 ? "bg-gradient-to-br from-rose-50 to-orange-50" : "bg-gradient-to-br from-emerald-50 to-green-50")}>
          <CardContent className="p-6 text-center">
            {overtimeHours > 0 ? <AlertTriangle className="w-6 h-6 mx-auto text-rose-600 mb-2" /> : <Clock className="w-6 h-6 mx-auto text-emerald-600 mb-2" />}
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">주간 초과근무</p>
            <p className={cn("text-3xl font-black mt-1", overtimeHours > 0 ? "text-rose-600" : "text-emerald-600")}>{overtimeHours.toFixed(1)}<span className="text-sm font-medium text-muted-foreground">h</span></p>
            {overtimeHours > 0 && <p className="text-[10px] text-rose-500 mt-1">보상휴가 대상</p>}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-md bg-gradient-to-br from-violet-50 to-purple-50">
          <CardContent className="p-6 text-center">
            <Gift className="w-6 h-6 mx-auto text-violet-600 mb-2" />
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">이번 달 총 근무</p>
            <p className="text-3xl font-black text-foreground mt-1">{totalMonthlyHours.toFixed(1)}<span className="text-sm font-medium text-muted-foreground">h</span></p>
            <p className="text-[10px] text-muted-foreground mt-1">{monthlyWorkData.length}일 출근</p>
          </CardContent>
        </Card>
      </div>

      {/* 오늘의 출퇴근 카드 */}
      <Card className="rounded-[2rem] border-none shadow-xl bg-gradient-to-br from-amber-50 to-orange-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-600" />
            오늘의 근태 — {format(new Date(), "yyyy년 M월 d일 (EEEE)", { locale: ko })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm text-center space-y-3">
              <LogIn className="w-8 h-8 mx-auto text-blue-500" />
              <p className="text-sm text-muted-foreground font-medium">출근 시간</p>
              <p className="text-3xl font-black text-foreground">{formatTime(todayRecord?.clock_in ?? null)}</p>
              {todayRecord?.clock_in && (
                <Badge variant="outline" className="text-[10px]">{getMethodLabel(todayRecord.clock_in_method)}</Badge>
              )}
              {!todayRecord?.clock_in && (
                <Button onClick={handleClockIn} className="w-full rounded-xl bg-blue-600 hover:bg-blue-700">
                  <LogIn className="w-4 h-4 mr-2" /> 출근하기
                </Button>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm text-center space-y-3">
              <LogOut className="w-8 h-8 mx-auto text-rose-500" />
              <p className="text-sm text-muted-foreground font-medium">퇴근 시간</p>
              <p className="text-3xl font-black text-foreground">{formatTime(todayRecord?.clock_out ?? null)}</p>
              {todayRecord?.clock_out && (
                <Badge variant="outline" className="text-[10px]">{getMethodLabel(todayRecord.clock_out_method)}</Badge>
              )}
              {todayRecord?.clock_in && !todayRecord?.clock_out && (
                <Button onClick={handleClockOut} variant="outline" className="w-full rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50">
                  <LogOut className="w-4 h-4 mr-2" /> 퇴근하기
                </Button>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm text-center space-y-3">
              <Clock className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="text-sm text-muted-foreground font-medium">총 근무시간</p>
              <p className="text-3xl font-black text-foreground">{todayRecord ? (getWorkHours(todayRecord) || "근무 중") : "--"}</p>
              {!todayRecord?.clock_out && todayRecord?.clock_in && (
                <p className="text-xs text-muted-foreground">퇴근 미기록 시 18:00 또는 일정 종료시간 자동 처리</p>
              )}
            </div>
          </div>

          {todayRecord && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-muted-foreground">메모</p>
                {!editingMemo && (
                  <Button variant="ghost" size="sm" onClick={() => setEditingMemo(true)}>
                    <Edit2 className="w-3 h-3 mr-1" /> 수정
                  </Button>
                )}
              </div>
              {editingMemo ? (
                <div className="flex gap-2">
                  <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="오늘의 업무 메모..." className="rounded-xl" />
                  <Button onClick={handleSaveMemo} size="sm" className="rounded-xl">저장</Button>
                  <Button onClick={() => setEditingMemo(false)} size="sm" variant="ghost" className="rounded-xl">취소</Button>
                </div>
              ) : (
                <p className="text-sm text-foreground">{todayRecord.memo || "메모 없음"}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 월간 근무 로그 테이블 */}
      <Card className="rounded-[2rem] border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold">월간 근무 로그</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-bold text-foreground min-w-[120px] text-center">{format(currentMonth, "yyyy년 M월", { locale: ko })}</span>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 상세 로그 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-3 px-2 font-semibold">날짜</th>
                  <th className="text-center py-3 px-2 font-semibold">출근</th>
                  <th className="text-center py-3 px-2 font-semibold">퇴근</th>
                  <th className="text-center py-3 px-2 font-semibold">퇴근 방식</th>
                  <th className="text-right py-3 px-2 font-semibold">근무시간</th>
                </tr>
              </thead>
              <tbody>
                {monthlyWorkData.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">이번 달 출근 기록이 없습니다.</td></tr>
                ) : monthlyWorkData.map((d) => (
                  <tr key={d.work_date} className={cn("border-b last:border-none hover:bg-muted/30 transition-colors", isSameDay(new Date(d.work_date + "T00:00:00"), new Date()) && "bg-amber-50/50")}>
                    <td className="py-3 px-2 font-medium">{format(new Date(d.work_date + "T00:00:00"), "M/d (EEE)", { locale: ko })}</td>
                    <td className="py-3 px-2 text-center">{formatTime(d.clock_in_time)}</td>
                    <td className="py-3 px-2 text-center">{formatTime(d.clock_out_time)}</td>
                    <td className="py-3 px-2 text-center">
                      <Badge variant="outline" className="text-[10px]">{getMethodLabel(d.clock_out_method)}</Badge>
                    </td>
                    <td className="py-3 px-2 text-right font-bold">
                      <span className={cn(d.hours_worked > 9 ? "text-rose-600" : "text-foreground")}>
                        {d.hours_worked.toFixed(1)}h
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {monthlyWorkData.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 font-bold">
                    <td colSpan={4} className="py-3 px-2 text-right text-muted-foreground">월간 합계</td>
                    <td className="py-3 px-2 text-right text-lg">{totalMonthlyHours.toFixed(1)}h</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 미니 캘린더 */}
      <Card className="rounded-[2rem] border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-bold">출근 캘린더</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
              <div key={d} className="text-center text-xs font-bold text-muted-foreground py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="h-16" />
            ))}
            {days.map((day) => {
              const record = getRecordForDay(day);
              const workData = getWorkDataForDay(day);
              const today = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "h-16 rounded-xl p-1.5 text-xs border transition-colors",
                    today ? "border-amber-400 bg-amber-50/50" : "border-transparent hover:bg-muted/30",
                    record ? "bg-emerald-50/50" : ""
                  )}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={cn("font-bold text-[11px]", today ? "text-amber-600" : day.getDay() === 0 ? "text-rose-500" : day.getDay() === 6 ? "text-blue-500" : "text-foreground")}>
                      {format(day, "d")}
                    </span>
                    {getStatusBadge(record)}
                  </div>
                  {workData && (
                    <p className="text-[10px] font-semibold text-muted-foreground">{workData.hours_worked.toFixed(1)}h</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceManagement;
