import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSessionManager = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionValid, setIsSessionValid] = useState(true);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  const createSession = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;

      const response = await fetch("/api/auth/session/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setSessionId(result.sessionId);
        const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        setExpiresAt(newExpiry);
      }
    } catch (error) {
      console.error("Session creation failed:", error);
    }
  }, []);

  const validateSession = useCallback(async (id: string) => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;

      const response = await fetch("/api/auth/session/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ sessionId: id }),
      });

      const result = await response.json();
      if (!result.valid) {
        setIsSessionValid(false);
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error("Session validation failed:", error);
    }
  }, []);

  const terminateSession = useCallback(async (id: string) => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;

      await fetch("/api/auth/session/terminate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ sessionId: id }),
      });
    } catch (error) {
      console.error("Session termination failed:", error);
    }
  }, []);

  useEffect(() => {
    if (!sessionId) {
      createSession();
    }
  }, [sessionId, createSession]);

  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(() => {
      validateSession(sessionId);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [sessionId, validateSession]);

  return { sessionId, isSessionValid, expiresAt, terminateSession };
};
