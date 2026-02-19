import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, LayoutGrid,
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, addWeeks, subWeeks, eachDayOfInterval,
  isSameMonth, isSameDay, isToday,
} from "date-fns";
import { ko } from "date-fns/locale";

interface ScheduleEvent {
  id: string;
  artist_id: string;
  title: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  schedule_type: string;
  location: string | null;
  artist?: { id: string; name: string; stage_name: string | null };
}

interface ScheduleCalendarProps {
  schedules: ScheduleEvent[];
  onEventClick?: (schedule: ScheduleEvent) => void;
}

const TYPE_COLORS: Record<string, string> = {
  filming: "bg-red-500",
  meeting: "bg-blue-500",
  event: "bg-purple-500",
  rehearsal: "bg-amber-500",
  interview: "bg-cyan-500",
  travel: "bg-green-500",
  rest: "bg-slate-400",
  schedule: "bg-indigo-500",
};

const TYPE_LABELS: Record<string, string> = {
  schedule: "일정",
  filming: "촬영",
  meeting: "미팅",
  event: "행사",
  rehearsal: "리허설",
  interview: "인터뷰",
  travel: "이동",
  rest: "휴식",
};

type ViewMode = "month" | "week";

export const ScheduleCalendar = ({ schedules, onEventClick }: ScheduleCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  const days = useMemo(() => {
    if (viewMode === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
      const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
      return eachDayOfInterval({ start: calStart, end: calEnd });
    } else {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
  }, [currentDate, viewMode]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    schedules.forEach((s) => {
      const start = new Date(s.start_time);
      const end = new Date(s.end_time);
      days.forEach((day) => {
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);
        if (start <= dayEnd && end >= dayStart) {
          const key = format(day, "yyyy-MM-dd");
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(s);
        }
      });
    });
    return map;
  }, [schedules, days]);

  const navigate = (direction: number) => {
    if (viewMode === "month") {
      setCurrentDate(direction > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else {
      setCurrentDate(direction > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    }
  };

  const headerLabel = viewMode === "month"
    ? format(currentDate, "yyyy년 M월", { locale: ko })
    : `${format(days[0], "M/d", { locale: ko })} ~ ${format(days[6], "M/d", { locale: ko })}`;

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-lg font-bold text-slate-900 min-w-[160px] text-center">
            {headerLabel}
          </h3>
          <Button variant="ghost" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="ml-2 text-xs"
            onClick={() => setCurrentDate(new Date())}
          >
            오늘
          </Button>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          <Button
            variant={viewMode === "month" ? "default" : "ghost"}
            size="sm"
            className="gap-1.5 h-7 text-xs"
            onClick={() => setViewMode("month")}
          >
            <CalendarIcon className="w-3.5 h-3.5" /> 월간
          </Button>
          <Button
            variant={viewMode === "week" ? "default" : "ghost"}
            size="sm"
            className="gap-1.5 h-7 text-xs"
            onClick={() => setViewMode("week")}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> 주간
          </Button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {weekDays.map((d, i) => (
          <div
            key={d}
            className={`text-center py-2 text-xs font-semibold ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-slate-500"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className={`grid grid-cols-7 ${viewMode === "week" ? "min-h-[200px]" : ""}`}>
        {days.map((day, idx) => {
          const key = format(day, "yyyy-MM-dd");
          const events = eventsByDay.get(key) || [];
          const inMonth = viewMode === "month" ? isSameMonth(day, currentDate) : true;
          const today = isToday(day);
          const dayOfWeek = day.getDay();

          return (
            <div
              key={idx}
              className={`border-b border-r border-slate-100 ${
                viewMode === "week" ? "min-h-[180px]" : "min-h-[100px]"
              } ${!inMonth ? "bg-slate-50/50" : ""} ${today ? "bg-primary/5" : ""}`}
            >
              <div className="p-1">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full ${
                    today
                      ? "bg-primary text-primary-foreground font-bold"
                      : !inMonth
                      ? "text-slate-300"
                      : dayOfWeek === 0
                      ? "text-red-500"
                      : dayOfWeek === 6
                      ? "text-blue-500"
                      : "text-slate-700"
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="px-1 pb-1 space-y-0.5">
                {events.slice(0, viewMode === "week" ? 8 : 3).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => onEventClick?.(ev)}
                    className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] leading-tight text-white truncate ${
                      TYPE_COLORS[ev.schedule_type] || TYPE_COLORS.schedule
                    } hover:opacity-80 transition-opacity`}
                    title={`${(ev.artist as any)?.name || ""} - ${ev.title}`}
                  >
                    {viewMode === "week" && (
                      <span className="font-medium">
                        {!ev.is_all_day && format(new Date(ev.start_time), "HH:mm")}{" "}
                      </span>
                    )}
                    {(ev.artist as any)?.name?.charAt(0)}{" "}
                    {ev.title}
                  </button>
                ))}
                {events.length > (viewMode === "week" ? 8 : 3) && (
                  <p className="text-[10px] text-slate-400 px-1">
                    +{events.length - (viewMode === "week" ? 8 : 3)}건
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 p-3 border-t border-slate-100">
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${TYPE_COLORS[key]}`} />
            <span className="text-[11px] text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
