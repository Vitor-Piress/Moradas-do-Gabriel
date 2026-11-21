/**
 * Cache leve e versionado em localStorage para dados públicos reais vindos do Supabase
 * (estratégia stale-while-revalidate: entrega imediata em visitas recorrentes sem exibir
 * nenhum dado genérico de fallback e revalida silenciosamente em segundo plano).
 */

export const PUBLIC_CACHE_KEYS = {
  businessInfo: "moradas_public_cache_v1_business_info",
  accommodations: "moradas_public_cache_v1_accommodations",
} as const;

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24; // 24 horas

interface CacheEnvelope<T> {
  savedAt: number;
  data: T;
}

export function readPublicCache<T>(
  key: string,
  maxAgeMs = DEFAULT_TTL_MS,
): CacheEnvelope<T> | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return undefined;

    const parsed = JSON.parse(raw) as Partial<CacheEnvelope<T>> | null;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.savedAt !== "number" ||
      !("data" in parsed) ||
      parsed.data === undefined
    ) {
      window.localStorage.removeItem(key);
      return undefined;
    }

    if (Date.now() - parsed.savedAt > maxAgeMs) {
      window.localStorage.removeItem(key);
      return undefined;
    }

    return parsed as CacheEnvelope<T>;
  } catch {
    return undefined;
  }
}

export function writePublicCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;

  try {
    const envelope: CacheEnvelope<T> = {
      savedAt: Date.now(),
      data,
    };
    window.localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Ignora falhas de cota ou bloqueio de storage em modo privado
  }
}

export function clearPublicCache(key: string): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignora falhas de acesso ao storage
  }
}
