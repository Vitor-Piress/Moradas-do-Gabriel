import {
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Compass,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  MapPin,
  Maximize2,
  ShoppingBag,
  Sparkles,
  Sun,
  Umbrella,
  Utensils,
  Wifi,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type {
  BusinessInfoMetadata,
  PlaceTip,
  WifiNetwork,
} from "../../@types/database.types";
import { trackGuideInteraction } from "../../services";
import { extractEmbedUrl } from "../../utils/embedUrl";
import { WazeIcon } from "../../utils/iconMapper";

interface GuestGuideTabProps {
  metadata: BusinessInfoMetadata;
}

const DEFAULT_CATEGORIES = [
  "Todos",
  "Gastronomia",
  "Praias",
  "Passeios",
  "Mercados",
] as const;

function getCategoryIcon(category: string) {
  const normalized = category.toLowerCase();
  if (
    normalized.includes("gastronomia") ||
    normalized.includes("restaurante")
  ) {
    return Utensils;
  }
  if (normalized.includes("praia")) {
    return Umbrella;
  }
  if (normalized.includes("passeio")) {
    return Compass;
  }
  if (normalized.includes("mercado") || normalized.includes("conveniência")) {
    return ShoppingBag;
  }
  return Sparkles;
}

export function GuestGuideTab({ metadata }: GuestGuideTabProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<string, boolean>
  >({});
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [placeImageIndices, setPlaceImageIndices] = useState<
    Record<string, number>
  >({});
  const [lightboxState, setLightboxState] = useState<{
    placeName: string;
    category: string;
    images: string[];
    activeIndex: number;
  } | null>(null);

  useEffect(() => {
    if (!lightboxState) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxState(null);
      } else if (e.key === "ArrowLeft" && lightboxState.images.length > 1) {
        setLightboxState((prev) =>
          prev
            ? {
                ...prev,
                activeIndex:
                  (prev.activeIndex - 1 + prev.images.length) %
                  prev.images.length,
              }
            : null,
        );
      } else if (e.key === "ArrowRight" && lightboxState.images.length > 1) {
        setLightboxState((prev) =>
          prev
            ? {
                ...prev,
                activeIndex: (prev.activeIndex + 1) % prev.images.length,
              }
            : null,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxState]);

  const handleOpenLightbox = (
    placeName: string,
    category: string,
    images: string[],
    startIndex: number,
  ) => {
    setLightboxState({
      placeName,
      category,
      images,
      activeIndex: startIndex,
    });
    trackGuideInteraction(`maximize_place_photos:${placeName}`);
  };

  const handleCyclePlaceImage = (
    placeKey: string,
    totalImages: number,
    delta: number,
  ) => {
    setPlaceImageIndices((prev) => {
      const current = prev[placeKey] ?? 0;
      const next = (current + delta + totalImages) % totalImages;
      return { ...prev, [placeKey]: next };
    });
  };

  const togglePasswordVisibility = (cardKey: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey],
    }));
  };

  const { location, rules, places_tips } = metadata;

  // Suporte a múltiplas redes com retrocompatibilidade automática para o campo legado `wifi`
  const wifiNetworks: WifiNetwork[] =
    Array.isArray(metadata.wifi_networks) && metadata.wifi_networks.length > 0
      ? metadata.wifi_networks
      : metadata.wifi && (metadata.wifi.ssid || metadata.wifi.password)
        ? [
            {
              id: "wifi-legacy-1",
              label: "",
              ssid: metadata.wifi.ssid,
              password: metadata.wifi.password,
            },
          ]
        : [];

  const cleanEmbedUrl = extractEmbedUrl(location.embed_url || "");

  // Categorias dinâmicas combinando as padrões + eventuais categorias extras cadastradas
  const categories = Array.from(
    new Set([
      ...DEFAULT_CATEGORIES,
      ...places_tips.map((p) => p.category).filter(Boolean),
    ]),
  );

  const filteredPlaces: PlaceTip[] =
    selectedCategory === "Todos"
      ? places_tips
      : places_tips.filter(
          (p) => p.category.toLowerCase() === selectedCategory.toLowerCase(),
        );

  const handleCopyWifi = async (network: WifiNetwork, cardKey: string) => {
    if (!network.password) return;

    try {
      await navigator.clipboard.writeText(network.password);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = network.password;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopiedKey(cardKey);
    trackGuideInteraction("copy_wifi_" + network.ssid);

    window.setTimeout(() => {
      setCopiedKey((current) => (current === cardKey ? null : current));
    }, 2500);
  };

  const handleOpenMaps = () => {
    trackGuideInteraction("open_maps");
  };

  const handleOpenWaze = () => {
    trackGuideInteraction("open_waze");
  };

  const handleOpenPlaceTip = (placeName: string) => {
    trackGuideInteraction(`place_tip:${placeName}`);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 1. Localização & Rotas (Como Chegar & Mapas) */}
      <section
        id="como-chegar"
        aria-label="Como Chegar e Mapas"
        className="scroll-mt-4 rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-brand-navy/60">
              Localização & Rotas
            </span>
            <h2 className="text-base sm:text-lg font-bold text-brand-navy leading-tight break-words">
              Como Chegar
            </h2>
          </div>
        </div>

        {/* Endereço e Instruções Escritas */}
        <div className="rounded-xl bg-brand-bg border border-slate-200 p-3.5 sm:p-4 space-y-2.5">
          {location.address && (
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-navy/60">
                Endereço
              </p>
              <p className="text-sm font-semibold text-brand-navy mt-0.5 break-words">
                {location.address}
              </p>
            </div>
          )}

          {location.instructions && (
            <div className="pt-2 border-t border-slate-200 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-navy/60">
                Orientações de Chegada
              </p>
              <p className="text-sm text-brand-navy/80 leading-relaxed mt-0.5 whitespace-pre-line break-words">
                {location.instructions}
              </p>
            </div>
          )}
        </div>

        {/* Google Maps Embed (quando location.embed_url estiver preenchido) */}
        {cleanEmbedUrl && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-brand-bg">
            <iframe
              src={cleanEmbedUrl}
              title="Mapa de Localização - Pousada Moradas do Gabriel"
              className="w-full h-56 sm:h-64 border-0"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}

        {/* Botões de ação rápida responsivos: Google Maps e Waze */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <a
            href={location.maps_url || "https://maps.google.com"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOpenMaps}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-navy text-white font-semibold text-xs sm:text-sm hover:bg-brand-navy-light transition-colors text-center"
          >
            <MapPin className="w-4 h-4 shrink-0" />
            <span>Abrir no Google Maps</span>
          </a>

          <a
            href={location.waze_url || "https://waze.com/ul"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOpenWaze}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-brand-navy border border-slate-200 font-semibold text-xs sm:text-sm transition-colors text-center"
          >
            <WazeIcon className="w-4 h-4 text-brand-navy shrink-0" />
            <span>Ir com Waze</span>
          </a>
        </div>
      </section>

      {/* 2. Internet da Pousada (Seção de Wi-Fi com Senha Oculta por Padrão) */}
      <section
        aria-label="Conexão Wi-Fi"
        className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-navy text-white flex items-center justify-center shrink-0">
              <Wifi className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-brand-navy/60">
                Internet da Pousada
              </span>
              <h2 className="text-base sm:text-lg font-bold text-brand-navy leading-tight break-words">
                Wi-Fi para Hóspedes
              </h2>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-brand-bg border border-slate-200 text-brand-navy text-xs font-semibold shrink-0">
            {wifiNetworks.length > 1
              ? `${wifiNetworks.length} redes`
              : "Gratuito"}
          </span>
        </div>

        {wifiNetworks.length > 0 ? (
          <div className="space-y-3">
            {wifiNetworks.map((network, index) => {
              const cardKey = network.id || `${network.ssid}-${index}`;
              const isCopied = copiedKey === cardKey;
              const isPasswordVisible = Boolean(visiblePasswords[cardKey]);

              return (
                <div
                  key={cardKey}
                  className="rounded-xl bg-brand-bg border border-slate-200 p-3.5 sm:p-4 space-y-2.5"
                >
                  {network.label && (
                    <div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-brand-navy/80 break-words">
                        {network.label}
                      </span>
                    </div>
                  )}

                  {/* Linha 1: Nome da Rede (SSID) ocupando largura total */}
                  <div className="rounded-lg bg-white border border-slate-200 px-3.5 py-2.5 min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-navy/60">
                      Rede (SSID)
                    </p>
                    <p className="mt-0.5 font-bold text-sm sm:text-base text-brand-navy break-words">
                      {network.ssid || "Consulte a recepção"}
                    </p>
                  </div>

                  {/* Linha 2: Senha (oculta por padrão com botão de olho) + Botão Copiar Senha */}
                  <div className="flex flex-col sm:flex-row sm:items-stretch gap-2.5">
                    <div className="rounded-lg bg-white border border-slate-200 px-3.5 py-2.5 min-w-0 flex-1 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-navy/60">
                          Senha
                        </p>
                        <p className="mt-0.5 font-mono font-semibold text-sm sm:text-base text-brand-navy break-words">
                          {network.password
                            ? isPasswordVisible
                              ? network.password
                              : "••••••••••"
                            : "—"}
                        </p>
                      </div>

                      {network.password && (
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(cardKey)}
                          aria-label={
                            isPasswordVisible
                              ? "Ocultar senha"
                              : "Mostrar senha"
                          }
                          title={
                            isPasswordVisible
                              ? "Ocultar senha"
                              : "Mostrar senha"
                          }
                          className="p-2 rounded-lg bg-brand-bg border border-slate-200 text-brand-navy/75 hover:text-brand-navy hover:bg-slate-100 transition-colors shrink-0"
                        >
                          {isPasswordVisible ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyWifi(network, cardKey)}
                      disabled={!network.password}
                      className={`w-full sm:w-auto py-3 sm:py-2.5 px-5 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shrink-0 ${
                        isCopied
                          ? "bg-brand-green text-brand-navy border border-brand-navy/20"
                          : "bg-brand-navy text-white hover:bg-brand-navy-light"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-4 h-4 shrink-0" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 shrink-0" />
                          <span>Copiar Senha</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl bg-brand-bg border border-slate-200 p-4 text-center">
            <p className="text-sm text-brand-navy/75">
              Consulte a recepção para os dados de acesso ao Wi-Fi.
            </p>
          </div>
        )}
      </section>

      {/* 3. Regras da Hospedagem */}
      <section
        aria-label="Regras da Hospedagem"
        className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-brand-navy/60">
              Boa Convivência & Conforto
            </span>
            <h2 className="text-base sm:text-lg font-bold text-brand-navy leading-tight break-words">
              Regras da Hospedagem
            </h2>
          </div>
        </div>

        {rules.length > 0 ? (
          <ul className="space-y-2">
            {rules.map((rule, index) => (
              <li
                key={index}
                className="flex items-start gap-3 rounded-xl bg-brand-bg border border-slate-200 p-3.5 text-sm text-brand-navy leading-relaxed"
              >
                <span className="w-6 h-6 rounded-md bg-white border border-slate-200 text-brand-navy font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 break-words">{rule}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-brand-navy/75 bg-brand-bg border border-slate-200 rounded-xl p-4">
            Aproveite sua estadia com tranquilidade! Em caso de dúvidas sobre
            horários de café da manhã ou check-out, fale com a nossa recepção.
          </p>
        )}
      </section>

      {/* 4. Dicas de Restaurantes e Lugares */}
      <section
        aria-label="Dicas de Restaurantes e Lugares"
        className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center shrink-0">
            <Sun className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-brand-navy/60">
              Curadoria da Pousada
            </span>
            <h2 className="text-base sm:text-lg font-bold text-brand-navy leading-tight break-words">
              Dicas de Restaurantes e Lugares
            </h2>
          </div>
        </div>

        {/* Filtro por Categoria com Flex-Wrap (100% visível em telas pequenas) */}
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-brand-navy text-white"
                    : "bg-brand-bg text-brand-navy/80 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Lista de Cards de Lugares */}
        {filteredPlaces.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {filteredPlaces.map((place, idx) => {
              const CategoryIcon = getCategoryIcon(place.category);
              const placeEmbedUrl = extractEmbedUrl(place.embed_url || "");
              const placeImages =
                Array.isArray(place.images) && place.images.length > 0
                  ? place.images.filter(Boolean)
                  : place.image_url?.trim()
                    ? [place.image_url.trim()]
                    : [];
              const placeKey = `${place.name}-${idx}`;
              const activeImgIdx =
                placeImages.length > 0
                  ? (placeImageIndices[placeKey] ?? 0) % placeImages.length
                  : 0;
              const hasBothMedia =
                placeImages.length > 0 && Boolean(placeEmbedUrl);

              return (
                <article
                  key={placeKey}
                  className="rounded-xl bg-brand-bg border border-slate-200 p-4 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className="font-bold text-sm sm:text-base text-brand-navy break-words min-w-0">
                        {place.name}
                      </h3>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-white border border-slate-200 text-brand-navy shrink-0">
                        <CategoryIcon className="w-3 h-3 shrink-0" />
                        <span>{place.category}</span>
                      </span>
                    </div>
                    {place.description && (
                      <p className="text-xs sm:text-sm text-brand-navy/75 leading-relaxed break-words">
                        {place.description}
                      </p>
                    )}
                  </div>

                  {/* Imagens do Local + Mapa Incorporado (Lado a lado quando ambos existirem) */}
                  {(placeImages.length > 0 || placeEmbedUrl) && (
                    <div
                      className={`grid grid-cols-1 ${
                        hasBothMedia ? "sm:grid-cols-2" : ""
                      } gap-3`}
                    >
                      {placeImages.length > 0 && (
                        <div className="relative group overflow-hidden rounded-xl border border-slate-200 bg-white h-48 sm:h-52">
                          <img
                            src={placeImages[activeImgIdx]}
                            alt={`${place.name} - Foto ${activeImgIdx + 1}`}
                            onClick={() =>
                              handleOpenLightbox(
                                place.name,
                                place.category,
                                placeImages,
                                activeImgIdx,
                              )
                            }
                            className="w-full h-full object-cover cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.02]"
                            loading="lazy"
                          />

                          {/* Botão de Maximizar Fotos */}
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenLightbox(
                                place.name,
                                place.category,
                                placeImages,
                                activeImgIdx,
                              )
                            }
                            aria-label={`Ampliar fotos de ${place.name}`}
                            title="Ampliar fotos"
                            className="absolute top-2 right-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/95 hover:bg-white border border-slate-200 text-brand-navy text-[11px] font-semibold shadow-xs transition-colors"
                          >
                            <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Ampliar</span>
                          </button>

                          {placeImages.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCyclePlaceImage(
                                    placeKey,
                                    placeImages.length,
                                    -1,
                                  );
                                }}
                                aria-label="Foto anterior"
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-white/90 border border-slate-200 text-brand-navy flex items-center justify-center shadow-xs hover:bg-white"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCyclePlaceImage(
                                    placeKey,
                                    placeImages.length,
                                    1,
                                  );
                                }}
                                aria-label="Próxima foto"
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-white/90 border border-slate-200 text-brand-navy flex items-center justify-center shadow-xs hover:bg-white"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-brand-navy/85 text-white text-[10px] font-semibold">
                                {activeImgIdx + 1}/{placeImages.length}
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      {placeEmbedUrl && (
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white h-48 sm:h-52">
                          <iframe
                            src={placeEmbedUrl}
                            title={`Mapa de Localização - ${place.name}`}
                            className="w-full h-full border-0"
                            loading="lazy"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {place.link && (
                    <div className="pt-1">
                      <a
                        href={place.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleOpenPlaceTip(place.name)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-brand-navy font-semibold text-xs hover:border-brand-navy/40 hover:bg-slate-50 transition-colors"
                      >
                        <span>Ver localização / conhecer</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl bg-brand-bg p-5 text-center border border-slate-200">
            <p className="text-sm text-brand-navy/75">
              Nenhuma dica encontrada na categoria{" "}
              <strong className="text-brand-navy">{selectedCategory}</strong>.
            </p>
          </div>
        )}
      </section>

      {/* Modal Lightbox (Portal no document.body para ocupar a tela inteira sem interferência de transform) */}
      {lightboxState &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Galeria de fotos - ${lightboxState.placeName}`}
            onClick={() => setLightboxState(null)}
            className="fixed inset-0 z-[100] bg-brand-navy/80 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl max-h-[92vh] rounded-3xl bg-white border border-slate-200 p-3.5 sm:p-5 shadow-2xl flex flex-col gap-3"
            >
              {/* Cabeçalho do Modal */}
              <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-200 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm sm:text-base text-brand-navy truncate">
                      {lightboxState.placeName}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-brand-bg border border-slate-200 text-[11px] font-semibold text-brand-navy">
                      {lightboxState.category}
                    </span>
                  </div>
                  <p className="text-xs text-brand-navy/65">
                    Foto {lightboxState.activeIndex + 1} de{" "}
                    {lightboxState.images.length}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setLightboxState(null)}
                  aria-label="Fechar visualização ampliada"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-bg hover:bg-slate-100 border border-slate-200 text-brand-navy text-xs font-semibold transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                  <span>Fechar</span>
                </button>
              </div>

              {/* Imagem Principal Maximizada + Controles do Carrossel */}
              <div className="relative flex-1 min-h-0 flex items-center justify-center rounded-2xl overflow-hidden bg-brand-bg border border-slate-200">
                <img
                  src={lightboxState.images[lightboxState.activeIndex]}
                  alt={`${lightboxState.placeName} - Foto ${lightboxState.activeIndex + 1}`}
                  className="max-h-[60vh] sm:max-h-[66vh] w-full object-contain"
                />

                {lightboxState.images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxState((prev) =>
                          prev
                            ? {
                                ...prev,
                                activeIndex:
                                  (prev.activeIndex - 1 + prev.images.length) %
                                  prev.images.length,
                              }
                            : null,
                        )
                      }
                      aria-label="Foto anterior"
                      className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/95 hover:bg-white border border-slate-200 text-brand-navy flex items-center justify-center shadow-md transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setLightboxState((prev) =>
                          prev
                            ? {
                                ...prev,
                                activeIndex:
                                  (prev.activeIndex + 1) % prev.images.length,
                              }
                            : null,
                        )
                      }
                      aria-label="Próxima foto"
                      className="absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/95 hover:bg-white border border-slate-200 text-brand-navy flex items-center justify-center shadow-md transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Miniaturas Inferiores */}
              {lightboxState.images.length > 1 && (
                <div className="flex items-center justify-center gap-2 overflow-x-auto pt-1 shrink-0">
                  {lightboxState.images.map((imgUrl, idx) => {
                    const isCurrent = idx === lightboxState.activeIndex;
                    return (
                      <button
                        key={`${imgUrl}-${idx}`}
                        type="button"
                        onClick={() =>
                          setLightboxState((prev) =>
                            prev ? { ...prev, activeIndex: idx } : null,
                          )
                        }
                        className={`w-16 h-12 sm:w-20 sm:h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                          isCurrent
                            ? "border-brand-navy shadow-xs"
                            : "border-slate-200 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`Miniatura ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
