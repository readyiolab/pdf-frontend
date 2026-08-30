import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { lettersApi } from "@/services/lettersApi";
import { safeInternalPath } from "@/lib/safeRedirect";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

/**
 * Microsoft/Google redirects here after the user approves mailbox access.
 * We exchange the code via the API, then return to the batch wizard send step.
 */
export default function MailCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Connecting your email…");

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    if (error) {
      toast.error(errorDescription || error || "Email connection was cancelled");
      navigate("/letters/batches/new", { replace: true });
      return;
    }

    if (!code || !state) {
      toast.error("Missing authorization details. Try Connect Outlook again.");
      navigate("/letters/batches/new", { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { account } = await lettersApi.mailExchange(code, state);
        if (cancelled) return;
        localStorage.setItem("letter_mail_just_connected", account.emailAddress || "1");
        toast.success(`Connected ${account.emailAddress}`);
        setMessage(`Connected as ${account.emailAddress}. Returning…`);
        const returnTo = safeInternalPath(
          localStorage.getItem("letter_mail_return_to"),
          "/letters/batches/new"
        );
        localStorage.removeItem("letter_mail_return_to");
        navigate(returnTo, { replace: true });
      } catch (e: any) {
        if (cancelled) return;
        toast.error(e.message || "Could not connect email");
        navigate("/letters/batches/new", { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, navigate]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <Spinner className="size-6 text-indigo-600" />
      <p className="text-sm font-medium text-slate-800">{message}</p>
      <p className="text-xs text-slate-500">Do not close this window.</p>
    </div>
  );
}
