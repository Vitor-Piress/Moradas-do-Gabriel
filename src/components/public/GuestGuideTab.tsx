import {
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Map as MapIcon,
  MapPin,
  Maximize2,
  ShoppingBag,
  Umbrella,
  Utensils,
  X,
} from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import type {
  BusinessInfoMetadata,
  PlaceTip,
  WifiNetwork,
} from "../../@types/database.types";
import { trackGuideInteraction } from "../../services";
import { extractEmbedUrl } from "../../utils/embedUrl";
import { WazeIcon } from "../../utils/iconMapper";
import { isImagePreloaded, preloadImageUrl } from "../../utils/imagePreload";
import { MaskedLine, Reveal } from "./Motion";
import { SmoothImage } from "./SmoothImage";
import { SmoothMapEmbed } from "./SmoothMapEmbed";

interface GuestGuideTabProps {
  metadata: BusinessInfoMetadata;
  focusedSection?: string | null;
}

function SectionSpotlight({ active }: { active: boolean }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {active && (
        <m.div
          aria-hidden="true"
          initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: 0.55, ease: EASE_OUT_EXPO },
          }}
          transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
          className="pointer-events-none absolute -inset-x-2.5 sm:-inset-x-3.5 -inset-y-3.5 rounded-3xl bg-[#CDDF8E]/22 border border-[#9EB850]/55 -z-10"
        />
      )}
    </AnimatePresence>
  );
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const ORDERED_CATEGORIES = [
  "Gastronomia",
  "Praias",
  "Passeios",
  "Mercados",
] as const;

const QUICK_NAV_ITEMS = [
  { id: "como-chegar", label: "Rota" },
  { id: "guia-wifi", label: "Wi-Fi" },
  { id: "guia-regras", label: "Regras" },
  { id: "guia-dicas", label: "Dicas" },
] as const;

type QuickNavId = (typeof QUICK_NAV_ITEMS)[number]["id"];

const SLIDE_VARIANTS = {
  enter: (dir: number) => ({
    x: dir >= 0 ? "18%" : "-18%",
    scale: 1.04,
    opacity: 0,
    zIndex: 2,
  }),
  center: {
    x: "0%",
    scale: 1,
    opacity: 1,
    zIndex: 2,
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? "-12%" : "12%",
    scale: 0.96,
    opacity: 0,
    zIndex: 1,
  }),
};

function formatChapterNumber(n: number): string {
  return String(n).padStart(2, "0");
}

function CategoryBadgeIcon({
  category,
  className = "w-3.5 h-3.5 shrink-0",
}: {
  category: string;
  className?: string;
}) {
  const normalized = category.toLowerCase();
  if (
    normalized.includes("gastronomia") ||
    normalized.includes("restaurante")
  ) {
    return <Utensils className={className} />;
  }
  if (normalized.includes("praia")) {
    return <Umbrella className={className} />;
  }
  if (normalized.includes("passeio")) {
    return <Compass className={className} />;
  }
  if (normalized.includes("mercado") || normalized.includes("conveniência")) {
    return <ShoppingBag className={className} />;
  }
  return <MapPin className={className} />;
}

function getPlaceCtaLabel(link: string): string {
  const lower = link.toLowerCase();
  if (
    lower.includes("maps.app") ||
    lower.includes("google.com/maps") ||
    lower.includes("goo.gl/maps")
  ) {
    return "Abrir no Google Maps";
  }
  if (lower.includes("waze.com")) {
    return "Navegar com Waze";
  }
  if (lower.includes("instagram.com")) {
    return "Ver no Instagram";
  }
  return "Conhecer local";
}

function copyTextSafe(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  return Promise.resolve();
}

interface PlacePhotoCarouselProps {
  placeName: string;
  category: string;
  images: string[];
  activeIndex: number;
  direction: number;
  onStep: (delta: number) => void;
  onOpenLightbox: (startIndex: number) => void;
}

function PlacePhotoCarousel({
  placeName,
  category,
  images,
  activeIndex,
  direction,
  onStep,
  onOpenLightbox,
}: PlacePhotoCarouselProps) {
  const prefersReducedMotion = useReducedMotion();
  const safeIndex = images.length > 0 ? activeIndex % images.length : 0;
  const currentSrc = images[safeIndex] ?? "";
  const canSlide = images.length > 1;
  const isAlreadyPreloaded = Boolean(currentSrc) && isImagePreloaded(currentSrc);

  return (
    <div className="relative w-full h-full bg-brand-surface overflow-hidden select-none">
      <AnimatePresence initial={false} custom={direction}>
        <m.div
          key={`${currentSrc}-${safeIndex}`}
          custom={direction}
          variants={prefersReducedMotion ? undefined : SLIDE_VARIANTS}
          initial={prefersReducedMotion ? { opacity: 0 } : "enter"}
          animate={prefersReducedMotion ? { opacity: 1 } : "center"}
          exit={prefersReducedMotion ? { opacity: 0 } : "exit"}
          transition={{
            x: { duration: 0.44, ease: EASE_OUT_EXPO },
            scale: { duration: 0.44, ease: EASE_OUT_EXPO },
            opacity: { duration: 0.3, ease: EASE_OUT_EXPO },
          }}
          drag={canSlide && !prefersReducedMotion ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={(_, info) => {
            if (info.offset.x < -42 || info.velocity.x < -300) {
              onStep(1);
            } else if (info.offset.x > 42 || info.velocity.x > 300) {
              onStep(-1);
            }
          }}
          onTap={() => onOpenLightbox(safeIndex)}
          className="absolute inset-0 cursor-zoom-in touch-pan-y"
        >
          <SmoothImage
            src={currentSrc}
            alt={`${placeName} - Foto ${safeIndex + 1}`}
            priority={isAlreadyPreloaded || safeIndex === 0}
            containerClassName="relative w-full h-full overflow-hidden pointer-events-none"
            className="w-full h-full object-cover"
          />
        </m.div>
      </AnimatePresence>

      {/* Badge discreto da categoria no mesmo estilo dos cards de Acomodações */}
      <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/95 border border-brand-navy/10 text-brand-navy text-xs font-semibold pointer-events-none">
        <CategoryBadgeIcon category={category} />
        <span>{category}</span>
      </span>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenLightbox(safeIndex);
        }}
        aria-label={`Ampliar fotos de ${placeName}`}
        className="absolute top-3 right-3 z-10 w-11 h-11 rounded-xl bg-[#071B42]/75 hover:bg-[#071B42]/92 border border-white/20 text-white flex items-center justify-center transition-colors"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      {canSlide && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStep(-1);
            }}
            aria-label={`Foto anterior de ${placeName}`}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-xl bg-[#071B42]/70 hover:bg-[#071B42]/92 border border-white/15 text-white flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStep(1);
            }}
            aria-label={`Próxima foto de ${placeName}`}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-xl bg-[#071B42]/70 hover:bg-[#071B42]/92 border border-white/15 text-white flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Indicador de progresso em pílula fluida + contagem discreta */}
          <div
            aria-hidden="true"
            className="absolute bottom-0 inset-x-0 z-10 h-14 bg-gradient-to-t from-[#071B42]/72 via-[#071B42]/24 to-transparent pointer-events-none flex items-end justify-between px-3 pb-2.5"
          >
            <div className="flex items-center gap-1.5">
              {images.map((_, dotIdx) => (
                <span
                  key={dotIdx}
                  className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${
                    dotIdx === safeIndex
                      ? "w-5 bg-white"
                      : "w-1.5 bg-white/55"
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] font-semibold tabular-nums text-white">
              {formatChapterNumber(safeIndex + 1)} /{" "}
              {formatChapterNumber(images.length)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export function GuestGuideTab({
  metadata,
  focusedSection = null,
}: GuestGuideTabProps) {
  const prefersReducedMotion = useReducedMotion();
  const isClickScrollingRef = useRef(false);
  const clickScrollTimerRef = useRef<number | null>(null);

  const [activeNavId, setActiveNavId] = useState<QuickNavId>("como-chegar");
  const [addressCopied, setAddressCopied] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<string, boolean>
  >({});

  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [placeCarousels, setPlaceCarousels] = useState<
    Record<string, { index: number; direction: number }>
  >({});
  const [placeMediaModes, setPlaceMediaModes] = useState<
    Record<string, "photos" | "map">
  >({});

  const [lightboxState, setLightboxState] = useState<{
    placeName: string;
    category: string;
    images: string[];
    activeIndex: number;
    direction: number;
  } | null>(null);

  const { location, rules, places_tips } = metadata;

  const wifiNetworks: WifiNetwork[] = useMemo(() => {
    if (
      Array.isArray(metadata.wifi_networks) &&
      metadata.wifi_networks.length > 0
    ) {
      return metadata.wifi_networks;
    }
    if (metadata.wifi && (metadata.wifi.ssid || metadata.wifi.password)) {
      return [
        {
          id: "wifi-legacy-1",
          label: "",
          ssid: metadata.wifi.ssid,
          password: metadata.wifi.password,
        },
      ];
    }
    return [];
  }, [metadata.wifi_networks, metadata.wifi]);

  const cleanEmbedUrl = extractEmbedUrl(location.embed_url || "");

  // Pré-carrega fotos da Curadoria em segundo plano para trocas e swipes instantâneos
  const allCuradoriaImageUrls = useMemo(() => {
    const urls = new Set<string>();
    places_tips.forEach((place) => {
      if (place.image_url?.trim()) urls.add(place.image_url.trim());
      if (Array.isArray(place.images)) {
        place.images.forEach((img) => {
          if (img?.trim()) urls.add(img.trim());
        });
      }
    });
    return Array.from(urls);
  }, [places_tips]);

  useEffect(() => {
    if (allCuradoriaImageUrls.length === 0) return;
    const timer = window.setTimeout(() => {
      allCuradoriaImageUrls.forEach((url) => {
        void preloadImageUrl(url);
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [allCuradoriaImageUrls]);

  // Scroll-spy determinístico: sem saltos por abas intermediárias durante clique
  useEffect(() => {
    let rafId = 0;

    const updateActiveSection = () => {
      rafId = 0;
      if (isClickScrollingRef.current) return;

      if (window.scrollY < 40) {
        setActiveNavId("como-chegar");
        return;
      }

      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 24;
      if (atBottom) {
        setActiveNavId("guia-dicas");
        return;
      }

      let current: QuickNavId = "como-chegar";
      for (const item of QUICK_NAV_ITEMS) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= 116) {
          current = item.id;
        }
      }
      setActiveNavId(current);
    };

    const scheduleUpdate = () => {
      if (rafId !== 0) return;
      rafId = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });

    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      if (clickScrollTimerRef.current !== null) {
        window.clearTimeout(clickScrollTimerRef.current);
      }
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  useEffect(() => {
    if (!lightboxState) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxState(null);
      } else if (e.key === "ArrowLeft" && lightboxState.images.length > 1) {
        setLightboxState((prev) =>
          prev
            ? {
                ...prev,
                direction: -1,
                activeIndex:
                  (prev.activeIndex - 1 + prev.images.length) %
                  prev.images.length,
              }
            : null,
        );
      } else if (e.key === "ArrowRight" && lightboxState.images.length > 1) {
        setLightboxState((prev) =>
          prev
            ? {
                ...prev,
                direction: 1,
                activeIndex: (prev.activeIndex + 1) % prev.images.length,
              }
            : null,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxState]);

  const categoriesWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    places_tips.forEach((place) => {
      const cat = place.category?.trim();
      if (!cat) return;
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    });

    const orderedPresent = ORDERED_CATEGORIES.filter((cat) =>
      Array.from(counts.keys()).some(
        (key) => key.toLowerCase() === cat.toLowerCase(),
      ),
    );
    const extraCategories = Array.from(counts.keys()).filter(
      (cat) =>
        !ORDERED_CATEGORIES.some(
          (ordered) => ordered.toLowerCase() === cat.toLowerCase(),
        ),
    );

    const categoryNames = Array.from(
      new Set(["Todos", ...orderedPresent, ...extraCategories]),
    );

    return categoryNames.map((name) => ({
      name,
      count:
        name === "Todos"
          ? places_tips.length
          : places_tips.filter(
              (p) => p.category?.trim().toLowerCase() === name.toLowerCase(),
            ).length,
    }));
  }, [places_tips]);

  const activeCategory = categoriesWithCounts.some(
    (c) => c.name === selectedCategory,
  )
    ? selectedCategory
    : "Todos";

  const filteredPlaces: PlaceTip[] = useMemo(() => {
    if (activeCategory === "Todos") return places_tips;
    return places_tips.filter(
      (p) =>
        p.category?.trim().toLowerCase() === activeCategory.toLowerCase(),
    );
  }, [activeCategory, places_tips]);

  const handleQuickNavClick = (
    e: MouseEvent<HTMLAnchorElement>,
    id: QuickNavId,
  ) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;

    isClickScrollingRef.current = true;
    if (clickScrollTimerRef.current !== null) {
      window.clearTimeout(clickScrollTimerRef.current);
    }
    clickScrollTimerRef.current = window.setTimeout(
      () => {
        isClickScrollingRef.current = false;
        clickScrollTimerRef.current = null;
      },
      prefersReducedMotion ? 100 : 850,
    );
    setActiveNavId(id);

    const top = Math.max(
      0,
      target.getBoundingClientRect().top + window.scrollY - 68,
    );
    window.scrollTo({
      top,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  const handleOpenLightbox = (
    placeName: string,
    category: string,
    images: string[],
    startIndex: number,
  ) => {
    setLightboxState({
      placeName,
      category,
      images,
      activeIndex: startIndex,
      direction: 1,
    });
    trackGuideInteraction(`maximize_place_photos:${placeName}`);
  };

  const handleStepPlaceImage = (
    placeKey: string,
    totalImages: number,
    delta: number,
  ) => {
    setPlaceCarousels((prev) => {
      const current = prev[placeKey]?.index ?? 0;
      const next = (current + delta + totalImages) % totalImages;
      return { ...prev, [placeKey]: { index: next, direction: delta } };
    });
  };

  const togglePasswordVisibility = (cardKey: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey],
    }));
  };

  const handleCopyAddress = async () => {
    if (!location.address) return;
    try {
      await copyTextSafe(location.address);
    } catch {
      return;
    }
    setAddressCopied(true);
    trackGuideInteraction("copy_address");
    window.setTimeout(() => setAddressCopied(false), 2400);
  };

  const handleCopyWifi = async (network: WifiNetwork, cardKey: string) => {
    if (!network.password) return;
    try {
      await copyTextSafe(network.password);
    } catch {
      return;
    }

    setCopiedKey(cardKey);
    trackGuideInteraction("copy_wifi_" + network.ssid);

    window.setTimeout(() => {
      setCopiedKey((current) => (current === cardKey ? null : current));
    }, 2500);
  };

  const handleOpenMaps = () => {
    trackGuideInteraction("open_maps");
  };

  const handleOpenWaze = () => {
    trackGuideInteraction("open_waze");
  };

  const handleOpenPlaceTip = (placeName: string) => {
    trackGuideInteraction(`place_tip:${placeName}`);
  };

  return (
    <div>
      {/* Navbar Sticky de borda a borda com 4 abas fixas e linha deslizante */}
      <nav
        aria-label="Navegação rápida do guia"
        className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-brand-navy/10"
      >
        <div className="w-full max-w-lg mx-auto grid grid-cols-4 px-2">
          {QUICK_NAV_ITEMS.map((item) => {
            const isActive = activeNavId === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => handleQuickNavClick(e, item.id)}
                aria-current={isActive ? "true" : undefined}
                className={`relative min-h-12 px-1 flex items-center justify-center text-xs sm:text-sm font-semibold transition-colors ${
                  isActive
                    ? "text-brand-navy"
                    : "text-brand-ink-muted hover:text-brand-navy"
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <m.span
                    layoutId="guide-tab-underline"
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 34,
                    }}
                    aria-hidden="true"
                    className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-brand-navy pointer-events-none"
                  />
                )}
              </a>
            );
          })}
        </div>
      </nav>

      {/* Conteúdo principal com padrão visual único entre todas as seções */}
      <div className="w-full max-w-lg mx-auto px-4 pt-6 pb-8 space-y-9">
        {/* ===================================================================
            01 · COMO CHEGAR E MAPAS (MAPA SEMPRE VISÍVEL)
        =================================================================== */}
        <Reveal direction="up">
          <section
            id="como-chegar"
            aria-labelledby="como-chegar-heading"
            className="relative isolate scroll-mt-[78px] space-y-3.5"
          >
            <SectionSpotlight active={focusedSection === "como-chegar"} />
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-brand-ink-muted">
                <span
                  aria-hidden="true"
                  className="w-6 h-0.5 bg-brand-green shrink-0"
                />
                <span className="tabular-nums font-semibold text-brand-navy">
                  01
                </span>
                <span aria-hidden="true" className="text-brand-navy/30">
                  ·
                </span>
                <span>Localização e rotas</span>
              </div>
              <h2
                id="como-chegar-heading"
                className="font-display text-xl sm:text-2xl font-semibold text-brand-navy tracking-[-0.02em] leading-tight"
              >
                Como chegar
              </h2>
            </div>

            <div className="rounded-2xl bg-white border border-brand-navy/10 overflow-hidden shadow-xs divide-y divide-brand-navy/8">
              {cleanEmbedUrl && (
                <SmoothMapEmbed
                  eager
                  src={cleanEmbedUrl}
                  title="Mapa de localização da Pousada Moradas do Gabriel"
                  containerClassName="overflow-hidden bg-brand-surface h-56 sm:h-60"
                  loadingLabel="Carregando mapa da pousada..."
                />
              )}

              {location.address && (
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-brand-ink-muted">
                      Endereço da pousada
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-brand-navy leading-snug break-words">
                      {location.address}
                    </p>
                  </div>

                  <m.button
                    type="button"
                    onClick={handleCopyAddress}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
                    aria-label={
                      addressCopied
                        ? "Endereço copiado"
                        : "Copiar endereço da pousada"
                    }
                    className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-colors shrink-0 ${
                      addressCopied
                        ? "bg-brand-green border-brand-navy/20 text-brand-navy"
                        : "bg-brand-bg border-brand-navy/12 hover:bg-brand-surface text-brand-navy"
                    }`}
                  >
                    {addressCopied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </m.button>
                </div>
              )}

              {location.instructions && (
                <div className="p-4">
                  <p className="text-xs font-medium text-brand-ink-muted">
                    Orientações de chegada
                  </p>
                  <p className="mt-1 text-sm text-brand-ink-secondary leading-relaxed whitespace-pre-line break-words">
                    {location.instructions}
                  </p>
                </div>
              )}

              <div className="p-4 grid grid-cols-2 gap-2.5">
                <m.a
                  href={location.maps_url || "https://maps.google.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleOpenMaps}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                  className="inline-flex items-center justify-center gap-2 min-h-11 px-3 rounded-xl bg-brand-navy hover:bg-brand-navy-light text-white font-semibold text-xs sm:text-sm transition-colors text-center"
                >
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>Google Maps</span>
                </m.a>

                <m.a
                  href={location.waze_url || "https://waze.com/ul"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleOpenWaze}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                  className="inline-flex items-center justify-center gap-2 min-h-11 px-3 rounded-xl bg-brand-bg hover:bg-brand-surface text-brand-navy border border-brand-navy/15 font-semibold text-xs sm:text-sm transition-colors text-center"
                >
                  <WazeIcon className="w-4 h-4 text-brand-navy shrink-0" />
                  <span>Ir com Waze</span>
                </m.a>
              </div>
            </div>
          </section>
        </Reveal>

        {/* ===================================================================
            02 · WI-FI PARA HÓSPEDES
        =================================================================== */}
        <Reveal direction="up">
          <section
            id="guia-wifi"
            aria-labelledby="guia-wifi-heading"
            className="relative isolate scroll-mt-[78px] space-y-3.5"
          >
            <SectionSpotlight active={focusedSection === "guia-wifi"} />
            <div className="flex items-end justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium text-brand-ink-muted">
                  <span
                    aria-hidden="true"
                    className="w-6 h-0.5 bg-brand-green shrink-0"
                  />
                  <span className="tabular-nums font-semibold text-brand-navy">
                    02
                  </span>
                  <span aria-hidden="true" className="text-brand-navy/30">
                    ·
                  </span>
                  <span>Internet da pousada</span>
                </div>
                <h2
                  id="guia-wifi-heading"
                  className="font-display text-xl sm:text-2xl font-semibold text-brand-navy tracking-[-0.02em] leading-tight"
                >
                  Wi-Fi para hóspedes
                </h2>
              </div>

              <span className="text-xs font-semibold tabular-nums text-brand-ink-muted pb-0.5 shrink-0">
                {wifiNetworks.length > 1
                  ? `${wifiNetworks.length} redes`
                  : "Gratuito"}
              </span>
            </div>

            {wifiNetworks.length > 0 ? (
              <div className="space-y-3">
                {wifiNetworks.map((network, index) => {
                  const cardKey = network.id || `${network.ssid}-${index}`;
                  const isCopied = copiedKey === cardKey;
                  const isPasswordVisible = Boolean(visiblePasswords[cardKey]);

                  return (
                    <div
                      key={cardKey}
                      className="rounded-2xl bg-white border border-brand-navy/10 overflow-hidden shadow-xs divide-y divide-brand-navy/8"
                    >
                      {network.label && (
                        <div className="px-4 py-2.5 bg-brand-surface text-xs font-semibold text-brand-navy break-words">
                          {network.label}
                        </div>
                      )}

                      <div className="px-4 py-3 min-w-0">
                        <p className="text-xs font-medium text-brand-ink-muted">
                          Nome da rede (SSID)
                        </p>
                        <p className="mt-0.5 font-semibold text-sm sm:text-base text-brand-navy select-all break-words">
                          {network.ssid || "Consulte a recepção"}
                        </p>
                      </div>

                      <div className="px-4 py-2.5 flex items-center justify-between gap-2 min-w-0">
                        <div className="min-w-0 flex-1 py-0.5">
                          <p className="text-xs font-medium text-brand-ink-muted">
                            Senha
                          </p>
                          <p className="mt-0.5 font-mono font-semibold text-sm sm:text-base text-brand-navy break-words">
                            {network.password
                              ? isPasswordVisible
                                ? network.password
                                : "••••••••••"
                              : "Rede aberta (sem senha)"}
                          </p>
                        </div>

                        {network.password && (
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(cardKey)}
                            aria-label={
                              isPasswordVisible
                                ? "Ocultar senha do Wi-Fi"
                                : "Mostrar senha do Wi-Fi"
                            }
                            aria-pressed={isPasswordVisible}
                            className="w-11 h-11 rounded-xl bg-brand-bg border border-brand-navy/12 text-brand-ink-secondary hover:text-brand-navy hover:bg-brand-surface flex items-center justify-center transition-colors shrink-0"
                          >
                            {isPasswordVisible ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>

                      <div className="p-4">
                        <m.button
                          type="button"
                          onClick={() => handleCopyWifi(network, cardKey)}
                          disabled={!network.password}
                          whileTap={
                            prefersReducedMotion || !network.password
                              ? undefined
                              : { scale: 0.98 }
                          }
                          className={`w-full min-h-11 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
                            isCopied
                              ? "bg-brand-green text-brand-navy border border-brand-navy/20"
                              : "bg-brand-navy text-white hover:bg-brand-navy-light"
                          } disabled:opacity-50`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-4 h-4 shrink-0" />
                              <span>Senha copiada</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 shrink-0" />
                              <span>Copiar senha</span>
                            </>
                          )}
                        </m.button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl bg-white border border-brand-navy/10 p-5 text-center shadow-xs">
                <p className="text-sm text-brand-ink-secondary">
                  Consulte a recepção para os dados de acesso ao Wi-Fi.
                </p>
              </div>
            )}
          </section>
        </Reveal>

        {/* ===================================================================
            03 · REGRAS DA HOSPEDAGEM
        =================================================================== */}
        <Reveal direction="up">
          <section
            id="guia-regras"
            aria-labelledby="guia-regras-heading"
            className="relative isolate scroll-mt-[78px] space-y-3.5"
          >
            <SectionSpotlight active={focusedSection === "guia-regras"} />
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-brand-ink-muted">
                <span
                  aria-hidden="true"
                  className="w-6 h-0.5 bg-brand-green shrink-0"
                />
                <span className="tabular-nums font-semibold text-brand-navy">
                  03
                </span>
                <span aria-hidden="true" className="text-brand-navy/30">
                  ·
                </span>
                <span>Boa convivência e conforto</span>
              </div>
              <h2
                id="guia-regras-heading"
                className="font-display text-xl sm:text-2xl font-semibold text-brand-navy tracking-[-0.02em] leading-tight"
              >
                Regras da hospedagem
              </h2>
            </div>

            <div className="rounded-2xl bg-white border border-brand-navy/10 overflow-hidden shadow-xs">
              {rules.length > 0 ? (
                <ol className="divide-y divide-brand-navy/8 px-4">
                  {rules.map((rule, index) => (
                    <li
                      key={index}
                      className="py-3.5 flex items-baseline gap-3"
                    >
                      <span className="font-display text-sm font-semibold tabular-nums text-brand-navy shrink-0">
                        {formatChapterNumber(index + 1)}
                      </span>
                      <span className="text-sm text-brand-ink-secondary leading-relaxed break-words">
                        {rule}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="p-5 text-sm text-brand-ink-secondary leading-relaxed">
                  Aproveite sua estadia com tranquilidade. Em caso de dúvidas
                  sobre horários de café da manhã ou check-out, fale com a
                  recepção.
                </p>
              )}
            </div>
          </section>
        </Reveal>

        {/* ===================================================================
            04 · CURADORIA DA POUSADA
        =================================================================== */}
        <section
          id="guia-dicas"
          aria-labelledby="guia-dicas-heading"
          className="relative isolate scroll-mt-[78px] space-y-4"
        >
          <SectionSpotlight active={focusedSection === "guia-dicas"} />
          <Reveal direction="up" className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-brand-ink-muted">
              <span
                aria-hidden="true"
                className="w-6 h-0.5 bg-brand-green shrink-0"
              />
              <span className="tabular-nums font-semibold text-brand-navy">
                04
              </span>
              <span aria-hidden="true" className="text-brand-navy/30">
                ·
              </span>
              <span>Curadoria da pousada</span>
            </div>

            <MaskedLine inView>
              <h2
                id="guia-dicas-heading"
                className="font-display text-xl sm:text-2xl font-semibold text-brand-navy tracking-[-0.02em] leading-tight"
              >
                Dicas da região
              </h2>
            </MaskedLine>

            <p className="text-sm text-brand-ink-secondary leading-relaxed">
              Restaurantes, praias, passeios e conveniências selecionados pela
              nossa equipe.
            </p>
          </Reveal>

          {categoriesWithCounts.length > 1 && (
            <div
              role="tablist"
              aria-label="Filtrar dicas por categoria"
              className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {categoriesWithCounts.map(({ name, count }) => {
                const isActive = activeCategory === name;
                return (
                  <button
                    key={name}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setSelectedCategory(name)}
                    className={`relative min-h-11 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition-colors ${
                      isActive
                        ? "text-white"
                        : "bg-white border border-brand-navy/10 text-brand-ink-secondary hover:text-brand-navy hover:bg-brand-surface"
                    }`}
                  >
                    {isActive && (
                      <m.span
                        layoutId="guide-category-pill"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 32,
                        }}
                        aria-hidden="true"
                        className="absolute inset-0 rounded-xl bg-brand-navy pointer-events-none"
                      />
                    )}
                    <span className="relative z-10">{name}</span>
                    <span
                      className={`relative z-10 text-[11px] tabular-nums ${
                        isActive ? "text-brand-green" : "text-brand-ink-muted"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {filteredPlaces.length > 0 ? (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {filteredPlaces.map((place, idx) => {
                  const placeEmbedUrl = extractEmbedUrl(place.embed_url || "");
                  const placeImages =
                    Array.isArray(place.images) && place.images.length > 0
                      ? place.images.filter(Boolean)
                      : place.image_url?.trim()
                        ? [place.image_url.trim()]
                        : [];
                  const placeKey = `${place.name}-${idx}`;
                  const carouselState = placeCarousels[placeKey] ?? {
                    index: 0,
                    direction: 1,
                  };
                  const hasPhotos = placeImages.length > 0;
                  const hasMap = Boolean(placeEmbedUrl);
                  const hasBothMedia = hasPhotos && hasMap;
                  const activeMediaMode = hasPhotos
                    ? (placeMediaModes[placeKey] ?? "photos")
                    : "map";

                  return (
                    <m.article
                      key={placeKey}
                      layout={!prefersReducedMotion}
                      initial={
                        prefersReducedMotion
                          ? { opacity: 1 }
                          : { opacity: 0, y: 14 }
                      }
                      animate={{ opacity: 1, y: 0 }}
                      exit={
                        prefersReducedMotion
                          ? { opacity: 0 }
                          : { opacity: 0, scale: 0.97 }
                      }
                      transition={{ duration: 0.34, ease: EASE_OUT_EXPO }}
                      className="rounded-2xl bg-white border border-brand-navy/10 overflow-hidden shadow-xs"
                    >
                      {(hasPhotos || hasMap) && (
                        <div className="relative aspect-[16/10] bg-brand-surface overflow-hidden">
                          <AnimatePresence mode="wait" initial={false}>
                            {activeMediaMode === "photos" && hasPhotos ? (
                              <m.div
                                key="mode-photos"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{
                                  duration: 0.24,
                                  ease: EASE_OUT_EXPO,
                                }}
                                className="w-full h-full"
                              >
                                <PlacePhotoCarousel
                                  placeName={place.name}
                                  category={place.category}
                                  images={placeImages}
                                  activeIndex={carouselState.index}
                                  direction={carouselState.direction}
                                  onStep={(delta) =>
                                    handleStepPlaceImage(
                                      placeKey,
                                      placeImages.length,
                                      delta,
                                    )
                                  }
                                  onOpenLightbox={(startIndex) =>
                                    handleOpenLightbox(
                                      place.name,
                                      place.category,
                                      placeImages,
                                      startIndex,
                                    )
                                  }
                                />
                              </m.div>
                            ) : (
                              <m.div
                                key="mode-map"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{
                                  duration: 0.24,
                                  ease: EASE_OUT_EXPO,
                                }}
                                className="w-full h-full"
                              >
                                <SmoothMapEmbed
                                  eager
                                  src={placeEmbedUrl}
                                  title={`Mapa de localização de ${place.name}`}
                                  containerClassName="overflow-hidden w-full h-full bg-brand-surface"
                                  loadingLabel={`Carregando mapa de ${place.name}...`}
                                />
                              </m.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      <div className="p-4 sm:p-5 space-y-3.5">
                        <div className="space-y-1.5 min-w-0">
                          {!hasPhotos && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-bg border border-brand-navy/10 text-xs font-semibold text-brand-navy">
                              <CategoryBadgeIcon category={place.category} />
                              <span>{place.category}</span>
                            </span>
                          )}

                          <h3 className="font-display font-semibold text-lg sm:text-xl text-brand-navy leading-snug break-words">
                            {place.name}
                          </h3>

                          {place.description && (
                            <p className="text-sm text-brand-ink-secondary leading-relaxed break-words">
                              {place.description}
                            </p>
                          )}
                        </div>

                        {(place.link || hasBothMedia) && (
                          <div className="flex items-center gap-2 pt-0.5">
                            {place.link && (
                              <m.a
                                href={place.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => handleOpenPlaceTip(place.name)}
                                whileTap={
                                  prefersReducedMotion
                                    ? undefined
                                    : { scale: 0.985 }
                                }
                                className="flex-1 min-h-11 px-4 rounded-xl bg-brand-navy hover:bg-brand-navy-light text-white font-semibold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors text-center"
                              >
                                <span>{getPlaceCtaLabel(place.link)}</span>
                                <ExternalLink className="w-4 h-4 shrink-0" />
                              </m.a>
                            )}

                            {hasBothMedia && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPlaceMediaModes((prev) => ({
                                    ...prev,
                                    [placeKey]:
                                      activeMediaMode === "photos"
                                        ? "map"
                                        : "photos",
                                  }))
                                }
                                className="min-h-11 px-3.5 rounded-xl bg-brand-bg hover:bg-brand-surface border border-brand-navy/15 text-brand-navy text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors shrink-0"
                              >
                                <MapIcon className="w-4 h-4 shrink-0" />
                                <span>
                                  {activeMediaMode === "photos"
                                    ? "Ver mapa"
                                    : "Ver fotos"}
                                </span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </m.article>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-brand-navy/10 p-6 text-center space-y-3 shadow-xs">
              <p className="text-sm text-brand-ink-secondary">
                Nenhuma dica cadastrada no momento para{" "}
                <strong className="text-brand-navy">{activeCategory}</strong>.
              </p>
              {activeCategory !== "Todos" && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory("Todos")}
                  className="inline-flex items-center justify-center min-h-11 px-4 rounded-xl bg-brand-navy text-white text-xs font-semibold hover:bg-brand-navy-light transition-colors"
                >
                  Ver todas as dicas
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Modal Lightbox Imersivo com deslize direcional fluido */}
      {createPortal(
        <AnimatePresence>
          {lightboxState && (
            <m.div
              key="guide-lightbox-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
              role="dialog"
              aria-modal="true"
              aria-label={`Galeria de fotos - ${lightboxState.placeName}`}
              onClick={() => setLightboxState(null)}
              className="fixed inset-0 z-[100] bg-[#071B42]/95 p-3 sm:p-6 flex flex-col justify-between gap-3"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl mx-auto flex items-center justify-between gap-3 shrink-0"
              >
                <div className="min-w-0 text-white">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-semibold text-base sm:text-lg truncate">
                      {lightboxState.placeName}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-white/12 text-[#D8E1F0] text-xs font-medium">
                      {lightboxState.category}
                    </span>
                  </div>
                  <p className="text-xs text-[#B8C7E0] tabular-nums">
                    Foto {formatChapterNumber(lightboxState.activeIndex + 1)} de{" "}
                    {formatChapterNumber(lightboxState.images.length)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setLightboxState(null)}
                  aria-label="Fechar visualização ampliada"
                  className="inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-xl bg-white hover:bg-brand-bg text-brand-navy text-xs sm:text-sm font-semibold transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                  <span>Fechar</span>
                </button>
              </div>

              <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-3xl mx-auto flex-1 min-h-0 rounded-2xl overflow-hidden bg-brand-scrim"
              >
                <AnimatePresence
                  initial={false}
                  custom={lightboxState.direction}
                >
                  <m.div
                    key={`${lightboxState.images[lightboxState.activeIndex]}-${lightboxState.activeIndex}`}
                    custom={lightboxState.direction}
                    variants={prefersReducedMotion ? undefined : SLIDE_VARIANTS}
                    initial={prefersReducedMotion ? { opacity: 0 } : "enter"}
                    animate={prefersReducedMotion ? { opacity: 1 } : "center"}
                    exit={prefersReducedMotion ? { opacity: 0 } : "exit"}
                    transition={{
                      x: { duration: 0.44, ease: EASE_OUT_EXPO },
                      scale: { duration: 0.44, ease: EASE_OUT_EXPO },
                      opacity: { duration: 0.3, ease: EASE_OUT_EXPO },
                    }}
                    drag={
                      lightboxState.images.length > 1 && !prefersReducedMotion
                        ? "x"
                        : false
                    }
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.18}
                    onDragEnd={(_, info) => {
                      if (lightboxState.images.length <= 1) return;
                      if (info.offset.x < -44 || info.velocity.x < -300) {
                        setLightboxState((prev) =>
                          prev
                            ? {
                                ...prev,
                                direction: 1,
                                activeIndex:
                                  (prev.activeIndex + 1) % prev.images.length,
                              }
                            : null,
                        );
                      } else if (info.offset.x > 44 || info.velocity.x > 300) {
                        setLightboxState((prev) =>
                          prev
                            ? {
                                ...prev,
                                direction: -1,
                                activeIndex:
                                  (prev.activeIndex - 1 + prev.images.length) %
                                  prev.images.length,
                              }
                            : null,
                        );
                      }
                    }}
                    className="absolute inset-0 flex items-center justify-center touch-pan-y"
                  >
                    <SmoothImage
                      src={lightboxState.images[lightboxState.activeIndex]}
                      alt={`${lightboxState.placeName} - Foto ${lightboxState.activeIndex + 1}`}
                      theme="dark"
                      priority
                      containerClassName="relative w-full h-full flex items-center justify-center overflow-hidden pointer-events-none"
                      className="max-h-full max-w-full object-contain"
                    />
                  </m.div>
                </AnimatePresence>

                {lightboxState.images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxState((prev) =>
                          prev
                            ? {
                                ...prev,
                                direction: -1,
                                activeIndex:
                                  (prev.activeIndex - 1 + prev.images.length) %
                                  prev.images.length,
                              }
                            : null,
                        )
                      }
                      aria-label="Foto anterior"
                      className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-xl bg-[#071B42]/80 hover:bg-[#071B42] border border-white/25 text-white flex items-center justify-center transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setLightboxState((prev) =>
                          prev
                            ? {
                                ...prev,
                                direction: 1,
                                activeIndex:
                                  (prev.activeIndex + 1) % prev.images.length,
                              }
                            : null,
                        )
                      }
                      aria-label="Próxima foto"
                      className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-xl bg-[#071B42]/80 hover:bg-[#071B42] border border-white/25 text-white flex items-center justify-center transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {lightboxState.images.length > 1 && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-3xl mx-auto flex items-center justify-center gap-2 overflow-x-auto py-1 shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {lightboxState.images.map((imgUrl, idx) => {
                    const isCurrent = idx === lightboxState.activeIndex;
                    return (
                      <button
                        key={`${imgUrl}-${idx}`}
                        type="button"
                        onClick={() =>
                          setLightboxState((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  direction: idx >= prev.activeIndex ? 1 : -1,
                                  activeIndex: idx,
                                }
                              : null,
                          )
                        }
                        aria-label={`Ver foto ${idx + 1}`}
                        className={`w-16 h-12 sm:w-20 sm:h-14 rounded-xl overflow-hidden border-2 transition-[border-color,opacity] shrink-0 ${
                          isCurrent
                            ? "border-brand-green opacity-100"
                            : "border-white/25 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`Miniatura ${idx + 1}`}
                          width={80}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </m.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
