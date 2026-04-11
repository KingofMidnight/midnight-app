import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isCreator: boolean;
  isBanned: boolean;
  banReason: string | null;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);

  const checkRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) {
      setIsAdmin(false);
      setIsCreator(false);
      return;
    }

    const roles = data?.map((r) => r.role) || [];
    setIsAdmin(roles.includes("admin"));
    setIsCreator(roles.includes("creator" as any) || roles.includes("admin"));
  };

  const checkBan = async (userId: string): Promise<{ banned: boolean; reason: string | null }> => {
    const { data, error } = await supabase
      .from("user_bans")
      .select("id, reason, expires_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1);

    if (error || !data || data.length === 0) {
      setIsBanned(false);
      setBanReason(null);
      return { banned: false, reason: null };
    }

    const ban = data[0];
    if (ban.expires_at && new Date(ban.expires_at) < new Date()) {
      setIsBanned(false);
      setBanReason(null);
      return { banned: false, reason: null };
    }

    setIsBanned(true);
    setBanReason(ban.reason);
    return { banned: true, reason: ban.reason };
  };

  const processSession = async (session: Session | null) => {
    if (!session?.user) {
      setIsAdmin(false);
      setIsCreator(false);
      setIsBanned(false);
      setBanReason(null);
      return;
    }

    try {
      const banStatus = await checkBan(session.user.id);
      if (banStatus.banned) {
        await supabase.auth.signOut();
        return;
      }
      await checkRoles(session.user.id);
    } catch {
      setIsAdmin(false);
      setIsCreator(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
      setTimeout(() => {
        processSession(nextSession);
      }, 0);
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
      processSession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { username, display_name: username },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };

    if (data.user) {
      const banStatus = await checkBan(data.user.id);
      if (banStatus.banned) {
        await supabase.auth.signOut();
        return { error: { message: `Your account has been banned. Reason: ${banStatus.reason || "Violation of terms."}` } };
      }
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isCreator, isBanned, banReason, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

