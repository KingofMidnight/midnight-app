import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api, type ModerationNotice } from "@/lib/api";

// The signed-in user's warnings and timeouts, plus acknowledge support.
export const useModerationNotices = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState<ModerationNotice[]>([]);
  const [timedOutUntil, setTimedOutUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setNotices([]);
      setTimedOutUntil(null);
      return;
    }
    setLoading(true);
    try {
      const data = await api.moderation.me();
      setNotices(data.actions);
      setTimedOutUntil(data.timedOutUntil);
    } catch {
      // Backend unreachable: don't block the page, just show nothing
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const acknowledge = useCallback(async (id: string) => {
    await api.moderation.acknowledge(id);
    setNotices((prev) => prev.map((n) => (n.id === id ? { ...n, acknowledged_at: new Date().toISOString() } : n)));
  }, []);

  const pending = notices.filter((n) => n.active && !n.acknowledged_at);

  return { notices, pending, timedOutUntil, loading, acknowledge, reload: load };
};
