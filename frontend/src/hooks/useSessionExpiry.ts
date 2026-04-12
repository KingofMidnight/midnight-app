import { useEffect, useState } from "react";
import { useSessionManager } from "./useSessionManager";

export const useSessionExpiry = () => {
  const { isSessionValid, expiresAt } = useSessionManager();
  const [warningShown, setWarningShown] = useState(false);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const expires = new Date(expiresAt).getTime();
      const remaining = Math.max(0, expires - now);

      setExpiresIn(remaining);

      if (remaining < 5 * 60 * 1000 && !warningShown) {
        setWarningShown(true);
      }

      if (remaining === 0) {
        window.location.href = "/auth";
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, warningShown]);

  const formatTimeRemaining = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  return {
    isValid: isSessionValid,
    expiresIn,
    formatTimeRemaining,
    showWarning: warningShown && expiresIn !== null && expiresIn < 5 * 60 * 1000,
  };
};
