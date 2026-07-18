import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { publicSigningApi, SigningError } from "@/services/publicSigningApi";

interface OtpModalProps {
  token: string;
  /** Masked destination, e.g. a***@example.com. */
  onVerified: (sessionToken: string, fileUrl: string) => void;
}

const RESEND_COOLDOWN = 45;

/**
 * Identity challenge shown before the document is readable.
 *
 * Not dismissable, and rendered instead of the document rather than over it:
 * the API withholds the file URL until verification passes, so there is nothing
 * behind this to look at. A closable overlay would imply otherwise.
 */
export function OtpModal({ token, onVerified }: OtpModalProps) {
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const send = async () => {
    setIsSending(true);
    try {
      const result = await publicSigningApi.requestOtp(token);
      setSentTo(result.sentTo);
      setCooldown(RESEND_COOLDOWN);
      toast.success(`Code sent to ${result.sentTo}`);
    } catch (err) {
      toast.error(err instanceof SigningError ? err.message : "Couldn't send the code.");
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const verify = async (value: string) => {
    setIsVerifying(true);
    try {
      const result = await publicSigningApi.verifyOtp(token, value);
      onVerified(result.sessionToken, result.fileUrl);
    } catch (err) {
      // Clear on failure so the next attempt starts from an empty box rather
      // than the signer having to select-all and retype.
      setCode("");
      toast.error(err instanceof SigningError ? err.message : "Verification failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in-up rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
          <ShieldCheck className="size-6 text-primary" />
        </div>

        <h1 className="text-lg font-semibold">Verify it's you</h1>
        <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
          {sentTo
            ? `We sent a 6-digit code to ${sentTo}. Enter it below to open the document.`
            : "For your security, we need to verify your identity before you can view this document."}
        </p>

        {sentTo ? (
          <div className="mt-5 space-y-4">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(v) => {
                  setCode(v);
                  // Auto-submit on the sixth digit — nobody wants to hunt for a
                  // button after typing a code they just read off their phone.
                  if (v.length === 6) verify(v);
                }}
                disabled={isVerifying}
                aria-label="6-digit verification code"
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {isVerifying && (
              <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Spinner className="size-3" />
                Verifying…
              </p>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={send}
              disabled={cooldown > 0 || isSending}
              className="w-full"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't get it? Resend"}
            </Button>
          </div>
        ) : (
          <Button onClick={send} disabled={isSending} className="mt-5 w-full">
            {isSending ? <Spinner className="size-4" /> : <ShieldCheck />}
            Send me a code
          </Button>
        )}

        <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
          Never share this code. Anyone with it and your link can sign on your behalf.
        </p>
      </div>
    </div>
  );
}
