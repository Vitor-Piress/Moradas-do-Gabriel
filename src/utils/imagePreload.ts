const LOADED_IMAGE_URLS = new Set<string>();
const IN_FLIGHT_PRELOADS = new Map<string, Promise<void>>();

export function isImagePreloaded(url: string): boolean {
  return Boolean(url) && LOADED_IMAGE_URLS.has(url);
}

export function markImagePreloaded(url: string): void {
  if (url) {
    LOADED_IMAGE_URLS.add(url);
  }
}

/**
 * Pré-carrega uma URL de imagem em memória e marca como pronta para evitar
 * flash de shimmer em slides subsequentes ou após a cortina inicial.
 */
export function preloadImageUrl(url: string): Promise<void> {
  if (!url) return Promise.resolve();
  if (LOADED_IMAGE_URLS.has(url)) return Promise.resolve();

  const existing = IN_FLIGHT_PRELOADS.get(url);
  if (existing) return existing;

  const promise = new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      LOADED_IMAGE_URLS.add(url);
      IN_FLIGHT_PRELOADS.delete(url);
      resolve();
    };
    img.onerror = () => {
      IN_FLIGHT_PRELOADS.delete(url);
      resolve();
    };
    img.src = url;
    if (img.complete && img.naturalWidth > 0) {
      LOADED_IMAGE_URLS.add(url);
      IN_FLIGHT_PRELOADS.delete(url);
      resolve();
    }
  });

  IN_FLIGHT_PRELOADS.set(url, promise);
  return promise;
}
