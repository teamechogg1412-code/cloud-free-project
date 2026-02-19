// src/components/attendance/ClockInPopup.tsx

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn, Clock, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";

export const ClockInPopup = () => {
  const { user, currentTenant, isSuperAdmin, memberships } = useAuth();
  const [open, setOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 출근 여부 체크 로직
  useEffect(() => {
    if (!user || !currentTenant || checked) return;

    const checkAttendance = async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("user_id", user.id)
        .eq("tenant_id", currentTenant.tenant_id)
        .eq("date", todayStr)
        .maybeSingle();

      if (!data) {
        setOpen(true);
      }
      setChecked(true);
    };

    checkAttendance();
  }, [user, currentTenant, checked, todayStr]);

  const handleClockIn = async () => {
    if (!user) return;
    setLoading(true);
    const now = new Date().toISOString();

    try {
      if (isSuperAdmin && memberships.length > 0) {
        // --- 슈퍼어드민: 모든 테넌트에 일괄 출근 (Upsert 사용으로 중복 방지) ---
        const attendanceData = memberships.map((m) => ({
          user_id: user.id,
          tenant_id: m.tenant_id,
          date: todayStr,
          clock_in: now,
          clock_in_method: "super_admin_bulk",
        }));

        const { error } = await supabase
          .from("attendance_records")
          .upsert(attendanceData, { onConflict: "user_id,tenant_id,date" });

        if (error) throw error;
        toast.success(`슈퍼어드민 권한으로 ${memberships.length}개 회사에 동시 출근 처리되었습니다.`);
      } else if (currentTenant) {
        // --- 일반 관리자/직원: 현재 선택된 회사만 출근 ---
        const { error } = await supabase.from("attendance_records").insert({
          user_id: user.id,
          tenant_id: currentTenant.tenant_id,
          date: todayStr,
          clock_in: now,
          clock_in_method: "popup",
        });

        if (error) throw error;
        toast.success(`출근이 기록되었습니다. (${format(new Date(), "HH:mm")})`);
      }
      
      setOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error("출근 기록 실패: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md rounded-[2rem] border-none shadow-2xl">
        <DialogHeader className="text-center space-y-4">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
            isSuperAdmin ? "bg-indigo-600" : "bg-gradient-to-br from-amber-400 to-orange-500"
          }`}>
            {isSuperAdmin ? <ShieldAlert className="w-8 h-8 text-white" /> : <Clock className="w-8 h-8 text-white" />}
          </div>
          <DialogTitle className="text-xl font-black">
            {isSuperAdmin ? "전사 통합 출근 기록" : "출근 기록"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium">
            {format(new Date(), "yyyy년 M월 d일 (EEEE)", { locale: ko })}
          </DialogDescription>
        </DialogHeader>

        <div className="text-center py-6">
          <p className="text-5xl font-black text-foreground tracking-tight tabular-nums">
            {format(currentTime, "HH:mm:ss")}
          </p>
          {isSuperAdmin ? (
            <p className="text-sm text-indigo-600 font-bold mt-4 bg-indigo-50 py-2 rounded-xl">
              현재 등록된 모든 고객사({memberships.length}개)에<br/>동일한 시간으로 출근 기록이 생성됩니다.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">현재 시각에 출근을 기록하시겠습니까?</p>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:justify-center">
          <Button variant="ghost" onClick={handleSkip} className="rounded-xl font-bold text-slate-400">
            나중에
          </Button>
          <Button
            onClick={handleClockIn}
            disabled={loading}
            className={`rounded-xl px-8 font-bold shadow-lg transition-all active:scale-95 ${
              isSuperAdmin 
                ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            }`}
          >
            <LogIn className="w-4 h-4 mr-2" />
            {loading ? "기록 중..." : isSuperAdmin ? "통합 출근하기" : "출근하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};