import {
  ArrowLeft,
  Bath,
  BedDouble,
  Check,
  ChevronLeft,
  ChevronRight,
  Dog,
  Maximize2,
  RefreshCw,
  Refrigerator,
  Snowflake,
  Sun,
  Tv,
  Users,
  Utensils,
  Wifi,
  X,
} from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import { BrandLoader } from "../../components/public/BrandLoader";
import {
  HorizonDivider,
  MaskedLine,
  PageTransition,
  Reveal,
  StaggerGroup,
  StaggerItem,
} from "../../components/public/Motion";
import { SmoothImage } from "../../components/public/SmoothImage";
import {
  useAccommodationBySlug,
  useBusinessInfo,
} from "../../hooks/usePortalData";
import { trackLinkClick, trackPageView } from "../../services";
import { formatWhatsAppUrl } from "../../utils/embedUrl";
import { WhatsAppIcon } from "../../utils/iconMapper";
import { isImagePreloaded, preloadImageUrl } from "../../utils/imagePreload";

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const SLIDE_VARIANTS = {
  enter: (dir: number) => ({
    x: dir >= 0 ? "18%" : "-18%",
    scale: 1.05,
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
    x: dir >= 0 ? "-14%" : "14%",
    scale: 0.96,
    opacity: 0,
    zIndex: 1,
  }),
};

type AmenityKind =
  | "guests"
  | "kitchen"
  | "utensils"
  | "ac"
  | "tv"
  | "wifi"
  | "balcony"
  | "bathroom"
  | "linen"
  | "pet";

function AmenityIcon({
  kind,
  className = "w-4 h-4 shrink-0",
}: {
  kind: AmenityKind;
  className?: string;
}) {
  switch (kind) {
    case "guests":
      return <Users className={className} />;
    case "kitchen":
      return <Utensils className={className} />;
    case "utensils":
      return <Refrigerator className={className} />;
    case "ac":
      return <Snowflake className={className} />;
    case "tv":
      return <Tv className={className} />;
    case "wifi":
      return <Wifi className={className} />;
    case "balcony":
      return <Sun className={className} />;
    case "bathroom":
      return <Bath className={className} />;
    case "linen":
      return <BedDouble className={className} />;
    case "pet":
      return <Dog className={className} />;
  }
}

function formatPhotoNumber(n: number): string {
  return String(n).padStart(2, "0");
}

export function AccommodationDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const prefersReducedMotion = useReducedMotion();

  const {
    data: accommodation,
    isLoading,
    isError,
    refetch,
  } = useAccommodationBySlug(slug);
  const { data: businessInfo } = useBusinessInfo();

  const [photoState, setPhotoState] = useState<{
    slugKey: string | undefined;
    index: number;
    direction: number;
  }>({
    slugKey: slug,
    index: 0,
    direction: 1,
  });

  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    if (slug) {
      trackPageView(`acomodacao_${slug}`);
    }
  }, [slug]);

  const galleryPhotos = useMemo(
    () =>
      accommodation
        ? Array.from(
            new Set(
              [accommodation.cover_image, ...accommodation.gallery].filter(
                Boolean,
              ),
            ),
          )
        : [],
    [accommodation],
  );

  // Pré-carrega todas as fotos da galeria para troca e swipe instantâneos
  useEffect(() => {
    if (galleryPhotos.length <= 1) return;
    galleryPhotos.slice(1).forEach((photoUrl) => {
      void preloadImageUrl(photoUrl);
    });
  }, [galleryPhotos]);

  const currentPhotoIndex =
    photoState.slugKey === slug && galleryPhotos.length > 0
      ? ((photoState.index % galleryPhotos.length) + galleryPhotos.length) %
        galleryPhotos.length
      : 0;
  const slideDirection =
    photoState.slugKey === slug ? photoState.direction : 1;

  // Navegação por teclado quando o lightbox estiver aberto
  useEffect(() => {
    if (!lightboxOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxOpen(false);
      } else if (e.key === "ArrowLeft" && galleryPhotos.length > 1) {
        setPhotoState((prev) => {
          const baseIndex = prev.slugKey === slug ? prev.index : 0;
          return {
            slugKey: slug,
            direction: -1,
            index:
              (baseIndex - 1 + galleryPhotos.length) % galleryPhotos.length,
          };
        });
      } else if (e.key === "ArrowRight" && galleryPhotos.length > 1) {
        setPhotoState((prev) => {
          const baseIndex = prev.slugKey === slug ? prev.index : 0;
          return {
            slugKey: slug,
            direction: 1,
            index: (baseIndex + 1) % galleryPhotos.length,
          };
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxOpen, galleryPhotos.length, slug]);

  if (isError && !accommodation) {
    return (
      <div className="min-h-screen bg-brand-bg text-brand-navy flex flex-col items-center justify-center p-6 text-center">
        <div className="rounded-2xl bg-white border border-brand-navy/10 p-8 max-w-md space-y-4 shadow-xs">
          <BedDouble className="w-10 h-10 mx-auto text-brand-navy" />
          <h1 className="font-display text-xl font-semibold text-brand-navy">
            Não foi possível carregar a acomodação
          </h1>
          <p className="text-sm text-brand-ink-secondary">
            Verifique sua conexão e tente novamente em alguns instantes.
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy-light transition-colors"
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
            <span>Tentar novamente</span>
          </button>
        </div>
      </div>
    );
  }

  if (isLoading && !accommodation) {
    return (
      <BrandLoader show message="Carregando detalhes da acomodação..." />
    );
  }

  if (!accommodation) {
    return (
      <div className="min-h-screen bg-brand-bg text-brand-navy flex flex-col items-center justify-center p-6 text-center">
        <div className="rounded-2xl bg-white border border-brand-navy/10 p-8 max-w-md space-y-4 shadow-xs">
          <BedDouble className="w-10 h-10 mx-auto text-brand-navy" />
          <h1 className="font-display text-xl font-semibold text-brand-navy">
            Acomodação não encontrada
          </h1>
          <p className="text-sm text-brand-ink-secondary">
            Esta acomodação pode ter sido atualizada ou não está disponível no
            momento.
          </p>
          <Link
            to="/#acomodacoes"
            className="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy-light transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Voltar para a pousada</span>
          </Link>
        </div>
      </div>
    );
  }

  const activePhoto = galleryPhotos[currentPhotoIndex] ?? "";
  const isCurrentPreloaded =
    Boolean(activePhoto) && isImagePreloaded(activePhoto);

  const handleStepPhoto = (delta: number) => {
    if (galleryPhotos.length <= 1) return;
    setPhotoState({
      slugKey: slug,
      index:
        (currentPhotoIndex + delta + galleryPhotos.length) %
        galleryPhotos.length,
      direction: delta,
    });
  };

  const handleSelectPhotoIndex = (targetIdx: number) => {
    if (targetIdx === currentPhotoIndex) return;
    setPhotoState({
      slugKey: slug,
      index: targetIdx,
      direction: targetIdx > currentPhotoIndex ? 1 : -1,
    });
  };

  const whatsappContact = businessInfo?.metadata.contacts.whatsapp ?? "";
  const whatsappBookingUrl =
    formatWhatsAppUrl(
      whatsappContact,
      `Olá! Estou no site da Pousada Moradas do Gabriel e gostaria de consultar disponibilidade e valores da acomodação "${accommodation.title}".`,
    ) || "https://wa.me/";

  const totalBedUnits = accommodation.beds.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  const rawAmenityItems: Array<{
    kind: AmenityKind;
    label: string;
    value: string;
    available: boolean;
  }> = [
    {
      kind: "guests",
      label: "Capacidade máxima",
      value: `Acomoda até ${accommodation.max_guests} ${accommodation.max_guests === 1 ? "pessoa" : "pessoas"}`,
      available: true,
    },
    {
      kind: "kitchen",
      label: "Cozinha",
      value: accommodation.has_kitchen
        ? "Cozinha equipada disponível"
        : "Não possui cozinha",
      available: accommodation.has_kitchen,
    },
    {
      kind: "utensils",
      label: "Frigobar e utensílios",
      value: accommodation.has_kitchen_utensils
        ? "Incluso na acomodação"
        : "Não incluso",
      available: accommodation.has_kitchen_utensils,
    },
    {
      kind: "ac",
      label: "Ar-condicionado",
      value: accommodation.has_ac ? "Ambiente climatizado" : "Não possui",
      available: accommodation.has_ac,
    },
    {
      kind: "tv",
      label: "Televisão",
      value: accommodation.has_tv ? "Possui TV" : "Não possui",
      available: accommodation.has_tv,
    },
    {
      kind: "wifi",
      label: "Internet Wi-Fi",
      value: accommodation.has_wifi ? "Wi-Fi gratuito" : "Não possui",
      available: accommodation.has_wifi,
    },
    {
      kind: "balcony",
      label: "Varanda e rede",
      value: accommodation.has_balcony
        ? "Possui varanda / rede"
        : "Não possui",
      available: accommodation.has_balcony,
    },
    {
      kind: "bathroom",
      label: "Banheiro",
      value: accommodation.has_private_bathroom
        ? "Banheiro privativo exclusivo"
        : "Banheiro compartilhado",
      available: accommodation.has_private_bathroom,
    },
    {
      kind: "linen",
      label: "Roupas de cama e banho",
      value: accommodation.has_bed_bath_linen
        ? "Inclusas na estadia"
        : "Não inclusas",
      available: accommodation.has_bed_bath_linen,
    },
    {
      kind: "pet",
      label: "Pet friendly",
      value: accommodation.is_pet_friendly
        ? "Aceita animais de estimação"
        : "Não aceita animais",
      available: accommodation.is_pet_friendly,
    },
  ];

  // Ordena comodidades disponíveis primeiro para leitura rápida do hóspede
  const sortedAmenityItems = [
    ...rawAmenityItems.filter((item) => item.available),
    ...rawAmenityItems.filter((item) => !item.available),
  ];

  return (
    <PageTransition className="min-h-screen bg-brand-bg text-brand-navy flex flex-col justify-between overflow-x-clip">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7 pb-24 lg:pb-16 space-y-6 sm:space-y-8">
        {/* Topo de Navegação */}
        <header className="flex items-center justify-between gap-3">
          <Link
            to="/#acomodacoes"
            className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl bg-white border border-brand-navy/12 text-brand-navy text-xs sm:text-sm font-semibold shadow-xs hover:bg-brand-surface transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Todas as acomodações</span>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-2.5 min-h-11 px-2 rounded-xl hover:bg-white/60 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-white border border-brand-navy/10 p-1.5 flex items-center justify-center shrink-0">
              <img
                src="/logoMoradasdoGabriel.svg"
                alt="Pousada Moradas do Gabriel"
                width={28}
                height={28}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-display text-sm font-semibold text-brand-navy hidden sm:inline">
              Moradas do Gabriel
            </span>
          </Link>
        </header>

        {/* Abertura Editorial da Acomodação */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm font-medium text-brand-ink-muted">
            <m.span
              aria-hidden="true"
              initial={prefersReducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.55, ease: EASE_OUT_EXPO }}
              className="w-8 h-0.5 bg-brand-green origin-left shrink-0"
            />
            <span className="tabular-nums font-semibold text-brand-navy">
              Até {accommodation.max_guests}{" "}
              {accommodation.max_guests === 1 ? "pessoa" : "pessoas"}
            </span>
            {totalBedUnits > 0 && (
              <>
                <span aria-hidden="true" className="text-brand-navy/30">
                  ·
                </span>
                <span>
                  {totalBedUnits} {totalBedUnits === 1 ? "cama" : "camas"}
                </span>
              </>
            )}
            {galleryPhotos.length > 0 && (
              <>
                <span aria-hidden="true" className="text-brand-navy/30">
                  ·
                </span>
                <span className="tabular-nums">
                  {galleryPhotos.length}{" "}
                  {galleryPhotos.length === 1 ? "foto" : "fotos"}
                </span>
              </>
            )}
          </div>

          <MaskedLine delay={40}>
            <h1 className="font-display font-semibold text-[clamp(1.85rem,4.2vw,3.15rem)] leading-[1.06] tracking-[-0.025em] text-brand-navy text-balance break-words">
              {accommodation.title}
            </h1>
          </MaskedLine>

          {accommodation.short_description && (
            <m.p
              initial={
                prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.52, delay: 0.12, ease: EASE_OUT_EXPO }}
              className="text-sm sm:text-base text-brand-ink-secondary leading-relaxed max-w-3xl break-words"
            >
              {accommodation.short_description}
            </m.p>
          )}
        </section>

        {/* Palco Fotográfico com Cortina de Entrada + Swipe Direcional */}
        <m.section
          aria-label="Galeria de fotos da acomodação"
          initial={
            prefersReducedMotion
              ? { opacity: 1 }
              : {
                  opacity: 0.35,
                  clipPath: "inset(8% 0% 0% 0% round 20px)",
                  scale: 1.025,
                }
          }
          animate={{
            opacity: 1,
            clipPath: "inset(0% 0% 0% 0% round 20px)",
            scale: 1,
          }}
          transition={{ duration: 0.78, ease: EASE_OUT_EXPO }}
          className="rounded-2xl sm:rounded-3xl bg-white border border-brand-navy/10 p-2.5 sm:p-4 shadow-xs space-y-3"
        >
          <div className="relative aspect-[16/10] sm:aspect-[16/9] max-h-[540px] w-full rounded-xl sm:rounded-2xl overflow-hidden bg-brand-surface select-none">
            {activePhoto ? (
              <AnimatePresence initial={false} custom={slideDirection}>
                <m.div
                  key={`${activePhoto}-${currentPhotoIndex}`}
                  custom={slideDirection}
                  variants={prefersReducedMotion ? undefined : SLIDE_VARIANTS}
                  initial={prefersReducedMotion ? { opacity: 0 } : "enter"}
                  animate={prefersReducedMotion ? { opacity: 1 } : "center"}
                  exit={prefersReducedMotion ? { opacity: 0 } : "exit"}
                  transition={{
                    x: { duration: 0.48, ease: EASE_OUT_EXPO },
                    scale: { duration: 0.48, ease: EASE_OUT_EXPO },
                    opacity: { duration: 0.34, ease: EASE_OUT_EXPO },
                  }}
                  drag={
                    galleryPhotos.length > 1 && !prefersReducedMotion
                      ? "x"
                      : false
                  }
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.16}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -44 || info.velocity.x < -300) {
                      handleStepPhoto(1);
                    } else if (info.offset.x > 44 || info.velocity.x > 300) {
                      handleStepPhoto(-1);
                    }
                  }}
                  onTap={() => setLightboxOpen(true)}
                  className="absolute inset-0 cursor-zoom-in touch-pan-y"
                >
                  <SmoothImage
                    src={activePhoto}
                    alt={`${accommodation.title} - foto ${currentPhotoIndex + 1}`}
                    priority={isCurrentPreloaded || currentPhotoIndex === 0}
                    containerClassName="relative w-full h-full overflow-hidden pointer-events-none"
                    className="w-full h-full object-cover"
                    fallback={
                      <div className="w-full h-full flex items-center justify-center text-brand-ink-muted">
                        <BedDouble className="w-12 h-12" />
                      </div>
                    }
                  />
                </m.div>
              </AnimatePresence>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-brand-ink-muted">
                <BedDouble className="w-12 h-12" />
              </div>
            )}

            {/* Indicador superior esquerdo */}
            <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/95 border border-brand-navy/10 text-brand-navy text-xs font-semibold pointer-events-none">
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>
                Até {accommodation.max_guests}{" "}
                {accommodation.max_guests === 1 ? "pessoa" : "pessoas"}
              </span>
            </div>

            {activePhoto && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxOpen(true);
                }}
                aria-label="Ampliar galeria em tela cheia"
                className="absolute top-3 right-3 z-10 w-11 h-11 rounded-xl bg-[#071B42]/78 hover:bg-[#071B42] border border-white/25 text-white flex items-center justify-center transition-colors focus-visible:outline-brand-green"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}

            {galleryPhotos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStepPhoto(-1);
                  }}
                  aria-label="Foto anterior"
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-xl bg-[#071B42]/75 hover:bg-[#071B42] border border-white/20 text-white flex items-center justify-center transition-colors focus-visible:outline-brand-green"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStepPhoto(1);
                  }}
                  aria-label="Próxima foto"
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-xl bg-[#071B42]/75 hover:bg-[#071B42] border border-white/20 text-white flex items-center justify-center transition-colors focus-visible:outline-brand-green"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <div
                  aria-hidden="true"
                  className="absolute bottom-0 inset-x-0 z-10 h-14 bg-gradient-to-t from-[#071B42]/76 via-[#071B42]/24 to-transparent pointer-events-none flex items-end justify-between px-3.5 pb-3"
                >
                  <div className="flex items-center gap-1.5">
                    {galleryPhotos.map((_, dotIdx) => (
                      <span
                        key={dotIdx}
                        className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${
                          dotIdx === currentPhotoIndex
                            ? "w-6 bg-brand-green"
                            : "w-1.5 bg-white/55"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-white">
                    {formatPhotoNumber(currentPhotoIndex + 1)} /{" "}
                    {formatPhotoNumber(galleryPhotos.length)}
                  </span>
                </div>
              </>
            )}
          </div>

          {galleryPhotos.length > 1 && (
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {galleryPhotos.map((photoUrl, idx) => {
                const isSelected = idx === currentPhotoIndex;
                return (
                  <button
                    key={`${photoUrl}-${idx}`}
                    type="button"
                    onClick={() => handleSelectPhotoIndex(idx)}
                    aria-label={`Selecionar foto ${idx + 1} de ${galleryPhotos.length}`}
                    aria-current={isSelected ? "true" : undefined}
                    className={`relative w-22 h-16 sm:w-28 sm:h-20 rounded-xl overflow-hidden shrink-0 transition-opacity ${
                      isSelected
                        ? "opacity-100"
                        : "opacity-65 hover:opacity-100"
                    }`}
                  >
                    <SmoothImage
                      src={photoUrl}
                      alt={`${accommodation.title} - miniatura ${idx + 1}`}
                      containerClassName="relative w-full h-full overflow-hidden"
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <m.span
                        layoutId="accommodation-thumb-ring"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 32,
                        }}
                        aria-hidden="true"
                        className="absolute inset-0 rounded-xl border-2 border-brand-navy ring-2 ring-inset ring-brand-green pointer-events-none"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </m.section>

        {/* Detalhes Principais + Card Sticky de Reserva */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Coluna Esquerda: Capítulos Editoriais */}
          <div className="lg:col-span-8 space-y-6 sm:space-y-8">
            {/* 01 · Sobre a Acomodação */}
            <Reveal direction="up">
              <section className="rounded-2xl sm:rounded-3xl bg-white border border-brand-navy/10 p-5 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 text-xs font-medium text-brand-ink-muted">
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
                  <span>A acomodação</span>
                </div>

                <h2 className="font-display text-xl sm:text-2xl font-semibold text-brand-navy tracking-[-0.02em]">
                  Conforto e detalhes do espaço
                </h2>

                <p className="text-sm sm:text-base text-brand-ink-secondary leading-relaxed whitespace-pre-line break-words">
                  {accommodation.full_description ||
                    accommodation.short_description}
                </p>
              </section>
            </Reveal>

            {/* 02 · Configuração de Camas */}
            <section className="rounded-2xl sm:rounded-3xl bg-white border border-brand-navy/10 p-5 sm:p-8 shadow-xs space-y-5">
              <Reveal direction="up" className="space-y-1.5">
                <div className="flex items-center gap-2.5 text-xs font-medium text-brand-ink-muted">
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
                  <span>Descanso</span>
                </div>

                <h2 className="font-display text-xl sm:text-2xl font-semibold text-brand-navy tracking-[-0.02em]">
                  Disposição de camas
                </h2>
                <p className="text-xs sm:text-sm text-brand-ink-muted">
                  Configuração pensada para acomodar até{" "}
                  {accommodation.max_guests}{" "}
                  {accommodation.max_guests === 1 ? "hóspede" : "hóspedes"}
                </p>
              </Reveal>

              {accommodation.beds.length > 0 ? (
                <StaggerGroup
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  staggerMs={70}
                >
                  {accommodation.beds.map((bed, idx) => (
                    <StaggerItem key={`${bed.type}-${idx}`}>
                      <m.div
                        whileHover={
                          prefersReducedMotion ? undefined : { y: -2 }
                        }
                        transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
                        className="rounded-2xl bg-brand-bg border border-brand-navy/12 p-4 flex items-center gap-3.5"
                      >
                        <span className="w-11 h-11 rounded-xl bg-brand-navy text-white font-display font-semibold text-sm tabular-nums flex items-center justify-center shrink-0">
                          {bed.count}x
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-brand-navy break-words">
                            {bed.type}
                          </p>
                          <p className="text-xs text-brand-ink-muted">
                            {bed.count === 1
                              ? "1 unidade"
                              : `${bed.count} unidades`}
                          </p>
                        </div>
                      </m.div>
                    </StaggerItem>
                  ))}
                </StaggerGroup>
              ) : (
                <p className="text-sm text-brand-ink-secondary">
                  Consulte a recepção para opções personalizadas de camas.
                </p>
              )}
            </section>

            {/* 03 · Comodidades do Espaço */}
            <section className="rounded-2xl sm:rounded-3xl bg-white border border-brand-navy/10 p-5 sm:p-8 shadow-xs space-y-5">
              <Reveal direction="up" className="space-y-1.5">
                <div className="flex items-center gap-2.5 text-xs font-medium text-brand-ink-muted">
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
                  <span>Estrutura</span>
                </div>

                <h2 className="font-display text-xl sm:text-2xl font-semibold text-brand-navy tracking-[-0.02em]">
                  Comodidades incluídas
                </h2>
              </Reveal>

              <StaggerGroup
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                staggerMs={45}
              >
                {sortedAmenityItems.map((item) => (
                  <StaggerItem key={item.label}>
                    <div
                      className={`rounded-2xl border p-3.5 flex items-center justify-between gap-3 ${
                        item.available
                          ? "bg-brand-bg border-brand-navy/12 text-brand-navy"
                          : "bg-brand-bg/50 border-brand-navy/8 text-brand-ink-muted"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                            item.available
                              ? "bg-white border-brand-navy/12 text-brand-navy"
                              : "bg-white/70 border-brand-navy/8 text-brand-ink-muted"
                          }`}
                        >
                          <AmenityIcon kind={item.kind} className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold break-words">
                            {item.label}
                          </p>
                          <p
                            className={`text-xs break-words ${
                              item.available
                                ? "text-brand-ink-secondary"
                                : "text-brand-ink-muted"
                            }`}
                          >
                            {item.value}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {item.available ? (
                          <span className="w-7 h-7 rounded-lg bg-brand-green/50 text-brand-navy flex items-center justify-center">
                            <Check className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="w-7 h-7 rounded-lg bg-brand-surface text-brand-ink-muted flex items-center justify-center">
                            <X className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerGroup>

              {accommodation.extra_amenities.length > 0 && (
                <div className="pt-4 space-y-3">
                  <HorizonDivider />
                  <p className="text-xs font-semibold text-brand-ink-secondary">
                    Diferenciais adicionais
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {accommodation.extra_amenities.map((extra, idx) => (
                      <span
                        key={`${extra}-${idx}`}
                        className="px-3 py-1.5 rounded-xl bg-brand-bg border border-brand-navy/12 text-xs font-semibold text-brand-navy"
                      >
                        {extra}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Coluna Direita: Painel Sticky de Reserva Direta */}
          <Reveal direction="left" delay={120} className="lg:col-span-4 lg:sticky lg:top-8">
            <aside className="rounded-2xl sm:rounded-3xl bg-white border border-brand-navy/12 overflow-hidden shadow-xs">
              <div className="bg-brand-scrim text-white p-6 space-y-2">
                <p className="text-xs font-medium text-brand-green">
                  Atendimento direto da pousada
                </p>
                <h3 className="font-display text-lg sm:text-xl font-semibold leading-snug break-words">
                  Consulte datas para {accommodation.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#D8E1F0] leading-relaxed">
                  Fale diretamente com a nossa recepção pelo WhatsApp sem taxas
                  de intermediação.
                </p>
              </div>

              <div className="p-6 space-y-5">
                <div className="rounded-2xl bg-brand-bg border border-brand-navy/10 p-4 space-y-2.5 text-xs sm:text-sm text-brand-ink-secondary">
                  <div className="flex items-center justify-between gap-2">
                    <span>Capacidade</span>
                    <span className="font-semibold text-brand-navy tabular-nums">
                      Até {accommodation.max_guests}{" "}
                      {accommodation.max_guests === 1 ? "pessoa" : "pessoas"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Cozinha</span>
                    <span className="font-semibold text-brand-navy">
                      {accommodation.has_kitchen ? "Equipada" : "Frigobar"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Climatização</span>
                    <span className="font-semibold text-brand-navy">
                      {accommodation.has_ac ? "Ar-condicionado" : "Ventilação"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Pets</span>
                    <span className="font-semibold text-brand-navy">
                      {accommodation.is_pet_friendly
                        ? "Aceita animais"
                        : "Não aceita"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <m.a
                    href={whatsappBookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackLinkClick(
                        null,
                        `book_accommodation_${accommodation.slug}`,
                      )
                    }
                    whileTap={
                      prefersReducedMotion ? undefined : { scale: 0.985 }
                    }
                    className="w-full inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-xl bg-brand-green hover:bg-[#BFD37E] text-brand-navy font-semibold text-sm transition-colors"
                  >
                    <WhatsAppIcon className="w-4 h-4 shrink-0" />
                    <span>Consultar disponibilidade</span>
                  </m.a>

                  <Link
                    to="/#acomodacoes"
                    className="w-full inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl bg-brand-bg hover:bg-brand-surface border border-brand-navy/12 text-brand-navy font-semibold text-xs sm:text-sm transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0" />
                    <span>Ver outras acomodações</span>
                  </Link>
                </div>
              </div>
            </aside>
          </Reveal>
        </div>
      </div>

      {/* Barra Fixa Inferior no Mobile para Conversão sem Bloquear Conteúdo */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-brand-navy/10 px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold text-brand-navy truncate">
              {accommodation.title}
            </p>
            <p className="text-xs font-medium text-brand-ink-muted tabular-nums">
              Até {accommodation.max_guests}{" "}
              {accommodation.max_guests === 1 ? "pessoa" : "pessoas"}
            </p>
          </div>
          <a
            href={whatsappBookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackLinkClick(null, `mobile_bar_book_${accommodation.slug}`)
            }
            className="inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-xl bg-brand-green hover:bg-[#BFD37E] text-brand-navy text-xs sm:text-sm font-semibold transition-colors shrink-0"
          >
            <WhatsAppIcon className="w-4 h-4 shrink-0" />
            <span>Reservar</span>
          </a>
        </div>
      </div>

      <footer className="hidden lg:block py-6 px-4 text-center text-xs font-medium text-brand-ink-muted border-t border-brand-navy/10 bg-white">
        © {new Date().getFullYear()} Pousada Moradas do Gabriel. Todos os
        direitos reservados.
      </footer>

      {/* Lightbox Fullscreen com Deslize Direcional */}
      {createPortal(
        <AnimatePresence>
          {lightboxOpen && activePhoto && (
            <m.div
              key="acc-lightbox-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
              role="dialog"
              aria-modal="true"
              aria-label={`Galeria ampliada de ${accommodation.title}`}
              onClick={() => setLightboxOpen(false)}
              className="fixed inset-0 z-[100] bg-[#071B42]/95 p-3 sm:p-6 flex flex-col justify-between gap-3"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-4xl mx-auto flex items-center justify-between gap-3 shrink-0"
              >
                <div className="min-w-0 text-white">
                  <h2 className="font-display font-semibold text-base sm:text-lg truncate">
                    {accommodation.title}
                  </h2>
                  <p className="text-xs text-[#B8C7E0] tabular-nums">
                    Foto {formatPhotoNumber(currentPhotoIndex + 1)} de{" "}
                    {formatPhotoNumber(galleryPhotos.length)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setLightboxOpen(false)}
                  aria-label="Fechar galeria ampliada"
                  className="inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-xl bg-white hover:bg-brand-bg text-brand-navy text-xs sm:text-sm font-semibold transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                  <span>Fechar</span>
                </button>
              </div>

              <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-4xl mx-auto flex-1 min-h-0 rounded-2xl overflow-hidden bg-brand-scrim"
              >
                <AnimatePresence initial={false} custom={slideDirection}>
                  <m.div
                    key={`lb-${activePhoto}-${currentPhotoIndex}`}
                    custom={slideDirection}
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
                      galleryPhotos.length > 1 && !prefersReducedMotion
                        ? "x"
                        : false
                    }
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.18}
                    onDragEnd={(_, info) => {
                      if (galleryPhotos.length <= 1) return;
                      if (info.offset.x < -44 || info.velocity.x < -300) {
                        handleStepPhoto(1);
                      } else if (info.offset.x > 44 || info.velocity.x > 300) {
                        handleStepPhoto(-1);
                      }
                    }}
                    className="absolute inset-0 flex items-center justify-center touch-pan-y"
                  >
                    <SmoothImage
                      src={activePhoto}
                      alt={`${accommodation.title} - foto ${currentPhotoIndex + 1}`}
                      theme="dark"
                      priority
                      containerClassName="relative w-full h-full flex items-center justify-center overflow-hidden pointer-events-none"
                      className="max-h-full max-w-full object-contain"
                    />
                  </m.div>
                </AnimatePresence>

                {galleryPhotos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStepPhoto(-1)}
                      aria-label="Foto anterior"
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-xl bg-[#071B42]/80 hover:bg-[#071B42] border border-white/25 text-white flex items-center justify-center transition-colors focus-visible:outline-brand-green"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStepPhoto(1)}
                      aria-label="Próxima foto"
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-xl bg-[#071B42]/80 hover:bg-[#071B42] border border-white/25 text-white flex items-center justify-center transition-colors focus-visible:outline-brand-green"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {galleryPhotos.length > 1 && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-4xl mx-auto flex items-center justify-center gap-2 overflow-x-auto py-1 shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {galleryPhotos.map((imgUrl, idx) => {
                    const isCurrent = idx === currentPhotoIndex;
                    return (
                      <button
                        key={`lb-thumb-${imgUrl}-${idx}`}
                        type="button"
                        onClick={() => handleSelectPhotoIndex(idx)}
                        aria-label={`Ver foto ${idx + 1}`}
                        className={`relative w-16 h-12 sm:w-20 sm:h-14 rounded-xl overflow-hidden border-2 transition-opacity shrink-0 ${
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
    </PageTransition>
  );
}
