import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { lettersApi } from "@/services/lettersApi";
import { toast } from "sonner";

/** Accepts ?token= from invite email. */
export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      toast.error("Missing invite token");
      navigate("/letters/studio");
      return;
    }
    lettersApi
      .acceptInvite(token)
      .then((res) => {
        localStorage.setItem("letter_org_id", res.organization.id);
        toast.success(`Joined ${res.organization.name}`);
        navigate("/letters/studio");
      })
      .catch((e) => {
        toast.error(e.message);
        navigate("/letters/studio");
      });
  }, [params, navigate]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      Accepting invitation…
    </div>
  );
}
