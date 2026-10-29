import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api";

export const useSessionManager = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionValid, setIsSessionValid] = useState(true);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  const createSession = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;

      const result = await api.sessions.create();
      setSessionId(result.sessionId);
      const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      setExpiresAt(newExpiry);
    } catch (error) {
      console.error("Session creation failed:", error);
    }
  }, []);

  const validateSession = useCallback(async (id: string) => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;

      const result = await api.sessions.validate(id);
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

      await api.sessions.terminate(id);
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
