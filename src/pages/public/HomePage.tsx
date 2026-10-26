import { Lock } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { GuestGuideTab } from "../../components/public/GuestGuideTab";
import { LinksTab } from "../../components/public/LinksTab";
import { PublicHeader } from "../../components/public/PublicHeader";
import { useActiveLinks, useBusinessInfo } from "../../hooks/usePortalData";
import { DEFAULT_BUSINESS_METADATA, trackPageView } from "../../services";

type ActiveTab = "links" | "guide";

export function HomePage() {
  const location = useLocation();

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

  return (
    <div className="min-h-screen bg-brand-bg text-brand-navy flex flex-col justify-between">
      <div className="w-full max-w-lg mx-auto px-4 pb-10">
        {/* Header Principal */}
        <PublicHeader welcomeMessage={welcomeMessage} />

        {/* Conteúdo Individual da Rota (/links-contato ou /guia-do-hospede) */}
        <main className="mt-2">
          {activeTab === "links" ? (
            <LinksTab
              links={links}
              isLoading={isLoadingLinks}
              contacts={metadata.contacts}
              mapsUrl={metadata.location.maps_url}
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
