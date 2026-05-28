import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  expiresAt: string | null;
  disabled: boolean;
  expired: boolean;
  refreshExpiry: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  expiresAt: null,
  disabled: false,
  expired: false,
  refreshExpiry: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadAccount(uid: string) {
    const [{ data: role }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle(),
      supabase.from("profiles").select("expires_at, disabled").eq("id", uid).maybeSingle(),
    ]);
    setIsAdmin(!!role);
    setExpiresAt((profile?.expires_at as string | null) ?? null);
    setDisabled(!!profile?.disabled);
  }

  useEffect(() => {
    if (!session?.user) {
      setIsAdmin(false);
      setExpiresAt(null);
      setDisabled(false);
      return;
    }
    loadAccount(session.user.id);
  }, [session?.user?.id]);

  const expired = !isAdmin && (disabled || (!!expiresAt && new Date(expiresAt) < new Date()));

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        isAdmin,
        expiresAt,
        disabled,
        expired,
        refreshExpiry: async () => { if (session?.user) await loadAccount(session.user.id); },
        signOut: async () => { await supabase.auth.signOut(); },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
