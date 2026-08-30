import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/api";
import { diagramsApi } from "@/services/diagramsApi";
import { ensureOrg, setOrgId, clearOrgId, useOrgStore } from "@/features/org";
import { diagramKeys } from "./keys";

function isMembershipError(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 403) return false;
  return /not a member of this organization|do not have access to this organization/i.test(
    err.message
  );
}

/** Run an org-scoped call; on stale-org 403, clear + re-bootstrap and retry once. */
export async function withOrgRetry<T>(
  userId: string | null | undefined,
  run: (orgId: string) => Promise<T>
): Promise<{ orgId: string; result: T }> {
  let orgId = await ensureOrg(userId);
  try {
    return { orgId, result: await run(orgId) };
  } catch (err) {
    if (!isMembershipError(err)) throw err;
    clearOrgId();
    orgId = await ensureOrg(userId);
    return { orgId, result: await run(orgId) };
  }
}

export function useDiagramList(folderId?: string | null, userId?: string | null) {
  const orgId = useOrgStore((s) => s.getOrgIdForUser(userId));

  return useInfiniteQuery({
    queryKey: diagramKeys.list(orgId ?? "pending", folderId),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const { orgId: oid, result } = await withOrgRetry(userId, (id) =>
        Promise.all([
          diagramsApi.list(id, folderId, pageParam, 50),
          pageParam === 1
            ? diagramsApi.listFolders(id)
            : Promise.resolve({ folders: [] as Awaited<ReturnType<typeof diagramsApi.listFolders>>["folders"] }),
        ])
      );
      if (oid !== orgId) {
        setOrgId(oid, { userId });
      }
      return {
        orgId: oid,
        diagrams: result[0].diagrams,
        folders: result[1].folders,
        pagination: result[0].pagination,
      };
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });
}

export function useDiagram(id: string | undefined, userId?: string | null, enabled = true) {
  return useQuery({
    queryKey: diagramKeys.detail(id ?? "none"),
    enabled: Boolean(id && enabled && id !== "new"),
    queryFn: async () => {
      const { orgId, result } = await withOrgRetry(userId, (oid) =>
        diagramsApi.get(oid, id!)
      );
      setOrgId(orgId, { userId });
      return { orgId, diagram: result.diagram };
    },
  });
}

export function useCreateDiagram(userId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      title?: string;
      folderId?: string | null;
    }) => {
      const { orgId, result } = await withOrgRetry(userId, (id) =>
        diagramsApi.create(id, body)
      );
      setOrgId(orgId, { userId });
      return { orgId, diagram: result.diagram };
    },
    onSuccess: ({ orgId }) => {
      void qc.invalidateQueries({ queryKey: diagramKeys.lists() });
      void qc.invalidateQueries({ queryKey: diagramKeys.folders(orgId) });
    },
  });
}

export function useDeleteDiagram(userId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (diagramId: string) => {
      const { orgId, result } = await withOrgRetry(userId, (id) =>
        diagramsApi.remove(id, diagramId)
      );
      return { orgId, result, diagramId };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: diagramKeys.lists() });
    },
  });
}

export function useCreateFolder(userId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { orgId, result } = await withOrgRetry(userId, (id) =>
        diagramsApi.createFolder(id, name)
      );
      setOrgId(orgId, { userId });
      return { orgId, folder: result.folder };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: diagramKeys.lists() });
    },
  });
}

export function useSaveDiagram(userId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      content?: Parameters<typeof diagramsApi.update>[2]["content"];
    }) => {
      const { orgId, result } = await withOrgRetry(userId, (oid) =>
        diagramsApi.update(oid, input.id, {
          title: input.title,
          content: input.content,
        })
      );
      return { orgId, diagram: result.diagram };
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: diagramKeys.detail(vars.id) });
      void qc.invalidateQueries({ queryKey: diagramKeys.lists() });
    },
  });
}
