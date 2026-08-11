/**
 * Feature module conventions (PDFPRODUCT)
 *
 * Ownership rules:
 * 1. Came from the network? → features/<domain>/queries.ts (TanStack Query)
 * 2. Needed on 2+ disconnected routes and client-only? → features/<domain>/*Store.ts (Zustand)
 * 3. Only one page/wizard/editor cares? → useState / feature hook under features/<domain>/hooks
 * 4. High-frequency / imperative engine (canvas, PDF, TipTap)? → refs + local state
 * 5. Navigation identity (?page=, :tool)? → React Router — do not duplicate into Zustand
 *
 * Layout:
 *   features/<domain>/
 *     keys.ts      — query key factories
 *     queries.ts   — useQuery / useMutation hooks
 *     *Store.ts    — Zustand (when shared client state is needed)
 *     hooks/       — feature logic extracted from pages
 *     api.ts       — optional re-exports of services/*
 *
 * Keep services/api.ts as the HTTP transport. Do not add new useEffect+useState
 * fetches in pages — go through features/*/queries.ts instead.
 */

export {};
