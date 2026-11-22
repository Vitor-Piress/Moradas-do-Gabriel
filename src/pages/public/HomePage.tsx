import { Lock, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
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

  const [focusedSection, setFocusedSection] = useState<string | null>(null);

  useEffect(() => {
    trackPageView(activeTab === "guide" ? "guia_do_hospede" : "links_contato");
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "guide" || !location.hash || !businessInfo) return;

    const sectionId = decodeURIComponent(location.hash.slice(1));
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const scrollDelay = prefersReducedMotion ? 50 : 340;
    const scrollDuration = prefersReducedMotion ? 1 : 780;
    let animationFrameId = 0;
    let clearHighlightTimeoutId = 0;

    window.scrollTo({ top: 0, behavior: "auto" });

    const triggerSectionFocus = () => {
      setFocusedSection(sectionId);
      clearHighlightTimeoutId = window.setTimeout(() => {
        setFocusedSection((current) =>
          current === sectionId ? null : current,
        );
      }, 1900);
    };

    const scrollToSection = () => {
      const target = document.getElementById(sectionId);
      if (!target) return;

      const startPosition = window.scrollY;
      // Mantém folga abaixo do navbar sticky para não cortar o destaque arredondado
      const targetPosition = Math.max(
        0,
        target.getBoundingClientRect().top + startPosition - 78,
      );

      if (prefersReducedMotion) {
        window.scrollTo({ top: targetPosition, behavior: "auto" });
        triggerSectionFocus();
        return;
      }

      const distance = targetPosition - startPosition;
      const startTime = performance.now();

      const animateScroll = (currentTime: number) => {
        const progress = Math.min(
          (currentTime - startTime) / scrollDuration,
          1,
        );
        const easedProgress = 1 - Math.pow(1 - progress, 3);

        window.scrollTo({
          top: startPosition + distance * easedProgress,
          behavior: "auto",
        });

        if (progress < 1) {
          animationFrameId = window.requestAnimationFrame(animateScroll);
        } else {
          triggerSectionFocus();
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
      window.clearTimeout(clearHighlightTimeoutId);
    };
  }, [activeTab, location.hash, location.key, businessInfo]);

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
          <h1 className="font-display text-xl font-semibold text-brand-navy">
            Não foi possível carregar as informações
          </h1>
          <p className="text-sm text-brand-ink-secondary leading-relaxed">
            Verifique sua conexão com a internet e tente novamente.
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

  const showLoader = isLoadingBusiness && !businessInfo;
  const metadata = businessInfo?.metadata;
  const welcomeMessage =
    businessInfo?.content ??
    "Seja muito bem-vindo! Aqui você encontra nossas informações e acessos rápidos para aproveitar sua estadia.";

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
        <PageTransition className="min-h-screen bg-brand-bg text-brand-navy flex flex-col justify-between overflow-x-clip">
          {activeTab === "guide" ? (
            <div className="flex-1 flex flex-col">
              <PublicHeader
                welcomeMessage={welcomeMessage}
                variant="guide"
              />
              <main className="flex-1">
                <GuestGuideTab
                  metadata={metadata}
                  focusedSection={focusedSection}
                />
              </main>
            </div>
          ) : (
            <div className="w-full max-w-lg mx-auto px-4 pb-10">
              <PublicHeader
                welcomeMessage={welcomeMessage}
                variant="links"
              />
              <main className="mt-1">
                <LinksTab
                  links={links}
                  isLoading={isLoadingLinks}
                  contacts={metadata.contacts}
                  mapsUrl={metadata.location.maps_url}
                />
              </main>
            </div>
          )}

          <footer className="w-full max-w-lg mx-auto px-4 py-6 border-t border-brand-navy/10 text-center space-y-2">
            <p className="text-xs font-medium text-brand-ink-muted">
              © {new Date().getFullYear()} Pousada Moradas do Gabriel
            </p>
            <div>
              <Link
                to="/admin"
                className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3 text-xs font-medium text-brand-ink-muted hover:text-brand-navy transition-colors"
              >
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Painel da pousada</span>
              </Link>
            </div>
          </footer>
        </PageTransition>
      )}
    </>
  );
}
