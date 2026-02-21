import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const GmailOAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const returnedState = searchParams.get("state");
      const storedState = sessionStorage.getItem("gmail_oauth_state");
      const tenantId = sessionStorage.getItem("gmail_oauth_tenant_id");
      const error = searchParams.get("error");

      if (error) {
        setStatus("error");
        setMessage("Google 인증이 취소되었습니다.");
        return;
      }

      if (!code) {
        setStatus("error");
        setMessage("인증 코드가 없습니다.");
        return;
      }

      if (!returnedState || returnedState !== storedState) {
        setStatus("error");
        setMessage("보안 검증에 실패했습니다. 다시 시도해주세요.");
        return;
      }

      if (!tenantId) {
        setStatus("error");
        setMessage("테넌트 정보가 없습니다. 다시 시도해주세요.");
        return;
      }

      // Clean up
      sessionStorage.removeItem("gmail_oauth_state");
      sessionStorage.removeItem("gmail_oauth_tenant_id");

      try {
        const redirectUri = `${window.location.origin}/auth/gmail/callback`;

        const res = await supabase.functions.invoke("gmail-oauth", {
          body: { action: "exchange_code", code, tenantId, redirectUri },
        });

        if (res.error) throw res.error;
        if (res.data?.success) {
          setStatus("success");
          setMessage(`Gmail 연동 완료! (${res.data.email})`);
        } else {
          throw new Error(res.data?.error || "알 수 없는 오류");
        }
      } catch (e: any) {
        setStatus("error");
        setMessage(e.message || "토큰 교환 중 오류가 발생했습니다.");
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-none shadow-xl rounded-2xl">
        <CardContent className="p-8 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
              <p className="text-lg font-semibold">Gmail 연동 처리 중...</p>
              <p className="text-sm text-muted-foreground">잠시만 기다려 주세요.</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
              <p className="text-lg font-semibold">연동 성공!</p>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button onClick={() => navigate("/my-page")} className="mt-4 rounded-xl">
                마이페이지로 돌아가기
              </Button>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="w-12 h-12 text-destructive mx-auto" />
              <p className="text-lg font-semibold">연동 실패</p>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button onClick={() => navigate("/my-page")} variant="outline" className="mt-4 rounded-xl">
                마이페이지로 돌아가기
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GmailOAuthCallback;
