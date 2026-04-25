import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'administrativo';

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  reloadRoles: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [bootstrapTried, setBootstrapTried] = useState(false);

  const loadRoles = async (uid: string | undefined) => {
    if (!uid) { setRoles([]); return; }
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', uid);
    setRoles((data ?? []).map(r => r.role as AppRole));
  };

  useEffect(() => {
    // Suscripción primero
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      // Diferir consultas para evitar deadlocks
      setTimeout(() => loadRoles(sess?.user?.id), 0);
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      loadRoles(sess?.user?.id).finally(() => setLoading(false));

      // Bootstrap del admin si no hay sesión activa (idempotente, una sola vez por carga)
      if (!sess && !bootstrapTried) {
        setBootstrapTried(true);
        supabase.functions.invoke('bootstrap-admin').catch(() => {/* silencioso */});
      }
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  const reloadRoles = async () => loadRoles(user?.id);

  return (
    <Ctx.Provider value={{
      user, session, roles, isAdmin: roles.includes('admin'),
      loading, signIn, signOut, reloadRoles,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
