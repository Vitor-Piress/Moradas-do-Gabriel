import { Compass, ExternalLink, Link2, Loader2, LogOut } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoMoradas from "../../assets/logoMoradasdoGabriel.png";
import { AnalyticsOverview } from "../../components/admin/AnalyticsOverview";
import { GuestGuideEditor } from "../../components/admin/GuestGuideEditor";
import { LinksManager } from "../../components/admin/LinksManager";
import { useAuth } from "../../hooks/useAuth";
import {
  useAllLinks,
  useAnalyticsSummary,
  useBusinessInfo,
} from "../../hooks/usePortalData";

type AdminSection = "links" | "guide";

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState<AdminSection>("links");

  const { data: links = [], isLoading: isLoadingLinks } = useAllLinks();
  const { data: businessInfo, isLoading: isLoadingBusiness } =
    useBusinessInfo();
  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
    isFetching: isFetchingAnalytics,
    refetch: refetchAnalytics,
  } = useAnalyticsSummary();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-navy pb-16">
      {/* Topbar do Painel Admin */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0">
              <img
                src={logoMoradas}
                alt="Logo Pousada Moradas do Gabriel"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-base font-bold text-brand-navy truncate">
                Painel Admin • Moradas do Gabriel
              </h1>
              <p className="text-xs text-brand-navy/65 truncate">
                {user?.email || "Administrador"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-brand-navy text-xs font-semibold transition-colors"
            >
              <span className="hidden sm:inline">Ver Página Pública</span>
              <span className="sm:hidden">Página Pública</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-brand-navy text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        {/* 1. Resumo de Analytics */}
        <AnalyticsOverview
          summary={analytics}
          isLoading={isLoadingAnalytics}
          isFetching={isFetchingAnalytics}
          onRefresh={() => refetchAnalytics()}
        />

        {/* 2. Seletor de Seção do Admin (Links vs Guia do Hóspede) */}
        <div className="space-y-5">
          <div className="p-1 rounded-xl bg-white border border-slate-200 grid grid-cols-2 gap-1 w-full sm:max-w-md shadow-xs">
            <button
              type="button"
              onClick={() => setActiveSection("links")}
              className={`min-w-0 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                activeSection === "links"
                  ? "bg-brand-navy text-white"
                  : "text-brand-navy/75 hover:text-brand-navy hover:bg-brand-bg"
              }`}
            >
              <Link2 className="w-4 h-4 shrink-0" />
              <span className="truncate">CRUD de Links</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("guide")}
              className={`min-w-0 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                activeSection === "guide"
                  ? "bg-brand-navy text-white"
                  : "text-brand-navy/75 hover:text-brand-navy hover:bg-brand-bg"
              }`}
            >
              <Compass className="w-4 h-4 shrink-0" />
              <span className="truncate">Guia do Hóspede</span>
            </button>
          </div>

          {activeSection === "links" ? (
            <LinksManager
              links={links}
              isLoading={isLoadingLinks}
              clicksByLinkId={analytics?.clicksByLinkId ?? {}}
            />
          ) : isLoadingBusiness ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-12 flex flex-col items-center justify-center text-brand-navy shadow-xs">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p className="text-sm font-medium text-brand-navy/75">
                Carregando dados do Guia do Hóspede...
              </p>
            </div>
          ) : (
            <GuestGuideEditor
              key={businessInfo?.updated_at ?? "default"}
              businessInfo={businessInfo}
            />
          )}
        </div>
      </main>
    </div>
  );
}
