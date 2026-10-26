import { Compass, Link2, Lock } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GuestGuideTab } from "../../components/public/GuestGuideTab";
import { LinksTab } from "../../components/public/LinksTab";
import { PublicHeader } from "../../components/public/PublicHeader";
import { useActiveLinks, useBusinessInfo } from "../../hooks/usePortalData";
import {
  DEFAULT_BUSINESS_METADATA,
  trackGuideInteraction,
  trackPageView,
} from "../../services";

type ActiveTab = "links" | "guide";

export function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab: ActiveTab =
    location.pathname === "/guia-do-hospede" ? "guide" : "links";

  const { data: links = [], isLoading: isLoadingLinks } = useActiveLinks();
  const { data: businessInfo } = useBusinessInfo();

  const metadata = businessInfo?.metadata ?? DEFAULT_BUSINESS_METADATA;
  const welcomeMessage =
    businessInfo?.content ??
    "Seja muito bem-vindo! Aqui você encontra nossos links rápidos e o guia completo para aproveitar sua estadia.";

  useEffect(() => {
    trackPageView(activeTab === "guide" ? "guia_do_hospede" : "links_contato");
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "guide" && location.hash === "#como-chegar") {
      const timer = window.setTimeout(() => {
        const el = document.getElementById("como-chegar");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
      return () => window.clearTimeout(timer);
    }
  }, [activeTab, location.hash]);

  const handleNavigateToLocation = () => {
    navigate("/guia-do-hospede#como-chegar");
  };

  const handleTabChange = (tab: ActiveTab) => {
    if (tab === "guide") {
      trackGuideInteraction("open_guide_tab");
      navigate("/guia-do-hospede");
    } else {
      navigate("/links-contato");
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-navy flex flex-col justify-between">
      <div className="w-full max-w-lg mx-auto px-4 pb-10">
        {/* Header Principal */}
        <PublicHeader welcomeMessage={welcomeMessage} />

        {/* Seletor de 2 Abas Flat e Responsivo (320px-430px) */}
        <nav
          aria-label="Seções da Central do Hóspede"
          className="mt-2 mb-6 p-1 rounded-xl bg-white border border-slate-200 grid grid-cols-2 gap-1 shadow-xs"
        >
          <button
            type="button"
            onClick={() => handleTabChange("links")}
            className={`min-w-0 py-2.5 px-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === "links"
                ? "bg-brand-navy text-white"
                : "text-brand-navy/75 hover:text-brand-navy hover:bg-brand-bg"
            }`}
          >
            <Link2 className="w-4 h-4 shrink-0" />
            <span className="truncate">Links & Contatos</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("guide")}
            className={`min-w-0 py-2.5 px-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === "guide"
                ? "bg-brand-navy text-white"
                : "text-brand-navy/75 hover:text-brand-navy hover:bg-brand-bg"
            }`}
          >
            <Compass className="w-4 h-4 shrink-0" />
            <span className="truncate">Guia do Hóspede</span>
          </button>
        </nav>

        {/* Conteúdo da Aba Selecionada */}
        <main>
          {activeTab === "links" ? (
            <LinksTab
              links={links}
              isLoading={isLoadingLinks}
              contacts={metadata.contacts}
              onSwitchToGuide={() => handleTabChange("guide")}
              onNavigateToLocation={handleNavigateToLocation}
            />
          ) : (
            <GuestGuideTab metadata={metadata} />
          )}
        </main>
      </div>

      {/* Rodapé Editorial */}
      <footer className="w-full max-w-lg mx-auto px-4 py-6 border-t border-slate-200 text-center space-y-2">
        <p className="text-xs font-medium text-brand-navy/65">
          © {new Date().getFullYear()} Pousada Moradas do Gabriel
        </p>
        <div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-navy/50 hover:text-brand-navy transition-colors"
          >
            <Lock className="w-3 h-3 shrink-0" />
            <span>Painel da Pousada</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
