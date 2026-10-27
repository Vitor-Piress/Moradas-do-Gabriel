import {
  Check,
  ClipboardCheck,
  Compass,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  MapPin,
  ShoppingBag,
  Sparkles,
  Sun,
  Umbrella,
  Utensils,
  Wifi,
} from "lucide-react";
import { useState } from "react";
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

              return (
                <article
                  key={`${place.name}-${idx}`}
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

                  {placeEmbedUrl && (
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <iframe
                        src={placeEmbedUrl}
                        title={`Mapa de Localização - ${place.name}`}
                        className="w-full h-44 sm:h-52 border-0"
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                      />
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
    </div>
  );
}
