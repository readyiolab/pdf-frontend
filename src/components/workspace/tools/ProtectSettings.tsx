import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Shield } from "lucide-react";

interface ProtectSettingsProps {
  userPassword: string;
  ownerPassword: string;
  onUserPasswordChange: (pwd: string) => void;
  onOwnerPasswordChange: (pwd: string) => void;
  disabled?: boolean;
}

export const ProtectSettings: React.FC<ProtectSettingsProps> = ({
  userPassword,
  ownerPassword,
  onUserPasswordChange,
  onOwnerPasswordChange,
  disabled = false,
}) => {
  const [showUser, setShowUser] = useState(false);
  const [showOwner, setShowOwner] = useState(false);

  const getStrength = (pwd: string): { label: string; color: string; width: string } => {
    if (!pwd) return { label: "", color: "", width: "0%" };
    if (pwd.length < 4) return { label: "Weak", color: "bg-destructive", width: "25%" };
    if (pwd.length < 8) return { label: "Fair", color: "bg-amber-500", width: "50%" };
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && pwd.length >= 8) return { label: "Strong", color: "bg-emerald-500", width: "100%" };
    return { label: "Good", color: "bg-blue-500", width: "75%" };
  };

  const userStrength = getStrength(userPassword);

  return (
    <div className="space-y-5">
      {/* Info card */}
      <div className="rounded-xl border bg-muted/50 p-3.5 flex items-start gap-3">
        <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <div className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">User Password</span> prevents opening the PDF.{" "}
          <span className="font-semibold text-foreground">Owner Password</span> restricts editing and printing permissions.
        </div>
      </div>

      {/* User password */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Lock className="h-3 w-3" />
          User Password (Open)
        </Label>
        <div className="relative">
          <Input
            type={showUser ? "text" : "password"}
            value={userPassword}
            onChange={(e) => onUserPasswordChange(e.target.value)}
            placeholder="Required to open the PDF"
            disabled={disabled}
            className="h-9 text-sm pr-10"
          />
          <button
            type="button"
            onClick={() => setShowUser(!showUser)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            {showUser ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        {/* Password strength */}
        {userPassword && (
          <div className="space-y-1">
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${userStrength.color}`}
                style={{ width: userStrength.width }}
              />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">{userStrength.label}</span>
          </div>
        )}
      </div>

      {/* Owner password */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Shield className="h-3 w-3" />
          Owner Password (Permissions)
        </Label>
        <div className="relative">
          <Input
            type={showOwner ? "text" : "password"}
            value={ownerPassword}
            onChange={(e) => onOwnerPasswordChange(e.target.value)}
            placeholder="Optional — restricts editing"
            disabled={disabled}
            className="h-9 text-sm pr-10"
          />
          <button
            type="button"
            onClick={() => setShowOwner(!showOwner)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            {showOwner ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
