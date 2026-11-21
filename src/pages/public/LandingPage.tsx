import {
  ArrowRight,
  Bath,
  BedDouble,
  ChevronLeft,
  ChevronRight,
  Compass,
  Dog,
  Lock,
  MapPin,
  Pause,
  Phone,
  Play,
  RefreshCw,
  Refrigerator,
  Snowflake,
  Tv,
  Users,
  Utensils,
  Wifi,
} from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { Link } from "react-router-dom";
import type { TypedAccommodation } from "../../@types/database.types";
import { BrandLoader } from "../../components/public/BrandLoader";
import { PageTransition, Reveal } from "../../components/public/Motion";
import { SmoothImage } from "../../components/public/SmoothImage";
import { SmoothMapEmbed } from "../../components/public/SmoothMapEmbed";
import {
  useActiveAccommodations,
  useBusinessInfo,
} from "../../hooks/usePortalData";
import {
  trackGuideInteraction,
  trackLinkClick,
  trackPageView,
} from "../../services";
import {
  extractEmbedUrl,
  formatInstagramMask,
  formatInstagramUrl,
  formatPhoneMask,
  formatWhatsAppUrl,
} from "../../utils/embedUrl";
import { InstagramIcon, WazeIcon, WhatsAppIcon } from "../../utils/iconMapper";
import { isImagePreloaded, preloadImageUrl } from "../../utils/imagePreload";
import { PUBLIC_CACHE_KEYS, readPublicCache } from "../../utils/publicCache";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const HERO_BOOT_TIMEOUT_MS = 1200;
const HERO_AUTOPLAY_MS = 6000;

function formatBedsSummary(acc: TypedAccommodation): string {
  if (!acc.beds || acc.beds.length === 0) {
    return "Camas confortáveis";
  }
  return acc.beds.map((b) => `${b.count}x ${b.type}`).join(" · ");
}

function countAccommodationPhotos(acc: TypedAccommodation): number {
  const uniqueUrls = new Set<string>();
  if (acc.cover_image) uniqueUrls.add(acc.cover_image);
  if (Array.isArray(acc.gallery)) {
    acc.gallery.forEach((url) => {
      if (url) uniqueUrls.add(url);
    });
  }
  return uniqueUrls.size;
}

function formatChapterNumber(n: number): string {
  return String(n).padStart(2, "0");
}

export function LandingPage() {
  const {
    data: businessInfo,
    isLoading: isLoadingBusiness,
    isError: isBusinessError,
    refetch: refetchBusiness,
  } = useBusinessInfo();
  const {
    data: accommodations = [],
    isLoading: isLoadingAccommodations,
  } = useActiveAccommodations();

  const prefersReducedMotion = useReducedMotion();

  // Detecta na montagem se já existe cache local para evitar cortina em visitas recorrentes
  const [isColdBoot] = useState(
    () => !readPublicCache(PUBLIC_CACHE_KEYS.businessInfo)?.data,
  );
  const [readyHeroSrc, setReadyHeroSrc] = useState<string | null>(null);
  const [heroPreloadTimedOut, setHeroPreloadTimedOut] = useState(false);

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [showFloatingHeader, setShowFloatingHeader] = useState(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const metadata = businessInfo?.metadata;
  const landing = metadata?.landing;
  const slides = useMemo(
    () => landing?.hero_slides ?? [],
    [landing?.hero_slides],
  );
  const firstHeroSrc = slides[0]?.image_url || "";

  useEffect(() => {
    trackPageView("landing_page");
  }, []);

  // Na 1ª visita sem cache, pré-carrega a primeira foto da Hero com limite de 1,2s
  useEffect(() => {
    if (!isColdBoot || !firstHeroSrc) return;

    if (isImagePreloaded(firstHeroSrc)) {
      queueMicrotask(() => setReadyHeroSrc(firstHeroSrc));
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setHeroPreloadTimedOut(true);
      }
    }, HERO_BOOT_TIMEOUT_MS);

    preloadImageUrl(firstHeroSrc).then(() => {
      if (!cancelled) {
        window.clearTimeout(timeoutId);
        setReadyHeroSrc(firstHeroSrc);
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isColdBoot, firstHeroSrc]);

  const isFirstHeroReady =
    !firstHeroSrc ||
    readyHeroSrc === firstHeroSrc ||
    isImagePreloaded(firstHeroSrc) ||
    heroPreloadTimedOut;

  const showBrandCurtain =
    isColdBoot &&
    !isBusinessError &&
    (isLoadingBusiness || !businessInfo || !isFirstHeroReady);

  useEffect(() => {
    if (showBrandCurtain || slides.length <= 1) return;

    const timer = window.setTimeout(() => {
      slides.forEach((slide, idx) => {
        if (idx > 0 && slide.image_url) {
          void preloadImageUrl(slide.image_url);
        }
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [showBrandCurtain, slides]);

  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingHeader(window.scrollY > 420);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isAutoplayPaused =
    userPaused || interactionPaused || Boolean(prefersReducedMotion);

  useEffect(() => {
    if (showBrandCurtain || isAutoplayPaused || slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % slides.length);
    }, HERO_AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [showBrandCurtain, isAutoplayPaused, slides.length]);

  if (isBusinessError && !businessInfo) {
    return (
      <div className="min-h-screen bg-brand-bg text-brand-navy flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl bg-white border border-brand-navy/10 p-8 text-center shadow-xs space-y-4">
          <div className="mx-auto w-20 h-20 rounded-xl bg-brand-bg border border-brand-navy/10 p-2 flex items-center justify-center">
            <img
              src="/logoMoradasdoGabriel.svg"
              alt="Logo Pousada Moradas do Gabriel"
              width={64}
              height={64}
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="font-display text-2xl font-medium text-brand-navy">
            Não foi possível carregar o site
          </h1>
          <p className="text-sm text-brand-ink-secondary leading-relaxed">
            Verifique sua conexão com a internet e tente novamente em alguns
            instantes.
          </p>
          <button
            type="button"
            onClick={() => void refetchBusiness()}
            className="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl bg-brand-navy hover:bg-brand-navy-light text-white text-sm font-semibold transition-colors"
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
            <span>Tentar novamente</span>
          </button>
        </div>
      </div>
    );
  }

  const safeSlideIndex =
    slides.length > 0 ? activeSlideIndex % slides.length : 0;
  const currentSlide = slides[safeSlideIndex];

  const contacts = metadata?.contacts ?? {
    whatsapp: "",
    phone: "",
    instagram: "",
  };
  const location = metadata?.location ?? {
    address: "",
    maps_url: "",
    waze_url: "",
    embed_url: "",
    instructions: "",
  };

  const whatsappUrl =
    formatWhatsAppUrl(
      contacts.whatsapp,
      "Olá! Vim pelo site oficial da Pousada Moradas do Gabriel e gostaria de consultar disponibilidade de hospedagem.",
    ) || "https://wa.me/";

  const instagramUrl =
    formatInstagramUrl(contacts.instagram) || "https://instagram.com";

  const maskedWhatsapp = formatPhoneMask(contacts.whatsapp);
  const maskedPhone = formatPhoneMask(contacts.phone);
  const maskedInstagram = formatInstagramMask(contacts.instagram);
  const cleanEmbedUrl = extractEmbedUrl(location.embed_url || "");

  const aboutData = landing?.about;
  const hasAboutContent = Boolean(
    aboutData &&
      (aboutData.title ||
        aboutData.description ||
        aboutData.secondary_description ||
        aboutData.image_url ||
        aboutData.highlights.length > 0),
  );
  const hasAboutImage = Boolean(aboutData?.image_url);

  const footerData = landing?.footer;
  const companyName =
    footerData?.company_name || "Pousada Moradas do Gabriel";

  const accommodationsChapter = hasAboutContent ? 2 : 1;
  const locationChapter = hasAboutContent ? 3 : 2;

  const handleSelectSlide = (index: number) => {
    setActiveSlideIndex(index);
  };

  const handlePrevSlide = () => {
    if (slides.length <= 1) return;
    setActiveSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNextSlide = () => {
    if (slides.length <= 1) return;
    setActiveSlideIndex((prev) => (prev + 1) % slides.length);
  };

  const handleHeroTouchStart = (e: TouchEvent<HTMLElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setInteractionPaused(true);
  };

  const handleHeroTouchEnd = (e: TouchEvent<HTMLElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    setInteractionPaused(false);
    if (!start || slides.length <= 1) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        handleNextSlide();
      } else {
        handlePrevSlide();
      }
    }
  };

  const slideCtaHref = currentSlide?.cta_href || "#acomodacoes";
  const isInternalRoute =
    slideCtaHref.startsWith("/") && !slideCtaHref.startsWith("//");

  return (
    <>
      <BrandLoader show={showBrandCurtain} />

      {businessInfo && !showBrandCurtain && (
        <PageTransition>
          <div
            id="inicio"
            className="min-h-screen bg-brand-bg text-brand-navy flex flex-col justify-between overflow-x-clip"
          >
            <a
              href="#conteudo-principal"
              className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[130] focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-brand-navy focus:text-white focus:text-sm focus:font-semibold"
            >
              Pular para o conteúdo principal
            </a>

            {/* Único elemento com backdrop-blur na página para legibilidade sobre conteúdo rolado */}
            <AnimatePresence>
              {showFloatingHeader && (
                <m.div
                  key="floating-header"
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.24, ease: EASE_OUT }}
                  className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-2xl"
                >
                  <nav
                    aria-label="Navegação rápida ao rolar"
                    className="px-2.5 sm:px-3.5 py-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-brand-navy/12 shadow-[0_14px_34px_-12px_rgba(11,41,99,0.25)] flex items-center justify-between gap-2"
                  >
                    <a
                      href="#inicio"
                      aria-label="Voltar ao início"
                      className="flex items-center gap-2 min-h-11 px-1 rounded-xl shrink-0"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white border border-brand-navy/10 p-1 flex items-center justify-center shrink-0">
                        <img
                          src="/logoMoradasdoGabriel.svg"
                          alt=""
                          width={24}
                          height={24}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="font-display font-medium text-sm text-brand-navy hidden sm:inline truncate max-w-[160px]">
                        Moradas do Gabriel
                      </span>
                    </a>

                    <div className="flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-medium text-brand-ink-secondary">
                      {hasAboutContent && (
                        <a
                          href="#sobre"
                          className="inline-flex items-center min-h-11 px-2.5 sm:px-3 rounded-xl hover:bg-brand-bg hover:text-brand-navy transition-colors"
                        >
                          Sobre
                        </a>
                      )}
                      <a
                        href="#acomodacoes"
                        className="inline-flex items-center min-h-11 px-2.5 sm:px-3 rounded-xl hover:bg-brand-bg hover:text-brand-navy transition-colors"
                      >
                        Acomodações
                      </a>
                      <a
                        href="#localizacao"
                        className="hidden sm:inline-flex items-center min-h-11 px-3 rounded-xl hover:bg-brand-bg hover:text-brand-navy transition-colors"
                      >
                        Localização
                      </a>
                    </div>

                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        trackLinkClick(null, "floating_header_whatsapp")
                      }
                      className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3.5 sm:px-4 rounded-xl bg-brand-green hover:bg-[#BFD37E] active:scale-[0.985] text-brand-navy text-xs sm:text-sm font-semibold transition-[background-color,transform] shrink-0"
                    >
                      <WhatsAppIcon className="w-4 h-4 shrink-0" />
                      <span>Reservar</span>
                    </a>
                  </nav>
                </m.div>
              )}
            </AnimatePresence>

            {/* Palco editorial de abertura com fotografia real em destaque */}
            <div className="w-full max-w-[1400px] mx-auto px-2 pt-2 sm:px-4 sm:pt-4">
              <section
                aria-label="Apresentação da pousada"
                aria-roledescription={slides.length > 1 ? "carousel" : undefined}
                onMouseEnter={() => setInteractionPaused(true)}
                onMouseLeave={() => setInteractionPaused(false)}
                onFocusCapture={() => setInteractionPaused(true)}
                onBlurCapture={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setInteractionPaused(false);
                  }
                }}
                onTouchStart={handleHeroTouchStart}
                onTouchEnd={handleHeroTouchEnd}
                className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-brand-scrim text-white min-h-[76svh] sm:min-h-[84svh] max-h-[860px] flex flex-col justify-between"
              >
                <div aria-hidden="true" className="absolute inset-0">
                  <AnimatePresence initial={false}>
                    {currentSlide?.image_url && (
                      <m.div
                        key={currentSlide.image_url || currentSlide.id}
                        initial={{
                          opacity: 0,
                          scale: prefersReducedMotion ? 1 : 1.035,
                        }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          opacity: { duration: 0.56, ease: EASE_OUT },
                          scale: { duration: 0.95, ease: EASE_OUT },
                        }}
                        className="absolute inset-0"
                      >
                        <SmoothImage
                          src={currentSlide.image_url}
                          alt={currentSlide.title}
                          theme="dark"
                          targetOpacity={1}
                          priority={safeSlideIndex === 0}
                          containerClassName="relative w-full h-full overflow-hidden"
                          className="w-full h-full object-cover"
                        />
                      </m.div>
                    )}
                  </AnimatePresence>

                  {/* Scrim direcional garante contraste WCAG AA sobre qualquer foto sem apagar o sol/céu */}
                  <div className="absolute inset-0 bg-gradient-to-b from-[#071B42]/76 via-[#071B42]/18 to-transparent pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071B42]/92 via-[#071B42]/48 to-transparent pointer-events-none" />
                  <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-[#071B42]/72 via-[#071B42]/28 to-transparent pointer-events-none" />
                </div>

                <header className="relative z-20 flex items-center justify-between gap-2 sm:gap-4 px-4 py-3.5 sm:px-8 sm:py-5 md:px-12">
                  <a
                    href="#inicio"
                    className="flex items-center gap-2.5 sm:gap-3 min-w-0 rounded-xl focus-visible:outline-brand-green"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0">
                      <img
                        src="/logoMoradasdoGabriel.svg"
                        alt="Logo Pousada Moradas do Gabriel"
                        width={36}
                        height={36}
                        fetchPriority="high"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="font-display text-sm sm:text-base font-medium text-white tracking-tight truncate">
                      {companyName}
                    </span>
                  </a>

                  <nav
                    aria-label="Navegação principal"
                    className="hidden lg:flex items-center gap-1 text-sm font-medium text-[#E5ECF7]"
                  >
                    {hasAboutContent && (
                      <a
                        href="#sobre"
                        className="inline-flex items-center min-h-11 px-3.5 rounded-xl hover:bg-white/12 hover:text-white transition-colors focus-visible:outline-brand-green"
                      >
                        Sobre
                      </a>
                    )}
                    <a
                      href="#acomodacoes"
                      className="inline-flex items-center min-h-11 px-3.5 rounded-xl hover:bg-white/12 hover:text-white transition-colors focus-visible:outline-brand-green"
                    >
                      Acomodações
                    </a>
                    <a
                      href="#localizacao"
                      className="inline-flex items-center min-h-11 px-3.5 rounded-xl hover:bg-white/12 hover:text-white transition-colors focus-visible:outline-brand-green"
                    >
                      Localização
                    </a>
                    <Link
                      to="/links-contato"
                      className="inline-flex items-center min-h-11 px-3.5 rounded-xl hover:bg-white/12 hover:text-white transition-colors focus-visible:outline-brand-green"
                    >
                      Links e contatos
                    </Link>
                  </nav>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to="/links-contato"
                      className="lg:hidden inline-flex items-center justify-center min-h-11 px-3 sm:px-3.5 rounded-xl border border-white/25 bg-[#071B42]/65 hover:bg-[#071B42]/85 text-xs sm:text-sm font-medium text-white transition-colors focus-visible:outline-brand-green"
                    >
                      <span>Links</span>
                      <span className="hidden sm:inline">&nbsp;e contatos</span>
                    </Link>

                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackLinkClick(null, "hero_top_whatsapp")}
                      className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3.5 sm:px-5 rounded-xl bg-brand-green hover:bg-[#BFD37E] active:scale-[0.985] text-brand-navy text-xs sm:text-sm font-semibold transition-[background-color,transform] focus-visible:outline-brand-green"
                    >
                      <WhatsAppIcon className="w-4 h-4 shrink-0" />
                      <span>Reservar</span>
                    </a>
                  </div>
                </header>

                <div className="relative z-20 flex-1 flex flex-col justify-end px-5 sm:px-8 md:px-12 pt-10 pb-7 sm:pb-10 md:pb-12">
                  {slides.length > 0 && currentSlide ? (
                    <AnimatePresence mode="wait">
                      <m.div
                        key={`${currentSlide.id}-${safeSlideIndex}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{
                          opacity: 0,
                          y: -6,
                          transition: { duration: 0.18, ease: "easeIn" },
                        }}
                        transition={{ duration: 0.42, ease: EASE_OUT }}
                        className="max-w-2xl space-y-4 sm:space-y-5"
                      >
                        <p className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-[#D8E1F0]">
                          <span className="font-semibold tabular-nums text-brand-green">
                            {formatChapterNumber(safeSlideIndex + 1)} /{" "}
                            {formatChapterNumber(slides.length)}
                          </span>
                          <span aria-hidden="true" className="text-white/40">
                            ·
                          </span>
                          <span>{currentSlide.topic}</span>
                        </p>

                        <h1 className="font-display font-medium text-[clamp(2rem,4.6vw,3.85rem)] leading-[1.06] tracking-[-0.025em] text-white text-balance break-words">
                          {currentSlide.title}
                        </h1>

                        {currentSlide.subtitle && (
                          <p className="text-sm sm:text-base md:text-[1.0625rem] text-[#E5ECF7] leading-relaxed max-w-xl break-words">
                            {currentSlide.subtitle}
                          </p>
                        )}

                        <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                          {isInternalRoute ? (
                            <Link
                              to={slideCtaHref}
                              className="inline-flex items-center justify-center min-h-12 px-6 rounded-xl bg-white hover:bg-brand-bg active:scale-[0.985] text-brand-navy font-semibold text-sm transition-[background-color,transform] focus-visible:outline-brand-green"
                            >
                              {currentSlide.cta_label || "Ver acomodações"}
                            </Link>
                          ) : (
                            <a
                              href={slideCtaHref}
                              className="inline-flex items-center justify-center min-h-12 px-6 rounded-xl bg-white hover:bg-brand-bg active:scale-[0.985] text-brand-navy font-semibold text-sm transition-[background-color,transform] focus-visible:outline-brand-green"
                            >
                              {currentSlide.cta_label || "Ver acomodações"}
                            </a>
                          )}

                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() =>
                              trackLinkClick(null, "hero_slide_whatsapp")
                            }
                            className="inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-xl bg-[#071B42]/78 hover:bg-[#071B42]/92 active:scale-[0.985] border border-white/35 text-white font-medium text-sm transition-[background-color,border-color,transform] focus-visible:outline-brand-green"
                          >
                            <WhatsAppIcon className="w-4 h-4 shrink-0" />
                            <span>Consultar no WhatsApp</span>
                          </a>
                        </div>
                      </m.div>
                    </AnimatePresence>
                  ) : (
                    <div className="max-w-2xl space-y-4 sm:space-y-5">
                      <h1 className="font-display font-medium text-[clamp(2rem,4.6vw,3.85rem)] leading-[1.06] tracking-[-0.025em] text-white text-balance break-words">
                        {companyName}
                      </h1>
                      {location.address && (
                        <p className="text-sm sm:text-base text-[#E5ECF7] leading-relaxed max-w-xl">
                          {location.address}
                        </p>
                      )}
                      <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                        <a
                          href="#acomodacoes"
                          className="inline-flex items-center justify-center min-h-12 px-6 rounded-xl bg-white hover:bg-brand-bg text-brand-navy font-semibold text-sm transition-colors focus-visible:outline-brand-green"
                        >
                          Ver acomodações
                        </a>
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() =>
                            trackLinkClick(null, "hero_fallback_whatsapp")
                          }
                          className="inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-xl bg-[#071B42]/78 hover:bg-[#071B42]/92 border border-white/35 text-white font-medium text-sm transition-colors focus-visible:outline-brand-green"
                        >
                          <WhatsAppIcon className="w-4 h-4 shrink-0" />
                          <span>Consultar no WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Barra de capítulos integrada na base da Hero com linha de horizonte em verde-folhagem */}
                {slides.length > 0 && currentSlide && (
                  <div className="relative z-20 border-t border-white/15 bg-[#071B42]/86">
                    <div className="flex items-stretch justify-between gap-2 px-4 sm:px-8 md:px-12">
                      <div className="hidden sm:flex items-stretch flex-1 min-w-0">
                        {slides.map((slide, idx) => {
                          const isActive = idx === safeSlideIndex;
                          return (
                            <button
                              key={slide.id || idx}
                              type="button"
                              onClick={() => handleSelectSlide(idx)}
                              aria-current={isActive ? "true" : undefined}
                              className="group relative flex-1 min-w-0 flex items-center gap-2.5 min-h-14 px-3 first:pl-0 text-left transition-colors focus-visible:outline-brand-green"
                            >
                              <span
                                aria-hidden="true"
                                className="absolute -top-px left-0 right-3 group-first:left-0 h-0.5 bg-white/15 overflow-hidden"
                              >
                                {isActive &&
                                  (!isAutoplayPaused && slides.length > 1 ? (
                                    <m.span
                                      key={`bar-${safeSlideIndex}-playing`}
                                      initial={{ scaleX: 0 }}
                                      animate={{ scaleX: 1 }}
                                      transition={{
                                        duration: HERO_AUTOPLAY_MS / 1000,
                                        ease: "linear",
                                      }}
                                      className="block w-full h-full bg-brand-green origin-left"
                                    />
                                  ) : (
                                    <span className="block w-full h-full bg-brand-green" />
                                  ))}
                              </span>

                              <span
                                className={`text-xs font-semibold tabular-nums shrink-0 ${
                                  isActive
                                    ? "text-brand-green"
                                    : "text-[#B8C7E0] group-hover:text-white"
                                }`}
                              >
                                {formatChapterNumber(idx + 1)}
                              </span>
                              <span
                                className={`text-xs md:text-sm font-medium truncate transition-colors ${
                                  isActive
                                    ? "text-white"
                                    : "text-[#B8C7E0] group-hover:text-white"
                                }`}
                              >
                                {slide.topic}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="sm:hidden relative flex-1 min-w-0 flex items-center gap-2.5 min-h-14 pr-2">
                        <span
                          aria-hidden="true"
                          className="absolute -top-px left-0 right-2 h-0.5 bg-white/15 overflow-hidden"
                        >
                          {!isAutoplayPaused && slides.length > 1 ? (
                            <m.span
                              key={`mobile-bar-${safeSlideIndex}-playing`}
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{
                                duration: HERO_AUTOPLAY_MS / 1000,
                                ease: "linear",
                              }}
                              className="block w-full h-full bg-brand-green origin-left"
                            />
                          ) : (
                            <span className="block w-full h-full bg-brand-green" />
                          )}
                        </span>

                        <span className="text-xs font-semibold tabular-nums text-brand-green shrink-0">
                          {formatChapterNumber(safeSlideIndex + 1)}/
                          {formatChapterNumber(slides.length)}
                        </span>
                        <span className="text-xs font-medium text-white truncate">
                          {currentSlide.topic}
                        </span>
                      </div>

                      {slides.length > 1 && (
                        <div className="flex items-center gap-1.5 py-2 shrink-0">
                          <button
                            type="button"
                            onClick={handlePrevSlide}
                            aria-label="Slide anterior"
                            className="w-11 h-11 rounded-xl border border-white/22 bg-white/8 hover:bg-white/16 active:scale-[0.97] text-white flex items-center justify-center transition-[background-color,transform] focus-visible:outline-brand-green"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleNextSlide}
                            aria-label="Próximo slide"
                            className="w-11 h-11 rounded-xl border border-white/22 bg-white/8 hover:bg-white/16 active:scale-[0.97] text-white flex items-center justify-center transition-[background-color,transform] focus-visible:outline-brand-green"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setUserPaused((prev) => !prev)}
                            aria-pressed={userPaused}
                            aria-label={
                              userPaused
                                ? "Retomar troca automática de fotos"
                                : "Pausar troca automática de fotos"
                            }
                            className="w-11 h-11 rounded-xl border border-white/22 bg-white/8 hover:bg-white/16 active:scale-[0.97] text-white flex items-center justify-center transition-[background-color,transform] focus-visible:outline-brand-green"
                          >
                            {userPaused ? (
                              <Play className="w-4 h-4" />
                            ) : (
                              <Pause className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>

            <main
              id="conteudo-principal"
              className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 sm:pb-28 space-y-20 sm:space-y-28"
            >
              {hasAboutContent && aboutData && (
                <Reveal direction="up">
                  <section
                    id="sobre"
                    aria-labelledby="sobre-heading"
                    className="scroll-mt-24 space-y-12 sm:space-y-14"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                      <div
                        className={`${
                          hasAboutImage ? "lg:col-span-6" : "lg:col-span-9"
                        } space-y-5`}
                      >
                        <div className="flex items-center gap-3 text-sm font-medium text-brand-ink-muted">
                          <span
                            aria-hidden="true"
                            className="w-8 h-0.5 bg-brand-green shrink-0"
                          />
                          <span className="tabular-nums font-semibold text-brand-navy">
                            01
                          </span>
                          <span
                            aria-hidden="true"
                            className="text-brand-navy/30"
                          >
                            ·
                          </span>
                          <span>{aboutData.badge || "Sobre a pousada"}</span>
                        </div>

                        {aboutData.title && (
                          <h2
                            id="sobre-heading"
                            className="font-display font-medium text-3xl sm:text-4xl text-brand-navy tracking-[-0.02em] leading-[1.12] text-balance break-words"
                          >
                            {aboutData.title}
                          </h2>
                        )}

                        {aboutData.description && (
                          <p className="text-base text-brand-ink-secondary leading-relaxed max-w-prose break-words">
                            {aboutData.description}
                          </p>
                        )}

                        {aboutData.secondary_description && (
                          <p className="text-[15px] text-brand-ink-muted leading-relaxed max-w-prose break-words">
                            {aboutData.secondary_description}
                          </p>
                        )}

                        <div className="pt-2 flex flex-wrap items-center gap-3">
                          <a
                            href="#acomodacoes"
                            className="inline-flex items-center justify-center min-h-11 px-5 rounded-xl bg-brand-navy hover:bg-brand-navy-light text-white text-sm font-semibold transition-colors"
                          >
                            Ver acomodações
                          </a>

                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() =>
                              trackLinkClick(null, "about_whatsapp")
                            }
                            className="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl bg-white border border-brand-navy/15 hover:border-brand-navy/35 hover:bg-brand-surface text-brand-navy text-sm font-semibold transition-colors"
                          >
                            <WhatsAppIcon className="w-4 h-4 shrink-0" />
                            <span>Falar pelo WhatsApp</span>
                          </a>
                        </div>
                      </div>

                      {hasAboutImage && (
                        <div className="lg:col-span-6">
                          <div className="aspect-[4/3] sm:aspect-[5/4] rounded-2xl overflow-hidden bg-brand-surface border border-brand-navy/10">
                            <SmoothImage
                              src={aboutData.image_url}
                              alt={aboutData.title || companyName}
                              containerClassName="relative w-full h-full overflow-hidden"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {aboutData.highlights.length > 0 && (
                      <div className="border-t border-brand-navy/12 pt-8 sm:pt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-7">
                        {aboutData.highlights.map((item, idx) => (
                          <div
                            key={`${item.title}-${idx}`}
                            className="space-y-2"
                          >
                            <div className="flex items-center gap-2 text-xs font-medium text-brand-ink-muted">
                              <span className="tabular-nums font-semibold text-brand-navy">
                                {formatChapterNumber(idx + 1)}
                              </span>
                              {item.badge && (
                                <>
                                  <span
                                    aria-hidden="true"
                                    className="text-brand-navy/30"
                                  >
                                    ·
                                  </span>
                                  <span>{item.badge}</span>
                                </>
                              )}
                            </div>
                            <h3 className="text-base font-semibold text-brand-navy leading-snug break-words">
                              {item.title}
                            </h3>
                            <p className="text-sm text-brand-ink-secondary leading-relaxed break-words">
                              {item.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </Reveal>
              )}

              <section
                id="acomodacoes"
                aria-labelledby="acomodacoes-heading"
                className="scroll-mt-24 space-y-8 sm:space-y-10"
              >
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm font-medium text-brand-ink-muted">
                      <span
                        aria-hidden="true"
                        className="w-8 h-0.5 bg-brand-green shrink-0"
                      />
                      <span className="tabular-nums font-semibold text-brand-navy">
                        {formatChapterNumber(accommodationsChapter)}
                      </span>
                      <span
                        aria-hidden="true"
                        className="text-brand-navy/30"
                      >
                        ·
                      </span>
                      <span>Hospedagem</span>
                    </div>

                    <h2
                      id="acomodacoes-heading"
                      className="font-display font-medium text-3xl sm:text-4xl text-brand-navy tracking-[-0.02em] leading-[1.12]"
                    >
                      Acomodações para sua estadia
                    </h2>

                    <p className="text-sm sm:text-base text-brand-ink-secondary max-w-xl leading-relaxed">
                      Escolha a opção ideal para sua viagem. Abra qualquer
                      acomodação para ver a galeria completa, disposição de
                      camas e comodidades.
                    </p>
                  </div>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackLinkClick(null, "accommodations_section_cta")
                    }
                    className="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl bg-white border border-brand-navy/15 hover:border-brand-navy/35 hover:bg-brand-surface text-brand-navy text-sm font-semibold transition-colors shrink-0"
                  >
                    <WhatsAppIcon className="w-4 h-4 shrink-0" />
                    <span>Consultar tarifas no WhatsApp</span>
                  </a>
                </div>

                {isLoadingAccommodations && accommodations.length === 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        aria-hidden="true"
                        className="rounded-2xl bg-white border border-brand-navy/10 overflow-hidden flex flex-col justify-between"
                      >
                        <div>
                          <div className="aspect-[16/10] bg-brand-surface media-shimmer-light" />
                          <div className="p-5 sm:p-6 space-y-3.5">
                            <div className="space-y-2">
                              <div className="h-5 w-3/4 rounded-md bg-brand-surface media-shimmer-light" />
                              <div className="h-3.5 w-1/2 rounded-md bg-brand-surface" />
                            </div>
                            <div className="space-y-2 pt-1">
                              <div className="h-3.5 w-full rounded-md bg-brand-surface" />
                              <div className="h-3.5 w-5/6 rounded-md bg-brand-surface" />
                            </div>
                            <div className="flex gap-1.5 pt-1">
                              <div className="h-6 w-24 rounded-md bg-brand-bg border border-brand-navy/10" />
                              <div className="h-6 w-16 rounded-md bg-brand-bg border border-brand-navy/10" />
                              <div className="h-6 w-16 rounded-md bg-brand-bg border border-brand-navy/10" />
                            </div>
                          </div>
                        </div>
                        <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0">
                          <div className="h-11 rounded-xl bg-brand-surface media-shimmer-light" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : accommodations.length > 0 ? (
                  <Reveal
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    direction="up"
                  >
                    {accommodations.map((acc) => {
                      const photoCount = countAccommodationPhotos(acc);
                      return (
                        <article
                          key={acc.id}
                          className="motion-card rounded-2xl bg-white border border-brand-navy/10 overflow-hidden flex flex-col justify-between group hover:border-brand-navy/25"
                        >
                          <div>
                            <Link
                              to={`/acomodacoes/${acc.slug}`}
                              className="block relative aspect-[16/10] overflow-hidden bg-brand-surface"
                            >
                              <div className="w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]">
                                <SmoothImage
                                  src={acc.cover_image}
                                  alt={acc.title}
                                  containerClassName="relative w-full h-full overflow-hidden"
                                  className="w-full h-full object-cover"
                                  fallback={
                                    <div className="w-full h-full flex items-center justify-center text-brand-ink-muted">
                                      <BedDouble className="w-9 h-9" />
                                    </div>
                                  }
                                />
                              </div>

                              <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/95 border border-brand-navy/10 text-brand-navy text-xs font-semibold tabular-nums">
                                <Users className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  Até {acc.max_guests}{" "}
                                  {acc.max_guests === 1 ? "pessoa" : "pessoas"}
                                </span>
                              </div>

                              {photoCount > 1 && (
                                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-[#071B42]/86 text-white text-xs font-medium tabular-nums">
                                  {photoCount} fotos
                                </div>
                              )}
                            </Link>

                            <div className="p-5 sm:p-6 space-y-3.5">
                              <div>
                                <Link
                                  to={`/acomodacoes/${acc.slug}`}
                                  className="hover:underline underline-offset-4"
                                >
                                  <h3 className="text-lg font-semibold text-brand-navy break-words leading-snug">
                                    {acc.title}
                                  </h3>
                                </Link>
                                <p className="mt-1.5 text-xs font-medium text-brand-ink-muted flex items-center gap-1.5">
                                  <BedDouble className="w-3.5 h-3.5 shrink-0" />
                                  <span>{formatBedsSummary(acc)}</span>
                                </p>
                              </div>

                              <p className="text-sm text-brand-ink-secondary leading-relaxed line-clamp-3 break-words">
                                {acc.short_description}
                              </p>

                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                {acc.has_ac && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-bg border border-brand-navy/10 text-xs font-medium text-brand-navy">
                                    <Snowflake className="w-3 h-3 shrink-0" />
                                    <span>Ar-condicionado</span>
                                  </span>
                                )}
                                {acc.has_tv && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-bg border border-brand-navy/10 text-xs font-medium text-brand-navy">
                                    <Tv className="w-3 h-3 shrink-0" />
                                    <span>TV</span>
                                  </span>
                                )}
                                {acc.has_kitchen && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-bg border border-brand-navy/10 text-xs font-medium text-brand-navy">
                                    <Utensils className="w-3 h-3 shrink-0" />
                                    <span>Cozinha</span>
                                  </span>
                                )}
                                {acc.has_kitchen_utensils &&
                                  !acc.has_kitchen && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-bg border border-brand-navy/10 text-xs font-medium text-brand-navy">
                                      <Refrigerator className="w-3 h-3 shrink-0" />
                                      <span>Frigobar e utensílios</span>
                                    </span>
                                  )}
                                {acc.has_wifi && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-bg border border-brand-navy/10 text-xs font-medium text-brand-navy">
                                    <Wifi className="w-3 h-3 shrink-0" />
                                    <span>Wi-Fi</span>
                                  </span>
                                )}
                                {acc.has_private_bathroom && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-bg border border-brand-navy/10 text-xs font-medium text-brand-navy">
                                    <Bath className="w-3 h-3 shrink-0" />
                                    <span>Banheiro privativo</span>
                                  </span>
                                )}
                                {acc.is_pet_friendly && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-bg border border-brand-navy/10 text-xs font-medium text-brand-navy">
                                    <Dog className="w-3 h-3 shrink-0" />
                                    <span>Pet friendly</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0">
                            <Link
                              to={`/acomodacoes/${acc.slug}`}
                              onClick={() =>
                                trackLinkClick(
                                  null,
                                  `view_accommodation_${acc.slug}`,
                                )
                              }
                              className="w-full inline-flex items-center justify-between gap-2 min-h-11 px-4 rounded-xl bg-brand-navy hover:bg-brand-navy-light text-white font-semibold text-sm transition-colors"
                            >
                              <span>Ver fotos e detalhes</span>
                              <ArrowRight className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
                            </Link>
                          </div>
                        </article>
                      );
                    })}
                  </Reveal>
                ) : (
                  <div className="rounded-2xl bg-white border border-brand-navy/10 p-8 text-center">
                    <p className="text-sm text-brand-ink-secondary">
                      Consulte nossa equipe pelo WhatsApp para conhecer as
                      opções de acomodações disponíveis.
                    </p>
                  </div>
                )}
              </section>

              <Reveal direction="up">
                <section
                  id="localizacao"
                  aria-labelledby="localizacao-heading"
                  className="scroll-mt-24 rounded-2xl sm:rounded-3xl bg-white border border-brand-navy/10 overflow-hidden"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12">
                    <div className="lg:col-span-5 p-6 sm:p-9 lg:p-10 flex flex-col justify-between gap-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm font-medium text-brand-ink-muted">
                          <span
                            aria-hidden="true"
                            className="w-8 h-0.5 bg-brand-green shrink-0"
                          />
                          <span className="tabular-nums font-semibold text-brand-navy">
                            {formatChapterNumber(locationChapter)}
                          </span>
                          <span
                            aria-hidden="true"
                            className="text-brand-navy/30"
                          >
                            ·
                          </span>
                          <span>Onde estamos</span>
                        </div>

                        <h2
                          id="localizacao-heading"
                          className="font-display font-medium text-3xl text-brand-navy tracking-[-0.02em] leading-[1.12]"
                        >
                          Localização e como chegar
                        </h2>

                        {location.address && (
                          <p className="text-sm sm:text-base font-semibold text-brand-navy break-words">
                            {location.address}
                          </p>
                        )}

                        {location.instructions && (
                          <p className="text-sm text-brand-ink-secondary leading-relaxed break-words">
                            {location.instructions}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5">
                        <a
                          href={location.maps_url || "https://maps.google.com"}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() =>
                            trackGuideInteraction("landing_open_maps")
                          }
                          className="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl bg-brand-navy hover:bg-brand-navy-light text-white font-semibold text-sm transition-colors"
                        >
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span>Abrir no Google Maps</span>
                        </a>

                        <a
                          href={location.waze_url || "https://waze.com/ul"}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() =>
                            trackGuideInteraction("landing_open_waze")
                          }
                          className="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl bg-brand-bg hover:bg-brand-surface text-brand-navy border border-brand-navy/15 font-semibold text-sm transition-colors"
                        >
                          <WazeIcon className="w-4 h-4 shrink-0" />
                          <span>Ir com Waze</span>
                        </a>
                      </div>
                    </div>

                    <div className="lg:col-span-7 p-3 sm:p-4 lg:pl-0">
                      {cleanEmbedUrl ? (
                        <SmoothMapEmbed
                          src={cleanEmbedUrl}
                          title="Mapa de localização da Pousada Moradas do Gabriel"
                          containerClassName="overflow-hidden rounded-xl sm:rounded-2xl border border-brand-navy/10 bg-brand-surface h-72 sm:h-96 lg:h-full lg:min-h-[380px]"
                          loadingLabel="Preparando mapa da pousada..."
                        />
                      ) : (
                        <div className="h-full min-h-[260px] rounded-xl sm:rounded-2xl bg-brand-bg border border-brand-navy/10 p-6 flex items-center justify-center text-center text-sm text-brand-ink-secondary">
                          Utilize os botões ao lado para traçar sua rota
                          diretamente pelo Google Maps ou Waze.
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </Reveal>
            </main>

            <footer className="bg-white border-t border-brand-navy/10 text-brand-navy">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-14 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-10">
                  <div className="md:col-span-5 space-y-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-white border border-brand-navy/10 p-1.5 flex items-center justify-center shrink-0">
                        <img
                          src="/logoMoradasdoGabriel.svg"
                          alt="Logo Pousada Moradas do Gabriel"
                          width={34}
                          height={34}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <p className="font-display font-medium text-lg text-brand-navy leading-tight">
                          {companyName}
                        </p>
                        {footerData?.cnpj && (
                          <p className="text-xs text-brand-ink-muted mt-0.5 tabular-nums">
                            CNPJ: {footerData.cnpj}
                          </p>
                        )}
                      </div>
                    </div>

                    {location.address && (
                      <p className="text-sm text-brand-ink-secondary leading-relaxed">
                        {location.address}
                      </p>
                    )}

                    {footerData?.check_in_out_info && (
                      <p className="text-xs font-medium text-brand-ink-muted">
                        {footerData.check_in_out_info}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-3 space-y-3">
                    <p className="text-sm font-semibold text-brand-navy">
                      Navegação
                    </p>
                    <ul className="space-y-1 text-sm font-medium text-brand-ink-secondary">
                      <li>
                        <a
                          href="#inicio"
                          className="inline-flex items-center min-h-10 hover:text-brand-navy transition-colors"
                        >
                          Início
                        </a>
                      </li>
                      {hasAboutContent && (
                        <li>
                          <a
                            href="#sobre"
                            className="inline-flex items-center min-h-10 hover:text-brand-navy transition-colors"
                          >
                            Sobre a pousada
                          </a>
                        </li>
                      )}
                      <li>
                        <a
                          href="#acomodacoes"
                          className="inline-flex items-center min-h-10 hover:text-brand-navy transition-colors"
                        >
                          Acomodações
                        </a>
                      </li>
                      <li>
                        <a
                          href="#localizacao"
                          className="inline-flex items-center min-h-10 hover:text-brand-navy transition-colors"
                        >
                          Localização
                        </a>
                      </li>
                      <li>
                        <Link
                          to="/links-contato"
                          className="inline-flex items-center gap-1.5 min-h-10 hover:text-brand-navy transition-colors"
                        >
                          <Compass className="w-3.5 h-3.5 shrink-0" />
                          <span>Central de links e contatos</span>
                        </Link>
                      </li>
                    </ul>
                  </div>

                  <div className="md:col-span-4 space-y-3">
                    <p className="text-sm font-semibold text-brand-navy">
                      Atendimento e reservas
                    </p>
                    <div className="space-y-1 text-sm font-medium text-brand-ink-secondary">
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 min-h-10 hover:text-brand-navy transition-colors"
                      >
                        <WhatsAppIcon className="w-4 h-4 shrink-0 text-brand-navy" />
                        <span>
                          WhatsApp{maskedWhatsapp ? `: ${maskedWhatsapp}` : ""}
                        </span>
                      </a>

                      {maskedPhone && (
                        <a
                          href={`tel:${contacts.phone.replace(/\D/g, "")}`}
                          className="flex items-center gap-2.5 min-h-10 hover:text-brand-navy transition-colors"
                        >
                          <Phone className="w-4 h-4 shrink-0 text-brand-navy" />
                          <span>Recepção: {maskedPhone}</span>
                        </a>
                      )}

                      <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 min-h-10 hover:text-brand-navy transition-colors"
                      >
                        <InstagramIcon className="w-4 h-4 shrink-0 text-brand-navy" />
                        <span>
                          Instagram
                          {maskedInstagram ? `: ${maskedInstagram}` : ""}
                        </span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-brand-navy/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-brand-ink-muted">
                  <p className="font-medium text-center sm:text-left">
                    © {new Date().getFullYear()} {companyName}.{" "}
                    {footerData?.copyright_note ||
                      "Todos os direitos reservados."}
                  </p>

                  <Link
                    to="/admin"
                    className="inline-flex items-center gap-1.5 min-h-11 px-2 text-xs font-medium text-brand-ink-muted hover:text-brand-navy transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Painel da pousada</span>
                  </Link>
                </div>
              </div>
            </footer>
          </div>
        </PageTransition>
      )}
    </>
  );
}
