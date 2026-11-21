import { AnimatePresence, m } from "motion/react";

interface BrandLoaderProps {
  show: boolean;
  message?: string;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function BrandLoader({
  show,
  message = "Preparando sua estadia...",
}: BrandLoaderProps) {
  return (
    <AnimatePresence>
      {show && (
        <m.div
          key="brand-loader-curtain"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.015 }}
          transition={{ duration: 0.38, ease: EASE_OUT_EXPO }}
          role="status"
          aria-live="polite"
          aria-label={message}
          className="fixed inset-0 z-[120] bg-brand-bg flex flex-col items-center justify-center px-6"
        >
          <div className="relative flex flex-col items-center text-center">
            {/* Halo sutil com a paleta solar/costeira */}
            <div
              aria-hidden="true"
              className="absolute -inset-8 rounded-full bg-brand-aqua/35 blur-2xl pointer-events-none"
            />

            <m.div
              initial={{ opacity: 0, scale: 0.94, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
              className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white border border-slate-200 p-2.5 shadow-sm flex items-center justify-center"
            >
              <img
                src="/logoMoradasdoGabriel.svg"
                alt="Logo Pousada Moradas do Gabriel"
                fetchPriority="high"
                loading="eager"
                decoding="sync"
                className="w-full h-full object-contain"
              />
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08, ease: EASE_OUT_EXPO }}
              className="relative mt-5 space-y-1.5"
            >
              <p className="text-sm sm:text-base font-bold tracking-tight text-brand-navy">
                Pousada Moradas do Gabriel
              </p>
              <p className="text-xs font-medium text-brand-navy/60">
                {message}
              </p>
            </m.div>

            {/* Barra de progresso fina e moderna */}
            <div
              aria-hidden="true"
              className="relative mt-5 w-40 h-1 rounded-full bg-brand-navy/10 overflow-hidden"
            >
              <m.div
                initial={{ x: "-100%" }}
                animate={{ x: ["-100%", "140%"] }}
                transition={{
                  duration: 1.15,
                  repeat: Infinity,
                  ease: [0.45, 0, 0.55, 1],
                }}
                className="w-2/3 h-full rounded-full bg-gradient-to-r from-brand-navy/40 via-brand-navy to-brand-navy/40"
              />
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
