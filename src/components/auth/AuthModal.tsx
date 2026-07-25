import React, { useState } from "react";
import { X } from "lucide-react";
import { AuthForm } from "./AuthForm";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = "login",
  onSuccess,
}) => {
  const [mode, setMode] = useState<"login" | "register">(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-50 w-full max-w-md max-h-[min(92dvh,720px)] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <AuthForm
          mode={mode}
          onSwitchMode={setMode}
          onSuccess={() => {
            onClose();
            onSuccess?.();
          }}
          isModal
        />
      </div>
    </div>
  );
};
