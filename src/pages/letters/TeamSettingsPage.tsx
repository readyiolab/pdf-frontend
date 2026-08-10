import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { lettersApi } from "@/services/lettersApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { StudioPageHeader } from "@/components/letters/StudioPageHeader";

function orgId() {
  return localStorage.getItem("letter_org_id") || "";
}

export default function TeamSettingsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("HR_MANAGER");
  const [retention, setRetention] = useState<30 | 60 | 90>(30);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    if (token) {
      lettersApi
        .acceptInvite(token)
        .then((res) => {
          localStorage.setItem("letter_org_id", res.organization.id);
          toast.success(`Joined ${res.organization.name} as ${res.role}`);
          navigate("/letters/studio");
        })
        .catch((e) => toast.error(e.message));
    }
  }, [params, navigate]);

  useEffect(() => {
    lettersApi.bootstrap().catch(() => undefined);
  }, []);

  const invite = async () => {
    try {
      const res = await lettersApi.invite(orgId(), email, role);
      setInviteToken(res.acceptToken || null);
      toast.success(`Invite sent to ${email}`);
      setEmail("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const saveRetention = async () => {
    try {
      await lettersApi.setRetention(orgId(), retention);
      toast.success(`Retention set to ${retention} days`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <StudioPageHeader
        title="Team & retention"
        description="Invite colleagues and choose how long generated PDFs are kept."
      />
      <div className="grid max-w-3xl gap-6 p-4 sm:grid-cols-2 sm:p-5">
        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Invite member</h2>
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Role</Label>
            <select
              className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="ADMIN">Admin</option>
              <option value="HR_MANAGER">HR Manager</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>
          <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700" onClick={invite}>
            Send invite
          </Button>
          {inviteToken && (
            <p className="break-all rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Dev accept link: /orgs/accept-invite?token={inviteToken}
            </p>
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900">PDF retention</h2>
          <p className="text-xs text-slate-500">
            Generated PDFs older than this window are purged. Metadata is kept.
          </p>
          <select
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={retention}
            onChange={(e) => setRetention(Number(e.target.value) as 30 | 60 | 90)}
          >
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
          <Button className="rounded-xl border-slate-200" variant="outline" onClick={saveRetention}>
            Save retention
          </Button>
        </div>
      </div>
    </div>
  );
}
