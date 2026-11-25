import {
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";
import {
  AnimatePresence,
  m,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState, type TouchEvent } from "react";
import { Link } from "react-router-dom";
import type { HeroSlideItem } from "../../@types/database.types";
import { trackLinkClick } from "../../services";
import { WhatsAppIcon } from "../../utils/iconMapper";
import { MaskedLine } from "./Motion";
import { SmoothImage } from "./SmoothImage";

interface HeroStageProps {
  companyName: string;
  slides: HeroSlideItem[];
  whatsappUrl: string;
  locationAddress: string;
  hasAboutContent: boolean;
  onLeaveHeroChange: (hasLeftHero: boolean) => void;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];
const HERO_AUTOPLAY_MS = 6000;

function formatChapterNumber(n: number): string {
  return String(n).padStart(2, "0");
}

export function HeroStage({
  companyName,
  slides,
  whatsappUrl,
  locationAddress,
  hasAboutContent,
  onLeaveHeroChange,
}: HeroStageProps) {
  const heroRef = useRef<HTMLElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const prefersReducedMotion = useReducedMotion();

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  // Bleed vertical contido (-inset-y-[5%]) evita bordas vazias no parallax sem ampliar excessivamente a foto
  const photoY = useTransform(scrollYProgress, [0, 1], ["-2.5%", "4.5%"]);
  const photoScale = useTransform(scrollYProgress, [0, 1], [1, 1.035]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "-10%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.25]);

  const isAutoplayPaused =
    userPaused || interactionPaused || Boolean(prefersReducedMotion);

  // Detecta dinamicamente quando o visitante ultrapassa a Hero em qualquer tamanho de tela
  useEffect(() => {
    const node = heroRef.current;
    if (!node) return;

    if (typeof IntersectionObserver !== "undefined") {
      const observer = new IntersectionObserver(
        ([entry]) => {
          onLeaveHeroChange(entry.intersectionRatio < 0.14);
        },
        { threshold: [0, 0.14, 0.25] },
      );

      observer.observe(node);
      return () => observer.disconnect();
    }

    const handleScroll = () => {
      const rect = node.getBoundingClientRect();
      onLeaveHeroChange(rect.bottom < 96);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [onLeaveHeroChange]);

  useEffect(() => {
    if (isAutoplayPaused || slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % slides.length);
    }, HERO_AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [isAutoplayPaused, slides.length]);

  const safeSlideIndex =
    slides.length > 0 ? activeSlideIndex % slides.length : 0;
  const currentSlide = slides[safeSlideIndex];

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
  const exploreHref = hasAboutContent ? "#sobre" : "#acomodacoes";

  return (
    <section
      ref={heroRef}
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
      className="hero-viewport relative w-full overflow-hidden bg-brand-scrim text-white flex flex-col justify-between"
    >
      {/* Camada fotográfica full-bleed com parallax de profundidade */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        <m.div
          style={
            prefersReducedMotion ? undefined : { y: photoY, scale: photoScale }
          }
          className="absolute -inset-y-[5%] inset-x-0"
        >
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
                  opacity: { duration: 0.62, ease: EASE_OUT_EXPO },
                  scale: { duration: 1.1, ease: EASE_OUT_EXPO },
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
        </m.div>

        {/* Scrim direcional preserva a luminosidade natural e garante contraste WCAG AA */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#071B42]/74 via-[#071B42]/14 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071B42]/92 via-[#071B42]/44 to-transparent pointer-events-none" />
        <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-[#071B42]/74 via-[#071B42]/24 to-transparent pointer-events-none" />
      </div>

      {/* Header integrado alinhado ao eixo principal de leitura */}
      <header className="relative z-20 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between gap-2 sm:gap-4">
        <a
          href="#inicio"
          className="flex items-center gap-2.5 sm:gap-3 min-w-0 min-h-11 rounded-xl focus-visible:outline-brand-green"
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
          <span className="font-display text-sm sm:text-base font-semibold text-white tracking-tight truncate">
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
            className="lg:hidden inline-flex items-center justify-center min-h-11 px-3 sm:px-3.5 rounded-xl border border-white/25 bg-[#071B42]/70 hover:bg-[#071B42]/90 text-xs sm:text-sm font-medium text-white transition-colors focus-visible:outline-brand-green"
          >
            <span>Links</span>
            <span className="hidden sm:inline">&nbsp;e contatos</span>
          </Link>

          <m.a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackLinkClick(null, "hero_top_whatsapp")}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
            className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3.5 sm:px-5 rounded-xl bg-brand-green hover:bg-[#BFD37E] text-brand-navy text-xs sm:text-sm font-semibold transition-colors focus-visible:outline-brand-green"
          >
            <WhatsAppIcon className="w-4 h-4 shrink-0" />
            <span>Reservar</span>
          </m.a>
        </div>
      </header>

      {/* Palco editorial central/inferior com entrada mascarada por linha */}
      <m.div
        style={
          prefersReducedMotion
            ? undefined
            : { y: contentY, opacity: contentOpacity }
        }
        className="relative z-20 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-8 sm:pt-16 sm:pb-12 md:pb-14 flex items-end justify-between gap-8"
      >
        {slides.length > 0 && currentSlide ? (
          <AnimatePresence mode="wait">
            <m.div
              key={`${currentSlide.id}-${safeSlideIndex}`}
              exit={{
                opacity: 0,
                y: prefersReducedMotion ? 0 : -8,
                transition: { duration: 0.18, ease: "easeIn" },
              }}
              className="max-w-3xl space-y-4 sm:space-y-5"
            >
              <m.p
                initial={
                  prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }
                }
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
                className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-[#D8E1F0]"
              >
                <span className="font-semibold tabular-nums text-brand-green">
                  {formatChapterNumber(safeSlideIndex + 1)} /{" "}
                  {formatChapterNumber(slides.length)}
                </span>
                <span aria-hidden="true" className="text-white/40">
                  ·
                </span>
                <span>{currentSlide.topic}</span>
              </m.p>

              <MaskedLine delay={40}>
                <h1 className="font-display font-semibold text-[clamp(2.3rem,5.4vw,4.55rem)] leading-[1.03] tracking-[-0.03em] text-white text-balance break-words">
                  {currentSlide.title}
                </h1>
              </MaskedLine>

              {currentSlide.subtitle && (
                <m.p
                  initial={
                    prefersReducedMotion
                      ? { opacity: 1 }
                      : { opacity: 0, y: 14 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.56,
                    delay: 0.11,
                    ease: EASE_OUT_EXPO,
                  }}
                  className="text-sm sm:text-base md:text-[1.125rem] text-[#E5ECF7] leading-relaxed max-w-xl break-words"
                >
                  {currentSlide.subtitle}
                </m.p>
              )}

              <m.div
                initial={
                  prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 14 }
                }
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.56,
                  delay: 0.18,
                  ease: EASE_OUT_EXPO,
                }}
                className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3"
              >
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
                  onClick={() => trackLinkClick(null, "hero_slide_whatsapp")}
                  className="inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-xl bg-[#071B42]/78 hover:bg-[#071B42]/92 active:scale-[0.985] border border-white/35 text-white font-medium text-sm transition-[background-color,border-color,transform] focus-visible:outline-brand-green"
                >
                  <WhatsAppIcon className="w-4 h-4 shrink-0" />
                  <span>Consultar no WhatsApp</span>
                </a>
              </m.div>
            </m.div>
          </AnimatePresence>
        ) : (
          <div className="max-w-3xl space-y-4 sm:space-y-5">
            <MaskedLine>
              <h1 className="font-display font-semibold text-[clamp(2.3rem,5.4vw,4.55rem)] leading-[1.03] tracking-[-0.03em] text-white text-balance break-words">
                {companyName}
              </h1>
            </MaskedLine>
            {locationAddress && (
              <p className="text-sm sm:text-base md:text-[1.125rem] text-[#E5ECF7] leading-relaxed max-w-xl">
                {locationAddress}
              </p>
            )}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
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
                onClick={() => trackLinkClick(null, "hero_fallback_whatsapp")}
                className="inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-xl bg-[#071B42]/78 hover:bg-[#071B42]/92 border border-white/35 text-white font-medium text-sm transition-colors focus-visible:outline-brand-green"
              >
                <WhatsAppIcon className="w-4 h-4 shrink-0" />
                <span>Consultar no WhatsApp</span>
              </a>
            </div>
          </div>
        )}

        {/* Convite funcional de rolagem para descer da primeira dobra */}
        <a
          href={exploreHref}
          aria-label="Rolar para conhecer a pousada"
          className="hidden lg:inline-flex items-center gap-2.5 min-h-11 px-4 rounded-xl border border-white/25 bg-[#071B42]/65 hover:bg-[#071B42]/88 hover:border-white/45 text-sm font-medium text-[#E5ECF7] hover:text-white transition-colors group shrink-0 focus-visible:outline-brand-green"
        >
          <span>Explorar a pousada</span>
          <ArrowDown className="w-4 h-4 shrink-0 text-brand-green transition-transform duration-300 group-hover:translate-y-0.5" />
        </a>
      </m.div>

      {/* Dock de capítulos integrado borda a borda com indicador compartilhado (layoutId) e linha #CDDF8E */}
      {slides.length > 0 && currentSlide && (
        <div className="relative z-20 w-full border-t border-white/15 bg-[#071B42]/86">
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 flex items-stretch justify-between gap-2">
            <div className="hidden sm:flex items-stretch flex-1 min-w-0 gap-1">
              {slides.map((slide, idx) => {
                const isActive = idx === safeSlideIndex;
                return (
                  <button
                    key={slide.id || idx}
                    type="button"
                    onClick={() => handleSelectSlide(idx)}
                    aria-current={isActive ? "true" : undefined}
                    className="group relative flex-1 min-w-0 flex items-center gap-2.5 min-h-14 px-3 first:pl-2 text-left transition-colors focus-visible:outline-brand-green"
                  >
                    {isActive && (
                      <m.span
                        layoutId="hero-chapter-active"
                        transition={{
                          type: "spring",
                          stiffness: 340,
                          damping: 32,
                        }}
                        aria-hidden="true"
                        className="absolute inset-x-0 inset-y-1.5 rounded-xl bg-white/10 pointer-events-none"
                      />
                    )}

                    <span
                      aria-hidden="true"
                      className="absolute -top-px left-0 right-1 h-0.5 bg-white/15 overflow-hidden"
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
                      className={`relative z-10 text-xs font-semibold tabular-nums shrink-0 ${
                        isActive
                          ? "text-brand-green"
                          : "text-[#B8C7E0] group-hover:text-white"
                      }`}
                    >
                      {formatChapterNumber(idx + 1)}
                    </span>
                    <span
                      className={`relative z-10 text-xs md:text-sm font-medium truncate transition-colors ${
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
                <m.button
                  type="button"
                  onClick={handlePrevSlide}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
                  aria-label="Slide anterior"
                  className="w-11 h-11 rounded-xl border border-white/22 bg-white/8 hover:bg-white/16 text-white flex items-center justify-center transition-colors focus-visible:outline-brand-green"
                >
                  <ChevronLeft className="w-4 h-4" />
                </m.button>
                <m.button
                  type="button"
                  onClick={handleNextSlide}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
                  aria-label="Próximo slide"
                  className="w-11 h-11 rounded-xl border border-white/22 bg-white/8 hover:bg-white/16 text-white flex items-center justify-center transition-colors focus-visible:outline-brand-green"
                >
                  <ChevronRight className="w-4 h-4" />
                </m.button>
                <m.button
                  type="button"
                  onClick={() => setUserPaused((prev) => !prev)}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
                  aria-pressed={userPaused}
                  aria-label={
                    userPaused
                      ? "Retomar troca automática de fotos"
                      : "Pausar troca automática de fotos"
                  }
                  className="w-11 h-11 rounded-xl border border-white/22 bg-white/8 hover:bg-white/16 text-white flex items-center justify-center transition-colors focus-visible:outline-brand-green"
                >
                  {userPaused ? (
                    <Play className="w-4 h-4" />
                  ) : (
                    <Pause className="w-4 h-4" />
                  )}
                </m.button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
