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

/**
 * Incorpora iframes do Google Maps com:
 * 1) Pré-montagem antecipada (`rootMargin: 500px`) antes de o visitante chegar à seção;
 * 2) Placeholder cartográfico refinado com shimmer enquanto tiles/scripts carregam;
 * 3) Crossfade suave no `onLoad` (com teto de segurança de 4,5s para não travar em redes restritas).
 */
export function SmoothMapEmbed({
  src,
  title,
  containerClassName = "overflow-hidden rounded-2xl border border-slate-200 bg-brand-bg h-72 sm:h-96",
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

  // Fallback de segurança caso o provedor terceirizado atrase ou suprima onLoad
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
          initial={{ opacity: 0, scale: 1.01 }}
          animate={{
            opacity: isLoaded ? 1 : 0,
            scale: isLoaded ? 1 : 1.01,
          }}
          transition={{ duration: 0.62, ease: EASE_OUT_EXPO }}
          className={iframeClassName}
        />
      )}

      {/* Placeholder Cartográfico Sutil enquanto o Google Maps carrega */}
      <AnimatePresence>
        {!isLoaded && (
          <m.div
            key="map-placeholder"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.42, ease: EASE_OUT_EXPO }}
            aria-hidden="true"
            className="absolute inset-0 z-10 pointer-events-none bg-[#F3F5F8] media-shimmer-light flex items-center justify-center p-4"
          >
            {/* Malha cartográfica sutil em SVG */}
            <svg
              className="absolute inset-0 w-full h-full opacity-45 text-brand-navy/10"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id="map-grid-pattern"
                  width="56"
                  height="56"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 56 0 L 0 0 0 56"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                  <path
                    d="M 0 28 L 56 28 M 28 0 L 28 56"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    strokeDasharray="3 3"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#map-grid-pattern)" />
            </svg>

            {/* Selo central elegante */}
            <div className="relative flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/95 backdrop-blur-xs border border-slate-200 shadow-xs">
              <div className="relative w-9 h-9 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center shrink-0">
                <m.span
                  animate={{ scale: [1, 1.35, 1], opacity: [0.45, 0, 0.45] }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 rounded-xl bg-brand-aqua/60"
                />
                <MapPin className="relative w-4 h-4" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold text-brand-navy truncate">
                  {loadingLabel}
                </p>
                <p className="text-[10px] font-medium text-brand-navy/60">
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
