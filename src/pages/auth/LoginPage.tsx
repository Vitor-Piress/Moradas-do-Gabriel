import {
  AlertCircle,
  ArrowLeft,
  KeyRound,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoMoradas from "../../assets/logoMoradasdoGabriel.png";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";

const LOGIN_LOCKOUT_STORAGE_KEY = "moradas_gabriel_login_lockout";
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 segundos de bloqueio após 5 falhas seguidas

function getLockoutRemainingSeconds(): number {
  try {
    const raw = sessionStorage.getItem(LOGIN_LOCKOUT_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { count?: number; until?: number };
    if (!parsed.until || Date.now() >= parsed.until) {
      return 0;
    }
    return Math.ceil((parsed.until - Date.now()) / 1000);
  } catch {
    return 0;
  }
}

function registerFailedAttempt(): number {
  try {
    const raw = sessionStorage.getItem(LOGIN_LOCKOUT_STORAGE_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as { count?: number; until?: number })
      : {};
    const nextCount = (parsed.count ?? 0) + 1;
    const until =
      nextCount >= MAX_FAILED_ATTEMPTS ? Date.now() + LOCKOUT_DURATION_MS : 0;
    sessionStorage.setItem(
      LOGIN_LOCKOUT_STORAGE_KEY,
      JSON.stringify({ count: until ? 0 : nextCount, until }),
    );
    return until ? Math.ceil(LOCKOUT_DURATION_MS / 1000) : 0;
  } catch {
    return 0;
  }
}

function clearFailedAttempts(): void {
  try {
    sessionStorage.removeItem(LOGIN_LOCKOUT_STORAGE_KEY);
  } catch {
    // Ignora caso sessionStorage esteja indisponível
  }
}

export function LoginPage() {
  const navigate = useNavigate();
  const { session, isAdmin, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && session && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [isLoading, session, isAdmin, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const remainingLockout = getLockoutRemainingSeconds();
    if (remainingLockout > 0) {
      setErrorMessage(
        `Muitas tentativas seguidas. Aguarde ${remainingLockout}s antes de tentar novamente.`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        const waitSecs = registerFailedAttempt();
        if (waitSecs > 0) {
          setErrorMessage(
            `Muitas tentativas incorretas. Aguarde ${waitSecs} segundos antes de tentar novamente.`,
          );
        } else {
          // Mensagem padronizada para não expor detalhes internos ou enumeração de contas
          setErrorMessage(
            "E-mail ou senha incorretos. Verifique suas credenciais.",
          );
        }
        return;
      }

      // Verifica se o usuário autenticado possui permissão de administrador (allowlist)
      const { data: adminCheck, error: rpcError } =
        await supabase.rpc("is_admin");
      const isMissingRpc =
        rpcError &&
        (rpcError.code === "PGRST202" ||
          rpcError.message?.includes("is_admin"));

      if (!isMissingRpc && adminCheck !== true) {
        await supabase.auth.signOut();
        setErrorMessage(
          "Esta conta não possui permissão de administrador para acessar o painel.",
        );
        return;
      }

      clearFailedAttempts();
      navigate("/admin", { replace: true });
    } catch {
      setErrorMessage(
        "Não foi possível conectar ao servidor. Tente novamente em instantes.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-navy flex flex-col justify-center items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-brand-navy/75 hover:text-brand-navy transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Voltar para a Central do Hóspede</span>
          </Link>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="text-center mb-6">
            <div className="mx-auto w-24 h-24 rounded-2xl bg-white border border-slate-200 p-2 flex items-center justify-center">
              <img
                src={logoMoradas}
                alt="Logo Pousada Moradas do Gabriel"
                className="w-full h-full object-contain"
              />
            </div>

            <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-bg border border-slate-200 text-brand-navy text-[11px] font-semibold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Acesso Restrito</span>
            </span>

            <h1 className="mt-2.5 text-xl sm:text-2xl font-bold text-brand-navy break-words">
              Painel Administrativo
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-brand-navy/70 break-words">
              Gerencie os links, o Guia do Hóspede e as métricas da Pousada
              Moradas do Gabriel.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 rounded-xl bg-brand-bg border border-slate-200 p-3.5 flex items-start gap-2.5 text-xs sm:text-sm text-brand-navy font-medium">
              <AlertCircle className="w-4 h-4 text-brand-navy shrink-0 mt-0.5" />
              <span className="min-w-0 flex-1 break-words">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1.5"
              >
                E-mail
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-brand-bg border border-slate-200 focus-within:border-brand-navy transition-colors">
                <Mail className="w-4 h-4 text-brand-navy/50 shrink-0" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@moradasdogabriel.com.br"
                  className="w-full min-w-0 bg-transparent text-sm text-brand-navy placeholder:text-brand-navy/40 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1.5"
              >
                Senha
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-brand-bg border border-slate-200 focus-within:border-brand-navy transition-colors">
                <KeyRound className="w-4 h-4 text-brand-navy/50 shrink-0" />
                <input
                  id="admin-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-w-0 bg-transparent text-sm text-brand-navy placeholder:text-brand-navy/40 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-brand-navy hover:bg-brand-navy-light text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <span>Entrar no Painel</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
