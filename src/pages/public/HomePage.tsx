import { Lock, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { BrandLoader } from "../../components/public/BrandLoader";
import { GuestGuideTab } from "../../components/public/GuestGuideTab";
import { LinksTab } from "../../components/public/LinksTab";
import { PageTransition } from "../../components/public/Motion";
import { PublicHeader } from "../../components/public/PublicHeader";
import { useActiveLinks, useBusinessInfo } from "../../hooks/usePortalData";
import { trackPageView } from "../../services";

type ActiveTab = "links" | "guide";

export function HomePage() {
  const location = useLocation();

  const activeTab: ActiveTab =
    location.pathname === "/guia-do-hospede" ? "guide" : "links";

  const { data: links = [], isLoading: isLoadingLinks } = useActiveLinks();
  const {
    data: businessInfo,
    isLoading: isLoadingBusiness,
    isError: isBusinessError,
    refetch: refetchBusiness,
  } = useBusinessInfo();

  useEffect(() => {
    trackPageView(activeTab === "guide" ? "guia_do_hospede" : "links_contato");
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "guide" || !location.hash || !businessInfo) return;

    const sectionId = decodeURIComponent(location.hash.slice(1));
    const scrollDelay = 650;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const scrollDuration = prefersReducedMotion ? 1 : 1400;
    let animationFrameId = 0;

    window.scrollTo({ top: 0, behavior: "auto" });

    const scrollToSection = () => {
      const target = document.getElementById(sectionId);
      if (!target) return;

      const startPosition = window.scrollY;
      const targetPosition =
        target.getBoundingClientRect().top + startPosition - 16;
      const distance = targetPosition - startPosition;
      const startTime = performance.now();

      const animateScroll = (currentTime: number) => {
        const progress = Math.min(
          (currentTime - startTime) / scrollDuration,
          1,
        );
        const easedProgress =
          progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        window.scrollTo({
          top: startPosition + distance * easedProgress,
          behavior: "auto",
        });

        if (progress < 1) {
          animationFrameId = window.requestAnimationFrame(animateScroll);
        } else {
          target.classList.remove("anchor-highlight");
          void target.offsetWidth;
          target.classList.add("anchor-highlight");
          window.setTimeout(
            () => target.classList.remove("anchor-highlight"),
            2000,
          );
        }
      };

      animationFrameId = window.requestAnimationFrame(animateScroll);
    };

    const scrollTimeoutId = window.setTimeout(() => {
      scrollToSection();
    }, scrollDelay);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.clearTimeout(scrollTimeoutId);
    };
  }, [activeTab, location.hash, businessInfo]);

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
            Não foi possível carregar as informações
          </h1>
          <p className="text-sm text-brand-navy/75 leading-relaxed">
            Verifique sua conexão com a internet e tente novamente.
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

  const showLoader = isLoadingBusiness && !businessInfo;
  const metadata = businessInfo?.metadata;
  const welcomeMessage =
    businessInfo?.content ??
    "Seja muito bem-vindo! Aqui você encontra nossos links rápidos e o guia completo para aproveitar sua estadia.";

  return (
    <>
      <BrandLoader
        show={showLoader}
        message={
          activeTab === "guide"
            ? "Carregando Guia do Hóspede..."
            : "Carregando Central de Links..."
        }
      />

      {businessInfo && metadata && (
        <PageTransition className="min-h-screen bg-brand-bg text-brand-navy flex flex-col justify-between">
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
        </PageTransition>
      )}
    </>
  );
}
