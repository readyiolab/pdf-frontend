import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { toast } from "sonner";
import { signingApi, type FieldPayload } from "@/services/signingApi";
import { DEFAULT_FIELD_SIZE, SIGNING_LIMITS, type SignField, type SignFieldType } from "@/lib/signing/types";
import { FIELD_META } from "@/lib/signing/fieldMeta";

/** A field as the designer holds it — server-owned columns are not modelled here. */
export type DesignerField = FieldPayload;

const MAX_HISTORY = 50;
const AUTOSAVE_DELAY = 1200;

function toPayload(f: SignField): DesignerField {
  return {
    id: f.id,
    recipientId: f.recipientId,
    type: f.type,
    label: f.label,
    page: f.page,
    x: f.x,
    y: f.y,
    width: f.width,
    height: f.height,
    required: f.required,
    locked: f.locked,
    config: f.config ?? {},
  };
}

/** Clamps a field so it can never be positioned outside the page. */
function clampToPage(f: DesignerField): DesignerField {
  const width = Math.min(f.width, 1);
  const height = Math.min(f.height, 1);
  return {
    ...f,
    width,
    height,
    x: Math.min(Math.max(f.x, 0), 1 - width),
    y: Math.min(Math.max(f.y, 0), 1 - height),
  };
}

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

interface HistoryState {
  present: DesignerField[];
  past: DesignerField[][];
  future: DesignerField[][];
}

type HistoryAction =
  | { type: "hydrate"; fields: DesignerField[] }
  | { type: "apply"; updater: (current: DesignerField[]) => DesignerField[]; transient: boolean }
  | { type: "begin" }
  | { type: "undo" }
  | { type: "redo" };

/**
 * Undo/redo as a reducer.
 *
 * History lives in state rather than refs for two reasons that both caused real
 * bugs when it didn't:
 *   1. Derived flags (canUndo/canRedo) read during render must come from state,
 *      or the toolbar buttons keep a stale disabled state — `begin` pushes
 *      history without changing `present`, so a ref mutation would re-render
 *      nothing.
 *   2. Mutating a ref inside a setState updater is not pure. React 19 invokes
 *      updaters twice in StrictMode, which double-pushed every edit onto the
 *      undo stack and made Ctrl+Z need two presses.
 *
 * Snapshots, not a command/diff log: field sets are capped at 500 shallow
 * objects, and snapshots make correctness obvious where inverse operations are
 * easy to get subtly wrong.
 */
function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case "hydrate":
      return { present: action.fields, past: [], future: [] };

    case "apply": {
      const next = action.updater(state.present);
      // A no-op edit (e.g. one rejected by a limit) must not dirty the document
      // or land in history.
      if (next === state.present) return state;
      if (action.transient) return { ...state, present: next };
      return {
        present: next,
        past: [...state.past, state.present].slice(-MAX_HISTORY),
        future: [],
      };
    }

    // Snapshots the current state without changing it, so an entire drag
    // collapses into one undo step (the moves themselves are transient).
    case "begin":
      return { ...state, past: [...state.past, state.present].slice(-MAX_HISTORY), future: [] };

    case "undo": {
      if (!state.past.length) return state;
      return {
        present: state.past[state.past.length - 1],
        past: state.past.slice(0, -1),
        future: [state.present, ...state.future].slice(0, MAX_HISTORY),
      };
    }

    case "redo": {
      if (!state.future.length) return state;
      return {
        present: state.future[0],
        past: [...state.past, state.present].slice(-MAX_HISTORY),
        future: state.future.slice(1),
      };
    }
  }
}

/** Owns the designer's field set: edits, selection, undo/redo, and autosave. */
export function useFieldDesigner(documentId: string, initialFields: SignField[], canEdit: boolean) {
  const [history, dispatch] = useReducer(historyReducer, initialFields, (f) => ({
    present: f.map(toPayload),
    past: [],
    future: [],
  }));
  const fields = history.present;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards autosave from firing for the server's own state on open, which would
  // post the document's data straight back at it.
  const isHydrated = useRef(false);

  useEffect(() => {
    dispatch({ type: "hydrate", fields: initialFields.map(toPayload) });
    isHydrated.current = false;
  }, [initialFields]);

  // Any real change to the field set marks the document dirty, which arms the
  // autosave below. Derived from `fields` rather than set at each call site so a
  // rejected no-op edit can't falsely dirty it.
  useEffect(() => {
    if (!isHydrated.current) {
      isHydrated.current = true;
      return;
    }
    setSaveState("dirty");
  }, [fields]);

  const apply = useCallback(
    (updater: (current: DesignerField[]) => DesignerField[], transient = false) => {
      if (!canEdit) return;
      dispatch({ type: "apply", updater, transient });
    },
    [canEdit]
  );

  const beginTransaction = useCallback(() => {
    if (canEdit) dispatch({ type: "begin" });
  }, [canEdit]);

  const undo = useCallback(() => {
    if (canEdit) dispatch({ type: "undo" });
  }, [canEdit]);

  const redo = useCallback(() => {
    if (canEdit) dispatch({ type: "redo" });
  }, [canEdit]);

  const addField = useCallback(
    (type: SignFieldType, page: number, x: number, y: number, recipientId: string | null) => {
      const size = DEFAULT_FIELD_SIZE[type];
      const field = clampToPage({
        id: crypto.randomUUID(),
        recipientId,
        type,
        label: FIELD_META[type].label,
        page,
        // Drop centred on the cursor: the user aims at where the field should
        // sit, not at where its top-left corner lands.
        x: x - size.width / 2,
        y: y - size.height / 2,
        width: size.width,
        height: size.height,
        required: true,
        locked: false,
        config: {},
      });

      apply((current) => {
        if (current.length >= SIGNING_LIMITS.maxFieldsPerDocument) {
          toast.error(`A document can hold at most ${SIGNING_LIMITS.maxFieldsPerDocument} fields.`);
          return current;
        }
        return [...current, field];
      });
      setSelectedIds([field.id]);
      return field.id;
    },
    [apply]
  );

  const updateField = useCallback(
    (id: string, patch: Partial<DesignerField>, transient = false) => {
      apply((current) => {
        const index = current.findIndex((f) => f.id === id);
        if (index === -1 || current[index].locked) return current;
        const next = [...current];
        next[index] = clampToPage({ ...current[index], ...patch });
        return next;
      }, transient);
    },
    [apply]
  );

  /** Moves every selected field by the same delta (drag a multi-selection). */
  const moveSelection = useCallback(
    (dx: number, dy: number, transient = false) => {
      apply((current) => {
        // A pure commit (dx/dy of 0 on pointerup) must not produce a new array,
        // or it would register as another change and re-dirty the document.
        if (dx === 0 && dy === 0) return current;
        return current.map((f) =>
          selectedIds.includes(f.id) && !f.locked ? clampToPage({ ...f, x: f.x + dx, y: f.y + dy }) : f
        );
      }, transient);
    },
    [apply, selectedIds]
  );

  const deleteSelection = useCallback(() => {
    apply((current) => {
      const removable = new Set(current.filter((f) => selectedIds.includes(f.id) && !f.locked).map((f) => f.id));
      if (!removable.size) return current;
      return current.filter((f) => !removable.has(f.id));
    });
    setSelectedIds([]);
  }, [apply, selectedIds]);

  const duplicateSelection = useCallback(() => {
    const newIds: string[] = [];
    apply((current) => {
      const originals = current.filter((f) => selectedIds.includes(f.id));
      if (!originals.length) return current;
      if (current.length + originals.length > SIGNING_LIMITS.maxFieldsPerDocument) {
        toast.error(`A document can hold at most ${SIGNING_LIMITS.maxFieldsPerDocument} fields.`);
        return current;
      }
      const copies = originals.map((f) => {
        const copy = clampToPage({
          ...f,
          id: crypto.randomUUID(),
          // Offset so the duplicate is visibly distinct rather than hidden
          // exactly beneath the original.
          x: f.x + 0.02,
          y: f.y + 0.02,
          locked: false,
        });
        newIds.push(copy.id);
        return copy;
      });
      return [...current, ...copies];
    });
    setSelectedIds(newIds);
  }, [apply, selectedIds]);

  const toggleLock = useCallback(() => {
    apply((current) => {
      if (!current.some((f) => selectedIds.includes(f.id))) return current;
      // Mixed selection resolves to "lock all" — the safer of the two.
      const shouldLock = current.some((f) => selectedIds.includes(f.id) && !f.locked);
      return current.map((f) => (selectedIds.includes(f.id) ? { ...f, locked: shouldLock } : f));
    });
  }, [apply, selectedIds]);

  /** Detaches fields from a recipient who has been removed. */
  const clearRecipient = useCallback(
    (recipientId: string) => {
      apply((current) =>
        current.some((f) => f.recipientId === recipientId)
          ? current.map((f) => (f.recipientId === recipientId ? { ...f, recipientId: null } : f))
          : current
      );
    },
    [apply]
  );

  const save = useCallback(async () => {
    if (!canEdit) return;
    setSaveState("saving");
    try {
      await signingApi.saveFields(documentId, fields);
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      toast.error(err instanceof Error ? err.message : "Couldn't save your changes.");
    }
  }, [documentId, fields, canEdit]);

  // Debounced autosave. The timer resets on every edit, so a burst of drags
  // becomes one request once the user pauses rather than one per frame.
  useEffect(() => {
    if (saveState !== "dirty" || !canEdit) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(save, AUTOSAVE_DELAY);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [saveState, save, canEdit]);

  // Last line of defence against losing placement work to a stray tab close.
  // Saving here is not an option — async work is killed mid-flight during
  // unload — so the native prompt is all we can reliably do.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveState === "dirty" || saveState === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveState]);

  const selectedFields = useMemo(
    () => fields.filter((f) => selectedIds.includes(f.id)),
    [fields, selectedIds]
  );

  const fieldsByPage = useMemo(() => {
    const map = new Map<number, DesignerField[]>();
    for (const f of fields) {
      const list = map.get(f.page);
      if (list) list.push(f);
      else map.set(f.page, [f]);
    }
    return map;
  }, [fields]);

  const pagesWithFields = useMemo(() => new Set(fieldsByPage.keys()), [fieldsByPage]);

  return {
    fields,
    fieldsByPage,
    pagesWithFields,
    selectedIds,
    selectedFields,
    setSelectedIds,
    saveState,
    // Derived from state, so the toolbar's disabled state is always accurate.
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    addField,
    updateField,
    moveSelection,
    deleteSelection,
    duplicateSelection,
    toggleLock,
    clearRecipient,
    beginTransaction,
    undo,
    redo,
    save,
  };
}
