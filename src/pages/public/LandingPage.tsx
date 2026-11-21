import {
  ArrowRight,
  Bath,
  BedDouble,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Dog,
  Lock,
  MapPin,
  Phone,
  RefreshCw,
  Refrigerator,
  Snowflake,
  Sparkles,
  Sun,
  Tv,
  Users,
  Utensils,
  Waves,
  Wifi,
} from "lucide-react";
import { AnimatePresence, m } from "motion/react";
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

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];
const HERO_BOOT_TIMEOUT_MS = 1200;

function formatBedsSummary(acc: TypedAccommodation): string {
  if (!acc.beds || acc.beds.length === 0) {
    return "Camas confortáveis";
  }
  return acc.beds.map((b) => `${b.count}x ${b.type}`).join(" • ");
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

  // Detecta na montagem se havia cache real (visitas recorrentes abrem em 0ms sem cortina)
  const [isColdBoot] = useState(
    () => !readPublicCache(PUBLIC_CACHE_KEYS.businessInfo)?.data,
  );
  const [readyHeroSrc, setReadyHeroSrc] = useState<string | null>(null);
  const [heroPreloadTimedOut, setHeroPreloadTimedOut] = useState(false);

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"next" | "previous">(
    "next",
  );
  const [isPaused, setIsPaused] = useState(false);
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

  // Na 1ª visita (cache frio), pré-carrega a 1ª foto da Hero com teto máximo de 1,2s
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

  // Após a entrada inicial, pré-carrega os demais slides da Hero em segundo plano
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

  // Controla a exibição do Header Flutuante Centralizado apenas ao rolar a página
  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingHeader(window.scrollY > 140);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Autoplay do Carrossel da Hero Section
  useEffect(() => {
    if (showBrandCurtain || isPaused || slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setSlideDirection("next");
      setActiveSlideIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [showBrandCurtain, isPaused, slides.length]);

  // Erro real de rede na 1ª visita sem cache: estado limpo sem fallback falso
  if (isBusinessError && !businessInfo) {
    return (
      <div className="min-h-screen bg-brand-bg text-brand-navy flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-8 text-center shadow-xs space-y-4">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-brand-bg border border-slate-200 p-2 flex items-center justify-center">
            <img
              src="/logoMoradasdoGabriel.svg"
              alt="Logo Pousada Moradas do Gabriel"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-xl font-bold text-brand-navy">
            Não foi possível carregar o site
          </h1>
          <p className="text-sm text-brand-navy/75 leading-relaxed">
            Verifique sua conexão com a internet e tente novamente em alguns
            instantes.
          </p>
          <button
            type="button"
            onClick={() => void refetchBusiness()}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-navy hover:bg-brand-navy-light text-white text-sm font-semibold transition-colors"
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

  const handleSelectSlide = (index: number) => {
    setSlideDirection(index >= safeSlideIndex ? "next" : "previous");
    setActiveSlideIndex(index);
  };

  const handlePrevSlide = () => {
    if (slides.length <= 1) return;
    setSlideDirection("previous");
    setActiveSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNextSlide = () => {
    if (slides.length <= 1) return;
    setSlideDirection("next");
    setActiveSlideIndex((prev) => (prev + 1) % slides.length);
  };

  const handleHeroTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setIsPaused(true);
  };

  const handleHeroTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    setIsPaused(false);
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

  return (
    <>
      <BrandLoader show={showBrandCurtain} />

      {businessInfo && !showBrandCurtain && (
        <PageTransition>
          <div
            id="inicio"
            className="min-h-screen bg-brand-bg text-brand-navy flex flex-col justify-between"
          >
            {/* HEADER FLUTUANTE CENTRALIZADO (Aparece somente ao rolar a página) */}
            <AnimatePresence>
              {showFloatingHeader && (
                <m.div
                  key="floating-header"
                  initial={{ opacity: 0, y: -18, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -14, scale: 0.98 }}
                  transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
                  className="fixed top-3.5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-2xl"
                >
                  <nav
                    aria-label="Navegação flutuante"
                    className="px-3 sm:px-4 py-2 rounded-2xl bg-white/98 backdrop-blur-md border border-white ring-2 ring-white/70 shadow-[0_14px_35px_-10px_rgba(11,41,99,0.3)] flex items-center justify-between gap-2"
                  >
                    <a
                      href="#inicio"
                      className="flex items-center gap-2 min-w-0 shrink-0"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0 shadow-sm">
                        <img
                          src="/logoMoradasdoGabriel.svg"
                          alt="Moradas do Gabriel"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="font-bold text-xs sm:text-sm text-brand-navy hidden xs:inline truncate">
                        Moradas do Gabriel
                      </span>
                    </a>

                    <div className="flex items-center gap-1 sm:gap-2 text-xs font-semibold text-brand-navy/80">
                      <a
                        href="#sobre"
                        className="px-2.5 py-1.5 rounded-lg hover:bg-brand-bg hover:text-brand-navy transition-colors"
                      >
                        Sobre
                      </a>
                      <a
                        href="#acomodacoes"
                        className="px-2.5 py-1.5 rounded-lg hover:bg-brand-bg hover:text-brand-navy transition-colors"
                      >
                        Acomodações
                      </a>
                      <a
                        href="#localizacao"
                        className="px-2.5 py-1.5 rounded-lg hover:bg-brand-bg hover:text-brand-navy transition-colors hidden sm:inline-block"
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
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-green hover:bg-brand-green/85 text-brand-navy text-xs font-bold shadow-sm transition-colors shrink-0"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>Reservar</span>
                    </a>
                  </nav>
                </m.div>
              )}
            </AnimatePresence>

            <main className="w-full max-w-6xl mx-auto px-4 pt-5 pb-16 space-y-14 sm:space-y-20">
              {/* ===================================================================
                  1. HERO SECTION COM CARROSSEL DE IMAGENS POR TÓPICOS
              =================================================================== */}
              <section aria-label="Destaques da Pousada" className="space-y-4">
                {/* Topo Editorial da Hero */}
                <m.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
                  className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0">
                      <img
                        src="/logoMoradasdoGabriel.svg"
                        alt="Logo Pousada Moradas do Gabriel"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-brand-navy/60">
                        Hospedagem & Lazer no Litoral
                      </span>
                      <p className="text-base sm:text-lg font-bold text-brand-navy truncate">
                        {companyName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href="#acomodacoes"
                      className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy text-xs font-semibold hover:bg-slate-100 transition-colors"
                    >
                      <BedDouble className="w-4 h-4 shrink-0" />
                      <span>Conhecer Acomodações</span>
                    </a>

                    <Link
                      to="/links-contato"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-brand-navy text-xs font-semibold hover:bg-slate-50 transition-colors"
                    >
                      <span>Links & Contatos</span>
                    </Link>

                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackLinkClick(null, "hero_top_whatsapp")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-navy hover:bg-brand-navy-light text-white text-xs font-semibold transition-colors"
                    >
                      <WhatsAppIcon className="w-4 h-4 shrink-0" />
                      <span>Reservar</span>
                    </a>
                  </div>
                </m.div>

                {/* Carrossel Principal por Tópicos (Acomodações, Praias, Destinos, Sobre a Pousada) */}
                {slides.length > 0 && currentSlide && (
                  <m.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.58,
                      delay: 0.06,
                      ease: EASE_OUT_EXPO,
                    }}
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                    onTouchStart={handleHeroTouchStart}
                    onTouchEnd={handleHeroTouchEnd}
                    className="rounded-3xl bg-white border border-slate-200 p-2.5 sm:p-4 shadow-xs space-y-2.5 sm:space-y-3"
                  >
                    {/* Abas de Tópicos do Carrossel com Pílula Deslizante */}
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1 flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {slides.map((slide, idx) => {
                          const isActive = idx === safeSlideIndex;
                          return (
                            <button
                              key={slide.id || idx}
                              type="button"
                              onClick={() => handleSelectSlide(idx)}
                              className={`relative ${
                                !isActive ? "hidden sm:inline-flex" : "inline-flex"
                              } shrink-0 whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                                isActive
                                  ? "text-white"
                                  : "bg-brand-bg text-brand-navy/75 border border-slate-200 hover:text-brand-navy hover:bg-slate-100"
                              }`}
                            >
                              {isActive && (
                                <m.span
                                  layoutId="hero-topic-pill"
                                  transition={{
                                    type: "spring",
                                    stiffness: 380,
                                    damping: 32,
                                  }}
                                  className="hidden sm:block absolute inset-0 rounded-xl bg-brand-navy shadow-xs"
                                />
                              )}
                              {isActive && (
                                <span
                                  aria-hidden="true"
                                  className="sm:hidden absolute inset-0 rounded-xl bg-brand-navy shadow-xs"
                                />
                              )}
                              <span className="relative z-10">
                                {slide.topic}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {slides.length > 1 && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={handlePrevSlide}
                            aria-label="Slide anterior"
                            className="w-9 h-9 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center hover:bg-slate-100 transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleNextSlide}
                            aria-label="Próximo slide"
                            className="w-9 h-9 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center hover:bg-slate-100 transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Banner Visual do Slide Ativo com Crossfade Suave */}
                    <div className="relative overflow-hidden rounded-2xl min-h-[440px] sm:min-h-[460px] flex items-end bg-brand-navy">
                      <AnimatePresence initial={false}>
                        {currentSlide.image_url && (
                          <m.div
                            key={currentSlide.image_url || currentSlide.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{
                              duration: 0.65,
                              ease: EASE_OUT_EXPO,
                            }}
                            className="absolute inset-0"
                          >
                            <SmoothImage
                              src={currentSlide.image_url}
                              alt={currentSlide.title}
                              theme="dark"
                              targetOpacity={0.82}
                              priority={safeSlideIndex === 0}
                              containerClassName="relative w-full h-full overflow-hidden"
                              className="w-full h-full object-cover"
                            />
                          </m.div>
                        )}
                      </AnimatePresence>

                      <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/95 via-brand-navy/55 to-brand-navy/15 pointer-events-none" />

                      <AnimatePresence mode="wait">
                        <m.div
                          key={`${currentSlide.id}-${safeSlideIndex}`}
                          initial={{
                            opacity: 0,
                            x: slideDirection === "next" ? 18 : -18,
                            y: 10,
                          }}
                          animate={{ opacity: 1, x: 0, y: 0 }}
                          exit={{
                            opacity: 0,
                            x: slideDirection === "next" ? -14 : 14,
                            transition: { duration: 0.22, ease: "easeIn" },
                          }}
                          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
                          className="relative z-10 w-full p-5 sm:p-10 md:p-12 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6"
                        >
                          <div className="max-w-2xl space-y-2.5 sm:space-y-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs border border-white/25 text-white text-[11px] font-semibold uppercase tracking-wider">
                              <Waves className="w-3.5 h-3.5 shrink-0" />
                              <span>{currentSlide.topic}</span>
                            </span>

                            <h1 className="text-xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight break-words">
                              {currentSlide.title}
                            </h1>

                            <p className="text-sm sm:text-base text-white/85 leading-relaxed max-w-xl break-words">
                              {currentSlide.subtitle}
                            </p>
                          </div>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                            <a
                              href={currentSlide.cta_href || "#acomodacoes"}
                              className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-xl bg-white text-brand-navy font-bold text-xs sm:text-sm hover:bg-brand-bg transition-colors"
                            >
                              <span>
                                {currentSlide.cta_label || "Saiba Mais"}
                              </span>
                              <ArrowRight className="w-4 h-4 shrink-0" />
                            </a>

                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() =>
                                trackLinkClick(null, "hero_slide_whatsapp")
                              }
                              className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-xl bg-brand-navy/85 backdrop-blur-xs border border-white/30 text-white font-semibold text-xs sm:text-sm hover:bg-brand-navy transition-colors"
                            >
                              <WhatsAppIcon className="w-4 h-4 shrink-0" />
                              <span>Consultar Datas</span>
                            </a>
                          </div>
                        </m.div>
                      </AnimatePresence>
                    </div>
                  </m.div>
                )}
              </section>

              {/* ===================================================================
                  2. SOBRE A POUSADA (BENTO GRID EDITORIAL MODERNO)
              =================================================================== */}
              {hasAboutContent && aboutData && (
                <Reveal className="space-y-6" direction="up">
                  <section
                    id="sobre"
                    aria-label="Sobre a Pousada"
                    className="scroll-mt-24 space-y-6"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                      {/* Coluna Texto Principal */}
                      <div
                        className={`${
                          hasAboutImage ? "lg:col-span-7" : "lg:col-span-12"
                        } rounded-3xl bg-white border border-slate-200 p-6 sm:p-9 shadow-xs flex flex-col justify-between space-y-6`}
                      >
                        <div className="space-y-4">
                          {aboutData.badge && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-bg border border-slate-200 text-brand-navy text-[11px] font-semibold uppercase tracking-wider">
                              <Sun className="w-3.5 h-3.5 shrink-0" />
                              <span>{aboutData.badge}</span>
                            </div>
                          )}

                          {aboutData.title && (
                            <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy tracking-tight leading-snug break-words">
                              {aboutData.title}
                            </h2>
                          )}

                          {aboutData.description && (
                            <p className="text-sm sm:text-base text-brand-navy/80 leading-relaxed break-words">
                              {aboutData.description}
                            </p>
                          )}

                          {aboutData.secondary_description && (
                            <p className="text-sm sm:text-base text-brand-navy/75 leading-relaxed break-words">
                              {aboutData.secondary_description}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-slate-200">
                          <a
                            href="#acomodacoes"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-navy text-white text-xs sm:text-sm font-semibold hover:bg-brand-navy-light transition-colors"
                          >
                            <BedDouble className="w-4 h-4 shrink-0" />
                            <span>Explorar Acomodações</span>
                          </a>

                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() =>
                              trackLinkClick(null, "about_whatsapp")
                            }
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy text-xs sm:text-sm font-semibold hover:bg-slate-100 transition-colors"
                          >
                            <WhatsAppIcon className="w-4 h-4 shrink-0" />
                            <span>Falar com nossa equipe</span>
                          </a>
                        </div>
                      </div>

                      {/* Coluna Foto Editorial (somente quando cadastrada no Painel Admin) */}
                      {hasAboutImage && (
                        <div className="lg:col-span-5 rounded-3xl overflow-hidden bg-white border border-slate-200 p-3 shadow-xs flex flex-col">
                          <div className="relative flex-1 min-h-[260px] rounded-2xl overflow-hidden bg-brand-bg">
                            <SmoothImage
                              src={aboutData.image_url}
                              alt={aboutData.title || companyName}
                              containerClassName="relative w-full h-full min-h-[260px] overflow-hidden"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-white/95 backdrop-blur-xs border border-slate-200 p-3.5 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-brand-navy text-white flex items-center justify-center shrink-0">
                                <Sparkles className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-brand-navy truncate">
                                  Ambiente Familiar & Costeiro
                                </p>
                                <p className="text-[11px] text-brand-navy/70 truncate">
                                  Conforto, sossego e fácil acesso às praias
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bento Grid de Diferenciais da Pousada */}
                    {aboutData.highlights.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {aboutData.highlights.map((item, idx) => (
                          <div
                            key={`${item.title}-${idx}`}
                            className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-3"
                          >
                            <div className="space-y-2">
                              {item.badge && (
                                <span className="inline-block px-2.5 py-0.5 rounded-md bg-brand-bg border border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-brand-navy/75">
                                  {item.badge}
                                </span>
                              )}
                              <h3 className="text-base font-bold text-brand-navy break-words">
                                {item.title}
                              </h3>
                              <p className="text-xs sm:text-sm text-brand-navy/75 leading-relaxed break-words">
                                {item.description}
                              </p>
                            </div>
                            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-brand-navy/65">
                              <CheckCircle2 className="w-3.5 h-3.5 text-brand-navy shrink-0" />
                              <span>{companyName}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </Reveal>
              )}

              {/* ===================================================================
                  3. PREVIEW DAS ACOMODAÇÕES (Com páginas individuais editáveis)
              =================================================================== */}
              <section
                id="acomodacoes"
                aria-label="Nossas Acomodações"
                className="scroll-mt-24 space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-brand-navy text-[11px] font-semibold uppercase tracking-wider">
                      <BedDouble className="w-3.5 h-3.5 shrink-0" />
                      <span>Hospedagem</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy tracking-tight">
                      Conheça Nossas Acomodações
                    </h2>
                    <p className="text-sm sm:text-base text-brand-navy/75 max-w-2xl">
                      Escolha a opção ideal para a sua estadia. Clique em uma
                      acomodação para ver a galeria completa de fotos,
                      configuração de camas e todas as comodidades.
                    </p>
                  </div>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackLinkClick(null, "accommodations_section_cta")
                    }
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-brand-navy text-xs sm:text-sm font-semibold transition-colors shrink-0"
                  >
                    <WhatsAppIcon className="w-4 h-4 shrink-0" />
                    <span>Consultar Tarifas no WhatsApp</span>
                  </a>
                </div>

                {isLoadingAccommodations && accommodations.length === 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        aria-hidden="true"
                        className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="h-56 bg-brand-bg media-shimmer-light" />
                          <div className="p-5 space-y-3.5">
                            <div className="space-y-2">
                              <div className="h-5 w-3/4 rounded-lg bg-slate-100 media-shimmer-light" />
                              <div className="h-3.5 w-1/2 rounded-md bg-slate-100" />
                            </div>
                            <div className="space-y-2 pt-1">
                              <div className="h-3.5 w-full rounded-md bg-slate-100" />
                              <div className="h-3.5 w-5/6 rounded-md bg-slate-100" />
                            </div>
                            <div className="flex gap-1.5 pt-1">
                              <div className="h-6 w-24 rounded-lg bg-brand-bg border border-slate-200" />
                              <div className="h-6 w-16 rounded-lg bg-brand-bg border border-slate-200" />
                              <div className="h-6 w-16 rounded-lg bg-brand-bg border border-slate-200" />
                            </div>
                          </div>
                        </div>
                        <div className="p-5 pt-0">
                          <div className="h-11 rounded-xl bg-slate-100 media-shimmer-light" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : accommodations.length > 0 ? (
                  <Reveal
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                    direction="up"
                  >
                    {accommodations.map((acc) => (
                      <article
                        key={acc.id}
                        className="motion-card rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between group hover:border-brand-navy/35 transition-colors"
                      >
                        <div>
                          {/* Foto de Capa */}
                          <Link
                            to={`/acomodacoes/${acc.slug}`}
                            className="block relative h-56 overflow-hidden bg-brand-bg"
                          >
                            <div className="w-full h-full transition-transform duration-500 group-hover:scale-105">
                              <SmoothImage
                                src={acc.cover_image}
                                alt={acc.title}
                                containerClassName="relative w-full h-full overflow-hidden"
                                className="w-full h-full object-cover"
                                fallback={
                                  <div className="w-full h-full flex items-center justify-center text-brand-navy/40">
                                    <BedDouble className="w-10 h-10" />
                                  </div>
                                }
                              />
                            </div>

                            <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-xs border border-slate-200 text-brand-navy text-xs font-bold shadow-xs">
                              <Users className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                Até {acc.max_guests}{" "}
                                {acc.max_guests === 1 ? "pessoa" : "pessoas"}
                              </span>
                            </div>
                          </Link>

                          {/* Conteúdo do Card */}
                          <div className="p-5 space-y-3.5">
                            <div>
                              <Link
                                to={`/acomodacoes/${acc.slug}`}
                                className="hover:underline"
                              >
                                <h3 className="text-lg font-bold text-brand-navy break-words leading-snug">
                                  {acc.title}
                                </h3>
                              </Link>
                              <p className="mt-1 text-xs font-semibold text-brand-navy/65 flex items-center gap-1.5">
                                <BedDouble className="w-3.5 h-3.5 shrink-0" />
                                <span>{formatBedsSummary(acc)}</span>
                              </p>
                            </div>

                            <p className="text-xs sm:text-sm text-brand-navy/75 leading-relaxed line-clamp-3 break-words">
                              {acc.short_description}
                            </p>

                            {/* Tópicos de Comodidades */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              {acc.has_ac && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-bg border border-slate-200 text-[11px] font-semibold text-brand-navy">
                                  <Snowflake className="w-3 h-3 shrink-0" />
                                  <span>Ar-condicionado</span>
                                </span>
                              )}
                              {acc.has_tv && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-bg border border-slate-200 text-[11px] font-semibold text-brand-navy">
                                  <Tv className="w-3 h-3 shrink-0" />
                                  <span>TV</span>
                                </span>
                              )}
                              {acc.has_kitchen && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-bg border border-slate-200 text-[11px] font-semibold text-brand-navy">
                                  <Utensils className="w-3 h-3 shrink-0" />
                                  <span>Cozinha</span>
                                </span>
                              )}
                              {acc.has_kitchen_utensils && !acc.has_kitchen && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-bg border border-slate-200 text-[11px] font-semibold text-brand-navy">
                                  <Refrigerator className="w-3 h-3 shrink-0" />
                                  <span>Frigobar / Utensílios</span>
                                </span>
                              )}
                              {acc.has_wifi && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-bg border border-slate-200 text-[11px] font-semibold text-brand-navy">
                                  <Wifi className="w-3 h-3 shrink-0" />
                                  <span>Wi-Fi</span>
                                </span>
                              )}
                              {acc.has_private_bathroom && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-bg border border-slate-200 text-[11px] font-semibold text-brand-navy">
                                  <Bath className="w-3 h-3 shrink-0" />
                                  <span>Banheiro Privativo</span>
                                </span>
                              )}
                              {acc.is_pet_friendly && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-bg border border-slate-200 text-[11px] font-semibold text-brand-navy">
                                  <Dog className="w-3 h-3 shrink-0" />
                                  <span>Pet Friendly</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botão para Página Individual da Acomodação */}
                        <div className="p-5 pt-0">
                          <Link
                            to={`/acomodacoes/${acc.slug}`}
                            onClick={() =>
                              trackLinkClick(
                                null,
                                `view_accommodation_${acc.slug}`,
                              )
                            }
                            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-navy hover:bg-brand-navy-light text-white font-semibold text-xs sm:text-sm transition-colors"
                          >
                            <span>Ver Fotos e Detalhes</span>
                            <ArrowRight className="w-4 h-4 shrink-0" />
                          </Link>
                        </div>
                      </article>
                    ))}
                  </Reveal>
                ) : (
                  <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
                    <p className="text-sm text-brand-navy/75">
                      Consulte nossa equipe pelo WhatsApp para conhecer as
                      opções de acomodações disponíveis.
                    </p>
                  </div>
                )}
              </section>

              {/* ===================================================================
                  4. MAPA INCORPORADO COM A LOCALIZAÇÃO DA POUSADA
              =================================================================== */}
              <Reveal direction="up">
                <section
                  id="localizacao"
                  aria-label="Localização da Pousada"
                  className="scroll-mt-24 rounded-3xl bg-white border border-slate-200 p-6 sm:p-9 shadow-xs space-y-6"
                >
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-bg border border-slate-200 text-brand-navy text-[11px] font-semibold uppercase tracking-wider">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>Onde Estamos</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy tracking-tight">
                        Localização & Como Chegar
                      </h2>
                      {location.address && (
                        <p className="text-sm sm:text-base font-semibold text-brand-navy/85 break-words">
                          {location.address}
                        </p>
                      )}
                      {location.instructions && (
                        <p className="text-xs sm:text-sm text-brand-navy/70 max-w-2xl leading-relaxed break-words">
                          {location.instructions}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
                      <a
                        href={location.maps_url || "https://maps.google.com"}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          trackGuideInteraction("landing_open_maps")
                        }
                        className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-navy text-white font-semibold text-xs sm:text-sm hover:bg-brand-navy-light transition-colors"
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
                        className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-bg hover:bg-slate-100 text-brand-navy border border-slate-200 font-semibold text-xs sm:text-sm transition-colors"
                      >
                        <WazeIcon className="w-4 h-4 shrink-0" />
                        <span>Ir com Waze</span>
                      </a>
                    </div>
                  </div>

                  {cleanEmbedUrl ? (
                    <SmoothMapEmbed
                      src={cleanEmbedUrl}
                      title="Mapa de Localização - Pousada Moradas do Gabriel"
                      containerClassName="overflow-hidden rounded-2xl border border-slate-200 bg-brand-bg h-72 sm:h-96"
                      loadingLabel="Preparando mapa da pousada..."
                    />
                  ) : (
                    <div className="rounded-2xl bg-brand-bg border border-slate-200 p-6 text-center text-sm text-brand-navy/75">
                      Utilize os botões acima para traçar sua rota diretamente
                      pelo Google Maps ou Waze.
                    </div>
                  )}
                </section>
              </Reveal>
            </main>

            {/* =====================================================================
                5. FOOTER FORMAL COM INFORMAÇÕES DA POUSADA E DIREITOS RESERVADOS
            ===================================================================== */}
            <footer className="bg-white border-t border-slate-200 text-brand-navy">
              <div className="max-w-6xl mx-auto px-4 py-10 sm:py-12 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* Coluna 1: Identidade e Informações Formais */}
                  <div className="md:col-span-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0">
                        <img
                          src="/logoMoradasdoGabriel.svg"
                          alt="Logo Pousada Moradas do Gabriel"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-base text-brand-navy">
                          {companyName}
                        </p>
                        {footerData?.cnpj && (
                          <p className="text-xs text-brand-navy/65">
                            CNPJ: {footerData.cnpj}
                          </p>
                        )}
                      </div>
                    </div>

                    {location.address && (
                      <p className="text-xs sm:text-sm text-brand-navy/75 leading-relaxed">
                        {location.address}
                      </p>
                    )}

                    {footerData?.check_in_out_info && (
                      <p className="text-xs font-semibold text-brand-navy/70">
                        {footerData.check_in_out_info}
                      </p>
                    )}
                  </div>

                  {/* Coluna 2: Navegação Rápida */}
                  <div className="md:col-span-3 space-y-2.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-navy/60">
                      Navegação
                    </p>
                    <ul className="space-y-2 text-xs sm:text-sm font-semibold text-brand-navy/80">
                      <li>
                        <a
                          href="#inicio"
                          className="hover:text-brand-navy transition-colors"
                        >
                          Início
                        </a>
                      </li>
                      <li>
                        <a
                          href="#sobre"
                          className="hover:text-brand-navy transition-colors"
                        >
                          Sobre a Pousada
                        </a>
                      </li>
                      <li>
                        <a
                          href="#acomodacoes"
                          className="hover:text-brand-navy transition-colors"
                        >
                          Acomodações
                        </a>
                      </li>
                      <li>
                        <a
                          href="#localizacao"
                          className="hover:text-brand-navy transition-colors"
                        >
                          Localização
                        </a>
                      </li>
                      <li>
                        <Link
                          to="/links-contato"
                          className="inline-flex items-center gap-1 hover:text-brand-navy transition-colors"
                        >
                          <Compass className="w-3.5 h-3.5 shrink-0" />
                          <span>Central de Links & Contatos</span>
                        </Link>
                      </li>
                    </ul>
                  </div>

                  {/* Coluna 3: Canais de Atendimento */}
                  <div className="md:col-span-4 space-y-2.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-navy/60">
                      Atendimento & Reservas
                    </p>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 font-semibold text-brand-navy/85 hover:text-brand-navy transition-colors"
                      >
                        <WhatsAppIcon className="w-4 h-4 shrink-0" />
                        <span>
                          WhatsApp{maskedWhatsapp ? `: ${maskedWhatsapp}` : ""}
                        </span>
                      </a>

                      {maskedPhone && (
                        <a
                          href={`tel:${contacts.phone.replace(/\D/g, "")}`}
                          className="flex items-center gap-2 font-semibold text-brand-navy/85 hover:text-brand-navy transition-colors"
                        >
                          <Phone className="w-4 h-4 shrink-0" />
                          <span>Recepção: {maskedPhone}</span>
                        </a>
                      )}

                      <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 font-semibold text-brand-navy/85 hover:text-brand-navy transition-colors"
                      >
                        <InstagramIcon className="w-4 h-4 shrink-0" />
                        <span>
                          Instagram
                          {maskedInstagram ? `: ${maskedInstagram}` : ""}
                        </span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Linha Final: Carimbo de Direitos Reservados + Acesso Admin */}
                <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-brand-navy/65">
                  <p className="font-medium text-center sm:text-left">
                    © {new Date().getFullYear()} {companyName}.{" "}
                    {footerData?.copyright_note ||
                      "Todos os direitos reservados."}
                  </p>

                  <Link
                    to="/admin"
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-navy/50 hover:text-brand-navy transition-colors"
                  >
                    <Lock className="w-3 h-3 shrink-0" />
                    <span>Painel da Pousada</span>
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
