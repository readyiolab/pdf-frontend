import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function KeyboardShortcutsDialog({ open, onClose }: Props) {
  const shortcuts = [
    "Ctrl+S — Save",
    "Ctrl+/ — AI panel",
    "F5 — Present mode",
    "Ctrl+Z / Ctrl+Shift+Z — Undo / Redo",
    "Ctrl+C / X / V / D — Copy / Cut / Paste / Duplicate",
    "Delete — Remove selection",
    "Arrow keys — Nudge selection (Shift for 10px)",
    "V — Select · H — Pan · Space+drag — Temporary pan",
    "R — Rectangle · L — Connector · P — Pen",
    "Ctrl+wheel — Zoom",
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <ul className="space-y-1.5 text-sm text-[#475569]">
          {shortcuts.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
