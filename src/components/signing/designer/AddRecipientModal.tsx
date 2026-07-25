import { useState, useEffect } from "react";
import { UserPlus, Zap, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { signingApi } from "@/services/signingApi";
import type { SignAuthMethod, SignRecipient } from "@/lib/signing/types";

/** Auth options shown in the UI. SMS_OTP is intentionally omitted until the backend supports it. */
const AUTH_OPTIONS: { value: Exclude<SignAuthMethod, "SMS_OTP">; label: string; hint: string }[] = [
  { value: "NONE", label: "No extra check", hint: "They open the link and sign." },
  { value: "EMAIL_OTP", label: "Email code", hint: "They enter a one-time code we email them." },
  { value: "ACCESS_CODE", label: "Access code", hint: "They enter a code you choose before signing." },
];

interface AddRecipientModalProps {
  isOpen: boolean;
  documentId: string;
  onClose: () => void;
  onSuccess: (recipient: SignRecipient) => void;
}

export function AddRecipientModal({
  isOpen,
  documentId,
  onClose,
  onSuccess,
}: AddRecipientModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<SignRecipient["role"]>("SIGNER");
  const [authMethod, setAuthMethod] = useState<Exclude<SignAuthMethod, "SMS_OTP">>("NONE");
  const [accessCode, setAccessCode] = useState("");

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    accessCode?: string;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setEmail("");
      setPhone("");
      setRole("SIGNER");
      setAuthMethod("NONE");
      setAccessCode("");
      setErrors({});
    }
  }, [isOpen]);

  /**
   * Auto-formats input as user types to include +91 prefix and format Indian 10-digit mobile number cleanly.
   */
  const handlePhoneChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, "");

    let nationalNumber = digitsOnly;
    if (digitsOnly.startsWith("91") && digitsOnly.length > 10) {
      nationalNumber = digitsOnly.slice(2);
    } else if (digitsOnly.startsWith("0") && digitsOnly.length > 10) {
      nationalNumber = digitsOnly.slice(1);
    }

    const trimmedNational = nationalNumber.slice(0, 10);

    if (trimmedNational.length > 0) {
      setPhone(`+91 ${trimmedNational}`);
    } else {
      setPhone("");
    }

    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: undefined }));
    }
  };

  /**
   * Helper to validate inputs and display inline errors.
   */
  const validate = () => {
    const newErrors: { name?: string; email?: string; phone?: string; accessCode?: string } = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!emailPattern.test(email.trim())) {
      newErrors.email = "Enter a valid email address (e.g. name@example.com)";
    }

    // Phone is optional (SMS OTP is not offered yet).
    if (phone.trim()) {
      const phoneDigits = phone.replace(/\D/g, "");
      const nationalDigits =
        phoneDigits.length === 12 && phoneDigits.startsWith("91")
          ? phoneDigits.slice(2)
          : phoneDigits;

      if (nationalDigits.length !== 10) {
        newErrors.phone = "Enter a valid 10-digit mobile number";
      } else if (!/^[6-9]/.test(nationalDigits)) {
        newErrors.phone = "Indian mobile numbers must start with 6, 7, 8, or 9";
      }
    }

    if (authMethod === "ACCESS_CODE" && !accessCode.trim()) {
      newErrors.accessCode = "Choose an access code for this person";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      let e164Phone: string | undefined;
      if (phone.trim()) {
        const phoneDigits = phone.replace(/\D/g, "");
        const nationalDigits =
          phoneDigits.length === 12 && phoneDigits.startsWith("91")
            ? phoneDigits.slice(2)
            : phoneDigits;
        e164Phone = `+91${nationalDigits}`;
      }

      const recipient = await signingApi.addRecipient(documentId, {
        name: name.trim(),
        email: email.trim(),
        phone: e164Phone,
        role,
        authMethod,
        ...(authMethod === "ACCESS_CODE" ? { accessCode: accessCode.trim() } : {}),
      });

      toast.success(`${recipient.name} added.`);
      onSuccess(recipient);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add this person.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Prefills form with example data (Alok Kumar) as specified in requirements.
   */
  const handlePrefillExample = () => {
    setName("Alok Kumar");
    setEmail("alokkum9467@gmail.com");
    setPhone("+91 9825251331");
    setErrors({});
    toast.info("Filled in example details");
  };

  const authHint = AUTH_OPTIONS.find((o) => o.value === authMethod)?.hint;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UserPlus className="size-5" />
              </div>
              <div>
                <DialogTitle>Add someone</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Who needs to sign, approve, or just receive a copy?
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Example Prefill Banner */}
        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
          <div className="flex items-center gap-1.5 text-primary font-medium">
            <Zap className="size-3.5 shrink-0" />
            <span>Try with an example</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={handlePrefillExample}
            className="h-6 text-[11px] border-primary/30 text-primary hover:bg-primary/10"
          >
            Fill Alok Kumar
          </Button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 py-1">
          {/* Name Field */}
          <div className="space-y-1">
            <Label htmlFor="modal-r-name" className="text-xs font-medium">
              Full name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="modal-r-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="e.g. Alok Kumar"
              className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.name && (
              <p className="flex items-center gap-1 text-[11px] text-destructive mt-1">
                <AlertCircle className="size-3 shrink-0" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-1">
            <Label htmlFor="modal-r-email" className="text-xs font-medium">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="modal-r-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="e.g. alokkum9467@gmail.com"
              className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.email && (
              <p className="flex items-center gap-1 text-[11px] text-destructive mt-1">
                <AlertCircle className="size-3 shrink-0" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone Field — optional while SMS OTP is unavailable */}
          <div className="space-y-1">
            <Label htmlFor="modal-r-phone" className="text-xs font-medium flex items-center justify-between">
              <span>Mobile (optional)</span>
              <span className="text-[10px] text-muted-foreground font-normal">India (+91)</span>
            </Label>
            <Input
              id="modal-r-phone"
              type="tel"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="+91 9825251331"
              className={errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.phone ? (
              <p className="flex items-center gap-1 text-[11px] text-destructive mt-1">
                <AlertCircle className="size-3 shrink-0" />
                {errors.phone}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground leading-tight">
                Optional for now — used later for phone delivery.
              </p>
            )}
          </div>

          {/* Role Select */}
          <div className="space-y-1">
            <Label htmlFor="modal-r-role" className="text-xs font-medium">
              What should they do?
            </Label>
            <Select value={role} onValueChange={(v) => setRole(v as SignRecipient["role"])}>
              <SelectTrigger id="modal-r-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SIGNER">Sign</SelectItem>
                <SelectItem value="APPROVER">Approve</SelectItem>
                <SelectItem value="VIEWER">View only</SelectItem>
                <SelectItem value="CC">Get a copy when done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Auth method — SMS_OTP hidden until backend supports it */}
          <div className="space-y-1">
            <Label htmlFor="modal-r-auth" className="text-xs font-medium">
              Extra check before signing
            </Label>
            <Select
              value={authMethod}
              onValueChange={(v) => setAuthMethod(v as Exclude<SignAuthMethod, "SMS_OTP">)}
            >
              <SelectTrigger id="modal-r-auth">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUTH_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {authHint && (
              <p className="text-[10px] text-muted-foreground leading-tight">{authHint}</p>
            )}
          </div>

          {authMethod === "ACCESS_CODE" && (
            <div className="space-y-1">
              <Label htmlFor="modal-r-code" className="text-xs font-medium">
                Access code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="modal-r-code"
                value={accessCode}
                onChange={(e) => {
                  setAccessCode(e.target.value);
                  if (errors.accessCode) setErrors((prev) => ({ ...prev, accessCode: undefined }));
                }}
                placeholder="e.g. share privately with them"
                className={errors.accessCode ? "border-destructive focus-visible:ring-destructive" : ""}
                autoComplete="off"
              />
              {errors.accessCode ? (
                <p className="flex items-center gap-1 text-[11px] text-destructive mt-1">
                  <AlertCircle className="size-3 shrink-0" />
                  {errors.accessCode}
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Tell them this code separately — it is not emailed with the link.
                </p>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
