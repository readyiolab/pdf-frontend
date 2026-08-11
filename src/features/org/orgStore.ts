import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Legacy keys used across letters + diagrams before orgStore. */
export const LEGACY_ORG_KEY = "letter_org_id";
export const LEGACY_ORG_USER_KEY = "letter_org_user_id";

type OrgState = {
  orgId: string | null;
  role: string | null;
  orgName: string | null;
  /** User id that owns the stored org — prevents cross-account leak */
  userId: string | null;
  setOrg: (input: {
    orgId: string;
    role?: string | null;
    orgName?: string | null;
    userId?: string | null;
  }) => void;
  clearOrg: () => void;
  /** Read org only if it belongs to the given user (or no user scoping). */
  getOrgIdForUser: (userId?: string | null) => string | null;
};

function migrateFromLegacy(): Pick<OrgState, "orgId" | "userId"> {
  try {
    const orgId = localStorage.getItem(LEGACY_ORG_KEY);
    const userId = localStorage.getItem(LEGACY_ORG_USER_KEY);
    return {
      orgId: orgId || null,
      userId: userId || null,
    };
  } catch {
    return { orgId: null, userId: null };
  }
}

const legacy = migrateFromLegacy();

/**
 * Shared active organization for letters + diagrams.
 * Replaces scattered letter_org_id localStorage reads/writes.
 */
export const useOrgStore = create<OrgState>()(
  persist(
    (set, get) => ({
      orgId: legacy.orgId,
      role: null,
      orgName: null,
      userId: legacy.userId,
      setOrg: ({ orgId, role = null, orgName = null, userId = null }) => {
        // Keep legacy keys in sync for any remaining direct readers during migration
        try {
          localStorage.setItem(LEGACY_ORG_KEY, orgId);
          if (userId) localStorage.setItem(LEGACY_ORG_USER_KEY, userId);
        } catch {
          /* ignore */
        }
        set({
          orgId,
          role: role ?? null,
          orgName: orgName ?? get().orgName,
          userId: userId ?? get().userId,
        });
      },
      clearOrg: () => {
        try {
          localStorage.removeItem(LEGACY_ORG_KEY);
          localStorage.removeItem(LEGACY_ORG_USER_KEY);
        } catch {
          /* ignore */
        }
        set({ orgId: null, role: null, orgName: null, userId: null });
      },
      getOrgIdForUser: (userId) => {
        const { orgId, userId: storedUser } = get();
        if (!orgId) return null;
        if (userId && storedUser && storedUser !== userId) return null;
        return orgId;
      },
    }),
    {
      name: "letter_org_v2",
      partialize: (s) => ({
        orgId: s.orgId,
        role: s.role,
        orgName: s.orgName,
        userId: s.userId,
      }),
    }
  )
);

/** Imperative helpers for non-React modules (api services, auth). */
export function getOrgId(userId?: string | null): string | null {
  return useOrgStore.getState().getOrgIdForUser(userId);
}

export function setOrgId(
  id: string,
  opts?: { userId?: string | null; role?: string | null; orgName?: string | null }
) {
  useOrgStore.getState().setOrg({
    orgId: id,
    userId: opts?.userId,
    role: opts?.role,
    orgName: opts?.orgName,
  });
}

export function clearOrgId() {
  useOrgStore.getState().clearOrg();
}
