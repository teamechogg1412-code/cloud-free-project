import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator, SelectLabel, SelectGroup,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Calendar, Plus, Loader2, Edit2, Trash2, Clock, MapPin,
  User, List, CalendarDays, Users, Palmtree, Briefcase, UserPlus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from "date-fns";
import { ScheduleCalendar } from "@/components/schedule/ScheduleCalendar";
import { KakaoAddressSearch } from "@/components/schedule/KakaoAddressSearch";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";

// --- Interfaces ---
interface Schedule {
  id: string;
  artist_id: string | null;
  tenant_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  schedule_type: string;
  location: string | null;
  created_at: string;
  google_calendar_event_id?: string | null;
  project_id?: string | null;
  artist?: { id: string; name: string; stage_name: string | null };
  project?: { id: string; title: string } | null;
}

interface Artist {
  id: string;
  name: string;
  stage_name: string | null;
}

interface Project {
  id: string;
  title: string;
  status: string;
}

interface Member {
  id: string;
  user_id: string;
  name: string;
  job_title: string | null;
}

interface ExternalCompany {
  tenant_id: string;
  name: string;
  members: ExternalContact[];
}

interface ExternalContact {
  id: string;
  name: string;
  company: string;
  tenant_id: string;
  role: string;
}

interface Attendee {
  type: "employee" | "external";
  id: string;
  name: string;
  detail: string;
  tenant_id?: string;
}

// --- Constants ---
const SCHEDULE_TYPES = [
  { value: "schedule", label: "일반 일정", category: "general" },
  { value: "personal", label: "개인 일정", category: "general" },
  { value: "filming", label: "촬영", category: "project" },
  { value: "meeting", label: "미팅/회의", category: "all" },
  { value: "script_reading", label: "대본 리딩", category: "project" },
  { value: "event", label: "행사", category: "all" },
  { value: "rehearsal", label: "리허설", category: "project" },
  { value: "interview", label: "인터뷰", category: "all" },
  { value: "travel", label: "이동", category: "all" },
  { value: "rest", label: "휴식", category: "general" },
  { value: "audition", label: "오디션", category: "project" },
  { value: "fitting", label: "의상 피팅", category: "project" },
  { value: "press", label: "기자회견/시사회", category: "project" },
];

const getAvailableTypes = (hasProject: boolean) => {
  if (hasProject) return SCHEDULE_TYPES;
  return SCHEDULE_TYPES.filter(t => t.category !== "project");
};

// --- Component ---
const ScheduleManagement = () => {
  const { currentTenant, profile } = useAuth();
  const navigate = useNavigate();
  const myTenantId = currentTenant?.tenant_id;

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [leaveEvents, setLeaveEvents] = useState<any[]>([]);
  const [attendeeMap, setAttendeeMap] = useState<Map<string, string[]>>(new Map()); // schedule_id -> user_ids
  const [artists, setArtists] = useState<Artist[]>([]);
  const [savedLocations, setSavedLocations] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [externalCompanies, setExternalCompanies] = useState<ExternalCompany[]>([]);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [hasExternalAttendees, setHasExternalAttendees] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);
  const [processing, setProcessing] = useState(false);
  const [filterKey, setFilterKey] = useState("all");
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
    location_address: "",
    location_lat: 0,
    location_lng: 0,
    project_id: "",
  });
  const [selectedAttendees, setSelectedAttendees] = useState<Attendee[]>([]);

  // Derived
  const hasProject = form.project_id !== "" && form.project_id !== "none";
  const availableTypes = useMemo(() => getAvailableTypes(hasProject), [hasProject]);

  const fetchData = async () => {
    if (!myTenantId) return;
    setLoading(true);
    try {
      const [scheduleRes, artistRes, projectRes, memberRes] = await Promise.all([
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
        supabase
          .from("projects")
          .select("id, title, status")
          .eq("tenant_id", myTenantId)
          .in("status", ["active", "in_progress", "진행중"])
          .order("title"),
        supabase
          .from("members")
          .select("id, user_id, name, job_title")
          .eq("tenant_id", myTenantId)
          .eq("is_active", true)
          .order("name"),
      ]);

      if (scheduleRes.error) throw scheduleRes.error;
      setSchedules((scheduleRes.data || []) as unknown as Schedule[]);
      setArtists((artistRes.data || []) as Artist[]);
      setProjects((projectRes.data || []) as Project[]);

      // Merge members table with tenant_memberships for completeness (CEO, etc.)
      let allMembers = (memberRes.data || []) as Member[];
      const existingUserIds = new Set(allMembers.map(m => m.user_id));
      
      const { data: tmData } = await supabase
        .from("tenant_memberships")
        .select("id, user_id, role, job_title")
        .eq("tenant_id", myTenantId);
      
      if (tmData) {
        const missingUserIds = (tmData as any[])
          .filter(tm => !existingUserIds.has(tm.user_id))
          .map(tm => tm.user_id);
        
        if (missingUserIds.length > 0) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", missingUserIds);
          
          if (profileData) {
            const tmMap = new Map((tmData as any[]).map(tm => [tm.user_id, tm]));
            const extraMembers = (profileData as any[]).map(p => ({
              id: p.id,
              user_id: p.id,
              name: p.full_name || "이름 없음",
              job_title: tmMap.get(p.id)?.job_title || tmMap.get(p.id)?.role || null,
            }));
            allMembers = [...allMembers, ...extraMembers];
          }
        }
      }
      setMembers(allMembers);

      // Load attendee map for member filtering
      const scheduleIds = (scheduleRes.data || []).map((s: any) => s.id);
      if (scheduleIds.length > 0) {
        const { data: attData } = await supabase
          .from("schedule_attendees")
          .select("schedule_id, attendee_id")
          .in("schedule_id", scheduleIds.slice(0, 500))
          .eq("attendee_type", "employee");
        const aMap = new Map<string, string[]>();
        (attData || []).forEach((a: any) => {
          if (!aMap.has(a.schedule_id)) aMap.set(a.schedule_id, []);
          aMap.get(a.schedule_id)!.push(a.attendee_id);
        });
        setAttendeeMap(aMap);
      }

      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const { data: leaves } = await supabase
        .from("leave_requests")
        .select("id, user_id, start_date, end_date, status, leave_type_id, reason")
        .eq("tenant_id", myTenantId)
        .eq("status", "approved")
        .gte("end_date", format(monthStart, "yyyy-MM-dd"))
        .lte("start_date", format(monthEnd, "yyyy-MM-dd"));

      if (leaves && leaves.length > 0 && allMembers.length > 0) {
        const memberMap = new Map(allMembers.map(m => [m.user_id, m]));
        
        const leaveSchedules = (leaves as any[]).flatMap((l) => {
          const member = memberMap.get(l.user_id);
          if (!member) return [];
          const start = parseISO(l.start_date);
          const end = parseISO(l.end_date);
          const days = eachDayOfInterval({ start, end });
          return days.map(d => ({
            id: `leave-${l.id}-${format(d, "yyyy-MM-dd")}`,
            artist_id: null,
            title: `🌴 ${member.name} 휴가`,
            start_time: new Date(d.setHours(0, 0, 0, 0)).toISOString(),
            end_time: new Date(d.setHours(23, 59, 59, 999)).toISOString(),
            is_all_day: true,
            schedule_type: "leave",
            location: null,
            artist: null,
            _isLeave: true,
          }));
        });
        setLeaveEvents(leaveSchedules);
      }

      // Fetch partner companies from tenant_partnerships
      const { data: partnerships } = await supabase
        .from("tenant_partnerships")
        .select("requester_tenant_id, target_tenant_id, status")
        .eq("status", "active")
        .or(`requester_tenant_id.eq.${myTenantId},target_tenant_id.eq.${myTenantId}`);

      if (partnerships && partnerships.length > 0) {
        const partnerTenantIds = (partnerships as any[]).map(p =>
          p.requester_tenant_id === myTenantId ? p.target_tenant_id : p.requester_tenant_id
        );
        const uniquePartnerIds = [...new Set(partnerTenantIds)] as string[];

        const [{ data: partnerMembers }, { data: tenants }, { data: tmData }] = await Promise.all([
          supabase
            .from("members")
            .select("id, user_id, name, job_title, tenant_id")
            .in("tenant_id", uniquePartnerIds)
            .eq("is_active", true),
          supabase
            .from("tenants")
            .select("id, name")
            .in("id", uniquePartnerIds),
          supabase
            .from("tenant_memberships")
            .select("user_id, tenant_id, role")
            .in("tenant_id", uniquePartnerIds),
        ]);

        const tenantMap = new Map((tenants || []).map((t: any) => [t.id, t.name]));

        // Build grouped companies - start with all partner tenants
        const grouped = new Map<string, ExternalCompany>();
        uniquePartnerIds.forEach(tid => {
          const companyName = (tenantMap.get(tid) || "외부") as string;
          grouped.set(tid, { tenant_id: tid, name: companyName, members: [] });
        });

        // Add members from members table
        if (partnerMembers) {
          (partnerMembers as any[]).forEach(m => {
            const companyName = (tenantMap.get(m.tenant_id) || "외부") as string;
            if (!grouped.has(m.tenant_id)) {
              grouped.set(m.tenant_id, { tenant_id: m.tenant_id, name: companyName, members: [] });
            }
            grouped.get(m.tenant_id)!.members.push({
              id: m.user_id || m.id,
              name: m.name,
              company: companyName,
              tenant_id: m.tenant_id,
              role: m.job_title || "",
            });
          });
        }

        // For companies with no members, fallback to tenant_memberships + profiles
        const emptyCompanyIds = Array.from(grouped.entries())
          .filter(([_, c]) => c.members.length === 0)
          .map(([tid]) => tid);

        if (emptyCompanyIds.length > 0 && tmData) {
          const fallbackUsers = (tmData as any[]).filter(tm => emptyCompanyIds.includes(tm.tenant_id));
          if (fallbackUsers.length > 0) {
            const userIds = fallbackUsers.map(u => u.user_id);
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", userIds);
            const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));
            fallbackUsers.forEach(tm => {
              const companyName = (tenantMap.get(tm.tenant_id) || "외부") as string;
              const name = profileMap.get(tm.user_id) || "미확인";
              const existing = grouped.get(tm.tenant_id);
              if (existing && !existing.members.find(m => m.id === tm.user_id)) {
                existing.members.push({
                  id: tm.user_id,
                  name: name as string,
                  company: companyName,
                  tenant_id: tm.tenant_id,
                  role: tm.role || "",
                });
              }
            });
          }
        }

        setExternalCompanies(Array.from(grouped.values()));
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [myTenantId]);

  // Fetch saved locations when artist changes
  useEffect(() => {
    const fetchSavedLocations = async () => {
      if (!form.artist_id || !myTenantId) {
        setSavedLocations([]);
        return;
      }
      const { data } = await supabase
        .from("artist_saved_locations")
        .select("*")
        .eq("artist_id", form.artist_id)
        .eq("tenant_id", myTenantId)
        .order("category");
      setSavedLocations((data || []) as any[]);
    };
    fetchSavedLocations();
  }, [form.artist_id, myTenantId]);

  const applyFilter = (list: Schedule[]) => {
    if (filterKey === "all") return list;
    if (filterKey.startsWith("artist:")) {
      const id = filterKey.replace("artist:", "");
      return list.filter(s => s.artist_id === id);
    }
    if (filterKey.startsWith("project:")) {
      const id = filterKey.replace("project:", "");
      return list.filter(s => s.project_id === id);
    }
    if (filterKey.startsWith("member:")) {
      const id = filterKey.replace("member:", "");
      return list.filter(s => {
        const attendees = attendeeMap.get(s.id) || [];
        return attendees.includes(id);
      });
    }
    return list;
  };

  const allCalendarEvents = useMemo(() => {
    const filtered = applyFilter(schedules);
    return [...filtered, ...leaveEvents];
  }, [schedules, leaveEvents, filterKey, attendeeMap]);

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
      location_address: "",
      location_lat: 0,
      location_lng: 0,
      project_id: "",
    });
    setSelectedAttendees([]);
    setHasExternalAttendees(false);
    setExpandedCompanies(new Set());
    setEditingSchedule(null);
  };

  const openCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEdit = (s: Schedule) => {
    if ((s as any)._isLeave) return; // Don't edit leave events
    setEditingSchedule(s);
    const sAny = s as any;
    setForm({
      artist_id: s.artist_id || "",
      title: s.title,
      description: s.description || "",
      start_time: s.start_time.slice(0, 16),
      end_time: s.end_time.slice(0, 16),
      is_all_day: s.is_all_day,
      schedule_type: s.schedule_type || "schedule",
      location: s.location || "",
      location_address: sAny.location_address || "",
      location_lat: sAny.location_lat || 0,
      location_lng: sAny.location_lng || 0,
      project_id: sAny.project_id || "",
    });

    // Load existing attendees
    loadAttendees(s.id);
    setIsDialogOpen(true);
  };

  const loadAttendees = async (scheduleId: string) => {
    const { data } = await supabase
      .from("schedule_attendees")
      .select("*")
      .eq("schedule_id", scheduleId);

    if (data) {
      const attendees = (data as any[]).map(a => ({
        type: (a.attendee_type || "employee") as "employee" | "external",
        id: a.attendee_id,
        name: a.attendee_name || "",
        detail: a.attendee_detail || "",
        tenant_id: a.tenant_id || undefined,
      }));
      setSelectedAttendees(attendees);
      // Auto-enable external toggle if there are external attendees
      if (attendees.some(a => a.type === "external")) {
        setHasExternalAttendees(true);
      }
    }
  };

  const handleSave = async () => {
    if (!form.start_time || !form.end_time) {
      toast.error("시작/종료 시간을 입력해주세요.");
      return;
    }
    if (new Date(form.end_time) <= new Date(form.start_time)) {
      toast.error("종료 시간은 시작 시간 이후여야 합니다.");
      return;
    }

    setProcessing(true);
    try {
      // Auto-generate title if empty
      const autoTitle = form.title || (() => {
        const typeLabel = SCHEDULE_TYPES.find(t => t.value === form.schedule_type)?.label || "일정";
        const artistName = artists.find(a => a.id === form.artist_id)?.name;
        return artistName ? `${artistName} ${typeLabel}` : typeLabel;
      })();

      const payload = {
        artist_id: form.artist_id || null,
        tenant_id: myTenantId,
        title: autoTitle,
        description: form.description || null,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        is_all_day: form.is_all_day,
        schedule_type: form.schedule_type,
        location: form.location || null,
        location_address: form.location_address || null,
        location_lat: form.location_lat || null,
        location_lng: form.location_lng || null,
        project_id: form.project_id && form.project_id !== "none" ? form.project_id : null,
        ...(editingSchedule ? {} : { created_by: profile?.id }),
      };

      let savedScheduleId = editingSchedule?.id;

      if (editingSchedule) {
        const { error } = await supabase
          .from("artist_schedules")
          .update(payload as any)
          .eq("id", editingSchedule.id);
        if (error) throw error;
        toast.success("일정이 수정되었습니다.");
      } else {
        const { data: inserted, error } = await supabase
          .from("artist_schedules")
          .insert(payload as any)
          .select("id")
          .single();
        if (error) throw error;
        savedScheduleId = inserted?.id;
        toast.success("일정이 등록되었습니다.");
      }

      // Save attendees
      if (savedScheduleId) {
        // Delete existing attendees
        await supabase.from("schedule_attendees").delete().eq("schedule_id", savedScheduleId);

        // Insert new attendees
        if (selectedAttendees.length > 0) {
          const attendeeRows = selectedAttendees.map(a => ({
            schedule_id: savedScheduleId,
            tenant_id: a.type === "external" && a.tenant_id ? a.tenant_id : myTenantId,
            attendee_type: a.type,
            attendee_id: a.id,
            attendee_name: a.name,
            attendee_detail: a.detail,
          }));
          await supabase.from("schedule_attendees").insert(attendeeRows as any);
        }
      }

      // Auto-sync to Google Calendar
      if (savedScheduleId && profile?.id) {
        try {
          const { error: calError } = await invokeEdgeFunction("sync-schedule-to-calendar", {
            body: {
              action: "upsert",
              scheduleId: savedScheduleId,
              tenantId: myTenantId,
              userId: profile.id,
            },
          });
          if (calError) {
            console.warn("Calendar sync failed:", calError.message);
          }
        } catch (calErr: any) {
          console.warn("Calendar sync error:", calErr);
        }
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
      if (deleteTarget.google_calendar_event_id && profile?.id) {
        try {
          await invokeEdgeFunction("sync-schedule-to-calendar", {
            body: {
              action: "delete",
              tenantId: myTenantId,
              userId: profile.id,
              calendarEventId: deleteTarget.google_calendar_event_id,
            },
          });
        } catch (calErr) {
          console.warn("Calendar delete failed:", calErr);
        }
      }

      // Delete attendees first
      await supabase.from("schedule_attendees").delete().eq("schedule_id", deleteTarget.id);

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

  // Attendee toggle
  const toggleAttendee = (attendee: Attendee) => {
    setSelectedAttendees(prev => {
      const exists = prev.find(a => a.type === attendee.type && a.id === attendee.id);
      if (exists) return prev.filter(a => !(a.type === attendee.type && a.id === attendee.id));
      return [...prev, attendee];
    });
  };

  const isAttendeeSelected = (type: string, id: string) =>
    selectedAttendees.some(a => a.type === type && a.id === id);

  const filteredSchedules = applyFilter(schedules);

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
      personal: "bg-pink-100 text-pink-700",
      leave: "bg-emerald-100 text-emerald-700",
      script_reading: "bg-orange-100 text-orange-700",
      audition: "bg-violet-100 text-violet-700",
      fitting: "bg-rose-100 text-rose-700",
      press: "bg-teal-100 text-teal-700",
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
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">통합 스케줄 관리</h1>
            <p className="text-slate-500 mt-1">배우·직원 일정, 프로젝트 스케줄, 휴가를 통합 관리합니다.</p>
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
          <Select value={filterKey} onValueChange={setFilterKey}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {artists.length > 0 && (
                <SelectGroup>
                  <SelectSeparator />
                  <SelectLabel>🎭 아티스트</SelectLabel>
                  {artists.map(a => (
                    <SelectItem key={`artist:${a.id}`} value={`artist:${a.id}`}>
                      {a.name}{a.stage_name ? ` (${a.stage_name})` : ""}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {projects.length > 0 && (
                <SelectGroup>
                  <SelectSeparator />
                  <SelectLabel>📁 프로젝트</SelectLabel>
                  {projects.map(p => (
                    <SelectItem key={`project:${p.id}`} value={`project:${p.id}`}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {members.length > 0 && (
                <SelectGroup>
                  <SelectSeparator />
                  <SelectLabel>👤 직원</SelectLabel>
                  {members.map(m => (
                    <SelectItem key={`member:${m.user_id}`} value={`member:${m.user_id}`}>
                      {m.name}{m.job_title ? ` (${m.job_title})` : ""}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
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
              schedules={allCalendarEvents as any}
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
                        {(s as any).project_id && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Briefcase className="w-3 h-3" /> 프로젝트
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-bold text-lg text-slate-900 truncate">{s.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500">
                        {s.artist_id && (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {(s.artist as any)?.name || "알 수 없음"}
                          </span>
                        )}
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
                        className="gap-1 text-destructive hover:text-destructive"
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
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {editingSchedule ? "일정 수정" : "일정 등록"}
              </DialogTitle>
              <DialogDescription>
                스케줄을 {editingSchedule ? "수정" : "등록"}합니다. 프로젝트 연결 시 촬영·리딩 등 유형을 선택할 수 있습니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Row 1: Artist + Project */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>배우 (선택)</Label>
                  <Select value={form.artist_id || "none"} onValueChange={v => setForm(f => ({ ...f, artist_id: v === "none" ? "" : v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="배우를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">배우 없음 (일반/개인)</SelectItem>
                      {artists.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}{a.stage_name ? ` (${a.stage_name})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" /> 프로젝트
                  </Label>
                  <Select value={form.project_id || "none"} onValueChange={v => {
                    const newProjectId = v === "none" ? "" : v;
                    setForm(f => ({
                      ...f,
                      project_id: newProjectId,
                      // Reset schedule type if current type is project-only and no project
                      schedule_type: !newProjectId && SCHEDULE_TYPES.find(t => t.value === f.schedule_type)?.category === "project"
                        ? "schedule"
                        : f.schedule_type,
                    }));
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="프로젝트 연결 (선택)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">프로젝트 없음</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Title */}
              <div className="space-y-2">
                <Label>제목 (선택)</Label>
                <Input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="미입력 시 자동 생성 (예: 홍길동 촬영)"
                />
              </div>

              {/* Row 3: Type + Location */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>일정 유형</Label>
                  <Select value={form.schedule_type} onValueChange={v => setForm(f => ({ ...f, schedule_type: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTypes.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                          {t.category === "project" && " 📽️"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>장소 검색</Label>
                  <KakaoAddressSearch
                    value={form.location}
                    onSelect={(result) =>
                      setForm((f) => ({
                        ...f,
                        location: result.location,
                        location_address: result.location_address,
                        location_lat: result.location_lat,
                        location_lng: result.location_lng,
                      }))
                    }
                    placeholder="장소 또는 주소 검색"
                  />
                  {form.location_address && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {form.location_address}
                    </p>
                  )}
                  {/* Saved locations quick pick */}
                  {savedLocations.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {savedLocations.map(loc => (
                        <button
                          key={loc.id}
                          type="button"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border text-[10px] hover:bg-accent transition-colors"
                          onClick={() => setForm(f => ({
                            ...f,
                            location: loc.location_name || loc.label,
                            location_address: loc.address,
                            location_lat: loc.lat,
                            location_lng: loc.lng,
                          }))}
                        >
                          <MapPin className="w-2.5 h-2.5" />
                          {loc.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 4: All day + Times */}
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

              {/* Attendees Section */}
              <Separator />
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-base font-semibold">
                  <Users className="w-4 h-4" /> 참석자
                </Label>

                {/* Internal Employees */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" /> 내부 직원
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[120px] overflow-y-auto">
                    {members.map(m => (
                      <label
                        key={m.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                          isAttendeeSelected("employee", m.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-accent"
                        }`}
                      >
                        <Checkbox
                          checked={isAttendeeSelected("employee", m.id)}
                          onCheckedChange={() =>
                            toggleAttendee({
                              type: "employee",
                              id: m.id,
                              name: m.name,
                              detail: m.job_title || "",
                            })
                          }
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{m.name}</p>
                          {m.job_title && (
                            <p className="text-[10px] text-muted-foreground truncate">{m.job_title}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* External Attendees Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="hasExternal"
                      checked={hasExternalAttendees}
                      onCheckedChange={(v) => {
                        setHasExternalAttendees(!!v);
                        if (!v) {
                          // Remove all external attendees when unchecked
                          setSelectedAttendees(prev => prev.filter(a => a.type !== "external"));
                          setExpandedCompanies(new Set());
                        }
                      }}
                    />
                    <label htmlFor="hasExternal" className="text-xs font-semibold text-muted-foreground flex items-center gap-1 cursor-pointer">
                      <UserPlus className="w-3 h-3" /> 외부 인력 참석
                      {externalCompanies.length > 0 && (
                        <Badge variant="outline" className="text-[9px] ml-1">
                          파트너사 {externalCompanies.length}곳
                        </Badge>
                      )}
                    </label>
                  </div>

                  {hasExternalAttendees && externalCompanies.length > 0 && (
                    <div className="space-y-2 pl-6">
                      {externalCompanies.map(company => {
                        const isExpanded = expandedCompanies.has(company.tenant_id);
                        const selectedCount = selectedAttendees.filter(
                          a => a.type === "external" && company.members.some(m => m.id === a.id)
                        ).length;
                        return (
                          <div key={company.tenant_id} className="border border-border rounded-lg overflow-hidden">
                            <button
                              type="button"
                              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
                              onClick={() => {
                                setExpandedCompanies(prev => {
                                  const next = new Set(prev);
                                  if (next.has(company.tenant_id)) next.delete(company.tenant_id);
                                  else next.add(company.tenant_id);
                                  return next;
                                });
                              }}
                            >
                              <span className="flex items-center gap-1.5">
                                <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                                {company.name}
                                <Badge variant="outline" className="text-[10px] ml-1">{company.members.length}명</Badge>
                                {selectedCount > 0 && (
                                  <Badge className="text-[10px] ml-1">{selectedCount}명 선택</Badge>
                                )}
                              </span>
                              <span className="text-muted-foreground text-xs">{isExpanded ? "▲" : "▼"}</span>
                            </button>
                            {isExpanded && (
                              <div className="border-t border-border px-2 py-2 grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[160px] overflow-y-auto">
                                {company.members.map(c => (
                                  <label
                                    key={c.id}
                                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                                      isAttendeeSelected("external", c.id)
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:bg-accent"
                                    }`}
                                  >
                                    <Checkbox
                                      checked={isAttendeeSelected("external", c.id)}
                                      onCheckedChange={() =>
                                        toggleAttendee({
                                          type: "external",
                                          id: c.id,
                                          name: c.name,
                                          detail: `${c.company} ${c.role}`,
                                          tenant_id: c.tenant_id,
                                        })
                                      }
                                    />
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium truncate">{c.name}</p>
                                      {c.role && (
                                        <p className="text-[10px] text-muted-foreground truncate">{c.role}</p>
                                      )}
                                    </div>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {hasExternalAttendees && externalCompanies.length === 0 && (
                    <p className="text-xs text-muted-foreground pl-6">
                      연결된 파트너사가 없습니다. 파트너사 관리에서 먼저 연결하세요.
                    </p>
                  )}
                </div>

                {selectedAttendees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedAttendees.map((a, i) => (
                      <Badge
                        key={i}
                        variant={a.type === "employee" ? "default" : "secondary"}
                        className="text-[10px] gap-1"
                      >
                        {a.type === "external" && "🏢"}
                        {a.name}
                        <button
                          type="button"
                          className="ml-0.5 hover:text-destructive"
                          onClick={() => toggleAttendee(a)}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Description */}
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
                disabled={processing || !form.start_time || !form.end_time}
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
                "{deleteTarget?.title}" 일정을 삭제하시겠습니까? 참석자 기록도 함께 삭제됩니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
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
