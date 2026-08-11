/** Shared letter-org localStorage helper — prefer useLetterOrg / ensureOrg in new code. */
import { ensureOrg, getOrgId, setOrgId } from "@/features/org";

export function readLetterOrgId(): string {
  return getOrgId() || localStorage.getItem("letter_org_id") || "";
}

export async function ensureLetterOrgId(userId?: string | null): Promise<string> {
  return ensureOrg(userId);
}

export function writeLetterOrgId(
  id: string,
  opts?: { userId?: string | null; role?: string | null; orgName?: string | null }
) {
  setOrgId(id, opts);
}
