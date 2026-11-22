import {
  BedDouble,
  Compass,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  LogOut,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { LinkRow } from "../../@types/database.types";
import { AccommodationsManager } from "../../components/admin/AccommodationsManager";
import {
  AdminLivePreviewAside,
  type AccommodationDraftPreview,
  type AdminSection,
  type GuideDraftPreview,
  type LandingDraftPreview,
} from "../../components/admin/AdminLivePreviewAside";
import { AnalyticsOverview } from "../../components/admin/AnalyticsOverview";
import { GuestGuideEditor } from "../../components/admin/GuestGuideEditor";
import { LandingPageEditor } from "../../components/admin/LandingPageEditor";
import { LinksManager } from "../../components/admin/LinksManager";
import { useAuth } from "../../hooks/useAuth";
import {
  useAllAccommodations,
  useAllLinks,
  useAnalyticsSummary,
  useBusinessInfo,
} from "../../hooks/usePortalData";
import {
  DEFAULT_BUSINESS_METADATA,
  DEFAULT_LANDING_METADATA,
} from "../../services";

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [activeSection, setActiveSection] =
    useState<AdminSection>("accommodations");

  const { data: accommodations = [], isLoading: isLoadingAccommodations } =
    useAllAccommodations();
  const { data: links = [], isLoading: isLoadingLinks } = useAllLinks();
  const { data: businessInfo, isLoading: isLoadingBusiness } =
    useBusinessInfo();
  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
    isFetching: isFetchingAnalytics,
    refetch: refetchAnalytics,
  } = useAnalyticsSummary();

  // Estados de rascunho em tempo real para o painel lateral oficial (<aside> Desktop)
  const [accommodationsDraft, setAccommodationsDraft] =
    useState<AccommodationDraftPreview | null>(null);
  const [landingDraft, setLandingDraft] =
    useState<LandingDraftPreview | null>(null);
  const [linksDraft, setLinksDraft] = useState<LinkRow[] | null>(null);
  const [guideDraft, setGuideDraft] = useState<GuideDraftPreview | null>(null);

  const effectiveAccommodationsDraft = useMemo<AccommodationDraftPreview>(
    () =>
      accommodationsDraft ?? {
        orderedAccommodations: accommodations,
        focusedAccommodation: accommodations[0] ?? null,
        preferDetailView: false,
      },
    [accommodationsDraft, accommodations],
  );

  const effectiveLandingDraft = useMemo<LandingDraftPreview>(
    () =>
      landingDraft ?? {
        landing: businessInfo?.metadata.landing ?? DEFAULT_LANDING_METADATA,
        activeSlideIndex: 0,
      },
    [landingDraft, businessInfo],
  );

  const effectiveLinksDraft = useMemo<LinkRow[]>(
    () => linksDraft ?? links,
    [linksDraft, links],
  );

  const effectiveGuideDraft = useMemo<GuideDraftPreview>(
    () =>
      guideDraft ?? {
        content: businessInfo?.content ?? "",
        metadata: businessInfo?.metadata ?? DEFAULT_BUSINESS_METADATA,
        focusedPlaceIndex: 0,
      },
    [guideDraft, businessInfo],
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-navy pb-16">
      {/* Topbar do Painel Admin */}
      <header className="bg-white border-b border-brand-navy/10 sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-white border border-brand-navy/10 p-1.5 flex items-center justify-center shrink-0">
              <img
                src="/logoMoradasdoGabriel.svg"
                alt="Logo Pousada Moradas do Gabriel"
                width={32}
                height={32}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-base sm:text-lg font-semibold text-brand-navy tracking-tight truncate">
                Painel Admin · Moradas do Gabriel
              </h1>
              <p className="text-xs font-medium text-brand-ink-muted truncate">
                {user?.email || "Administrador"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl bg-white border border-brand-navy/12 hover:bg-brand-surface text-brand-navy text-xs font-semibold transition-colors"
            >
              <span>Landing Page</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </Link>

            <Link
              to="/links-contato"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl bg-white border border-brand-navy/12 hover:bg-brand-surface text-brand-navy text-xs font-semibold transition-colors"
            >
              <span>Links</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </Link>

            <Link
              to="/guia-do-hospede"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl bg-white border border-brand-navy/12 hover:bg-brand-surface text-brand-navy text-xs font-semibold transition-colors"
            >
              <span>Guia</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sair do painel administrativo"
              className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl bg-white border border-brand-navy/12 hover:bg-brand-surface text-brand-navy text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* 1. Resumo de Analytics */}
        <AnalyticsOverview
          summary={analytics}
          isLoading={isLoadingAnalytics}
          isFetching={isFetchingAnalytics}
          onRefresh={() => refetchAnalytics()}
        />

        {/* 2. Seletor de Seção do Admin */}
        <div className="space-y-5">
          <div className="p-1 rounded-xl bg-white border border-brand-navy/10 grid grid-cols-2 sm:grid-cols-4 gap-1 w-full shadow-xs">
            <button
              type="button"
              onClick={() => setActiveSection("accommodations")}
              className={`min-w-0 min-h-11 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                activeSection === "accommodations"
                  ? "bg-brand-navy text-white"
                  : "text-brand-ink-secondary hover:text-brand-navy hover:bg-brand-bg"
              }`}
            >
              <BedDouble className="w-4 h-4 shrink-0" />
              <span className="truncate">Acomodações</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("landing")}
              className={`min-w-0 min-h-11 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                activeSection === "landing"
                  ? "bg-brand-navy text-white"
                  : "text-brand-ink-secondary hover:text-brand-navy hover:bg-brand-bg"
              }`}
            >
              <Globe className="w-4 h-4 shrink-0" />
              <span className="truncate">Landing Page</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("links")}
              className={`min-w-0 min-h-11 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                activeSection === "links"
                  ? "bg-brand-navy text-white"
                  : "text-brand-ink-secondary hover:text-brand-navy hover:bg-brand-bg"
              }`}
            >
              <Link2 className="w-4 h-4 shrink-0" />
              <span className="truncate">Links Rápidos</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("guide")}
              className={`min-w-0 min-h-11 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                activeSection === "guide"
                  ? "bg-brand-navy text-white"
                  : "text-brand-ink-secondary hover:text-brand-navy hover:bg-brand-bg"
              }`}
            >
              <Compass className="w-4 h-4 shrink-0" />
              <span className="truncate">Guia do Hóspede</span>
            </button>
          </div>

          {/* Grid Desktop: Editores Persistentes (Esquerda) + Aside Oficial Sticky (Direita) */}
          <div className="lg:grid lg:grid-cols-12 lg:gap-7 items-start">
            <div className="lg:col-span-7 min-w-0">
              {/* Todas as abas ficam montadas via display CSS para nunca perder edições não salvas ao trocar de aba */}
              <div
                className={
                  activeSection === "accommodations" ? "block" : "hidden"
                }
              >
                <AccommodationsManager
                  accommodations={accommodations}
                  isLoading={isLoadingAccommodations}
                  onDraftChange={setAccommodationsDraft}
                />
              </div>

              <div className={activeSection === "landing" ? "block" : "hidden"}>
                {isLoadingBusiness && !businessInfo ? (
                  <div className="rounded-2xl bg-white border border-brand-navy/10 p-12 flex flex-col items-center justify-center text-brand-navy shadow-xs">
                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                    <p className="text-sm font-medium text-brand-ink-secondary">
                      Carregando dados da Landing Page...
                    </p>
                  </div>
                ) : (
                  <LandingPageEditor
                    businessInfo={businessInfo}
                    onDraftChange={setLandingDraft}
                  />
                )}
              </div>

              <div className={activeSection === "links" ? "block" : "hidden"}>
                <LinksManager
                  links={links}
                  isLoading={isLoadingLinks}
                  clicksByLinkId={analytics?.clicksByLinkId ?? {}}
                  onDraftChange={setLinksDraft}
                />
              </div>

              <div className={activeSection === "guide" ? "block" : "hidden"}>
                {isLoadingBusiness && !businessInfo ? (
                  <div className="rounded-2xl bg-white border border-brand-navy/10 p-12 flex flex-col items-center justify-center text-brand-navy shadow-xs">
                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                    <p className="text-sm font-medium text-brand-ink-secondary">
                      Carregando dados do Guia do Hóspede...
                    </p>
                  </div>
                ) : (
                  <GuestGuideEditor
                    businessInfo={businessInfo}
                    onDraftChange={setGuideDraft}
                  />
                )}
              </div>
            </div>

            {/* Painel Lateral Oficial em Tempo Real (Apenas Desktop lg+) */}
            <aside
              aria-label="Visualização oficial em tempo real"
              className="hidden lg:block lg:col-span-5 lg:sticky lg:top-20 min-w-0"
            >
              <AdminLivePreviewAside
                activeSection={activeSection}
                accommodationsDraft={effectiveAccommodationsDraft}
                landingDraft={effectiveLandingDraft}
                linksDraft={effectiveLinksDraft}
                guideDraft={effectiveGuideDraft}
                businessInfo={businessInfo}
              />
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
