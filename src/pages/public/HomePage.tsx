import { Lock } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { GuestGuideTab } from "../../components/public/GuestGuideTab";
import { LinksTab } from "../../components/public/LinksTab";
import { PublicHeader } from "../../components/public/PublicHeader";
import { PageTransition } from "../../components/public/Motion";
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

  useEffect(() => {
    if (activeTab !== "guide" || !location.hash) return;

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
          window.setTimeout(() => target.classList.remove("anchor-highlight"), 2000);
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
  }, [activeTab, location.hash]);

  return (
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
  );
}
