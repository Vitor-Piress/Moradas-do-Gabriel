import { m } from "motion/react";
import { useState, type ReactNode } from "react";
import { isImagePreloaded, markImagePreloaded } from "../../utils/imagePreload";

interface SmoothImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  theme?: "light" | "dark";
  targetOpacity?: number;
  priority?: boolean;
  fallback?: ReactNode;
  onClick?: () => void;
  onReady?: () => void;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function SmoothImage({
  src,
  alt,
  className = "w-full h-full object-cover",
  containerClassName = "relative w-full h-full overflow-hidden",
  theme = "light",
  targetOpacity = 1,
  priority = false,
  fallback = null,
  onClick,
  onReady,
}: SmoothImageProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(() =>
    src && isImagePreloaded(src) ? src : null,
  );
  const [erroredSrc, setErroredSrc] = useState<string | null>(null);

  const alreadyPreloaded = Boolean(src) && isImagePreloaded(src);
  const isLoaded = Boolean(src) && (loadedSrc === src || alreadyPreloaded);
  const hasError = Boolean(src) && erroredSrc === src;

  const handleImgRef = (node: HTMLImageElement | null) => {
    if (node && node.complete && node.naturalWidth > 0 && src && !isLoaded) {
      markImagePreloaded(src);
      queueMicrotask(() => {
        setLoadedSrc((prev) => (prev === src ? prev : src));
        onReady?.();
      });
    }
  };

  if (!src || hasError) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <div
      className={`${containerClassName} ${
        theme === "dark" ? "bg-brand-scrim" : "bg-brand-surface"
      }`}
    >
      {!isLoaded && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 pointer-events-none ${
            theme === "dark" ? "media-shimmer-dark" : "media-shimmer-light"
          }`}
        />
      )}

      <m.img
        ref={handleImgRef}
        key={src}
        src={src}
        alt={alt}
        onClick={onClick}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        onLoad={() => {
          markImagePreloaded(src);
          setLoadedSrc(src);
          onReady?.();
        }}
        onError={() => {
          setErroredSrc(src);
          onReady?.();
        }}
        initial={
          alreadyPreloaded
            ? { opacity: targetOpacity, scale: 1 }
            : { opacity: 0, scale: 1.018 }
        }
        animate={
          isLoaded
            ? { opacity: targetOpacity, scale: 1 }
            : { opacity: 0, scale: 1.018 }
        }
        transition={{
          duration: alreadyPreloaded ? 0.16 : 0.48,
          ease: EASE_OUT_EXPO,
        }}
        className={className}
      />
    </div>
  );
}
