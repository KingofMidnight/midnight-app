import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TwoFactorSetup {
  secret: string;
  manualEntryKey: string;
  backupCodes: string[];
}

export const use2FA = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setup2FA = useCallback(async (email: string): Promise<TwoFactorSetup | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Setup failed";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const verify2FASetup = useCallback(async (token: string, secret: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/2fa/verify-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}`,
        },
        body: JSON.stringify({ token, secret }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const enable2FA = useCallback(async (token: string, backupCodes: string[]): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}`,
        },
        body: JSON.stringify({ token, backupCodes }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Enable failed";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const verify2FA = useCallback(async (token: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}`,
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const useBackupCode = useCallback(async (code: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/2fa/backup-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Backup code failed";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const disable2FA = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}`,
        },
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Disable failed";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    setup2FA,
    verify2FASetup,
    enable2FA,
    verify2FA,
    useBackupCode,
    disable2FA,
  };
};
