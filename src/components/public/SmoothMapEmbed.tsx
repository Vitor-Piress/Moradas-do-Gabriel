import { MapPin } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface SmoothMapEmbedProps {
  src: string;
  title: string;
  containerClassName?: string;
  iframeClassName?: string;
  eager?: boolean;
  loadingLabel?: string;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function SmoothMapEmbed({
  src,
  title,
  containerClassName = "overflow-hidden rounded-2xl border border-brand-navy/10 bg-brand-surface h-72 sm:h-96",
  iframeClassName = "w-full h-full border-0",
  eager = false,
  loadingLabel = "Carregando mapa interativo...",
}: SmoothMapEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldMount, setShouldMount] = useState(
    () =>
      eager ||
      typeof window === "undefined" ||
      typeof IntersectionObserver === "undefined",
  );
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const isLoaded = Boolean(src) && loadedSrc === src;

  // Pré-monta o iframe 500px antes de entrar no viewport para reduzir atraso percebido
  useEffect(() => {
    if (shouldMount) return;
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldMount(true);
          observer.disconnect();
        }
      },
      { rootMargin: "500px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldMount]);

  // Garante liberação do placeholder caso o embed terceirizado atrase ou suprima onLoad
  useEffect(() => {
    if (!shouldMount || !src || isLoaded) return;
    const timer = window.setTimeout(() => {
      setLoadedSrc(src);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [shouldMount, src, isLoaded]);

  if (!src) return null;

  return (
    <div ref={containerRef} className={`relative ${containerClassName}`}>
      {shouldMount && (
        <m.iframe
          key={src}
          src={src}
          title={title}
          loading={eager ? "eager" : "lazy"}
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={() => setLoadedSrc(src)}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.48, ease: EASE_OUT_EXPO }}
          className={iframeClassName}
        />
      )}

      <AnimatePresence>
        {!isLoaded && (
          <m.div
            key="map-placeholder"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.36, ease: EASE_OUT_EXPO }}
            aria-hidden="true"
            className="absolute inset-0 z-10 pointer-events-none bg-brand-surface media-shimmer-light flex items-center justify-center p-4"
          >
            <div className="relative flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-brand-navy/10 shadow-xs">
              <div className="w-9 h-9 rounded-lg bg-brand-surface border border-brand-navy/10 text-brand-navy flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-semibold text-brand-navy truncate">
                  {loadingLabel}
                </p>
                <p className="text-[11px] font-medium text-brand-ink-muted">
                  Google Maps
                </p>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
