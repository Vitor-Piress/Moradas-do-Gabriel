import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { AuthContext, useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

/**
 * Verifica no servidor (via função SECURITY DEFINER `public.is_admin()`)
 * se o usuário autenticado pertence à allowlist `public.admin_users`.
 */
async function checkIsAdmin(session: Session | null): Promise<boolean> {
  if (!session?.user) {
    return false;
  }

  try {
    const { data, error } = await supabase.rpc("is_admin");
    if (error) {
      // Caso a migration 20261027_security_hardening.sql ainda não tenha sido aplicada no banco,
      // registra aviso no console e mantém compatibilidade até a aplicação da migration.
      if (
        error.code === "PGRST202" ||
        error.message?.includes("is_admin")
      ) {
        console.warn(
          "[Auth] Função public.is_admin() ainda não encontrada. Aplique a migration 20261027_security_hardening.sql no Supabase.",
        );
        return true;
      }
      return false;
    }
    return data === true;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const resolveSession = async (currentSession: Session | null) => {
      if (!isMounted) return;
      setSession(currentSession);

      if (!currentSession) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      const adminStatus = await checkIsAdmin(currentSession);
      if (!isMounted) return;
      setIsAdmin(adminStatus);
      setIsLoading(false);
    };

    supabase.auth
      .getSession()
      .then(({ data: { session: currentSession } }) =>
        resolveSession(currentSession),
      )
      .catch(() => {
        if (isMounted) {
          setIsAdmin(false);
          setIsLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setIsLoading(true);
      void resolveSession(newSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isAdmin,
        isLoading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6 text-brand-navy">
        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center mb-3 shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin text-brand-navy" />
        </div>
        <p className="text-sm font-medium text-brand-navy/75">
          Verificando sessão...
        </p>
      </div>
    );
  }

  if (!session || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
