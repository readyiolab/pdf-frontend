import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { lettersApi } from "@/services/lettersApi";
import { orgKeys } from "./keys";
import { clearOrgId, setOrgId, useOrgStore } from "./orgStore";

export type BootstrapResult = Awaited<ReturnType<typeof lettersApi.bootstrap>>;

/**
 * Ensure an active org exists: use store if valid for user, otherwise bootstrap.
 * Syncs Zustand orgStore on success.
 */
export async function ensureOrg(userId?: string | null): Promise<string> {
  const existing = useOrgStore.getState().getOrgIdForUser(userId);
  if (existing) return existing;
  const boot = await lettersApi.bootstrap();
  const oid = boot.org.organization.id as string;
  setOrgId(oid, {
    userId,
    role: boot.org.role,
    orgName: boot.org.organization.name,
  });
  return oid;
}

export function useBootstrapOrg(userId?: string | null, enabled = true) {
  return useQuery({
    queryKey: [...orgKeys.bootstrap(), userId ?? "anon"],
    enabled,
    queryFn: async () => {
      const boot = await lettersApi.bootstrap();
      setOrgId(boot.org.organization.id as string, {
        userId,
        role: boot.org.role,
        orgName: boot.org.organization.name,
      });
      return boot;
    },
    staleTime: 60_000,
  });
}

export function useOrgs(enabled = true) {
  return useQuery({
    queryKey: orgKeys.list(),
    enabled,
    queryFn: () => lettersApi.listOrgs(),
  });
}

export function useEnsureOrg(userId?: string | null, enabled = true) {
  return useQuery({
    queryKey: [...orgKeys.all, "ensure", userId ?? "anon"],
    enabled,
    queryFn: () => ensureOrg(userId),
    staleTime: 60_000,
  });
}

export function useClearOrgOnLogout() {
  const qc = useQueryClient();
  return () => {
    clearOrgId();
    void qc.removeQueries({ queryKey: orgKeys.all });
  };
}

export function useSelectOrgMutation(userId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { orgId: string; role?: string; orgName?: string }) => {
      setOrgId(input.orgId, {
        userId,
        role: input.role,
        orgName: input.orgName,
      });
      return input;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: orgKeys.all });
    },
  });
}
