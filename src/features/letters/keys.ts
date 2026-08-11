export const letterKeys = {
  all: ["letters"] as const,
  brands: (orgId: string) => [...letterKeys.all, "brands", orgId] as const,
  templates: (orgId: string) => [...letterKeys.all, "templates", orgId] as const,
  template: (orgId: string, id: string) =>
    [...letterKeys.all, "template", orgId, id] as const,
  batches: (orgId: string) => [...letterKeys.all, "batches", orgId] as const,
  batch: (orgId: string, id: string) => [...letterKeys.all, "batch", orgId, id] as const,
};
