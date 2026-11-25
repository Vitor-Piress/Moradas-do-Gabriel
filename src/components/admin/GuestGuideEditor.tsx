import {
  ArrowDown,
  ArrowUp,
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
  Trash2,
  Umbrella,
  Upload,
  Utensils,
  Wifi,
} from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import type {
  BusinessInfoMetadata,
  PlaceTip,
  TypedBusinessInfo,
  WifiNetwork,
} from "../../@types/database.types";
import { useSaveBusinessInfo } from "../../hooks/usePortalData";
import {
  DEFAULT_BUSINESS_METADATA,
  deleteImagesFromR2,
  uploadImageToR2,
} from "../../services";
import {
  containsIframeTag,
  extractEmbedUrl,
  extractInstagramHandle,
  extractPhoneDigits,
  formatInstagramMask,
  formatPhoneMask,
} from "../../utils/embedUrl";
import type { GuideDraftPreview } from "./AdminLivePreviewAside";

interface GuestGuideEditorProps {
  businessInfo: TypedBusinessInfo | undefined;
  onDraftChange?: (draft: GuideDraftPreview) => void;
}

interface EditableRuleItem {
  id: string;
  text: string;
}

interface EditablePlaceTip extends PlaceTip {
  _uiId: string;
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
  return <MapPin className={className} />;
}

function getPreviewCtaLabel(link: string): string {
  const lower = link.toLowerCase();
  if (
    lower.includes("maps.app") ||
    lower.includes("google.com/maps") ||
    lower.includes("goo.gl/maps")
  ) {
    return "Abrir no Google Maps";
  }
  if (lower.includes("waze.com")) {
    return "Navegar com Waze";
  }
  if (lower.includes("instagram.com")) {
    return "Ver no Instagram";
  }
  return "Conhecer local";
}

export function GuestGuideEditor({
  businessInfo,
  onDraftChange,
}: GuestGuideEditorProps) {
  const prefersReducedMotion = useReducedMotion();
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

  // Regras da Hospedagem (com ID estável para reordenar sem perder foco ou animação)
  const [ruleItems, setRuleItems] = useState<EditableRuleItem[]>(() =>
    initialMeta.rules.map((text, idx) => ({
      id: `rule-${idx}-${text.slice(0, 10)}`,
      text,
    })),
  );
  const [newRule, setNewRule] = useState("");

  // Dicas de Lugares (com ID estável para reordenar)
  const [placesTips, setPlacesTips] = useState<EditablePlaceTip[]>(() =>
    initialMeta.places_tips.map((place, idx) => ({
      ...place,
      _uiId: `place-${idx}-${place.name.slice(0, 10)}`,
    })),
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
  const sessionUploadsRef = useRef<Set<string>>(new Set());

  const collectAllPlaceImageUrls = (items: PlaceTip[]): string[] => {
    const urls: string[] = [];
    for (const p of items) {
      if (Array.isArray(p.images) && p.images.length > 0) {
        for (const img of p.images) {
          if (img?.trim()) urls.push(img.trim());
        }
      } else if (p.image_url?.trim()) {
        urls.push(p.image_url.trim());
      }
    }
    return Array.from(new Set(urls));
  };

  const cleanupUnsavedGuideUrls = (
    candidates: string[],
    stillReferencedUrls: string[],
  ) => {
    const refSet = new Set(stillReferencedUrls.map((u) => u.trim()).filter(Boolean));
    const toDelete = Array.from(
      new Set(candidates.map((u) => u.trim()).filter(Boolean)),
    ).filter((u) => sessionUploadsRef.current.has(u) && !refSet.has(u));

    if (toDelete.length === 0) return;
    for (const u of toDelete) {
      sessionUploadsRef.current.delete(u);
    }
    void deleteImagesFromR2(toDelete);
  };

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

  const handleMoveWifiNetwork = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= wifiNetworks.length) return;
    setWifiNetworks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  // Funções de Regras
  const handleAddRule = () => {
    if (!newRule.trim()) return;
    const id = `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setRuleItems((prev) => [...prev, { id, text: newRule.trim() }]);
    setNewRule("");
  };

  const handleUpdateRule = (index: number, value: string) => {
    setRuleItems((prev) =>
      prev.map((r, i) => (i === index ? { ...r, text: value } : r)),
    );
  };

  const handleRemoveRule = (index: number) => {
    setRuleItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveRule = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= ruleItems.length) return;
    setRuleItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
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
    const item: EditablePlaceTip = {
      _uiId: `place-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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

  const handleMovePlace = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= placesTips.length) return;
    setPlacesTips((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
    if (previewPlaceIndex === index) {
      setPreviewPlaceIndex(target);
    } else if (previewPlaceIndex === target) {
      setPreviewPlaceIndex(index);
    }
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
        sessionUploadsRef.current.add(url);
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
    const removedUrl = newPlaceImages[imgIdx] ?? "";
    const remainingNew = newPlaceImages.filter((_, i) => i !== imgIdx);
    setNewPlaceImages(remainingNew);
    setPreviewImageIdx(0);
    if (removedUrl) {
      cleanupUnsavedGuideUrls(
        [removedUrl],
        [...remainingNew, ...collectAllPlaceImageUrls(placesTips)],
      );
    }
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
        sessionUploadsRef.current.add(url);
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
    const targetPlace = placesTips[placeIdx];
    const removedUrl = targetPlace
      ? (getPlaceImagesList(targetPlace)[imgIdx] ?? "")
      : "";
    const nextPlaces = placesTips.map((place, i) => {
      if (i !== placeIdx) return place;
      const nextImages = getPlaceImagesList(place).filter(
        (_, idx) => idx !== imgIdx,
      );
      return {
        ...place,
        image_url: nextImages[0] ?? "",
        images: nextImages,
      };
    });
    setPlacesTips(nextPlaces);
    setPreviewImageIdx(0);
    if (removedUrl) {
      cleanupUnsavedGuideUrls(
        [removedUrl],
        [...newPlaceImages, ...collectAllPlaceImageUrls(nextPlaces)],
      );
    }
  };

  const handleRemovePlace = (index: number) => {
    const removedPlace = placesTips[index];
    const removedUrls = removedPlace ? getPlaceImagesList(removedPlace) : [];
    const nextPlaces = placesTips.filter((_, i) => i !== index);
    setPlacesTips(nextPlaces);
    if (
      typeof previewPlaceIndex === "number" &&
      previewPlaceIndex >= nextPlaces.length
    ) {
      setPreviewPlaceIndex(Math.max(0, nextPlaces.length - 1));
    }
    if (removedUrls.length > 0) {
      cleanupUnsavedGuideUrls(removedUrls, [
        ...newPlaceImages,
        ...collectAllPlaceImageUrls(nextPlaces),
      ]);
    }
  };

  const draftMetadata: BusinessInfoMetadata = useMemo(
    () => ({
      wifi_networks: wifiNetworks,
      wifi: {
        ssid: wifiNetworks[0]?.ssid ?? "",
        password: wifiNetworks[0]?.password ?? "",
      },
      location: {
        address,
        maps_url: mapsUrl,
        waze_url: wazeUrl,
        embed_url: extractEmbedUrl(embedUrl),
        instructions,
      },
      rules: ruleItems.map((r) => r.text),
      places_tips: placesTips.map((place) => ({
        name: place.name,
        category: place.category,
        description: place.description,
        link: place.link,
        embed_url: place.embed_url,
        image_url: place.image_url,
        images: place.images,
      })),
      contacts: {
        whatsapp: extractPhoneDigits(whatsapp),
        phone: extractPhoneDigits(phone),
        instagram: extractInstagramHandle(instagram),
      },
      landing: initialMeta.landing,
    }),
    [
      wifiNetworks,
      address,
      mapsUrl,
      wazeUrl,
      embedUrl,
      instructions,
      ruleItems,
      placesTips,
      whatsapp,
      phone,
      instagram,
      initialMeta.landing,
    ],
  );

  useEffect(() => {
    onDraftChange?.({
      content: welcomeContent,
      metadata: draftMetadata,
      focusedPlaceIndex: previewPlaceIndex,
      newPlaceDraft: {
        name: newPlaceName.trim(),
        category: newPlaceCategory || "Gastronomia",
        description: newPlaceDescription.trim(),
        link: newPlaceLink.trim(),
        embed_url: extractEmbedUrl(newPlaceEmbedUrl),
        image_url: newPlaceImages[0] ?? "",
        images: newPlaceImages,
      },
    });
  }, [
    onDraftChange,
    welcomeContent,
    draftMetadata,
    previewPlaceIndex,
    newPlaceName,
    newPlaceCategory,
    newPlaceDescription,
    newPlaceLink,
    newPlaceEmbedUrl,
    newPlaceImages,
  ]);

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

    const previousPersistedPlaceUrls = collectAllPlaceImageUrls(
      initialMeta.places_tips,
    );
    const cleanedPlacesTips: PlaceTip[] = placesTips
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
      .filter((p) => p.name !== "");

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
          rules: ruleItems.map((r) => r.text.trim()).filter(Boolean),
          places_tips: cleanedPlacesTips,
          contacts: {
            whatsapp: extractPhoneDigits(whatsapp),
            phone: extractPhoneDigits(phone),
            instagram: extractInstagramHandle(instagram),
          },
          landing: initialMeta.landing,
        },
      });

      const keptUrls = new Set([
        ...collectAllPlaceImageUrls(cleanedPlacesTips),
        ...newPlaceImages.map((u) => u.trim()).filter(Boolean),
      ]);
      const urlsToDelete = Array.from(
        new Set([...previousPersistedPlaceUrls, ...sessionUploadsRef.current]),
      ).filter((url) => url && !keptUrls.has(url));

      for (const savedUrl of collectAllPlaceImageUrls(cleanedPlacesTips)) {
        sessionUploadsRef.current.delete(savedUrl);
      }
      for (const deletedUrl of urlsToDelete) {
        sessionUploadsRef.current.delete(deletedUrl);
      }
      if (urlsToDelete.length > 0) {
        void deleteImagesFromR2(urlsToDelete);
      }

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
              <m.div
                key={network.id || idx}
                layout={!prefersReducedMotion}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-xl bg-brand-bg border border-slate-200 p-3.5 sm:p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-brand-navy text-white text-xs font-semibold tabular-nums">
                      #{String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="text-xs font-bold text-brand-navy">
                      Rede Wi-Fi {idx === 0 ? "· Principal" : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleMoveWifiNetwork(idx, -1)}
                      disabled={idx === 0}
                      title="Subir rede Wi-Fi"
                      aria-label={`Subir rede Wi-Fi ${idx + 1}`}
                      className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-brand-navy hover:bg-brand-surface flex items-center justify-center transition-colors disabled:opacity-35"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveWifiNetwork(idx, 1)}
                      disabled={idx === wifiNetworks.length - 1}
                      title="Descer rede Wi-Fi"
                      aria-label={`Descer rede Wi-Fi ${idx + 1}`}
                      className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-brand-navy hover:bg-brand-surface flex items-center justify-center transition-colors disabled:opacity-35"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveWifiNetwork(idx)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-ink-secondary hover:text-brand-navy h-9 px-2.5 rounded-lg bg-white border border-slate-200 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Remover</span>
                    </button>
                  </div>
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
              </m.div>
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
            <code>&lt;iframe&gt;</code> inteiro aqui para extrair apenas a URL
            do <code>src</code> automaticamente.
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
              Regras da Hospedagem ({ruleItems.length})
            </h4>
            <p className="text-xs text-brand-ink-muted break-words">
              Reordene, edite ou remova as orientações. A numeração (01, 02,
              03...) atualiza automaticamente.
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
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-xl bg-brand-navy text-white text-xs sm:text-sm font-semibold hover:bg-brand-navy-light transition-colors shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Adicionar Regra</span>
          </button>
        </div>

        {/* Lista de Regras com Ordenação e Numeração Dinâmica */}
        <div className="space-y-2.5">
          {ruleItems.map((ruleItem, idx) => (
            <m.div
              key={ruleItem.id}
              layout={!prefersReducedMotion}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-2 rounded-xl bg-brand-bg border border-slate-200 p-2.5"
            >
              <span className="w-8 h-9 rounded-lg bg-brand-navy text-white text-xs font-semibold tabular-nums flex items-center justify-center shrink-0">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <input
                type="text"
                value={ruleItem.text}
                onChange={(e) => handleUpdateRule(idx, e.target.value)}
                aria-label={`Regra ${String(idx + 1).padStart(2, "0")}`}
                className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-white border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
              />
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleMoveRule(idx, -1)}
                  disabled={idx === 0}
                  title="Subir regra"
                  aria-label={`Subir regra ${idx + 1}`}
                  className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-brand-navy hover:bg-brand-surface flex items-center justify-center transition-colors disabled:opacity-35"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveRule(idx, 1)}
                  disabled={idx === ruleItems.length - 1}
                  title="Descer regra"
                  aria-label={`Descer regra ${idx + 1}`}
                  className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-brand-navy hover:bg-brand-surface flex items-center justify-center transition-colors disabled:opacity-35"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveRule(idx)}
                  title="Remover regra"
                  aria-label={`Remover regra ${idx + 1}`}
                  className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-brand-ink-secondary hover:bg-slate-50 hover:text-brand-navy flex items-center justify-center transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </m.div>
          ))}
        </div>
      </section>

      {/* 5. Gerenciador de Dicas de Restaurantes e Lugares */}
      <section className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
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

        {/* PREVIEW DO COMPONENTE · CURADORIA DA POUSADA (MOBILE-FIRST) */}
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
          const hasPhotos = previewImages.length > 0;
          const hasMap = Boolean(previewEmbed);
          const hasBothPreviewMedia = hasPhotos && hasMap;

          return (
            <div className="lg:hidden rounded-2xl bg-brand-bg border border-slate-200 p-3.5 sm:p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-navy">
                  <Eye className="w-4 h-4" />
                  <span>Preview mobile · Curadoria da pousada</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-xs font-medium text-brand-ink-muted">
                  Clique em uma dica para alternar
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
                      className={`min-h-10 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        isCurrent
                          ? "bg-brand-navy text-white shadow-xs"
                          : "bg-white text-brand-ink-secondary border border-slate-200 hover:text-brand-navy"
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
                  className={`min-h-10 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    isNewPreview
                      ? "bg-brand-navy text-white shadow-xs"
                      : "bg-white text-brand-ink-secondary border border-slate-200 hover:text-brand-navy"
                  }`}
                >
                  + Nova Recomendação
                </button>
              </div>

              {/* Card Mobile-First Limpo Renderizado Igual ao Guia do Hóspede */}
              <article className="max-w-md mx-auto rounded-2xl bg-white border border-brand-navy/10 overflow-hidden shadow-xs">
                {(hasPhotos || hasMap) && (
                  <div className="relative aspect-[16/10] bg-brand-surface overflow-hidden">
                    {hasPhotos ? (
                      <>
                        <img
                          src={previewImages[safeImgIdx]}
                          alt={activePlace.name}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/95 border border-brand-navy/10 text-brand-navy text-xs font-semibold">
                          {renderPlaceCategoryIcon(
                            activePlace.category || "Gastronomia",
                            "w-3.5 h-3.5 shrink-0",
                          )}
                          <span>{activePlace.category || "Gastronomia"}</span>
                        </span>
                        <span className="absolute top-3 right-3 w-10 h-10 rounded-xl bg-[#071B42]/75 border border-white/20 text-white flex items-center justify-center">
                          <Maximize2 className="w-4 h-4 shrink-0" />
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
                              aria-label="Foto anterior no preview"
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-[#071B42]/75 hover:bg-[#071B42] text-white flex items-center justify-center"
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
                              aria-label="Próxima foto no preview"
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-[#071B42]/75 hover:bg-[#071B42] text-white flex items-center justify-center"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-[#071B42]/70 to-transparent flex items-end justify-between px-3 pb-2.5 pointer-events-none">
                              <div className="flex items-center gap-1.5">
                                {previewImages.map((_, dotIdx) => (
                                  <span
                                    key={dotIdx}
                                    className={`h-1.5 rounded-full ${
                                      dotIdx === safeImgIdx
                                        ? "w-5 bg-white"
                                        : "w-1.5 bg-white/55"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-[11px] font-semibold tabular-nums text-white">
                                {String(safeImgIdx + 1).padStart(2, "0")} /{" "}
                                {String(previewImages.length).padStart(2, "0")}
                              </span>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <iframe
                        src={previewEmbed}
                        title={`Preview Mapa - ${activePlace.name}`}
                        className="w-full h-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    )}
                  </div>
                )}

                <div className="p-4 space-y-3">
                  <div className="space-y-1.5 min-w-0">
                    {!hasPhotos && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-bg border border-brand-navy/10 text-xs font-semibold text-brand-navy">
                        {renderPlaceCategoryIcon(
                          activePlace.category || "Gastronomia",
                          "w-3.5 h-3.5 shrink-0",
                        )}
                        <span>{activePlace.category || "Gastronomia"}</span>
                      </span>
                    )}

                    <h5 className="font-display font-semibold text-lg text-brand-navy leading-snug break-words">
                      {activePlace.name || "Nome do Local"}
                    </h5>

                    {activePlace.description && (
                      <p className="text-sm text-brand-ink-secondary leading-relaxed break-words">
                        {activePlace.description}
                      </p>
                    )}
                  </div>

                  {(activePlace.link || hasBothPreviewMedia) && (
                    <div className="flex items-center gap-2 pt-0.5">
                      {activePlace.link && (
                        <span className="flex-1 min-h-11 px-4 rounded-xl bg-brand-navy text-white font-semibold text-xs sm:text-sm inline-flex items-center justify-center gap-2">
                          <span>{getPreviewCtaLabel(activePlace.link)}</span>
                          <ExternalLink className="w-4 h-4 shrink-0" />
                        </span>
                      )}
                      {hasBothPreviewMedia && (
                        <span className="min-h-11 px-3.5 rounded-xl bg-brand-bg border border-brand-navy/15 text-brand-navy text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 shrink-0">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>Ver mapa</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
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
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
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

        {/* Lista Editável de Lugares com Ordenação */}
        <div className="space-y-3">
          {placesTips.map((place, idx) => {
            const placeImgs = getPlaceImagesList(place);
            const isSelected = previewPlaceIndex === idx;

            return (
              <m.div
                key={place._uiId}
                layout={!prefersReducedMotion}
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
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
                    <span className="px-2 py-0.5 rounded-md bg-brand-navy text-white text-xs font-semibold tabular-nums">
                      #{String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="text-xs font-bold text-brand-navy">
                      {place.name || "Sem título"}
                    </span>
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded-md bg-white border border-brand-navy/20 text-brand-navy text-[10px] font-semibold">
                        Em foco no preview
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMovePlace(idx, -1);
                      }}
                      disabled={idx === 0}
                      title="Subir local na curadoria"
                      aria-label={`Subir ${place.name || `dica ${idx + 1}`}`}
                      className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-brand-navy hover:bg-brand-surface flex items-center justify-center transition-colors disabled:opacity-35"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMovePlace(idx, 1);
                      }}
                      disabled={idx === placesTips.length - 1}
                      title="Descer local na curadoria"
                      aria-label={`Descer ${place.name || `dica ${idx + 1}`}`}
                      className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-brand-navy hover:bg-brand-surface flex items-center justify-center transition-colors disabled:opacity-35"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    <label
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-brand-navy text-white text-xs font-semibold cursor-pointer hover:bg-brand-navy-light transition-colors shrink-0"
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
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
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
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-ink-secondary hover:text-brand-navy h-9 px-2.5 rounded-lg bg-white border border-slate-200 shrink-0"
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
                      Sem fotos adicionadas (opcional: use o botão Upload acima
                      para enviar fotos do local)
                    </span>
                  </div>
                )}
              </m.div>
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
