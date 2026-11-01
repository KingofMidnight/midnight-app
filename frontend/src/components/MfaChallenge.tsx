import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Shown site-wide whenever the signed-in user has 2FA on but hasn't entered a
// code this session. Until they do, the database and API refuse all changes.
const MfaChallenge = () => {
  const { user, mfaRequired, refreshMfa, signOut } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user || !mfaRequired) return null;

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data: factors, error: listErr } = await supabase.auth.mfa.listFactors();
      if (listErr) throw listErr;
      const factor = factors.totp.find((f) => f.status === "verified");
      if (!factor) throw new Error("No authenticator found on this account.");
      const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
      if (verifyErr) throw verifyErr;
      setCode("");
      await refreshMfa();
    } catch (err) {
      setError((err as Error).message || "Invalid code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-sm [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Two-factor verification
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => { e.preventDefault(); if (code.length === 6) verify(); }}
        >
          <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app to finish signing in.</p>
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="text-center text-2xl font-mono tracking-widest"
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
            {busy ? "Verifying..." : "Verify"}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => signOut()}>
            Sign out instead
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MfaChallenge;
