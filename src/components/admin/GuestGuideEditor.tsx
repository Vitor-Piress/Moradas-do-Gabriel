import {
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Compass,
  ExternalLink,
  Eye,
  Image,
  Loader2,
  MapPin,
  Maximize2,
  MessageCircle,
  Plus,
  Save,
  ShoppingBag,
  Sparkles,
  Sun,
  Trash2,
  Umbrella,
  Upload,
  Utensils,
  Wifi,
} from "lucide-react";
import { useState, type ChangeEvent, type FormEvent } from "react";
import type {
  BusinessInfoMetadata,
  PlaceTip,
  TypedBusinessInfo,
  WifiNetwork,
} from "../../@types/database.types";
import { useSaveBusinessInfo } from "../../hooks/usePortalData";
import { DEFAULT_BUSINESS_METADATA, uploadImageToR2 } from "../../services";
import {
  containsIframeTag,
  extractEmbedUrl,
  extractInstagramHandle,
  extractPhoneDigits,
  formatInstagramMask,
  formatPhoneMask,
} from "../../utils/embedUrl";

interface GuestGuideEditorProps {
  businessInfo: TypedBusinessInfo | undefined;
}

const PLACE_CATEGORY_OPTIONS = [
  "Gastronomia",
  "Praias",
  "Passeios",
  "Mercados",
] as const;

function renderPlaceCategoryIcon(category: string, className: string) {
  const normalized = category.toLowerCase();
  if (
    normalized.includes("gastronomia") ||
    normalized.includes("restaurante")
  ) {
    return <Utensils className={className} />;
  }
  if (normalized.includes("praia")) {
    return <Umbrella className={className} />;
  }
  if (normalized.includes("passeio")) {
    return <Compass className={className} />;
  }
  if (normalized.includes("mercado") || normalized.includes("conveniência")) {
    return <ShoppingBag className={className} />;
  }
  return <Sparkles className={className} />;
}

export function GuestGuideEditor({ businessInfo }: GuestGuideEditorProps) {
  const saveMutation = useSaveBusinessInfo();

  const initialMeta: BusinessInfoMetadata =
    businessInfo?.metadata ?? DEFAULT_BUSINESS_METADATA;

  const [welcomeContent, setWelcomeContent] = useState(
    businessInfo?.content ??
      "Seja muito bem-vindo! Aqui você encontra nossos links rápidos e o guia completo para aproveitar sua estadia.",
  );

  // Contatos Rápidos (inicializados com máscara visual)
  const [whatsapp, setWhatsapp] = useState(() =>
    formatPhoneMask(initialMeta.contacts.whatsapp),
  );
  const [phone, setPhone] = useState(() =>
    formatPhoneMask(initialMeta.contacts.phone),
  );
  const [instagram, setInstagram] = useState(() =>
    formatInstagramMask(initialMeta.contacts.instagram),
  );

  // Lista Dinâmica de Redes Wi-Fi (com retrocompatibilidade para `initialMeta.wifi`)
  const [wifiNetworks, setWifiNetworks] = useState<WifiNetwork[]>(() => {
    if (
      Array.isArray(initialMeta.wifi_networks) &&
      initialMeta.wifi_networks.length > 0
    ) {
      return initialMeta.wifi_networks.map((net, idx) => ({
        id: net.id || `wifi-${idx + 1}`,
        label: net.label ?? "",
        ssid: net.ssid ?? "",
        password: net.password ?? "",
      }));
    }
    if (
      initialMeta.wifi &&
      (initialMeta.wifi.ssid || initialMeta.wifi.password)
    ) {
      return [
        {
          id: "wifi-1",
          label: "",
          ssid: initialMeta.wifi.ssid,
          password: initialMeta.wifi.password,
        },
      ];
    }
    return [
      {
        id: "wifi-1",
        label: "Recepção / Piscina",
        ssid: "",
        password: "",
      },
    ];
  });

  // Localização & Mapas
  const [address, setAddress] = useState(initialMeta.location.address);
  const [instructions, setInstructions] = useState(
    initialMeta.location.instructions,
  );
  const [mapsUrl, setMapsUrl] = useState(initialMeta.location.maps_url);
  const [wazeUrl, setWazeUrl] = useState(initialMeta.location.waze_url);
  const [embedUrl, setEmbedUrl] = useState(initialMeta.location.embed_url);
  const [iframeExtractedNotice, setIframeExtractedNotice] = useState(false);

  // Regras da Hospedagem
  const [rules, setRules] = useState<string[]>(initialMeta.rules);
  const [newRule, setNewRule] = useState("");

  // Dicas de Lugares
  const [placesTips, setPlacesTips] = useState<PlaceTip[]>(
    initialMeta.places_tips,
  );
  const [previewPlaceIndex, setPreviewPlaceIndex] = useState<number | "new">(0);
  const [previewImageIdx, setPreviewImageIdx] = useState(0);
  const [newPlaceName, setNewPlaceName] = useState("");
  const [newPlaceCategory, setNewPlaceCategory] =
    useState<string>("Gastronomia");
  const [newPlaceDescription, setNewPlaceDescription] = useState("");
  const [newPlaceLink, setNewPlaceLink] = useState("");
  const [newPlaceEmbedUrl, setNewPlaceEmbedUrl] = useState("");
  const [newPlaceImages, setNewPlaceImages] = useState<string[]>([]);
  const [isUploadingNewPlaceImage, setIsUploadingNewPlaceImage] =
    useState(false);
  const [uploadingPlaceIndex, setUploadingPlaceIndex] = useState<number | null>(
    null,
  );

  // Feedback de salvamento
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleEmbedUrlChange = (rawInput: string) => {
    if (containsIframeTag(rawInput)) {
      const extracted = extractEmbedUrl(rawInput);
      setEmbedUrl(extracted);
      setIframeExtractedNotice(true);
    } else {
      setEmbedUrl(rawInput);
      setIframeExtractedNotice(false);
    }
  };

  // Funções de Redes Wi-Fi
  const handleAddWifiNetwork = () => {
    const newNetwork: WifiNetwork = {
      id: `wifi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: "",
      ssid: "",
      password: "",
    };
    setWifiNetworks((prev) => [...prev, newNetwork]);
  };

  const handleUpdateWifiNetwork = (
    index: number,
    field: keyof WifiNetwork,
    value: string,
  ) => {
    setWifiNetworks((prev) =>
      prev.map((net, i) => (i === index ? { ...net, [field]: value } : net)),
    );
  };

  const handleRemoveWifiNetwork = (index: number) => {
    setWifiNetworks((prev) => prev.filter((_, i) => i !== index));
  };

  // Funções de Regras
  const handleAddRule = () => {
    if (!newRule.trim()) return;
    setRules((prev) => [...prev, newRule.trim()]);
    setNewRule("");
  };

  const handleUpdateRule = (index: number, value: string) => {
    setRules((prev) => prev.map((r, i) => (i === index ? value : r)));
  };

  const handleRemoveRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  // Funções de Dicas de Lugares
  const getPlaceImagesList = (place: PlaceTip): string[] => {
    if (Array.isArray(place.images) && place.images.length > 0) {
      return place.images.filter(Boolean);
    }
    if (place.image_url?.trim()) {
      return [place.image_url.trim()];
    }
    return [];
  };

  const handleAddPlace = () => {
    if (!newPlaceName.trim()) return;
    const item: PlaceTip = {
      name: newPlaceName.trim(),
      category: newPlaceCategory || "Gastronomia",
      description: newPlaceDescription.trim(),
      link: newPlaceLink.trim(),
      embed_url: extractEmbedUrl(newPlaceEmbedUrl),
      image_url: newPlaceImages[0] ?? "",
      images: newPlaceImages,
    };
    const nextIndex = placesTips.length;
    setPlacesTips((prev) => [...prev, item]);
    setPreviewPlaceIndex(nextIndex);
    setPreviewImageIdx(0);
    setNewPlaceName("");
    setNewPlaceCategory("Gastronomia");
    setNewPlaceDescription("");
    setNewPlaceLink("");
    setNewPlaceEmbedUrl("");
    setNewPlaceImages([]);
  };

  const handleUpdatePlace = (
    index: number,
    field: keyof PlaceTip,
    value: string,
  ) => {
    const finalValue =
      field === "embed_url" && containsIframeTag(value)
        ? extractEmbedUrl(value)
        : value;
    setPlacesTips((prev) =>
      prev.map((place, i) =>
        i === index ? { ...place, [field]: finalValue } : place,
      ),
    );
    setPreviewPlaceIndex(index);
  };

  const handleNewPlaceImageUpload = async (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setSaveError(null);
    setIsUploadingNewPlaceImage(true);
    setPreviewPlaceIndex("new");
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const url = await uploadImageToR2(file, "lugares");
        uploaded.push(url);
      }
      setNewPlaceImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Erro ao enviar imagem do local para o R2.",
      );
    } finally {
      setIsUploadingNewPlaceImage(false);
      e.target.value = "";
    }
  };

  const handleRemoveNewPlaceImage = (imgIdx: number) => {
    setNewPlaceImages((prev) => prev.filter((_, i) => i !== imgIdx));
    setPreviewImageIdx(0);
  };

  const handleExistingPlaceImageUpload = async (
    placeIdx: number,
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setSaveError(null);
    setUploadingPlaceIndex(placeIdx);
    setPreviewPlaceIndex(placeIdx);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const url = await uploadImageToR2(file, "lugares");
        uploaded.push(url);
      }
      setPlacesTips((prev) =>
        prev.map((place, i) => {
          if (i !== placeIdx) return place;
          const nextImages = [...getPlaceImagesList(place), ...uploaded];
          return {
            ...place,
            image_url: nextImages[0] ?? "",
            images: nextImages,
          };
        }),
      );
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Erro ao enviar imagem do local para o R2.",
      );
    } finally {
      setUploadingPlaceIndex(null);
      e.target.value = "";
    }
  };

  const handleRemoveExistingPlaceImage = (placeIdx: number, imgIdx: number) => {
    setPlacesTips((prev) =>
      prev.map((place, i) => {
        if (i !== placeIdx) return place;
        const nextImages = getPlaceImagesList(place).filter(
          (_, idx) => idx !== imgIdx,
        );
        return {
          ...place,
          image_url: nextImages[0] ?? "",
          images: nextImages,
        };
      }),
    );
    setPreviewImageIdx(0);
  };

  const handleRemovePlace = (index: number) => {
    setPlacesTips((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (typeof previewPlaceIndex === "number" && previewPlaceIndex >= next.length) {
        setPreviewPlaceIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    const cleanedEmbedUrl = extractEmbedUrl(embedUrl);
    setEmbedUrl(cleanedEmbedUrl);

    const cleanedWifiNetworks: WifiNetwork[] = wifiNetworks
      .map((net, idx) => ({
        id: net.id?.trim() || `wifi-${idx + 1}`,
        label: (net.label ?? "").trim(),
        ssid: net.ssid.trim(),
        password: net.password.trim(),
      }))
      .filter((net) => net.ssid !== "" || net.password !== "");

    const primaryWifi = cleanedWifiNetworks[0] ?? {
      ssid: "",
      password: "",
    };

    try {
      await saveMutation.mutateAsync({
        id: businessInfo?.id || undefined,
        tab_title: businessInfo?.tab_title || "Guia do Hóspede",
        content: welcomeContent.trim(),
        metadata: {
          wifi_networks: cleanedWifiNetworks,
          wifi: {
            ssid: primaryWifi.ssid,
            password: primaryWifi.password,
          },
          location: {
            address: address.trim(),
            maps_url: mapsUrl.trim(),
            waze_url: wazeUrl.trim(),
            embed_url: cleanedEmbedUrl,
            instructions: instructions.trim(),
          },
          rules: rules.map((r) => r.trim()).filter(Boolean),
          places_tips: placesTips
            .map((p) => {
              const imgs = getPlaceImagesList(p);
              return {
                name: p.name.trim(),
                category: p.category.trim() || "Gastronomia",
                description: p.description.trim(),
                link: p.link.trim(),
                embed_url: extractEmbedUrl(p.embed_url ?? ""),
                image_url: imgs[0] ?? "",
                images: imgs,
              };
            })
            .filter((p) => p.name !== ""),
          contacts: {
            whatsapp: extractPhoneDigits(whatsapp),
            phone: extractPhoneDigits(phone),
            instagram: extractInstagramHandle(instagram),
          },
          landing: initialMeta.landing,
        },
      });

      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Erro ao salvar alterações do Guia do Hóspede.",
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
      {/* Barra de Ação Superior de Salvamento (Flat) */}
      <div className="sticky top-16 z-20 rounded-2xl bg-white border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-brand-navy break-words">
            Editor do Guia do Hóspede
          </h3>
          <p className="text-xs text-brand-navy/65 break-words">
            Edite as redes Wi-Fi, mapas, regras e dicas locais e clique em
            Salvar
          </p>
        </div>

        <button
          type="submit"
          disabled={saveMutation.isPending}
          className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-colors shrink-0 disabled:opacity-60 ${
            saveSuccess
              ? "bg-brand-green text-brand-navy border border-brand-navy/20"
              : "bg-brand-navy hover:bg-brand-navy-light text-white"
          }`}
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Salvando...</span>
            </>
          ) : saveSuccess ? (
            <>
              <Check className="w-4 h-4 shrink-0" />
              <span>Alterações Salvas!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 shrink-0" />
              <span>Salvar Guia do Hóspede</span>
            </>
          )}
        </button>
      </div>

      {saveError && (
        <div className="rounded-xl bg-white border border-slate-200 p-4 text-xs sm:text-sm font-semibold text-brand-navy break-words">
          Erro ao salvar: {saveError}
        </div>
      )}

      {/* 1. Boas-vindas & Contatos Rápidos do Header */}
      <section className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-base font-bold text-brand-navy break-words">
              Boas-Vindas & Contatos Rápidos
            </h4>
            <p className="text-xs text-brand-navy/65 break-words">
              Mensagem exibida no topo da página e atalhos rápidos do cabeçalho
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1">
            Mensagem Receptiva do Cabeçalho
          </label>
          <textarea
            rows={2}
            value={welcomeContent}
            onChange={(e) => setWelcomeContent(e.target.value)}
            placeholder="Seja muito bem-vindo à Pousada Moradas do Gabriel!"
            className="w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="min-w-0">
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1">
              WhatsApp (DDD + Número)
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={16}
              value={whatsapp}
              onChange={(e) => setWhatsapp(formatPhoneMask(e.target.value))}
              placeholder="(48) 9 9999-9999"
              className="w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
            />
          </div>

          <div className="min-w-0">
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1">
              Telefone da Recepção
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={16}
              value={phone}
              onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
              placeholder="(48) 9 9999-9999"
              className="w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
            />
          </div>

          <div className="min-w-0">
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1">
              Instagram (@usuario)
            </label>
            <input
              type="text"
              maxLength={31}
              value={instagram}
              onChange={(e) =>
                setInstagram(formatInstagramMask(e.target.value))
              }
              placeholder="@moradasdogabriel"
              className="w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
            />
          </div>
        </div>
      </section>

      {/* 2. Configurações de Redes Wi-Fi (Lista Dinâmica) */}
      <section className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand-navy text-white flex items-center justify-center shrink-0">
              <Wifi className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-base font-bold text-brand-navy break-words">
                Redes de Wi-Fi ({wifiNetworks.length})
              </h4>
              <p className="text-xs text-brand-navy/65 break-words">
                Cadastre uma ou mais redes Wi-Fi com local/identificação, SSID e
                senha
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddWifiNetwork}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-brand-navy hover:bg-brand-navy-light text-white text-xs font-semibold transition-colors shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Adicionar nova rede Wi-Fi</span>
          </button>
        </div>

        {wifiNetworks.length === 0 ? (
          <div className="rounded-xl bg-brand-bg border border-slate-200 p-5 text-center space-y-3">
            <p className="text-sm text-brand-navy/75">
              Nenhuma rede Wi-Fi cadastrada no momento.
            </p>
            <button
              type="button"
              onClick={handleAddWifiNetwork}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-brand-navy text-white text-xs font-semibold hover:bg-brand-navy-light transition-colors"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Adicionar primeira rede Wi-Fi</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {wifiNetworks.map((network, idx) => (
              <div
                key={network.id || idx}
                className="rounded-xl bg-brand-bg border border-slate-200 p-3.5 sm:p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-brand-navy">
                    Rede Wi-Fi #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveWifiNetwork(idx)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-navy/70 hover:text-brand-navy px-2.5 py-1 rounded-lg bg-white border border-slate-200 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Remover</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="min-w-0">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-brand-navy/70 mb-1">
                      Local / Identificação (opcional)
                    </label>
                    <input
                      type="text"
                      value={network.label ?? ""}
                      onChange={(e) =>
                        handleUpdateWifiNetwork(idx, "label", e.target.value)
                      }
                      placeholder="Ex: Recepção / Piscina"
                      className="w-full min-w-0 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-brand-navy/70 mb-1">
                      Nome da Rede (SSID) *
                    </label>
                    <input
                      type="text"
                      value={network.ssid}
                      onChange={(e) =>
                        handleUpdateWifiNetwork(idx, "ssid", e.target.value)
                      }
                      placeholder="Ex: MoradasDoGabriel_5G"
                      className="w-full min-w-0 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-brand-navy focus:outline-none focus:border-brand-navy"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-brand-navy/70 mb-1">
                      Senha do Wi-Fi
                    </label>
                    <input
                      type="text"
                      value={network.password}
                      onChange={(e) =>
                        handleUpdateWifiNetwork(idx, "password", e.target.value)
                      }
                      placeholder="Digite a senha"
                      className="w-full min-w-0 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-mono text-brand-navy focus:outline-none focus:border-brand-navy"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Como Chegar, Endereço e Google Maps Embed */}
      <section className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-base font-bold text-brand-navy break-words">
              Como Chegar & Mapas
            </h4>
            <p className="text-xs text-brand-navy/65 break-words">
              Endereço, instruções, links do Google Maps/Waze e mapa interativo
              incorporado
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1">
            Endereço Completo
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Rua..., Nº..., Bairro, Cidade - UF"
            className="w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
          />
        </div>

        <div className="min-w-0">
          <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1">
            Instruções e Pontos de Referência
          </label>
          <textarea
            rows={3}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Orientações úteis para a chegada do hóspede..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="min-w-0">
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1">
              Link do Botão &ldquo;Abrir no Google Maps&rdquo;
            </label>
            <input
              type="text"
              value={mapsUrl}
              onChange={(e) => setMapsUrl(e.target.value)}
              placeholder="https://maps.app.goo.gl/..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
            />
          </div>

          <div className="min-w-0">
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1">
              Link do Botão &ldquo;Ir com Waze&rdquo;
            </label>
            <input
              type="text"
              value={wazeUrl}
              onChange={(e) => setWazeUrl(e.target.value)}
              placeholder="https://waze.com/ul/..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
            />
          </div>
        </div>

        <div className="min-w-0">
          <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1">
            Google Maps Embed (URL ou código &lt;iframe src=&quot;...&quot;&gt;)
          </label>
          <input
            type="text"
            value={embedUrl}
            onChange={(e) => handleEmbedUrlChange(e.target.value)}
            placeholder='Cole a URL de embed ou o código <iframe src="https://www.google.com/maps/embed?pb=..." /> completo'
            className="w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
          />
          <p className="mt-1 text-[11px] text-brand-navy/65 break-words">
            Dica: No Google Maps, clique em{" "}
            <strong>Compartilhar → Incorporar um mapa</strong> e cole o código{" "}
            <code>&lt;iframe&gt;</code> inteiro aqui — extraímos apenas a URL do{" "}
            <code>src</code> automaticamente.
          </p>

          {iframeExtractedNotice && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-bg border border-slate-200 text-brand-navy text-xs font-semibold">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>
                Tag &lt;iframe&gt; detectada: URL extraída automaticamente.
              </span>
            </div>
          )}

          {embedUrl && (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-brand-bg">
              <iframe
                src={extractEmbedUrl(embedUrl)}
                title="Preview do Google Maps Embed"
                className="w-full h-48 border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
        </div>
      </section>

      {/* 4. Gerenciador de Regras da Hospedagem */}
      <section className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-base font-bold text-brand-navy break-words">
              Regras da Hospedagem ({rules.length})
            </h4>
            <p className="text-xs text-brand-navy/65 break-words">
              Adicione, edite ou remova as orientações da estadia
            </p>
          </div>
        </div>

        {/* Adicionar Nova Regra */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddRule();
              }
            }}
            placeholder="Digite uma nova regra ou orientação (ex: Check-in às 14h)..."
            className="w-full sm:flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-brand-bg border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
          />
          <button
            type="button"
            onClick={handleAddRule}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-navy text-white text-xs sm:text-sm font-semibold hover:bg-brand-navy-light transition-colors shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Adicionar Regra</span>
          </button>
        </div>

        {/* Lista de Regras */}
        <div className="space-y-2.5">
          {rules.map((rule, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-xl bg-brand-bg border border-slate-200 p-2.5"
            >
              <span className="w-6 h-6 rounded-md bg-white border border-slate-200 text-brand-navy text-xs font-bold flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <input
                type="text"
                value={rule}
                onChange={(e) => handleUpdateRule(idx, e.target.value)}
                className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
              />
              <button
                type="button"
                onClick={() => handleRemoveRule(idx)}
                title="Remover regra"
                className="p-2 rounded-lg bg-white border border-slate-200 text-brand-navy/70 hover:bg-slate-50 hover:text-brand-navy transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Gerenciador de Dicas de Restaurantes e Lugares */}
      <section className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center shrink-0">
            <Sun className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-base font-bold text-brand-navy break-words">
              Dicas de Lugares ({placesTips.length})
            </h4>
            <p className="text-xs text-brand-navy/65 break-words">
              Cadastre recomendações de Gastronomia, Praias, Passeios e Mercados
              com fotos opcionais e mapa incorporado
            </p>
          </div>
        </div>

        {/* PREVIEW DO COMPONENTE • CURADORIA DA POUSADA (DICAS DE LUGARES) */}
        {(() => {
          const isNewPreview =
            previewPlaceIndex === "new" || placesTips.length === 0;
          const activePlace: PlaceTip = isNewPreview
            ? {
                name: newPlaceName.trim() || "Nome do Local Recomendado",
                category: newPlaceCategory || "Gastronomia",
                description:
                  newPlaceDescription.trim() ||
                  "A descrição curta sobre o local recomendado aparecerá aqui para o hóspede.",
                link: newPlaceLink.trim(),
                embed_url: newPlaceEmbedUrl,
                images: newPlaceImages,
              }
            : (placesTips[
                typeof previewPlaceIndex === "number" ? previewPlaceIndex : 0
              ] ?? {
                name: "Nome do Local",
                category: "Gastronomia",
                description: "",
                link: "",
              });

          const previewEmbed = extractEmbedUrl(activePlace.embed_url ?? "");
          const previewImages = getPlaceImagesList(activePlace);
          const safeImgIdx =
            previewImages.length > 0
              ? previewImageIdx % previewImages.length
              : 0;
          const hasBothPreviewMedia =
            previewImages.length > 0 && Boolean(previewEmbed);

          return (
            <div className="rounded-2xl bg-brand-bg border border-slate-200 p-3.5 sm:p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-navy">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview do Componente • Curadoria da Pousada</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-brand-navy/70">
                  Clique em uma dica para alternar a visualização
                </span>
              </div>

              {/* Abas seletoras de Dica no Preview */}
              <div className="flex flex-wrap items-center gap-1.5">
                {placesTips.map((p, idx) => {
                  const isCurrent = previewPlaceIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPreviewPlaceIndex(idx);
                        setPreviewImageIdx(0);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        isCurrent
                          ? "bg-brand-navy text-white shadow-xs"
                          : "bg-white text-brand-navy/75 border border-slate-200 hover:text-brand-navy"
                      }`}
                    >
                      {p.name || `Dica #${idx + 1}`}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setPreviewPlaceIndex("new");
                    setPreviewImageIdx(0);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    isNewPreview
                      ? "bg-brand-navy text-white shadow-xs"
                      : "bg-white text-brand-navy/75 border border-slate-200 hover:text-brand-navy"
                  }`}
                >
                  + Nova Recomendação
                </button>
              </div>

              {/* Card Renderizado Igual ao Guia do Hóspede */}
              <article className="rounded-xl bg-white border border-slate-200 p-4 flex flex-col justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <h5 className="font-bold text-sm sm:text-base text-brand-navy break-words min-w-0">
                      {activePlace.name || "Nome do Local"}
                    </h5>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-brand-bg border border-slate-200 text-brand-navy shrink-0">
                      {renderPlaceCategoryIcon(
                        activePlace.category || "Gastronomia",
                        "w-3 h-3 shrink-0",
                      )}
                      <span>{activePlace.category || "Gastronomia"}</span>
                    </span>
                  </div>
                  {activePlace.description && (
                    <p className="text-xs sm:text-sm text-brand-navy/75 leading-relaxed break-words">
                      {activePlace.description}
                    </p>
                  )}
                </div>

                {(previewImages.length > 0 || previewEmbed) && (
                  <div
                    className={`grid grid-cols-1 ${
                      hasBothPreviewMedia ? "sm:grid-cols-2" : ""
                    } gap-3`}
                  >
                    {previewImages.length > 0 && (
                      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-brand-bg h-48 sm:h-52">
                        <img
                          src={previewImages[safeImgIdx]}
                          alt={activePlace.name}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 right-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/95 border border-slate-200 text-brand-navy text-[11px] font-semibold shadow-xs">
                          <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Ampliar</span>
                        </span>
                        {previewImages.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImageIdx(
                                  (prev) =>
                                    (prev - 1 + previewImages.length) %
                                    previewImages.length,
                                )
                              }
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-white/90 border border-slate-200 text-brand-navy flex items-center justify-center shadow-xs hover:bg-white"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImageIdx(
                                  (prev) => (prev + 1) % previewImages.length,
                                )
                              }
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-white/90 border border-slate-200 text-brand-navy flex items-center justify-center shadow-xs hover:bg-white"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-brand-navy/85 text-white text-[10px] font-semibold">
                              {safeImgIdx + 1}/{previewImages.length}
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {previewEmbed && (
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-brand-bg h-48 sm:h-52">
                        <iframe
                          src={previewEmbed}
                          title={`Preview Mapa - ${activePlace.name}`}
                          className="w-full h-full border-0"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    )}
                  </div>
                )}

                {activePlace.link && (
                  <div className="pt-1">
                    <span className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-bg border border-slate-200 text-brand-navy font-semibold text-xs">
                      <span>Ver localização / conhecer</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </span>
                  </div>
                )}
              </article>
            </div>
          );
        })()}

        {/* Sub-formulário para adicionar novo lugar */}
        <div
          onClick={() => setPreviewPlaceIndex("new")}
          className={`rounded-xl border p-3.5 sm:p-4 space-y-3 transition-colors ${
            previewPlaceIndex === "new"
              ? "bg-brand-bg border-brand-navy/40"
              : "bg-brand-bg border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-navy">
                Adicionar Nova Recomendação
              </p>
              {previewPlaceIndex === "new" && (
                <span className="px-2 py-0.5 rounded-md bg-brand-navy text-white text-[10px] font-semibold">
                  Visualizando no Preview
                </span>
              )}
            </div>

            <label
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-navy text-white text-xs font-semibold cursor-pointer hover:bg-brand-navy-light transition-colors shrink-0"
            >
              {isUploadingNewPlaceImage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleNewPlaceImageUpload}
                disabled={isUploadingNewPlaceImage}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={newPlaceName}
              onChange={(e) => {
                setNewPlaceName(e.target.value);
                setPreviewPlaceIndex("new");
              }}
              placeholder="Nome do Lugar *"
              className="sm:col-span-2 w-full min-w-0 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
            />
            <select
              value={newPlaceCategory}
              onChange={(e) => {
                setNewPlaceCategory(e.target.value);
                setPreviewPlaceIndex("new");
              }}
              className="w-full min-w-0 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
            >
              {PLACE_CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={newPlaceDescription}
              onChange={(e) => {
                setNewPlaceDescription(e.target.value);
                setPreviewPlaceIndex("new");
              }}
              placeholder="Descrição curta (ex: Ótima moqueca à beira-mar)"
              className="w-full min-w-0 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
            />
            <input
              type="text"
              value={newPlaceLink}
              onChange={(e) => {
                setNewPlaceLink(e.target.value);
                setPreviewPlaceIndex("new");
              }}
              placeholder="Link do Maps ou Instagram"
              className="w-full min-w-0 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newPlaceEmbedUrl}
              onChange={(e) => {
                setNewPlaceEmbedUrl(
                  containsIframeTag(e.target.value)
                    ? extractEmbedUrl(e.target.value)
                    : e.target.value,
                );
                setPreviewPlaceIndex("new");
              }}
              placeholder='Google Maps Embed opcional (URL ou <iframe src="..." />)'
              className="w-full sm:flex-1 min-w-0 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
            />
            <button
              type="button"
              onClick={handleAddPlace}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-brand-navy text-white text-xs font-semibold hover:bg-brand-navy-light transition-colors shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Incluir</span>
            </button>
          </div>

          {newPlaceImages.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="block text-[11px] font-semibold uppercase text-brand-navy/65">
                Fotos do Local ({newPlaceImages.length})
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {newPlaceImages.map((imgUrl, imgIdx) => (
                  <div
                    key={`${imgUrl}-${imgIdx}`}
                    className="relative rounded-xl overflow-hidden border border-slate-200 bg-white h-20"
                  >
                    <img
                      src={imgUrl}
                      alt={`Nova foto ${imgIdx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveNewPlaceImage(imgIdx);
                      }}
                      className="absolute top-1 right-1 p-1 rounded-md bg-white/90 text-brand-navy shadow-xs hover:bg-white"
                      title="Remover foto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lista Editável de Lugares */}
        <div className="space-y-3">
          {placesTips.map((place, idx) => {
            const placeImgs = getPlaceImagesList(place);
            const isSelected = previewPlaceIndex === idx;

            return (
              <div
                key={idx}
                onClick={() => {
                  setPreviewPlaceIndex(idx);
                  setPreviewImageIdx(0);
                }}
                className={`rounded-xl border p-3.5 sm:p-4 space-y-3 transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-brand-bg border-brand-navy/40"
                    : "bg-brand-bg/60 border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-brand-navy">
                      Dica #{idx + 1} • {place.name || "Sem título"}
                    </span>
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded-md bg-brand-navy text-white text-[10px] font-semibold">
                        Visualizando no Preview
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <label
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg bg-brand-navy text-white text-xs font-semibold cursor-pointer hover:bg-brand-navy-light transition-colors shrink-0"
                    >
                      {uploadingPlaceIndex === idx ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={(e) => handleExistingPlaceImageUpload(idx, e)}
                        disabled={uploadingPlaceIndex === idx}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePlace(idx);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-navy/70 hover:text-brand-navy px-2.5 py-1 rounded-lg bg-white border border-slate-200 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Remover</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={place.name}
                    onChange={(e) =>
                      handleUpdatePlace(idx, "name", e.target.value)
                    }
                    placeholder="Nome do lugar"
                    className="sm:col-span-2 w-full min-w-0 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-brand-navy focus:outline-none focus:border-brand-navy"
                  />
                  <select
                    value={place.category}
                    onChange={(e) =>
                      handleUpdatePlace(idx, "category", e.target.value)
                    }
                    className="w-full min-w-0 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
                  >
                    {PLACE_CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={place.description}
                    onChange={(e) =>
                      handleUpdatePlace(idx, "description", e.target.value)
                    }
                    placeholder="Descrição curta"
                    className="w-full min-w-0 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
                  />
                  <input
                    type="text"
                    value={place.link}
                    onChange={(e) =>
                      handleUpdatePlace(idx, "link", e.target.value)
                    }
                    placeholder="Link (Google Maps / Instagram)"
                    className="w-full min-w-0 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
                  />
                </div>

                <div className="min-w-0">
                  <input
                    type="text"
                    value={place.embed_url ?? ""}
                    onChange={(e) =>
                      handleUpdatePlace(idx, "embed_url", e.target.value)
                    }
                    placeholder='Google Maps Embed opcional (cole a URL ou o código <iframe src="..." />)'
                    className="w-full min-w-0 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
                  />
                </div>

                {placeImgs.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    <span className="block text-[11px] font-semibold uppercase text-brand-navy/65">
                      Fotos do Local ({placeImgs.length})
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {placeImgs.map((imgUrl, imgIdx) => (
                        <div
                          key={`${imgUrl}-${imgIdx}`}
                          className="relative rounded-xl overflow-hidden border border-slate-200 bg-white h-20"
                        >
                          <img
                            src={imgUrl}
                            alt={`${place.name} - Foto ${imgIdx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveExistingPlaceImage(idx, imgIdx);
                            }}
                            className="absolute top-1 right-1 p-1 rounded-md bg-white/90 text-brand-navy shadow-xs hover:bg-white"
                            title="Remover foto"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] text-brand-navy/55 pt-0.5">
                    <Image className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Sem fotos adicionadas (opcional — use o botão Upload acima
                      para enviar fotos do local)
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Botão Final de Salvar */}
      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-brand-navy hover:bg-brand-navy-light text-white font-semibold text-sm transition-colors disabled:opacity-60"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Salvando alterações...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 shrink-0" />
              <span>Salvar Todas as Alterações do Guia</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
