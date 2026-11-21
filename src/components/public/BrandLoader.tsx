import { AnimatePresence, m } from "motion/react";

interface BrandLoaderProps {
  show: boolean;
  message?: string;
}

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function BrandLoader({
  show,
  message = "Carregando informações da pousada...",
}: BrandLoaderProps) {
  return (
    <AnimatePresence>
      {show && (
        <m.div
          key="brand-loader-curtain"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.34, ease: EASE_OUT }}
          role="status"
          aria-live="polite"
          aria-label={message}
          className="fixed inset-0 z-[120] bg-brand-bg flex flex-col items-center justify-center px-6"
        >
          <div className="flex flex-col items-center text-center">
            <m.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, ease: EASE_OUT }}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border border-brand-navy/10 p-2.5 flex items-center justify-center"
            >
              <img
                src="/logoMoradasdoGabriel.svg"
                alt="Logo Pousada Moradas do Gabriel"
                width={92}
                height={92}
                fetchPriority="high"
                loading="eager"
                decoding="sync"
                className="w-full h-full object-contain"
              />
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: 0.06, ease: EASE_OUT }}
              className="mt-5 space-y-1.5"
            >
              <p className="font-display text-lg sm:text-xl font-medium tracking-tight text-brand-navy">
                Pousada Moradas do Gabriel
              </p>
              <p className="text-xs font-medium text-brand-ink-muted">
                {message}
              </p>
            </m.div>

            <div
              aria-hidden="true"
              className="mt-5 w-40 h-0.5 bg-brand-navy/12 overflow-hidden"
            >
              <m.div
                initial={{ x: "-100%" }}
                animate={{ x: ["-100%", "140%"] }}
                transition={{
                  duration: 1.15,
                  repeat: Infinity,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="w-1/2 h-full bg-brand-navy"
              />
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
