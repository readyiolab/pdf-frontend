import { useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { publicSigningApi, SigningError } from "@/services/publicSigningApi";

interface AccessCodeModalProps {
  token: string;
  onVerified: (sessionToken: string, fileUrl: string) => void;
}

/** Plain-English gate when the sender set an access code. */
export function AccessCodeModal({ token, onVerified }: AccessCodeModalProps) {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 4) {
      toast.error("Enter the access code the sender shared with you.");
      return;
    }
    setIsVerifying(true);
    try {
      const result = await publicSigningApi.verifyAccessCode(token, code.trim());
      onVerified(result.sessionToken, result.fileUrl);
    } catch (err) {
      toast.error(err instanceof SigningError ? err.message : "That code didn't work.");
      setCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in-up rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
          <KeyRound className="size-6 text-primary" />
        </div>
        <h1 className="text-lg font-semibold">Enter the access code</h1>
        <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
          The person who sent this document shared a code with you. Enter it to open the PDF.
        </p>
        <form onSubmit={verify} className="mt-5 space-y-3 text-left">
          <Input
            autoFocus
            type="text"
            autoComplete="one-time-code"
            placeholder="Access code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={isVerifying}
          />
          <Button type="submit" className="w-full" disabled={isVerifying}>
            {isVerifying ? <Spinner className="size-4" /> : null}
            Open document
          </Button>
        </form>
      </div>
    </div>
  );
}
