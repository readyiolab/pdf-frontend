export const diagramKeys = {
  all: ["diagrams"] as const,
  lists: () => [...diagramKeys.all, "list"] as const,
  list: (orgId: string, folderId?: string | null) =>
    [...diagramKeys.lists(), orgId, folderId ?? "all"] as const,
  folders: (orgId: string) => [...diagramKeys.all, "folders", orgId] as const,
  details: () => [...diagramKeys.all, "detail"] as const,
  detail: (id: string) => [...diagramKeys.details(), id] as const,
  versions: (id: string) => [...diagramKeys.all, "versions", id] as const,
};
