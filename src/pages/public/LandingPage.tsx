import {
  ArrowRight,
  Bath,
  BedDouble,
  Compass,
  Dog,
  Lock,
  MapPin,
  Phone,
  RefreshCw,
  Refrigerator,
  Snowflake,
  Tv,
  Users,
  Utensils,
  Wifi,
} from "lucide-react";
import {
  AnimatePresence,
  m,
  useReducedMotion,
  useScroll,
  useSpring,
} from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { TypedAccommodation } from "../../@types/database.types";
import { BrandLoader } from "../../components/public/BrandLoader";
import { EditorialParallaxPhoto } from "../../components/public/EditorialParallaxPhoto";
import { HeroStage } from "../../components/public/HeroStage";
import {
  EditorialCurtain,
  HorizonDivider,
  MaskedLine,
  PageTransition,
  Reveal,
  StaggerGroup,
  StaggerItem,
} from "../../components/public/Motion";
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
  const { scrollYProgress } = useScroll();
  const readingProgress = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 32,
    restDelta: 0.001,
  });

  // Detecta na montagem se já existe cache local para evitar cortina em visitas recorrentes
  const [isColdBoot] = useState(
    () => !readPublicCache(PUBLIC_CACHE_KEYS.businessInfo)?.data,
  );
  const [readyHeroSrc, setReadyHeroSrc] = useState<string | null>(null);
  const [heroPreloadTimedOut, setHeroPreloadTimedOut] = useState(false);
  const [showFloatingHeader, setShowFloatingHeader] = useState(false);

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
          <h1 className="font-display text-2xl font-semibold text-brand-navy">
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

            {/* Único elemento com backdrop-blur na página, agora com linha de progresso de leitura */}
            <AnimatePresence>
              {showFloatingHeader && (
                <m.div
                  key="floating-header"
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
                  className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-2xl"
                >
                  <nav
                    aria-label="Navegação rápida ao rolar"
                    className="relative overflow-hidden px-2.5 sm:px-3.5 py-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-brand-navy/12 shadow-[0_14px_34px_-12px_rgba(11,41,99,0.25)] flex items-center justify-between gap-2"
                  >
                    <a
                      href="#inicio"
                      aria-label="Voltar ao início"
                      className="flex items-center justify-center sm:justify-start gap-2 min-h-11 min-w-11 px-1 rounded-xl shrink-0"
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
                      <span className="font-display font-semibold text-sm text-brand-navy hidden sm:inline truncate max-w-[160px]">
                        Moradas do Gabriel
                      </span>
                    </a>

                    <div className="flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-medium text-brand-ink-secondary">
                      {hasAboutContent && (
                        <a
                          href="#sobre"
                          className="inline-flex items-center min-h-11 px-2 sm:px-3 rounded-xl hover:bg-brand-bg hover:text-brand-navy transition-colors"
                        >
                          Sobre
                        </a>
                      )}
                      <a
                        href="#acomodacoes"
                        className="inline-flex items-center min-h-11 px-2 sm:px-3 rounded-xl hover:bg-brand-bg hover:text-brand-navy transition-colors"
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
                      className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3 sm:px-4 rounded-xl bg-brand-green hover:bg-[#BFD37E] active:scale-[0.985] text-brand-navy text-xs sm:text-sm font-semibold transition-[background-color,transform] shrink-0"
                    >
                      <WhatsAppIcon className="w-4 h-4 shrink-0" />
                      <span>Reservar</span>
                    </a>

                    {!prefersReducedMotion && (
                      <m.span
                        aria-hidden="true"
                        style={{ scaleX: readingProgress }}
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-green origin-left pointer-events-none"
                      />
                    )}
                  </nav>
                </m.div>
              )}
            </AnimatePresence>

            {/* Hero 100% Full-Bleed ocupando toda a primeira dobra dinâmica */}
            <HeroStage
              companyName={companyName}
              slides={slides}
              whatsappUrl={whatsappUrl}
              locationAddress={location.address}
              hasAboutContent={hasAboutContent}
              onLeaveHeroChange={setShowFloatingHeader}
            />

            <main
              id="conteudo-principal"
              className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 sm:pb-28 space-y-20 sm:space-y-28"
            >
              {hasAboutContent && aboutData && (
                <section
                  id="sobre"
                  aria-labelledby="sobre-heading"
                  className="scroll-mt-24 space-y-12 sm:space-y-16"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                    <div
                      className={`${
                        hasAboutImage ? "lg:col-span-6" : "lg:col-span-9"
                      } space-y-5`}
                    >
                      <Reveal direction="up">
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
                      </Reveal>

                      {aboutData.title && (
                        <MaskedLine inView delay={60}>
                          <h2
                            id="sobre-heading"
                            className="font-display font-semibold text-3xl sm:text-4xl lg:text-[2.5rem] text-brand-navy tracking-[-0.025em] leading-[1.08] text-balance break-words"
                          >
                            {aboutData.title}
                          </h2>
                        </MaskedLine>
                      )}

                      <Reveal direction="up" delay={120}>
                        <div className="space-y-4">
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
                              className="inline-flex items-center justify-center min-h-11 px-5 rounded-xl bg-brand-navy hover:bg-brand-navy-light active:scale-[0.985] text-white text-sm font-semibold transition-[background-color,transform]"
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
                              className="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl bg-white border border-brand-navy/15 hover:border-brand-navy/35 hover:bg-brand-surface active:scale-[0.985] text-brand-navy text-sm font-semibold transition-[background-color,border-color,transform]"
                            >
                              <WhatsAppIcon className="w-4 h-4 shrink-0" />
                              <span>Falar pelo WhatsApp</span>
                            </a>
                          </div>
                        </div>
                      </Reveal>
                    </div>

                    {hasAboutImage && (
                      <div className="lg:col-span-6">
                        <EditorialParallaxPhoto
                          src={aboutData.image_url}
                          alt={aboutData.title || companyName}
                        />
                      </div>
                    )}
                  </div>

                  {aboutData.highlights.length > 0 && (
                    <div className="space-y-8 sm:space-y-10">
                      <HorizonDivider />
                      <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-7">
                        {aboutData.highlights.map((item, idx) => (
                          <StaggerItem
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
                          </StaggerItem>
                        ))}
                      </StaggerGroup>
                    </div>
                  )}
                </section>
              )}

              <section
                id="acomodacoes"
                aria-labelledby="acomodacoes-heading"
                className="scroll-mt-24 space-y-8 sm:space-y-10"
              >
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
                  <div className="space-y-3">
                    <Reveal direction="up">
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
                    </Reveal>

                    <MaskedLine inView delay={60}>
                      <h2
                        id="acomodacoes-heading"
                        className="font-display font-semibold text-3xl sm:text-4xl lg:text-[2.5rem] text-brand-navy tracking-[-0.025em] leading-[1.08]"
                      >
                        Acomodações para sua estadia
                      </h2>
                    </MaskedLine>

                    <Reveal direction="up" delay={120}>
                      <p className="text-sm sm:text-base text-brand-ink-secondary max-w-xl leading-relaxed">
                        Escolha a opção ideal para sua viagem. Abra qualquer
                        acomodação para ver a galeria completa, disposição de
                        camas e comodidades.
                      </p>
                    </Reveal>
                  </div>

                  <Reveal direction="up" delay={120}>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        trackLinkClick(null, "accommodations_section_cta")
                      }
                      className="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl bg-white border border-brand-navy/15 hover:border-brand-navy/35 hover:bg-brand-surface active:scale-[0.985] text-brand-navy text-sm font-semibold transition-[background-color,border-color,transform] shrink-0"
                    >
                      <WhatsAppIcon className="w-4 h-4 shrink-0" />
                      <span>Consultar tarifas no WhatsApp</span>
                    </a>
                  </Reveal>
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
                  <StaggerGroup
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    staggerMs={85}
                  >
                    {accommodations.map((acc) => {
                      const photoCount = countAccommodationPhotos(acc);
                      return (
                        <StaggerItem key={acc.id} className="h-full">
                          <article className="h-full motion-card rounded-2xl bg-white border border-brand-navy/10 overflow-hidden flex flex-col justify-between group hover:border-brand-navy/25">
                            <div>
                              <Link
                                to={`/acomodacoes/${acc.slug}`}
                                className="block relative aspect-[16/10] overflow-hidden bg-brand-surface"
                              >
                                <div className="w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]">
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
                                    {acc.max_guests === 1
                                      ? "pessoa"
                                      : "pessoas"}
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
                                className="w-full inline-flex items-center justify-between gap-2 min-h-11 px-4 rounded-xl bg-brand-navy hover:bg-brand-navy-light active:scale-[0.985] text-white font-semibold text-sm transition-[background-color,transform]"
                              >
                                <span>Ver fotos e detalhes</span>
                                <ArrowRight className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
                              </Link>
                            </div>
                          </article>
                        </StaggerItem>
                      );
                    })}
                  </StaggerGroup>
                ) : (
                  <div className="rounded-2xl bg-white border border-brand-navy/10 p-8 text-center">
                    <p className="text-sm text-brand-ink-secondary">
                      Consulte nossa equipe pelo WhatsApp para conhecer as
                      opções de acomodações disponíveis.
                    </p>
                  </div>
                )}
              </section>

              <section
                id="localizacao"
                aria-labelledby="localizacao-heading"
                className="scroll-mt-24 rounded-2xl sm:rounded-3xl bg-white border border-brand-navy/10 overflow-hidden"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12">
                  <Reveal
                    direction="up"
                    className="lg:col-span-5 p-6 sm:p-9 lg:p-10 flex flex-col justify-between gap-8"
                  >
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

                      <MaskedLine inView delay={60}>
                        <h2
                          id="localizacao-heading"
                          className="font-display font-semibold text-3xl lg:text-[2.15rem] text-brand-navy tracking-[-0.025em] leading-[1.1]"
                        >
                          Localização e como chegar
                        </h2>
                      </MaskedLine>

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
                        className="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl bg-brand-navy hover:bg-brand-navy-light active:scale-[0.985] text-white font-semibold text-sm transition-[background-color,transform]"
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
                        className="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl bg-brand-bg hover:bg-brand-surface active:scale-[0.985] text-brand-navy border border-brand-navy/15 font-semibold text-sm transition-[background-color,transform]"
                      >
                        <WazeIcon className="w-4 h-4 shrink-0" />
                        <span>Ir com Waze</span>
                      </a>
                    </div>
                  </Reveal>

                  <div className="lg:col-span-7 p-3 sm:p-4 lg:pl-0">
                    {cleanEmbedUrl ? (
                      <EditorialCurtain delay={120} className="h-full">
                        <SmoothMapEmbed
                          src={cleanEmbedUrl}
                          title="Mapa de localização da Pousada Moradas do Gabriel"
                          containerClassName="overflow-hidden rounded-xl sm:rounded-2xl border border-brand-navy/10 bg-brand-surface h-72 sm:h-96 lg:h-full lg:min-h-[380px]"
                          loadingLabel="Preparando mapa da pousada..."
                        />
                      </EditorialCurtain>
                    ) : (
                      <div className="h-full min-h-[260px] rounded-xl sm:rounded-2xl bg-brand-bg border border-brand-navy/10 p-6 flex items-center justify-center text-center text-sm text-brand-ink-secondary">
                        Utilize os botões ao lado para traçar sua rota
                        diretamente pelo Google Maps ou Waze.
                      </div>
                    )}
                  </div>
                </div>
              </section>
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
                        <p className="font-display font-semibold text-lg text-brand-navy leading-tight">
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
                    <ul className="space-y-0.5 text-sm font-medium text-brand-ink-secondary">
                      <li>
                        <a
                          href="#inicio"
                          className="inline-flex items-center min-h-11 hover:text-brand-navy transition-colors"
                        >
                          Início
                        </a>
                      </li>
                      {hasAboutContent && (
                        <li>
                          <a
                            href="#sobre"
                            className="inline-flex items-center min-h-11 hover:text-brand-navy transition-colors"
                          >
                            Sobre a pousada
                          </a>
                        </li>
                      )}
                      <li>
                        <a
                          href="#acomodacoes"
                          className="inline-flex items-center min-h-11 hover:text-brand-navy transition-colors"
                        >
                          Acomodações
                        </a>
                      </li>
                      <li>
                        <a
                          href="#localizacao"
                          className="inline-flex items-center min-h-11 hover:text-brand-navy transition-colors"
                        >
                          Localização
                        </a>
                      </li>
                      <li>
                        <Link
                          to="/links-contato"
                          className="inline-flex items-center gap-1.5 min-h-11 hover:text-brand-navy transition-colors"
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
                    <div className="space-y-0.5 text-sm font-medium text-brand-ink-secondary">
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 min-h-11 hover:text-brand-navy transition-colors"
                      >
                        <WhatsAppIcon className="w-4 h-4 shrink-0 text-brand-navy" />
                        <span>
                          WhatsApp{maskedWhatsapp ? `: ${maskedWhatsapp}` : ""}
                        </span>
                      </a>

                      {maskedPhone && (
                        <a
                          href={`tel:${contacts.phone.replace(/\D/g, "")}`}
                          className="flex items-center gap-2.5 min-h-11 hover:text-brand-navy transition-colors"
                        >
                          <Phone className="w-4 h-4 shrink-0 text-brand-navy" />
                          <span>Recepção: {maskedPhone}</span>
                        </a>
                      )}

                      <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 min-h-11 hover:text-brand-navy transition-colors"
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
