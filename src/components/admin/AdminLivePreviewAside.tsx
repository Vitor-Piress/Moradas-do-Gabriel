import {
  ArrowLeft,
  ArrowRight,
  Bath,
  BedDouble,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  Dog,
  ExternalLink,
  Eye,
  Globe,
  Lock,
  MapPin,
  Monitor,
  Phone,
  Refrigerator,
  Smartphone,
  Snowflake,
  Tv,
  Users,
  Utensils,
  Wifi,
} from "lucide-react";
import { createElement, useState } from "react";
import { Link } from "react-router-dom";
import type {
  BusinessInfoMetadata,
  LandingPageMetadata,
  LinkRow,
  PlaceTip,
  TypedAccommodation,
  TypedBusinessInfo,
  WifiNetwork,
} from "../../@types/database.types";
import {
  DEFAULT_BUSINESS_METADATA,
  DEFAULT_LANDING_METADATA,
} from "../../services";
import {
  extractEmbedUrl,
  formatInstagramMask,
  formatPhoneMask,
} from "../../utils/embedUrl";
import {
  InstagramIcon,
  resolveLinkIcon,
  WazeIcon,
  WhatsAppIcon,
} from "../../utils/iconMapper";

export type AdminSection = "accommodations" | "landing" | "links" | "guide";

export interface AccommodationDraftPreview {
  orderedAccommodations: TypedAccommodation[];
  focusedAccommodation: TypedAccommodation | null;
  preferDetailView: boolean;
}

export interface LandingDraftPreview {
  landing: LandingPageMetadata;
  activeSlideIndex: number;
}

export interface GuideDraftPreview {
  content: string;
  metadata: BusinessInfoMetadata;
  focusedPlaceIndex: number | "new";
  newPlaceDraft?: PlaceTip;
}

interface AdminLivePreviewAsideProps {
  activeSection: AdminSection;
  accommodationsDraft: AccommodationDraftPreview;
  landingDraft: LandingDraftPreview;
  linksDraft: LinkRow[];
  guideDraft: GuideDraftPreview;
  businessInfo: TypedBusinessInfo | undefined;
}

function formatNumber(n: number): string {
  return String(n).padStart(2, "0");
}

function formatBedsSummary(acc: TypedAccommodation): string {
  if (!acc.beds || acc.beds.length === 0) {
    return "Camas confortáveis";
  }
  return acc.beds.map((b) => `${b.count}x ${b.type}`).join(" · ");
}

function PlaceCategoryIcon({
  category,
  className = "w-3.5 h-3.5 shrink-0",
}: {
  category: string;
  className?: string;
}) {
  const lower = category.toLowerCase();
  if (lower.includes("gastronomia") || lower.includes("restaurante")) {
    return <Utensils className={className} />;
  }
  if (lower.includes("passeio")) {
    return <Compass className={className} />;
  }
  return <MapPin className={className} />;
}

function PreviewLinkIcon({
  icon,
  title,
  url,
}: {
  icon: string | null;
  title: string;
  url: string;
}) {
  return createElement(resolveLinkIcon(icon, title, url), {
    className: "w-4 h-4 shrink-0",
  });
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

export function AdminLivePreviewAside({
  activeSection,
  accommodationsDraft,
  landingDraft,
  linksDraft,
  guideDraft,
  businessInfo,
}: AdminLivePreviewAsideProps) {
  const baseMetadata = businessInfo?.metadata ?? DEFAULT_BUSINESS_METADATA;
  const landingData = landingDraft.landing ?? DEFAULT_LANDING_METADATA;

  // Sub-seletores próprios do painel aside (sem useEffect + setState)
  const [accViewOverride, setAccViewOverride] = useState<{
    triggerKey: string;
    mode: "vitrine" | "detail";
  } | null>(null);
  const [detailPhotoIdxState, setDetailPhotoIdxState] = useState<{
    slug: string;
    index: number;
  }>({ slug: "", index: 0 });
  const [landingFocusSection, setLandingFocusSection] = useState<
    "all" | "hero" | "about" | "accommodations" | "footer"
  >("all");
  const [heroSlideOverride, setHeroSlideOverride] = useState<{
    syncedIndex: number;
    index: number;
  } | null>(null);
  const [guideSectionTab, setGuideSectionTab] = useState<
    "all" | "como-chegar" | "guia-wifi" | "guia-regras" | "guia-dicas"
  >("all");
  const [guidePlacePhotoMap, setGuidePlacePhotoMap] = useState<
    Record<string, number>
  >({});

  // =========================================================================
  // Derivação do preview de Acomodações
  // =========================================================================
  const orderedAccommodations = accommodationsDraft.orderedAccommodations;
  const activeOrderedAccommodations = orderedAccommodations.filter(
    (a) => a.is_active,
  );
  const targetDetailAccommodation =
    accommodationsDraft.focusedAccommodation ??
    activeOrderedAccommodations[0] ??
    orderedAccommodations[0] ??
    null;

  const accTriggerKey = `${accommodationsDraft.preferDetailView}-${targetDetailAccommodation?.id ?? "none"}-${targetDetailAccommodation?.title ?? ""}`;
  const defaultAccMode: "vitrine" | "detail" =
    accommodationsDraft.preferDetailView && targetDetailAccommodation
      ? "detail"
      : "vitrine";
  const currentAccMode =
    accViewOverride?.triggerKey === accTriggerKey
      ? accViewOverride.mode
      : defaultAccMode;

  // =========================================================================
  // Derivação da rota exibida no cabeçalho oficial do aside
  // =========================================================================
  const routeBadge =
    activeSection === "accommodations"
      ? currentAccMode === "detail" && targetDetailAccommodation
        ? {
            label: `/acomodacoes/${targetDetailAccommodation.slug || "..."}`,
            href:
              targetDetailAccommodation.slug &&
              !targetDetailAccommodation.id.startsWith("draft-")
                ? `/acomodacoes/${targetDetailAccommodation.slug}`
                : "/#acomodacoes",
            device: "desktop" as const,
          }
        : { label: "/ · Vitrine", href: "/", device: "desktop" as const }
      : activeSection === "landing"
        ? { label: "/ · Landing Page", href: "/", device: "desktop" as const }
        : activeSection === "links"
          ? {
              label: "/links-contato",
              href: "/links-contato",
              device: "mobile" as const,
            }
          : {
              label: "/guia-do-hospede",
              href: "/guia-do-hospede",
              device: "mobile" as const,
            };

  // Dados para Hero Preview (sincroniza automaticamente ao clicar em slide no editor)
  const slides = landingData.hero_slides ?? [];
  const activeHeroIdx =
    slides.length > 0
      ? (heroSlideOverride?.syncedIndex === landingDraft.activeSlideIndex
          ? heroSlideOverride.index
          : landingDraft.activeSlideIndex) % slides.length
      : 0;
  const currentSlide = slides[activeHeroIdx] ?? null;

  const aboutData = landingData.about;
  const footerData = landingData.footer;
  const displayCompanyName =
    footerData?.company_name || "Pousada Moradas do Gabriel";

  // Contatos para previews (usa dados atualizados do Guia se estiver editando Guia, senão metadata salva)
  const previewContacts =
    activeSection === "guide"
      ? guideDraft.metadata.contacts
      : baseMetadata.contacts;
  const previewLocation =
    activeSection === "guide"
      ? guideDraft.metadata.location
      : baseMetadata.location;
  const maskedWhatsapp = formatPhoneMask(previewContacts.whatsapp);
  const maskedPhone = formatPhoneMask(previewContacts.phone);
  const maskedInstagram = formatInstagramMask(previewContacts.instagram);

  // Links ativos para preview /links-contato
  const activeLinksForPreview = linksDraft.filter((l) => l.is_active !== false);
  const hasWhatsappInLinks = activeLinksForPreview.some(
    (l) =>
      l.title.toLowerCase().includes("whatsapp") ||
      l.url.toLowerCase().includes("wa.me") ||
      l.url.toLowerCase().includes("whatsapp"),
  );
  const hasInstagramInLinks = activeLinksForPreview.some(
    (l) =>
      l.title.toLowerCase().includes("instagram") ||
      l.url.toLowerCase().includes("instagram.com"),
  );

  // Dados para Guia do Hóspede Preview
  const guideWifiList: WifiNetwork[] =
    Array.isArray(guideDraft.metadata.wifi_networks) &&
    guideDraft.metadata.wifi_networks.length > 0
      ? guideDraft.metadata.wifi_networks
      : [];
  const guideRules = guideDraft.metadata.rules ?? [];
  const guidePlaces = guideDraft.metadata.places_tips ?? [];
  const showDraftNewPlace =
    guideDraft.focusedPlaceIndex === "new" &&
    Boolean(guideDraft.newPlaceDraft?.name.trim());
  const previewPlacesCombined: Array<PlaceTip & { __isDraft?: boolean }> =
    showDraftNewPlace && guideDraft.newPlaceDraft
      ? [
          ...guidePlaces,
          { ...guideDraft.newPlaceDraft, __isDraft: true },
        ]
      : guidePlaces;

  return (
    <div className="rounded-2xl bg-white border border-brand-navy/12 shadow-xs overflow-hidden flex flex-col">
      {/* Cabeçalho do Painel Aside Oficial */}
      <div className="px-4 py-3 border-b border-brand-navy/10 bg-brand-surface/70 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-brand-navy text-white flex items-center justify-center shrink-0">
            {routeBadge.device === "mobile" ? (
              <Smartphone className="w-4 h-4" />
            ) : (
              <Monitor className="w-4 h-4" />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-brand-navy shrink-0" />
              <h2 className="font-display text-sm font-semibold text-brand-navy truncate">
                Preview oficial em tempo real
              </h2>
            </div>
            <p className="text-xs font-mono text-brand-ink-muted truncate">
              {routeBadge.label}
            </p>
          </div>
        </div>

        <Link
          to={routeBadge.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl bg-white border border-brand-navy/12 hover:border-brand-navy/35 text-xs font-semibold text-brand-navy transition-colors shrink-0"
        >
          <span>Abrir rota</span>
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        </Link>
      </div>

      {/* Subcontroles Contextuais da Aba Ativa */}
      {activeSection === "accommodations" && (
        <div className="px-4 py-2.5 border-b border-brand-navy/10 bg-white flex items-center justify-between gap-2">
          <div className="inline-flex p-1 rounded-xl bg-brand-bg border border-brand-navy/10 gap-1">
            <button
              type="button"
              onClick={() =>
                setAccViewOverride({
                  triggerKey: accTriggerKey,
                  mode: "vitrine",
                })
              }
              className={`min-h-9 px-3 rounded-lg text-xs font-semibold transition-colors ${
                currentAccMode === "vitrine"
                  ? "bg-brand-navy text-white"
                  : "text-brand-ink-secondary hover:text-brand-navy"
              }`}
            >
              Vitrine / ({activeOrderedAccommodations.length})
            </button>
            <button
              type="button"
              disabled={!targetDetailAccommodation}
              onClick={() =>
                setAccViewOverride({
                  triggerKey: accTriggerKey,
                  mode: "detail",
                })
              }
              className={`min-h-9 px-3 rounded-lg text-xs font-semibold transition-colors disabled:opacity-45 ${
                currentAccMode === "detail"
                  ? "bg-brand-navy text-white"
                  : "text-brand-ink-secondary hover:text-brand-navy"
              }`}
            >
              Página /acomodacoes
            </button>
          </div>

          <span className="text-[11px] font-medium text-brand-ink-muted truncate">
            {currentAccMode === "vitrine"
              ? "Top 6 visíveis inicialmente"
              : targetDetailAccommodation?.title || "Selecione uma unidade"}
          </span>
        </div>
      )}

      {activeSection === "landing" && (
        <div className="px-4 py-2.5 border-b border-brand-navy/10 bg-white flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { id: "all" as const, label: "Página completa" },
            { id: "hero" as const, label: "Hero" },
            { id: "about" as const, label: "Sobre" },
            { id: "accommodations" as const, label: "Acomodações (6)" },
            { id: "footer" as const, label: "Rodapé" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setLandingFocusSection(tab.id)}
              className={`min-h-9 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                landingFocusSection === tab.id
                  ? "bg-brand-navy text-white"
                  : "bg-brand-bg text-brand-ink-secondary hover:text-brand-navy"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeSection === "guide" && (
        <div className="px-4 py-2.5 border-b border-brand-navy/10 bg-white flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { id: "all" as const, label: "Tudo" },
            { id: "como-chegar" as const, label: "01 Rota" },
            { id: "guia-wifi" as const, label: "02 Wi-Fi" },
            { id: "guia-regras" as const, label: "03 Regras" },
            { id: "guia-dicas" as const, label: "04 Curadoria" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setGuideSectionTab(tab.id)}
              className={`min-h-9 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                guideSectionTab === tab.id
                  ? "bg-brand-navy text-white"
                  : "bg-brand-bg text-brand-ink-secondary hover:text-brand-navy"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Área de Conteúdo com Scroll Interno Confortável */}
      <div className="max-h-[calc(100vh-12.5rem)] overflow-y-auto bg-brand-bg p-4">
        {/* ===================================================================
            ABA 1: ACOMODAÇÕES (VITRINE / OU PÁGINA /acomodacoes/:slug)
        =================================================================== */}
        {activeSection === "accommodations" && (
          <>
            {currentAccMode === "vitrine" ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
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
                    <span>Hospedagem na Landing Page</span>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-brand-navy tracking-tight">
                    Acomodações para sua estadia
                  </h3>
                </div>

                {activeOrderedAccommodations.length === 0 ? (
                  <div className="rounded-2xl bg-white border border-brand-navy/10 p-6 text-center text-xs text-brand-ink-secondary">
                    Nenhuma acomodação visível no site público no momento.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
                    {activeOrderedAccommodations.map((acc, idx) => {
                      const isAboveFoldShowcase = idx < 6;
                      return (
                        <div key={acc.id} className="contents">
                          {idx === 6 && (
                            <div className="xl:col-span-2 rounded-xl bg-white border border-dashed border-brand-navy/25 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs font-semibold text-brand-navy">
                              <span>
                                A partir da 7ª posição: exibidas ao clicar em
                                &ldquo;Ver todas (+
                                {activeOrderedAccommodations.length - 6})&rdquo;
                              </span>
                            </div>
                          )}

                          <article
                            className={`rounded-2xl bg-white border overflow-hidden flex flex-col justify-between shadow-xs ${
                              isAboveFoldShowcase
                                ? "border-brand-navy/12"
                                : "border-brand-navy/10 opacity-90"
                            }`}
                          >
                            <div>
                              <div className="relative aspect-[16/10] bg-brand-surface overflow-hidden">
                                {acc.cover_image ? (
                                  <img
                                    src={acc.cover_image}
                                    alt={acc.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-brand-ink-muted">
                                    <BedDouble className="w-7 h-7" />
                                  </div>
                                )}
                                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-[#071B42]/86 text-white text-[11px] font-semibold tabular-nums">
                                  #{formatNumber(idx + 1)}
                                </span>
                                <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/95 text-brand-navy text-[11px] font-semibold tabular-nums">
                                  <Users className="w-3 h-3 shrink-0" />
                                  <span>{acc.max_guests}</span>
                                </span>
                              </div>

                              <div className="p-3.5 space-y-2">
                                <div>
                                  <h4 className="font-display text-sm font-semibold text-brand-navy leading-snug line-clamp-1">
                                    {acc.title}
                                  </h4>
                                  <p className="mt-0.5 text-[11px] font-medium text-brand-ink-muted truncate">
                                    {formatBedsSummary(acc)}
                                  </p>
                                </div>
                                <p className="text-xs text-brand-ink-secondary line-clamp-2 leading-relaxed">
                                  {acc.short_description ||
                                    "Resumo da acomodação exibido na vitrine."}
                                </p>
                              </div>
                            </div>

                            <div className="px-3.5 pb-3.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setAccViewOverride({
                                    triggerKey: accTriggerKey,
                                    mode: "detail",
                                  });
                                }}
                                className="w-full inline-flex items-center justify-between gap-2 min-h-9 px-3 rounded-xl bg-brand-navy hover:bg-brand-navy-light text-white text-xs font-semibold transition-colors"
                              >
                                <span>Ver fotos e detalhes</span>
                                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                              </button>
                            </div>
                          </article>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : targetDetailAccommodation ? (
              (() => {
                const detailPhotos = Array.from(
                  new Set(
                    [
                      targetDetailAccommodation.cover_image,
                      ...targetDetailAccommodation.gallery,
                    ].filter(Boolean),
                  ),
                );
                const safeDetailIdx =
                  detailPhotos.length > 0 &&
                  detailPhotoIdxState.slug === targetDetailAccommodation.slug
                    ? detailPhotoIdxState.index % detailPhotos.length
                    : 0;
                const activeDetailPhoto = detailPhotos[safeDetailIdx] ?? "";

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-brand-navy/10 text-xs font-semibold text-brand-navy">
                        <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                        <span>Todas as acomodações</span>
                      </span>
                      <span className="text-xs font-medium text-brand-ink-muted">
                        /acomodacoes/{targetDetailAccommodation.slug || "..."}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-brand-ink-muted">
                        <span
                          aria-hidden="true"
                          className="w-6 h-0.5 bg-brand-green shrink-0"
                        />
                        <span className="font-semibold text-brand-navy tabular-nums">
                          Até {targetDetailAccommodation.max_guests}{" "}
                          {targetDetailAccommodation.max_guests === 1
                            ? "pessoa"
                            : "pessoas"}
                        </span>
                        {detailPhotos.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{detailPhotos.length} fotos</span>
                          </>
                        )}
                      </div>
                      <h3 className="font-display text-2xl font-semibold text-brand-navy tracking-tight leading-tight break-words">
                        {targetDetailAccommodation.title ||
                          "Nome da acomodação"}
                      </h3>
                      {targetDetailAccommodation.short_description && (
                        <p className="text-xs text-brand-ink-secondary leading-relaxed break-words">
                          {targetDetailAccommodation.short_description}
                        </p>
                      )}
                    </div>

                    {/* Galeria da Página da Acomodação */}
                    <div className="rounded-2xl bg-white border border-brand-navy/10 p-2.5 space-y-2 shadow-xs">
                      <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-brand-surface">
                        {activeDetailPhoto ? (
                          <img
                            src={activeDetailPhoto}
                            alt={targetDetailAccommodation.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-brand-ink-muted">
                            <BedDouble className="w-9 h-9" />
                          </div>
                        )}

                        <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/95 text-brand-navy text-xs font-semibold">
                          <Users className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Até {targetDetailAccommodation.max_guests}{" "}
                            {targetDetailAccommodation.max_guests === 1
                              ? "pessoa"
                              : "pessoas"}
                          </span>
                        </span>

                        {detailPhotos.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setDetailPhotoIdxState({
                                  slug: targetDetailAccommodation.slug,
                                  index:
                                    (safeDetailIdx - 1 + detailPhotos.length) %
                                    detailPhotos.length,
                                })
                              }
                              aria-label="Foto anterior no preview"
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-[#071B42]/75 text-white flex items-center justify-center"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDetailPhotoIdxState({
                                  slug: targetDetailAccommodation.slug,
                                  index:
                                    (safeDetailIdx + 1) % detailPhotos.length,
                                })
                              }
                              aria-label="Próxima foto no preview"
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-[#071B42]/75 text-white flex items-center justify-center"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-[#071B42]/80 text-white text-[11px] font-semibold tabular-nums">
                              {formatNumber(safeDetailIdx + 1)} /{" "}
                              {formatNumber(detailPhotos.length)}
                            </span>
                          </>
                        )}
                      </div>

                      {detailPhotos.length > 1 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                          {detailPhotos.map((photoUrl, idx) => (
                            <button
                              key={`${photoUrl}-${idx}`}
                              type="button"
                              onClick={() =>
                                setDetailPhotoIdxState({
                                  slug: targetDetailAccommodation.slug,
                                  index: idx,
                                })
                              }
                              className={`w-14 h-11 rounded-lg overflow-hidden border-2 shrink-0 ${
                                idx === safeDetailIdx
                                  ? "border-brand-navy ring-1 ring-brand-green"
                                  : "border-transparent opacity-65 hover:opacity-100"
                              }`}
                            >
                              <img
                                src={photoUrl}
                                alt={`Miniatura ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Descrição e Camas */}
                    <div className="rounded-2xl bg-white border border-brand-navy/10 p-4 space-y-2.5 shadow-xs">
                      <div className="flex items-center gap-2 text-xs font-medium text-brand-ink-muted">
                        <span className="w-5 h-0.5 bg-brand-green" />
                        <span className="font-semibold text-brand-navy">
                          01
                        </span>
                        <span>·</span>
                        <span>A acomodação</span>
                      </div>
                      <p className="text-xs text-brand-ink-secondary leading-relaxed whitespace-pre-line break-words">
                        {targetDetailAccommodation.full_description ||
                          targetDetailAccommodation.short_description ||
                          "Descrição completa exibida na página individual."}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white border border-brand-navy/10 p-4 space-y-2.5 shadow-xs">
                      <div className="flex items-center gap-2 text-xs font-medium text-brand-ink-muted">
                        <span className="w-5 h-0.5 bg-brand-green" />
                        <span className="font-semibold text-brand-navy">
                          02
                        </span>
                        <span>·</span>
                        <span>Disposição de camas</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {targetDetailAccommodation.beds.map((bed, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl bg-brand-bg border border-brand-navy/10 p-2.5 flex items-center gap-2.5"
                          >
                            <span className="w-8 h-8 rounded-lg bg-brand-navy text-white text-xs font-semibold flex items-center justify-center shrink-0 tabular-nums">
                              {bed.count}x
                            </span>
                            <span className="text-xs font-semibold text-brand-navy break-words">
                              {bed.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Resumo de Comodidades Ativas + Reserva */}
                    <div className="rounded-2xl bg-white border border-brand-navy/10 p-4 space-y-3 shadow-xs">
                      <div className="flex items-center gap-2 text-xs font-medium text-brand-ink-muted">
                        <span className="w-5 h-0.5 bg-brand-green" />
                        <span className="font-semibold text-brand-navy">
                          03
                        </span>
                        <span>·</span>
                        <span>Comodidades incluídas</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {targetDetailAccommodation.has_ac && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-bg border border-brand-navy/10 text-xs font-medium text-brand-navy">
                            <Snowflake className="w-3 h-3 shrink-0" />
                            <span>Ar-condicionado</span>
                          </span>
                        )}
                        {targetDetailAccommodation.has_tv && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-bg border border-brand-navy/10 text-xs font-medium text-brand-navy">
                            <Tv className="w-3 h-3 shrink-0" />
                            <span>TV</span>
                          </span>
                        )}
                        {targetDetailAccommodation.has_kitchen && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-bg border border-brand-navy/10 text-xs font-medium text-brand-navy">
                            <Utensils className="w-3 h-3 shrink-0" />
                            <span>Cozinha</span>
                          </span>
                        )}
                        {targetDetailAccommodation.has_kitchen_utensils &&
                          !targetDetailAccommodation.has_kitchen && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-bg border border-brand-navy/10 text-xs font-medium text-brand-navy">
                              <Refrigerator className="w-3 h-3 shrink-0" />
                              <span>Frigobar</span>
                            </span>
                          )}
                        {targetDetailAccommodation.has_wifi && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-bg border border-brand-navy/10 text-xs font-medium text-brand-navy">
                            <Wifi className="w-3 h-3 shrink-0" />
                            <span>Wi-Fi</span>
                          </span>
                        )}
                        {targetDetailAccommodation.has_private_bathroom && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-bg border border-brand-navy/10 text-xs font-medium text-brand-navy">
                            <Bath className="w-3 h-3 shrink-0" />
                            <span>Banheiro privativo</span>
                          </span>
                        )}
                        {targetDetailAccommodation.is_pet_friendly && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-bg border border-brand-navy/10 text-xs font-medium text-brand-navy">
                            <Dog className="w-3 h-3 shrink-0" />
                            <span>Pet friendly</span>
                          </span>
                        )}
                      </div>
                      <div className="rounded-xl bg-brand-green px-4 py-2.5 text-center text-xs font-semibold text-brand-navy inline-flex w-full items-center justify-center gap-2">
                        <WhatsAppIcon className="w-4 h-4 shrink-0" />
                        <span>Consultar disponibilidade</span>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : null}
          </>
        )}

        {/* ===================================================================
            ABA 2: LANDING PAGE OFICIAL (/)
        =================================================================== */}
        {activeSection === "landing" && (
          <div className="space-y-5">
            {(landingFocusSection === "all" ||
              landingFocusSection === "hero") && (
              <section className="rounded-2xl bg-brand-scrim text-white overflow-hidden shadow-xs">
                {currentSlide ? (
                  <div className="relative min-h-[310px] flex flex-col justify-between">
                    <div aria-hidden="true" className="absolute inset-0">
                      {currentSlide.image_url && (
                        <img
                          src={currentSlide.image_url}
                          alt={currentSlide.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-b from-[#071B42]/74 via-[#071B42]/18 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#071B42]/92 via-[#071B42]/48 to-transparent" />
                    </div>

                    <div className="relative z-10 px-4 py-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-white p-1 flex items-center justify-center shrink-0">
                          <img
                            src="/logoMoradasdoGabriel.svg"
                            alt=""
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="font-display text-xs font-semibold text-white truncate">
                          {displayCompanyName}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-green text-brand-navy text-[11px] font-semibold shrink-0">
                        <WhatsAppIcon className="w-3 h-3 shrink-0" />
                        <span>Reservar</span>
                      </span>
                    </div>

                    <div className="relative z-10 px-4 pt-6 pb-4 space-y-2">
                      <p className="flex items-center gap-2 text-[11px] font-medium text-[#D8E1F0]">
                        <span className="font-semibold tabular-nums text-brand-green">
                          {formatNumber(activeHeroIdx + 1)} /{" "}
                          {formatNumber(slides.length)}
                        </span>
                        <span>·</span>
                        <span>{currentSlide.topic || "Tópico"}</span>
                      </p>
                      <h3 className="font-display text-xl font-semibold leading-[1.08] tracking-tight text-white break-words">
                        {currentSlide.title || "Título principal do slide"}
                      </h3>
                      <p className="text-xs text-[#E5ECF7] leading-relaxed line-clamp-2 break-words">
                        {currentSlide.subtitle ||
                          "Subtítulo exibido na abertura da Landing Page."}
                      </p>
                      <div className="pt-1 flex flex-wrap items-center gap-1.5">
                        <span className="px-3 py-1.5 rounded-lg bg-white text-brand-navy text-[11px] font-semibold">
                          {currentSlide.cta_label || "Ver acomodações"}
                        </span>
                        <span className="px-3 py-1.5 rounded-lg bg-[#071B42]/78 border border-white/30 text-white text-[11px] font-medium">
                          Consultar no WhatsApp
                        </span>
                      </div>
                    </div>

                    {/* Dock inferior dos capítulos */}
                    <div className="relative z-10 border-t border-white/15 bg-[#071B42]/88 px-3 py-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {slides.map((s, idx) => {
                          const isCurrent = idx === activeHeroIdx;
                          return (
                            <button
                              key={s.id || idx}
                              type="button"
                              onClick={() =>
                                setHeroSlideOverride({
                                  syncedIndex: landingDraft.activeSlideIndex,
                                  index: idx,
                                })
                              }
                              className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                                isCurrent
                                  ? "bg-white/14 text-white border-b-2 border-brand-green"
                                  : "text-[#B8C7E0] hover:text-white"
                              }`}
                            >
                              {formatNumber(idx + 1)} ·{" "}
                              {s.topic || `Slide ${idx + 1}`}
                            </button>
                          );
                        })}
                      </div>
                      {slides.length > 1 && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setHeroSlideOverride({
                                syncedIndex: landingDraft.activeSlideIndex,
                                index:
                                  (activeHeroIdx - 1 + slides.length) %
                                  slides.length,
                              })
                            }
                            aria-label="Slide anterior no preview"
                            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setHeroSlideOverride({
                                syncedIndex: landingDraft.activeSlideIndex,
                                index: (activeHeroIdx + 1) % slides.length,
                              })
                            }
                            aria-label="Próximo slide no preview"
                            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-[#D8E1F0]">
                    Adicione ao menos um slide para visualizar a Hero.
                  </div>
                )}
              </section>
            )}

            {(landingFocusSection === "all" ||
              landingFocusSection === "about") && (
              <section className="rounded-2xl bg-white border border-brand-navy/10 p-4 sm:p-5 space-y-4 shadow-xs">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-medium text-brand-ink-muted">
                    <span className="w-6 h-0.5 bg-brand-green shrink-0" />
                    <span className="tabular-nums font-semibold text-brand-navy">
                      01
                    </span>
                    <span>·</span>
                    <span>{aboutData.badge || "Sobre a pousada"}</span>
                  </div>
                  <h4 className="font-display text-lg font-semibold text-brand-navy leading-tight break-words">
                    {aboutData.title || "Título da seção Sobre"}
                  </h4>
                  {aboutData.image_url && (
                    <div className="aspect-[16/9] rounded-xl overflow-hidden bg-brand-surface border border-brand-navy/10">
                      <img
                        src={aboutData.image_url}
                        alt={aboutData.title || "Sobre a pousada"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <p className="text-xs text-brand-ink-secondary leading-relaxed break-words">
                    {aboutData.description ||
                      "Parágrafo principal da seção Sobre a pousada."}
                  </p>
                  {aboutData.secondary_description && (
                    <p className="text-xs text-brand-ink-muted leading-relaxed break-words">
                      {aboutData.secondary_description}
                    </p>
                  )}
                </div>

                {aboutData.highlights.length > 0 && (
                  <div className="pt-3 border-t border-brand-navy/10 grid grid-cols-2 gap-3">
                    {aboutData.highlights.map((hl, idx) => (
                      <div key={idx} className="space-y-1">
                        <p className="text-[11px] font-medium text-brand-ink-muted tabular-nums">
                          <span className="font-semibold text-brand-navy">
                            {formatNumber(idx + 1)}
                          </span>{" "}
                          {hl.badge ? `· ${hl.badge}` : ""}
                        </p>
                        <p className="text-xs font-semibold text-brand-navy break-words">
                          {hl.title}
                        </p>
                        <p className="text-[11px] text-brand-ink-secondary leading-snug break-words">
                          {hl.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {(landingFocusSection === "all" ||
              landingFocusSection === "accommodations") && (
              <section className="rounded-2xl bg-white border border-brand-navy/10 p-4 sm:p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-medium text-brand-ink-muted">
                      <span className="w-6 h-0.5 bg-brand-green shrink-0" />
                      <span className="tabular-nums font-semibold text-brand-navy">
                        02
                      </span>
                      <span>·</span>
                      <span>Vitrine inicial (Top 6)</span>
                    </div>
                    <h4 className="font-display text-base font-semibold text-brand-navy mt-1">
                      Acomodações em destaque (
                      {Math.min(6, activeOrderedAccommodations.length)} de{" "}
                      {activeOrderedAccommodations.length})
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {activeOrderedAccommodations.slice(0, 6).map((acc, idx) => (
                    <div
                      key={acc.id}
                      className="rounded-xl bg-brand-bg border border-brand-navy/10 overflow-hidden"
                    >
                      <div className="relative aspect-[16/10] bg-brand-surface">
                        {acc.cover_image && (
                          <img
                            src={acc.cover_image}
                            alt={acc.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-[#071B42]/85 text-white text-[10px] font-semibold tabular-nums">
                          #{formatNumber(idx + 1)}
                        </span>
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-semibold text-brand-navy truncate">
                          {acc.title}
                        </p>
                        <p className="text-[11px] text-brand-ink-muted tabular-nums">
                          Até {acc.max_guests} pessoas
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {activeOrderedAccommodations.length > 6 && (
                  <div className="rounded-xl bg-brand-bg border border-brand-navy/12 px-3 py-2 text-center text-xs font-semibold text-brand-navy">
                    + Ver todas as {activeOrderedAccommodations.length}{" "}
                    acomodações (+{activeOrderedAccommodations.length - 6})
                  </div>
                )}
              </section>
            )}

            {(landingFocusSection === "all" ||
              landingFocusSection === "footer") && (
              <footer className="rounded-2xl bg-white border border-brand-navy/10 p-4 sm:p-5 space-y-4 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-white border border-brand-navy/10 p-1 flex items-center justify-center shrink-0">
                    <img
                      src="/logoMoradasdoGabriel.svg"
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold text-brand-navy truncate">
                      {displayCompanyName}
                    </p>
                    {footerData?.cnpj && (
                      <p className="text-[11px] text-brand-ink-muted tabular-nums">
                        CNPJ: {footerData.cnpj}
                      </p>
                    )}
                  </div>
                </div>

                {baseMetadata.location.address && (
                  <p className="text-xs text-brand-ink-secondary">
                    {baseMetadata.location.address}
                  </p>
                )}

                {footerData?.check_in_out_info && (
                  <p className="text-[11px] font-medium text-brand-ink-muted">
                    {footerData.check_in_out_info}
                  </p>
                )}

                <div className="pt-3 border-t border-brand-navy/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-brand-ink-muted">
                  <span>
                    © {new Date().getFullYear()} {displayCompanyName}.{" "}
                    {footerData?.copyright_note ||
                      "Todos os direitos reservados."}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Lock className="w-3 h-3 shrink-0" />
                    <span>Painel da pousada</span>
                  </span>
                </div>
              </footer>
            )}
          </div>
        )}

        {/* ===================================================================
            ABA 3: LINKS RÁPIDOS (/links-contato · MOLDURA MOBILE)
        =================================================================== */}
        {activeSection === "links" && (
          <div className="max-w-[360px] mx-auto rounded-[28px] border-[5px] border-brand-scrim bg-brand-bg overflow-hidden shadow-xs">
            <div className="bg-brand-scrim px-4 py-2 flex items-center justify-between text-[11px] font-medium text-[#D8E1F0]">
              <span>/links-contato</span>
              <span>Mobile Preview</span>
            </div>

            <div className="p-4 space-y-4">
              <div className="text-center space-y-2.5 pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-brand-navy/12 text-[11px] font-semibold text-brand-navy">
                  <ArrowLeft className="w-3 h-3 shrink-0" />
                  <span>Conhecer o site da pousada</span>
                </span>

                <div className="mx-auto w-20 h-20 rounded-2xl bg-white border border-brand-navy/10 p-2 flex items-center justify-center">
                  <img
                    src="/logoMoradasdoGabriel.svg"
                    alt="Logo Moradas do Gabriel"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-brand-ink-muted">
                  <span className="w-5 h-0.5 bg-brand-green" />
                  <span>Central de links e contatos</span>
                </div>

                <h3 className="font-display text-lg font-semibold text-brand-navy">
                  Moradas do Gabriel
                </h3>
                <p className="text-xs text-brand-ink-secondary leading-relaxed break-words">
                  {businessInfo?.content ||
                    "Seja muito bem-vindo! Aqui você encontra nossas informações e acessos rápidos."}
                </p>
              </div>

              <div className="space-y-2">
                {/* Botão Fixo Principal: Site Oficial */}
                <div className="flex items-center justify-between gap-2.5 p-3 rounded-2xl bg-brand-navy text-white shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-xl bg-white/12 flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <span className="block text-[10px] text-[#D8E1F0]">
                        Site oficial
                      </span>
                      <p className="font-display text-xs font-semibold truncate">
                        Conheça a Pousada Moradas do Gabriel
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D8E1F0] shrink-0" />
                </div>

                {/* Links Dinâmicos na Ordem Atual */}
                {activeLinksForPreview.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between gap-2.5 p-3 rounded-2xl bg-white border border-brand-navy/10 text-brand-navy shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-brand-bg border border-brand-navy/10 flex items-center justify-center shrink-0">
                        <PreviewLinkIcon
                          icon={link.icon}
                          title={link.title}
                          url={link.url}
                        />
                      </span>
                      <span className="text-xs font-semibold truncate">
                        {link.title}
                      </span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-brand-ink-muted shrink-0" />
                  </div>
                ))}

                {!hasWhatsappInLinks && (
                  <div className="flex items-center justify-between gap-2.5 p-3 rounded-2xl bg-white border border-brand-navy/10 text-brand-navy">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-brand-bg border border-brand-navy/10 flex items-center justify-center shrink-0">
                        <WhatsAppIcon className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-semibold truncate">
                        {maskedWhatsapp
                          ? `WhatsApp: ${maskedWhatsapp}`
                          : "WhatsApp"}
                      </span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-brand-ink-muted shrink-0" />
                  </div>
                )}

                {!hasInstagramInLinks && (
                  <div className="flex items-center justify-between gap-2.5 p-3 rounded-2xl bg-white border border-brand-navy/10 text-brand-navy">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-brand-bg border border-brand-navy/10 flex items-center justify-center shrink-0">
                        <InstagramIcon className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-semibold truncate">
                        {maskedInstagram
                          ? `Instagram: ${maskedInstagram}`
                          : "Instagram"}
                      </span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-brand-ink-muted shrink-0" />
                  </div>
                )}

                <div className="flex items-center justify-between gap-2.5 p-3 rounded-2xl bg-white border border-brand-navy/10 text-brand-navy">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-xl bg-brand-bg border border-brand-navy/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-semibold truncate">
                      Como chegar
                    </span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-brand-ink-muted shrink-0" />
                </div>

                {maskedPhone && (
                  <div className="pt-1 text-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-brand-navy/10 text-[11px] font-semibold text-brand-ink-secondary">
                      <Phone className="w-3 h-3 shrink-0 text-brand-navy" />
                      <span>Recepção: {maskedPhone}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            ABA 4: GUIA DO HÓSPEDE (/guia-do-hospede · MOLDURA MOBILE)
        =================================================================== */}
        {activeSection === "guide" && (
          <div className="max-w-[360px] mx-auto rounded-[28px] border-[5px] border-brand-scrim bg-brand-bg overflow-hidden shadow-xs">
            {/* Banner Navy Superior Oficial */}
            <div className="bg-brand-scrim text-white px-4 pt-3.5 pb-4 space-y-3">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 font-semibold">
                  <ArrowLeft className="w-3 h-3 shrink-0" />
                  <span>Voltar ao site</span>
                </span>
                <div className="flex items-center gap-1.5 text-[#D8E1F0]">
                  <span className="w-4 h-0.5 bg-brand-green" />
                  <span>Guia do hóspede</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0">
                  <img
                    src="/logoMoradasdoGabriel.svg"
                    alt=""
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-base font-semibold text-white leading-tight truncate">
                    Moradas do Gabriel
                  </h3>
                  <p className="mt-0.5 text-[11px] text-[#D8E1F0] line-clamp-2 leading-snug break-words">
                    {guideDraft.content ||
                      "Seja muito bem-vindo! Aqui você encontra informações da sua estadia."}
                  </p>
                </div>
              </div>
            </div>

            {/* Navbar Sticky Interna (Rota, Wi-Fi, Regras, Dicas) */}
            <div className="bg-white border-b border-brand-navy/10 grid grid-cols-4 text-center">
              {[
                { id: "como-chegar" as const, label: "Rota" },
                { id: "guia-wifi" as const, label: "Wi-Fi" },
                { id: "guia-regras" as const, label: "Regras" },
                { id: "guia-dicas" as const, label: "Dicas" },
              ].map((navItem) => {
                const isSelected = guideSectionTab === navItem.id;
                return (
                  <button
                    key={navItem.id}
                    type="button"
                    onClick={() =>
                      setGuideSectionTab((curr) =>
                        curr === navItem.id ? "all" : navItem.id,
                      )
                    }
                    className={`py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                      isSelected
                        ? "border-brand-navy text-brand-navy"
                        : "border-transparent text-brand-ink-muted hover:text-brand-navy"
                    }`}
                  >
                    {navItem.label}
                  </button>
                );
              })}
            </div>

            <div className="p-3.5 space-y-6">
              {/* 01 · Como Chegar */}
              {(guideSectionTab === "all" ||
                guideSectionTab === "como-chegar") && (
                <section className="space-y-2.5">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-brand-ink-muted">
                    <span className="w-5 h-0.5 bg-brand-green" />
                    <span className="font-semibold text-brand-navy tabular-nums">
                      01
                    </span>
                    <span>·</span>
                    <span>Como chegar</span>
                  </div>

                  <div className="rounded-2xl bg-white border border-brand-navy/10 overflow-hidden shadow-xs divide-y divide-brand-navy/8">
                    {extractEmbedUrl(previewLocation.embed_url) && (
                      <div className="h-32 bg-brand-surface">
                        <iframe
                          src={extractEmbedUrl(previewLocation.embed_url)}
                          title="Mapa no preview oficial"
                          className="w-full h-full border-0"
                          loading="lazy"
                        />
                      </div>
                    )}
                    {previewLocation.address && (
                      <div className="p-3 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] text-brand-ink-muted">
                            Endereço
                          </p>
                          <p className="text-xs font-semibold text-brand-navy break-words">
                            {previewLocation.address}
                          </p>
                        </div>
                        <span className="w-8 h-8 rounded-lg bg-brand-bg border border-brand-navy/10 flex items-center justify-center shrink-0 text-brand-navy">
                          <Copy className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    )}
                    {previewLocation.instructions && (
                      <div className="p-3">
                        <p className="text-[11px] text-brand-ink-muted">
                          Orientações de chegada
                        </p>
                        <p className="mt-0.5 text-xs text-brand-ink-secondary leading-relaxed break-words">
                          {previewLocation.instructions}
                        </p>
                      </div>
                    )}
                    <div className="p-3 grid grid-cols-2 gap-2">
                      <span className="py-2 rounded-xl bg-brand-navy text-white text-[11px] font-semibold text-center">
                        Google Maps
                      </span>
                      <span className="py-2 rounded-xl bg-brand-bg border border-brand-navy/15 text-brand-navy text-[11px] font-semibold inline-flex items-center justify-center gap-1">
                        <WazeIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>Ir com Waze</span>
                      </span>
                    </div>
                  </div>
                </section>
              )}

              {/* 02 · Wi-Fi (ordem exata do editor) */}
              {(guideSectionTab === "all" ||
                guideSectionTab === "guia-wifi") && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[11px] font-medium text-brand-ink-muted">
                      <span className="w-5 h-0.5 bg-brand-green" />
                      <span className="font-semibold text-brand-navy tabular-nums">
                        02
                      </span>
                      <span>·</span>
                      <span>Wi-Fi ({guideWifiList.length})</span>
                    </div>
                  </div>

                  {guideWifiList.length === 0 ? (
                    <div className="rounded-2xl bg-white border border-brand-navy/10 p-4 text-center text-xs text-brand-ink-secondary">
                      Nenhuma rede Wi-Fi informada.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {guideWifiList.map((net, idx) => (
                        <div
                          key={net.id || idx}
                          className="rounded-2xl bg-white border border-brand-navy/10 overflow-hidden shadow-xs divide-y divide-brand-navy/8"
                        >
                          {(net.label || idx === 0) && (
                            <div className="px-3.5 py-2 bg-brand-surface flex items-center justify-between gap-2 text-xs font-semibold text-brand-navy">
                              <span className="truncate">
                                {net.label || `Rede #${idx + 1}`}
                              </span>
                              <span className="text-[10px] font-medium text-brand-ink-muted tabular-nums shrink-0">
                                #{formatNumber(idx + 1)}
                              </span>
                            </div>
                          )}
                          <div className="px-3.5 py-2.5">
                            <p className="text-[11px] text-brand-ink-muted">
                              Nome da rede (SSID)
                            </p>
                            <p className="text-xs font-semibold text-brand-navy break-words">
                              {net.ssid || "Não preenchido"}
                            </p>
                          </div>
                          <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[11px] text-brand-ink-muted">
                                Senha
                              </p>
                              <p className="text-xs font-mono font-semibold text-brand-navy break-words">
                                {net.password || "Rede aberta"}
                              </p>
                            </div>
                            <span className="px-2.5 py-1.5 rounded-lg bg-brand-navy text-white text-[11px] font-semibold shrink-0">
                              Copiar
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* 03 · Regras da Hospedagem (Numeração Dinâmica 01..0N) */}
              {(guideSectionTab === "all" ||
                guideSectionTab === "guia-regras") && (
                <section className="space-y-2.5">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-brand-ink-muted">
                    <span className="w-5 h-0.5 bg-brand-green" />
                    <span className="font-semibold text-brand-navy tabular-nums">
                      03
                    </span>
                    <span>·</span>
                    <span>Regras da hospedagem ({guideRules.length})</span>
                  </div>

                  <div className="rounded-2xl bg-white border border-brand-navy/10 overflow-hidden shadow-xs">
                    {guideRules.length > 0 ? (
                      <ol className="divide-y divide-brand-navy/8 px-3.5">
                        {guideRules.map((rule, idx) => (
                          <li
                            key={`${idx}-${rule.slice(0, 12)}`}
                            className="py-2.5 flex items-baseline gap-2.5"
                          >
                            <span className="font-display text-xs font-semibold tabular-nums text-brand-navy shrink-0">
                              {formatNumber(idx + 1)}
                            </span>
                            <span className="text-xs text-brand-ink-secondary leading-relaxed break-words">
                              {rule || "(Regra vazia)"}
                            </span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="p-4 text-xs text-brand-ink-secondary">
                        Nenhuma regra cadastrada.
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* 04 · Curadoria da Pousada (ordem exata do editor) */}
              {(guideSectionTab === "all" ||
                guideSectionTab === "guia-dicas") && (
                <section className="space-y-2.5">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-brand-ink-muted">
                    <span className="w-5 h-0.5 bg-brand-green" />
                    <span className="font-semibold text-brand-navy tabular-nums">
                      04
                    </span>
                    <span>·</span>
                    <span>Curadoria ({guidePlaces.length})</span>
                  </div>

                  {previewPlacesCombined.length === 0 ? (
                    <div className="rounded-2xl bg-white border border-brand-navy/10 p-4 text-center text-xs text-brand-ink-secondary">
                      Nenhum local cadastrado na curadoria.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {previewPlacesCombined.map((place, idx) => {
                        const imgs =
                          Array.isArray(place.images) && place.images.length > 0
                            ? place.images.filter(Boolean)
                            : place.image_url?.trim()
                              ? [place.image_url.trim()]
                              : [];
                        const placeKey = `${place.name}-${idx}`;
                        const imgIdx =
                          imgs.length > 0
                            ? (guidePlacePhotoMap[placeKey] ?? 0) % imgs.length
                            : 0;
                        const isFocused =
                          (place.__isDraft &&
                            guideDraft.focusedPlaceIndex === "new") ||
                          (!place.__isDraft &&
                            guideDraft.focusedPlaceIndex === idx);

                        return (
                          <article
                            key={placeKey}
                            className={`rounded-2xl bg-white border overflow-hidden shadow-xs ${
                              isFocused
                                ? "border-brand-navy ring-2 ring-brand-green/60"
                                : "border-brand-navy/10"
                            }`}
                          >
                            {imgs.length > 0 && (
                              <div className="relative aspect-[16/10] bg-brand-surface">
                                <img
                                  src={imgs[imgIdx]}
                                  alt={place.name}
                                  className="w-full h-full object-cover"
                                />
                                <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/95 text-brand-navy text-[10px] font-semibold">
                                  <PlaceCategoryIcon
                                    category={place.category || "Gastronomia"}
                                    className="w-3 h-3 shrink-0"
                                  />
                                  <span>{place.category}</span>
                                </span>
                                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-[#071B42]/85 text-white text-[10px] font-semibold tabular-nums">
                                  {place.__isDraft
                                    ? "Nova"
                                    : `#${formatNumber(idx + 1)}`}
                                </span>
                                {imgs.length > 1 && (
                                  <div className="absolute bottom-2 right-2 flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setGuidePlacePhotoMap((prev) => ({
                                          ...prev,
                                          [placeKey]:
                                            (imgIdx - 1 + imgs.length) %
                                            imgs.length,
                                        }))
                                      }
                                      aria-label={`Foto anterior de ${place.name}`}
                                      className="w-7 h-7 rounded-md bg-[#071B42]/80 text-white flex items-center justify-center"
                                    >
                                      <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setGuidePlacePhotoMap((prev) => ({
                                          ...prev,
                                          [placeKey]:
                                            (imgIdx + 1) % imgs.length,
                                        }))
                                      }
                                      aria-label={`Próxima foto de ${place.name}`}
                                      className="w-7 h-7 rounded-md bg-[#071B42]/80 text-white flex items-center justify-center"
                                    >
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="p-3 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-display text-sm font-semibold text-brand-navy break-words">
                                  {place.name}
                                </h4>
                                {imgs.length === 0 && (
                                  <span className="px-2 py-0.5 rounded bg-brand-bg border border-brand-navy/10 text-[10px] font-semibold text-brand-navy tabular-nums shrink-0">
                                    {place.__isDraft
                                      ? "Nova"
                                      : `#${formatNumber(idx + 1)}`}
                                  </span>
                                )}
                              </div>

                              {place.description && (
                                <p className="text-xs text-brand-ink-secondary leading-relaxed break-words">
                                  {place.description}
                                </p>
                              )}

                              {place.link && (
                                <div className="pt-0.5">
                                  <span className="w-full py-2 px-3 rounded-xl bg-brand-navy text-white text-[11px] font-semibold inline-flex items-center justify-center gap-1.5">
                                    <span>{getPlaceCtaLabel(place.link)}</span>
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                  </span>
                                </div>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Rodapé discreto do Aside */}
      <div className="px-4 py-2.5 bg-white border-t border-brand-navy/10 flex items-center justify-between gap-2 text-[11px] text-brand-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-brand-navy shrink-0" />
          <span>Reflete alterações antes mesmo de salvar</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <Wifi className="w-3 h-3 shrink-0" />
          <span>Sincronizado</span>
        </span>
      </div>
    </div>
  );
}
