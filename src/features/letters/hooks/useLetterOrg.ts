import { useEffect } from "react";
import { ensureOrg, useOrgStore } from "@/features/org";

/**
 * Ensures the active org is bootstrapped for letter studio pages.
 * Replaces duplicated localStorage letter_org_id helpers.
 */
export function useLetterOrg(userId?: string | null) {
  const orgId = useOrgStore((s) => s.getOrgIdForUser(userId));
  const orgName = useOrgStore((s) => s.orgName);

  useEffect(() => {
    if (!orgId) {
      void ensureOrg(userId).catch(() => undefined);
    }
  }, [orgId, userId]);

  return {
    orgId: orgId ?? "",
    orgName,
    ensure: () => ensureOrg(userId),
  };
}
