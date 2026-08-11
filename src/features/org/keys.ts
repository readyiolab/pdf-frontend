export const orgKeys = {
  all: ["org"] as const,
  list: () => [...orgKeys.all, "list"] as const,
  bootstrap: () => [...orgKeys.all, "bootstrap"] as const,
};
