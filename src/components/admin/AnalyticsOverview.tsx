import {
  Compass,
  Eye,
  MapPin,
  MousePointerClick,
  RefreshCw,
  Wifi,
} from "lucide-react";
import type { AnalyticsSummary } from "../../services";

interface AnalyticsOverviewProps {
  summary: AnalyticsSummary | undefined;
  isLoading: boolean;
  isFetching: boolean;
  onRefresh: () => void;
}

export function AnalyticsOverview({
  summary,
  isLoading,
  isFetching,
  onRefresh,
}: AnalyticsOverviewProps) {
  const pageViews = summary?.totalPageViews ?? 0;
  const linkClicks = summary?.totalLinkClicks ?? 0;
  const guideInteractions = summary?.totalGuideInteractions ?? 0;
  const wifiCopies = summary?.wifiCopies ?? 0;
  const mapClicks = summary?.totalMapInteractions ?? 0;

  return (
    <section aria-label="Resumo de Analytics" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-brand-navy">
            Resumo de Analytics
          </h2>
          <p className="text-xs text-brand-navy/65">
            Acompanhe os acessos, cliques nos botões e uso da Central do Hóspede
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-brand-navy hover:bg-slate-50 transition-colors disabled:opacity-50 shrink-0"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 shrink-0 ${isFetching ? "animate-spin" : ""}`}
          />
          <span>Atualizar</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Visualizações da Página (page_view) */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-navy/65">
              Visualizações
            </span>
            <div className="w-9 h-9 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center shrink-0">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading ? (
              <div className="h-8 w-20 rounded-lg bg-slate-100 animate-pulse" />
            ) : (
              <p className="text-2xl sm:text-3xl font-bold text-brand-navy">
                {pageViews}
              </p>
            )}
            <p className="mt-1 text-xs text-brand-navy/65">
              Acessos únicos (janela de 30min)
            </p>
          </div>
        </div>

        {/* Card 2: Cliques nos Links (link_click) */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-navy/65">
              Cliques nos Links
            </span>
            <div className="w-9 h-9 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center shrink-0">
              <MousePointerClick className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading ? (
              <div className="h-8 w-20 rounded-lg bg-slate-100 animate-pulse" />
            ) : (
              <p className="text-2xl sm:text-3xl font-bold text-brand-navy">
                {linkClicks}
              </p>
            )}
            <p className="mt-1 text-xs text-brand-navy/65">
              Total de cliques em botões e contatos
            </p>
          </div>
        </div>

        {/* Card 3: Interações no Guia do Hóspede (guide_interaction) */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-navy/65">
              Interações no Guia
            </span>
            <div className="w-9 h-9 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading ? (
              <div className="h-8 w-20 rounded-lg bg-slate-100 animate-pulse" />
            ) : (
              <p className="text-2xl sm:text-3xl font-bold text-brand-navy">
                {guideInteractions}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-brand-navy">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-brand-bg border border-slate-200">
                <Wifi className="w-3 h-3 shrink-0" />
                <span>Wi-Fi: {wifiCopies}x</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-brand-bg border border-slate-200">
                <MapPin className="w-3 h-3 shrink-0" />
                <span>Mapas: {mapClicks}x</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
