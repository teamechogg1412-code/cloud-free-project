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
import { LogIn, Clock } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";

export const ClockInPopup = () => {
  const { user, currentTenant } = useAuth();
  const [open, setOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const tenantId = currentTenant?.tenant_id;
  const todayStr = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user || !tenantId || checked) return;

    const checkAttendance = async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantId)
        .eq("date", todayStr)
        .maybeSingle();

      if (!data) {
        setOpen(true);
      }
      setChecked(true);
    };

    checkAttendance();
  }, [user, tenantId, checked]);

  const handleClockIn = async () => {
    if (!user || !tenantId) return;
    setLoading(true);
    const now = new Date().toISOString();
    const { error } = await supabase.from("attendance_records").insert({
      user_id: user.id,
      tenant_id: tenantId,
      date: todayStr,
      clock_in: now,
      clock_in_method: "popup",
    });
    setLoading(false);
    if (error) {
      toast.error("출근 기록 실패: " + error.message);
    } else {
      toast.success(`출근이 기록되었습니다. (${format(new Date(), "HH:mm")})`);
      setOpen(false);
    }
  };

  const handleSkip = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md rounded-[2rem]">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-xl font-black">출근 기록</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {format(new Date(), "yyyy년 M월 d일 (EEEE)", { locale: ko })}
          </DialogDescription>
        </DialogHeader>

        <div className="text-center py-6">
          <p className="text-5xl font-black text-foreground tracking-tight tabular-nums">
            {format(currentTime, "HH:mm:ss")}
          </p>
          <p className="text-sm text-muted-foreground mt-2">현재 시각에 출근을 기록하시겠습니까?</p>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-center">
          <Button variant="ghost" onClick={handleSkip} className="rounded-xl">
            나중에
          </Button>
          <Button
            onClick={handleClockIn}
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-8"
          >
            <LogIn className="w-4 h-4 mr-2" />
            {loading ? "기록 중..." : "출근하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
