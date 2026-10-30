import { useState, useCallback } from "react";
import { api } from "@/lib/api";

interface TwoFactorSetup {
  secret: string;
  manualEntryKey: string;
  backupCodes: string[];
  otpauthUrl: string;
}

export const use2FA = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(fn: () => Promise<T>, fallback: string): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const setup2FA = useCallback(
    async (): Promise<TwoFactorSetup | null> => {
      const res = await run(() => api.twoFactor.setup(), "Setup failed");
      return res && {
        secret: res.secret,
        manualEntryKey: res.manualEntryKey,
        backupCodes: res.backupCodes,
        otpauthUrl: res.otpauthUrl,
      };
    },
    [run]
  );

  const verify2FASetup = useCallback(
    async (token: string) => (await run(() => api.twoFactor.verifySetup(token), "Verification failed")) !== null,
    [run]
  );

  const enable2FA = useCallback(
    async (token: string) => (await run(() => api.twoFactor.enable(token), "Enable failed")) !== null,
    [run]
  );

  const verify2FA = useCallback(
    async (token: string) => (await run(() => api.twoFactor.verify(token), "Verification failed")) !== null,
    [run]
  );

  const useBackupCode = useCallback(
    async (code: string) => (await run(() => api.twoFactor.useBackupCode(code), "Backup code failed")) !== null,
    [run]
  );

  const disable2FA = useCallback(
    async (tokenOrBackupCode: string) => {
      const proof = /^\d{6}$/.test(tokenOrBackupCode) ? { token: tokenOrBackupCode } : { code: tokenOrBackupCode };
      return (await run(() => api.twoFactor.disable(proof), "Disable failed")) !== null;
    },
    [run]
  );

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
