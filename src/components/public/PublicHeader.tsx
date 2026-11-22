import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { MaskedLine } from "./Motion";

interface PublicHeaderProps {
  welcomeMessage: string;
  variant?: "links" | "guide";
}

export function PublicHeader({
  welcomeMessage,
  variant = "links",
}: PublicHeaderProps) {
  const fallbackMessage =
    "Seja muito bem-vindo! Aqui você encontra nossas informações e acessos rápidos para aproveitar sua estadia.";

  if (variant === "guide") {
    return (
      <header className="w-full bg-brand-scrim text-white">
        <div className="w-full max-w-lg mx-auto px-4 pt-4 pb-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-xl bg-white/10 hover:bg-white/16 border border-white/20 text-xs font-semibold text-white transition-colors shrink-0 focus-visible:outline-brand-green"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span>Voltar ao site</span>
            </Link>

            <div className="flex items-center gap-2 text-xs font-medium text-[#D8E1F0]">
              <span
                aria-hidden="true"
                className="w-6 h-0.5 bg-brand-green shrink-0"
              />
              <span>Guia do hóspede</span>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white p-1.5 flex items-center justify-center shrink-0">
              <img
                src="/logoMoradasdoGabriel.svg"
                alt="Logo Pousada Moradas do Gabriel"
                width={44}
                height={44}
                fetchPriority="high"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="min-w-0 flex-1">
              <MaskedLine>
                <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-[-0.025em] text-white leading-tight break-words">
                  Moradas do Gabriel
                </h1>
              </MaskedLine>
              <p className="mt-1 text-xs sm:text-sm text-[#D8E1F0] leading-snug break-words">
                {welcomeMessage || fallbackMessage}
              </p>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="pt-6 pb-5 text-center space-y-3">
      <div className="flex justify-center">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-xl bg-white border border-brand-navy/12 hover:bg-brand-surface text-xs font-semibold text-brand-navy transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
          <span>Conhecer o site da pousada</span>
        </Link>
      </div>

      <div className="mx-auto w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-white border border-brand-navy/10 p-2 shadow-xs flex items-center justify-center">
        <img
          src="/logoMoradasdoGabriel.svg"
          alt="Logo Pousada Moradas do Gabriel"
          width={120}
          height={120}
          fetchPriority="high"
          className="w-full h-full object-contain rounded-xl"
        />
      </div>

      <div className="flex items-center justify-center gap-2 text-xs font-medium text-brand-ink-muted">
        <span
          aria-hidden="true"
          className="w-6 h-0.5 bg-brand-green shrink-0"
        />
        <span>Central de links e contatos</span>
      </div>

      <MaskedLine>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-brand-navy break-words">
          Moradas do Gabriel
        </h1>
      </MaskedLine>

      <p className="text-sm text-brand-ink-secondary max-w-md mx-auto leading-relaxed break-words">
        {welcomeMessage || fallbackMessage}
      </p>
    </header>
  );
}
