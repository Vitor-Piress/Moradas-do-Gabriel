import type { AnalyticsEventRow } from "../@types/database.types";
import { supabase } from "../lib/supabase";

const PAGE_VIEW_STORAGE_KEY = "moradas_gabriel_last_page_view";
const PAGE_VIEW_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutos

/**
 * Registra uma visualização de página (`page_view`) com trava de 30 minutos no `localStorage`
 * para evitar contagens duplicadas em recarregamentos seguidos.
 */
export async function trackPageView(eventTarget = "home"): Promise<void> {
  try {
    const lastViewStr = localStorage.getItem(PAGE_VIEW_STORAGE_KEY);
    const now = Date.now();

    if (lastViewStr) {
      const lastViewTime = Number(lastViewStr);
      if (
        !Number.isNaN(lastViewTime) &&
        now - lastViewTime < PAGE_VIEW_COOLDOWN_MS
      ) {
        return;
      }
    }

    localStorage.setItem(PAGE_VIEW_STORAGE_KEY, String(now));

    const { error } = await supabase.from("analytics_events").insert({
      event_type: "page_view",
      event_target: eventTarget,
      link_id: null,
    });

    if (error) {
      console.warn(
        "[analyticsService] Falha ao registrar page_view:",
        error.message,
      );
    }
  } catch (err) {
    console.warn("[analyticsService] Erro ao processar page_view:", err);
  }
}

/**
 * Registra um clique em um botão/link (`link_click`).
 */
export async function trackLinkClick(
  linkId: string | null,
  eventTarget?: string,
): Promise<void> {
  try {
    const { error } = await supabase.from("analytics_events").insert({
      event_type: "link_click",
      link_id: linkId,
      event_target: eventTarget ?? null,
    });

    if (error) {
      console.warn(
        "[analyticsService] Falha ao registrar link_click:",
        error.message,
      );
    }
  } catch (err) {
    console.warn("[analyticsService] Erro ao processar link_click:", err);
  }
}

/**
 * Registra uma interação no Guia do Hóspede (`guide_interaction`)
 * utilizando `event_target` (ex: 'copy_wifi_' + ssid, 'open_maps', 'open_waze', etc.).
 */
export async function trackGuideInteraction(
  eventTarget: string,
): Promise<void> {
  try {
    const { error } = await supabase.from("analytics_events").insert({
      event_type: "guide_interaction",
      event_target: eventTarget,
      link_id: null,
    });

    if (error) {
      console.warn(
        "[analyticsService] Falha ao registrar guide_interaction:",
        error.message,
      );
    }
  } catch (err) {
    console.warn(
      "[analyticsService] Erro ao processar guide_interaction:",
      err,
    );
  }
}

export interface AnalyticsSummary {
  totalPageViews: number;
  totalLinkClicks: number;
  totalGuideInteractions: number;
  wifiCopies: number;
  mapsClicks: number;
  wazeClicks: number;
  totalMapInteractions: number;
  placeTipsClicks: number;
  clicksByLinkId: Record<string, number>;
  recentEvents: AnalyticsEventRow[];
}

/**
 * Busca e consolida as métricas de analytics para o Painel Admin (/admin).
 */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const { data, error } = await supabase
    .from("analytics_events")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "[analyticsService] Erro ao buscar analytics:",
      error.message,
    );
    throw error;
  }

  const events = data ?? [];

  let totalPageViews = 0;
  let totalLinkClicks = 0;
  let totalGuideInteractions = 0;
  let wifiCopies = 0;
  let mapsClicks = 0;
  let wazeClicks = 0;
  let placeTipsClicks = 0;
  const clicksByLinkId: Record<string, number> = {};

  for (const ev of events) {
    if (ev.event_type === "page_view") {
      totalPageViews += 1;
    } else if (ev.event_type === "link_click") {
      totalLinkClicks += 1;
      if (ev.link_id) {
        clicksByLinkId[ev.link_id] = (clicksByLinkId[ev.link_id] ?? 0) + 1;
      }
    } else if (ev.event_type === "guide_interaction") {
      totalGuideInteractions += 1;
      const target = (ev.event_target || "").toLowerCase();

      if (
        target === "copy_wifi" ||
        target.startsWith("copy_wifi_") ||
        target.includes("wifi")
      ) {
        wifiCopies += 1;
      } else if (target === "open_maps" || target.includes("maps")) {
        mapsClicks += 1;
      } else if (target === "open_waze" || target.includes("waze")) {
        wazeClicks += 1;
      } else if (target.startsWith("place_tip") || target.includes("place")) {
        placeTipsClicks += 1;
      }
    }
  }

  return {
    totalPageViews,
    totalLinkClicks,
    totalGuideInteractions,
    wifiCopies,
    mapsClicks,
    wazeClicks,
    totalMapInteractions: mapsClicks + wazeClicks,
    placeTipsClicks,
    clicksByLinkId,
    recentEvents: events.slice(0, 15),
  };
}
