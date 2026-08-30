import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  emptyDocument,
  upgradeDocument,
  type DiagramDocument,
} from "@/lib/diagram/model";
import { useCreateDiagram, useDiagram, withOrgRetry } from "@/features/diagrams";
import { diagramsApi } from "@/services/diagramsApi";
import { setOrgId } from "@/features/org";

/**
 * Loads / creates diagram document state for the editor.
 * Canvas remains imperative — this hook only owns server document metadata + local doc draft.
 */
export function useDiagramDocument(opts: {
  routeId: string | undefined;
  userId?: string | null;
}) {
  const { routeId, userId } = opts;
  const navigate = useNavigate();
  const isNew = !routeId || routeId === "new";

  const diagramQuery = useDiagram(isNew ? undefined : routeId, userId, !isNew);
  const createMutation = useCreateDiagram(userId);

  const [orgId, setLocalOrgId] = useState<string | null>(null);
  const [diagramId, setDiagramId] = useState<string | null>(isNew ? null : routeId!);
  const [title, setTitle] = useState("Untitled Diagram");
  const [doc, setDoc] = useState<DiagramDocument>(() => emptyDocument());
  const [activePageId, setActivePageId] = useState(() => emptyDocument().pages[0]!.id);
  const [dirty, setDirty] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [membershipHint, setMembershipHint] = useState(false);
  const [bootstrappingNew, setBootstrappingNew] = useState(isNew);
  const createdNewRef = useRef(false);

  // Hydrate from query when loading an existing diagram
  useEffect(() => {
    if (isNew || !diagramQuery.data) return;
    const { orgId: oid, diagram } = diagramQuery.data;
    setLocalOrgId(oid);
    setOrgId(oid, { userId });
    const content = upgradeDocument(diagram.content ?? emptyDocument());
    setDoc(content);
    setActivePageId(content.pages[0]!.id);
    setTitle(diagram.title);
    setDiagramId(diagram.id);
    setCurrentVersion(diagram.currentVersion ?? null);
    setDirty(false);
    setError(null);
    setMembershipHint(false);
  }, [diagramQuery.data, isNew, userId]);

  useEffect(() => {
    if (!diagramQuery.error) return;
    const msg =
      diagramQuery.error instanceof Error
        ? diagramQuery.error.message
        : "Failed to load diagram";
    setError(msg);
    if (/not a member of this organization|do not have access to this organization/i.test(msg)) setMembershipHint(true);
  }, [diagramQuery.error]);

  // Create on /diagrams/new
  useEffect(() => {
    if (!isNew || createdNewRef.current) return;
    createdNewRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        setBootstrappingNew(true);
        const { orgId: oid, diagram } = await createMutation.mutateAsync({
          title: "Untitled Diagram",
        });
        if (cancelled) return;
        setLocalOrgId(oid);
        setDiagramId(diagram.id);
        navigate(`/diagrams/${diagram.id}`, { replace: true });
        const content = upgradeDocument(diagram.content ?? emptyDocument());
        setDoc(content);
        setActivePageId(content.pages[0]!.id);
        setTitle(diagram.title);
        setCurrentVersion(diagram.currentVersion ?? null);
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Failed to create diagram";
        setError(msg);
        if (/not a member of this organization|do not have access to this organization/i.test(msg)) setMembershipHint(true);
      } finally {
        if (!cancelled) setBootstrappingNew(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, userId]);

  const retryLoad = useCallback(async () => {
    setError(null);
    setMembershipHint(false);
    if (isNew || !routeId) return;
    try {
      const { orgId: oid, result } = await withOrgRetry(userId, (id) =>
        diagramsApi.get(id, routeId)
      );
      setLocalOrgId(oid);
      setOrgId(oid, { userId });
      const content = upgradeDocument(result.diagram.content ?? emptyDocument());
      setDoc(content);
      setActivePageId(content.pages[0]!.id);
      setTitle(result.diagram.title);
      setDiagramId(result.diagram.id);
      setCurrentVersion(result.diagram.currentVersion ?? null);
      setDirty(false);
      await diagramQuery.refetch();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Retry failed";
      setError(msg);
      if (/not a member of this organization|do not have access to this organization/i.test(msg)) setMembershipHint(true);
    }
  }, [diagramQuery, isNew, routeId, userId]);

  const markDirty = useCallback(() => setDirty(true), []);

  const loading =
    bootstrappingNew ||
    (!isNew && diagramQuery.isLoading && !diagramQuery.data);

  return {
    orgId,
    setOrgId: setLocalOrgId,
    diagramId,
    setDiagramId,
    title,
    setTitle,
    doc,
    setDoc,
    activePageId,
    setActivePageId,
    dirty,
    setDirty,
    markDirty,
    currentVersion,
    setCurrentVersion,
    loading,
    error,
    setError,
    membershipHint,
    setMembershipHint,
    retryLoad,
    isNew,
    refetch: diagramQuery.refetch,
  };
}
