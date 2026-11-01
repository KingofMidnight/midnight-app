import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, ShieldOff, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Enrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

// Turn Supabase Auth TOTP two-factor authentication on or off for the signed-in user.
const TwoFactorSettings = () => {
  const { toast } = useToast();
  const { refreshMfa } = useAuth();
  const [verifiedFactorId, setVerifiedFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setVerifiedFactorId(data?.totp.find((f) => f.status === "verified")?.id ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const fail = (err: unknown) =>
    toast({ title: "Two-factor error", description: (err as Error).message, variant: "destructive" });

  const start = async () => {
    setBusy(true);
    try {
      // Clear any half-finished setup first (Supabase allows only one pending factor per name)
      const { data: existing } = await supabase.auth.mfa.listFactors();
      for (const f of existing?.all ?? []) {
        if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${Date.now()}` });
      if (error) throw error;
      setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
      setCode("");
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!enrollment) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollment.factorId, code });
      if (error) throw error;
      setEnrollment(null);
      await refreshMfa();
      await load();
      toast({ title: "Two-factor authentication is on", description: "You'll be asked for a code each time you sign in." });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (enrollment) await supabase.auth.mfa.unenroll({ factorId: enrollment.factorId });
    setEnrollment(null);
  };

  const disable = async () => {
    if (!verifiedFactorId || !window.confirm("Turn off two-factor authentication?")) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactorId });
      if (error) throw error;
      await supabase.auth.refreshSession();
      await refreshMfa();
      await load();
      toast({ title: "Two-factor authentication is off" });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  return (
    <div className="border border-border rounded-lg bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        {verifiedFactorId ? <ShieldCheck className="h-5 w-5 text-primary" /> : <ShieldOff className="h-5 w-5 text-muted-foreground" />}
        <h3 className="font-semibold">Two-factor authentication</h3>
        <span className={`text-xs ml-auto ${verifiedFactorId ? "text-primary" : "text-muted-foreground"}`}>
          {verifiedFactorId ? "On" : "Off"}
        </span>
      </div>

      {verifiedFactorId ? (
        <>
          <p className="text-sm text-muted-foreground">Signing in requires a code from your authenticator app.</p>
          <Button variant="outline" onClick={disable} disabled={busy}>Turn off</Button>
        </>
      ) : enrollment ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Scan this QR code with an authenticator app (Google Authenticator, Authy, 1Password…), then enter the 6-digit code it shows.
          </p>
          <img src={enrollment.qrCode} alt="Two-factor QR code" className="w-44 h-44 bg-white p-2 rounded" />
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Can't scan? Enter this key:</span>
            <code className="font-mono bg-secondary px-2 py-1 rounded break-all">{enrollment.secret}</code>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigator.clipboard.writeText(enrollment.secret)}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="max-w-40 text-center font-mono tracking-widest"
          />
          <div className="flex gap-2">
            <Button onClick={confirm} disabled={busy || code.length !== 6}>Turn on</Button>
            <Button variant="ghost" onClick={cancel} disabled={busy}>Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Protect your account with a code from an authenticator app in addition to your password.</p>
          <Button onClick={start} disabled={busy}>Set up two-factor authentication</Button>
        </>
      )}
    </div>
  );
};

export default TwoFactorSettings;
