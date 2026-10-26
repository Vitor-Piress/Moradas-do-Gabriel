interface PublicHeaderProps {
  welcomeMessage: string;
}

export function PublicHeader({ welcomeMessage }: PublicHeaderProps) {
  return (
    <header className="pt-7 pb-5 text-center">
      {/* Container da Logo Oficial (fundo branco flat) */}
      <div className="mx-auto w-36 h-36 sm:w-44 sm:h-44 rounded-2xl bg-white border border-slate-200 p-2 shadow-xs flex items-center justify-center">
        <img
          src="/logoMoradasdoGabriel.svg"
          alt="Logo Pousada Moradas do Gabriel"
          className="w-full h-full object-contain rounded-xl"
        />
      </div>

      {/* Badge Editorial Sutil */}
      <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-brand-navy text-[11px] font-semibold uppercase tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-navy shrink-0" />
        <span>Central Digital do Hóspede</span>
      </div>

      {/* Título Principal */}
      <h1 className="mt-2.5 text-2xl sm:text-3xl font-bold tracking-tight text-brand-navy break-words">
        Moradas do Gabriel
      </h1>

      {/* Mensagem Receptiva */}
      <p className="mt-1.5 text-sm text-brand-navy/75 max-w-md mx-auto leading-relaxed break-words">
        {welcomeMessage ||
          "Seja muito bem-vindo! Aqui você encontra nossos links rápidos e o guia completo para aproveitar sua estadia."}
      </p>
    </header>
  );
}
