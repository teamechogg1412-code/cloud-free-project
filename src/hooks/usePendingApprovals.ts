import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export interface PendingApprovalItem {
  id: string;
  requester_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  created_at: string;
  current_step: string;
}

export const usePendingApprovals = () => {
  const { user, currentTenant } = useAuth();
  const tenantId = currentTenant?.tenant_id;

  const [myRequestItems, setMyRequestItems] = useState<PendingApprovalItem[]>([]);
  const [myTurnItems, setMyTurnItems] = useState<PendingApprovalItem[]>([]);
  const [myApprovedItems, setMyApprovedItems] = useState<PendingApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId || !user) {
      setMyRequestItems([]);
      setMyTurnItems([]);
      setMyApprovedItems([]);
      setLoading(false);
      return;
    }
    fetchPendingApprovals();
  }, [tenantId, user]);

  const buildItem = async (req: any, stepLabel: string): Promise<PendingApprovalItem> => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", req.user_id)
      .single();

    const { data: leaveType } = await supabase
      .from("leave_types")
      .select("name, display_name")
      .eq("id", req.leave_type_id)
      .single();

    return {
      id: req.id,
      requester_name: profile?.full_name || "알 수 없음",
      leave_type: leaveType?.display_name || leaveType?.name || "휴가",
      start_date: req.start_date,
      end_date: req.end_date,
      reason: req.reason || "",
      created_at: req.created_at,
      current_step: stepLabel,
    };
  };

  const fetchPendingApprovals = async () => {
    if (!tenantId || !user) return;
    setLoading(true);

    try {
      const { data: pendingReqs } = await supabase
        .from("leave_requests")
        .select("id, user_id, leave_type_id, start_date, end_date, reason, created_at, approved_by, status")
        .eq("tenant_id", tenantId)
        .eq("status", "pending");

      if (!pendingReqs || pendingReqs.length === 0) {
        setMyRequestItems([]);
        setMyTurnItems([]);
        setMyApprovedItems([]);
        setLoading(false);
        return;
      }

      const requestItems: PendingApprovalItem[] = [];
      const turnItems: PendingApprovalItem[] = [];
      const approvedItems: PendingApprovalItem[] = [];

      for (const req of pendingReqs) {
        const { data: reqLines } = await supabase
          .from("approval_lines")
          .select("approver_user_id, step_order")
          .eq("tenant_id", tenantId)
          .eq("user_id", req.user_id)
          .order("step_order", { ascending: true });

        // Determine current step
        let currentStepIndex = 0;
        if (req.approved_by && reqLines && reqLines.length > 0) {
          const lastIdx = reqLines.findIndex((l: any) => l.approver_user_id === req.approved_by);
          if (lastIdx >= 0) currentStepIndex = lastIdx + 1;
        }

        const totalSteps = reqLines?.length || 0;
        const stepLabel = totalSteps > 0
          ? `${currentStepIndex + 1}차 승인 대기 (${totalSteps}단계 중)`
          : "승인 대기";

        const nextApproverId = reqLines && currentStepIndex < reqLines.length
          ? reqLines[currentStepIndex].approver_user_id
          : null;

        // 1. 내가 신청한 건
        if (req.user_id === user.id) {
          requestItems.push(await buildItem(req, stepLabel));
          continue; // 내 신청 건은 다른 카테고리에 중복 안 시킴
        }

        // 2. 내가 승인해야 할 건
        if (nextApproverId === user.id) {
          turnItems.push(await buildItem(req, stepLabel));
          continue;
        }

        // 3. 내가 승인했지만 아직 완료 안 된 건
        const iApprovedThis = reqLines?.some(
          (l: any, idx: number) => l.approver_user_id === user.id && idx < currentStepIndex
        );
        if (iApprovedThis) {
          approvedItems.push(await buildItem(req, stepLabel));
        }
      }

      setMyRequestItems(requestItems);
      setMyTurnItems(turnItems);
      setMyApprovedItems(approvedItems);
    } catch (err) {
      console.error("Failed to fetch pending approvals:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalCount = myRequestItems.length + myTurnItems.length + myApprovedItems.length;

  return {
    myRequestItems,
    myTurnItems,
    myApprovedItems,
    totalCount,
    loading,
    refetch: fetchPendingApprovals,
  };
};
