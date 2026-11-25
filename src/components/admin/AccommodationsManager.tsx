import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bath,
  BedDouble,
  ChevronsUp,
  Dog,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Refrigerator,
  Save,
  Snowflake,
  Trash2,
  Tv,
  Upload,
  Users,
  Utensils,
  Wifi,
  X,
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
import { Link } from "react-router-dom";
import type {
  BedConfigItem,
  TypedAccommodation,
} from "../../@types/database.types";
import { useAccommodationMutations } from "../../hooks/usePortalData";
import {
  deleteImagesFromR2,
  slugifyAccommodationTitle,
  uploadImageToR2,
  type SaveAccommodationPayload,
} from "../../services";
import type { AccommodationDraftPreview } from "./AdminLivePreviewAside";

interface AccommodationsManagerProps {
  accommodations: TypedAccommodation[];
  isLoading: boolean;
  onDraftChange?: (draft: AccommodationDraftPreview) => void;
}

const BED_TYPE_SUGGESTIONS = [
  "Cama Casal Queen",
  "Cama Casal King",
  "Cama de Casal Padrão",
  "Cama de Solteiro",
  "Beliche",
  "Sofá-cama",
];

export function AccommodationsManager({
  accommodations,
  isLoading,
  onDraftChange,
}: AccommodationsManagerProps) {
  const prefersReducedMotion = useReducedMotion();
  const { createMutation, updateMutation, deleteMutation, reorderMutation } =
    useAccommodationMutations();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(
    null,
  );
  const [preferDetailView, setPreferDetailView] = useState(false);
  const [optimisticOrder, setOptimisticOrder] = useState<{
    sourceKey: string;
    items: TypedAccommodation[];
  } | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Campos do Formulário
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [maxGuests, setMaxGuests] = useState(2);
  const [shortDescription, setShortDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);

  // Camas
  const [beds, setBeds] = useState<BedConfigItem[]>([
    { count: 1, type: "Cama Casal Queen" },
  ]);

  // Comodidades booleanas pré-definidas
  const [hasKitchen, setHasKitchen] = useState(false);
  const [hasKitchenUtensils, setHasKitchenUtensils] = useState(true);
  const [hasTv, setHasTv] = useState(true);
  const [hasAc, setHasAc] = useState(true);
  const [hasWifi, setHasWifi] = useState(true);
  const [hasBalcony, setHasBalcony] = useState(false);
  const [hasPrivateBathroom, setHasPrivateBathroom] = useState(true);
  const [hasBedBathLinen, setHasBedBathLinen] = useState(true);
  const [isPetFriendly, setIsPetFriendly] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Estados de upload e feedback
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const sessionUploadsRef = useRef<Set<string>>(new Set());

  const discardUnsavedSessionUploads = () => {
    const unsaved = Array.from(sessionUploadsRef.current);
    sessionUploadsRef.current.clear();
    if (unsaved.length > 0) {
      void deleteImagesFromR2(unsaved);
    }
  };

  const cleanupUnsavedAccUrl = (
    candidateUrl: string,
    remainingUrls: string[],
  ) => {
    const clean = candidateUrl.trim();
    if (
      !clean ||
      !sessionUploadsRef.current.has(clean) ||
      remainingUrls.includes(clean)
    ) {
      return;
    }
    sessionUploadsRef.current.delete(clean);
    void deleteImagesFromR2([clean]);
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setSlug("");
    setMaxGuests(2);
    setShortDescription("");
    setFullDescription("");
    setCoverImage("");
    setGallery([]);
    setBeds([{ count: 1, type: "Cama Casal Queen" }]);
    setHasKitchen(false);
    setHasKitchenUtensils(true);
    setHasTv(true);
    setHasAc(true);
    setHasWifi(true);
    setHasBalcony(false);
    setHasPrivateBathroom(true);
    setHasBedBathLinen(true);
    setIsPetFriendly(false);
    setIsActive(true);
    setFormError(null);
  };

  const handleOpenNew = () => {
    discardUnsavedSessionUploads();
    resetForm();
    setIsFormOpen(true);
    setSelectedPreviewId("draft-new-accommodation");
    setPreferDetailView(true);
  };

  const handleOpenEdit = (acc: TypedAccommodation) => {
    discardUnsavedSessionUploads();
    setEditingId(acc.id.startsWith("demo-") ? null : acc.id);
    setTitle(acc.title);
    setSlug(acc.slug);
    setMaxGuests(acc.max_guests);
    setShortDescription(acc.short_description);
    setFullDescription(acc.full_description);
    setCoverImage(acc.cover_image);
    setGallery(acc.gallery);
    setBeds(
      acc.beds.length > 0
        ? acc.beds
        : [{ count: 1, type: "Cama de Casal Padrão" }],
    );
    setHasKitchen(acc.has_kitchen);
    setHasKitchenUtensils(acc.has_kitchen_utensils);
    setHasTv(acc.has_tv);
    setHasAc(acc.has_ac);
    setHasWifi(acc.has_wifi);
    setHasBalcony(acc.has_balcony);
    setHasPrivateBathroom(acc.has_private_bathroom);
    setHasBedBathLinen(acc.has_bed_bath_linen);
    setIsPetFriendly(acc.is_pet_friendly);
    setIsActive(acc.is_active);
    setFormError(null);
    setIsFormOpen(true);
    setSelectedPreviewId(acc.id);
    setPreferDetailView(true);
  };

  const handleCoverUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previousCover = coverImage.trim();
    setFormError(null);
    setIsUploadingCover(true);
    try {
      const uploadedUrl = await uploadImageToR2(file, "acomodacoes");
      sessionUploadsRef.current.add(uploadedUrl);
      setCoverImage(uploadedUrl);
      if (previousCover && previousCover !== uploadedUrl) {
        cleanupUnsavedAccUrl(previousCover, [uploadedUrl, ...gallery]);
      }
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Erro ao fazer upload da imagem.",
      );
    } finally {
      setIsUploadingCover(false);
      e.target.value = "";
    }
  };

  const handleRemoveCoverImage = () => {
    const previousCover = coverImage.trim();
    setCoverImage("");
    if (previousCover) {
      cleanupUnsavedAccUrl(previousCover, gallery);
    }
  };

  const handleGalleryUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setFormError(null);
    setIsUploadingGallery(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const url = await uploadImageToR2(file, "acomodacoes");
        sessionUploadsRef.current.add(url);
        uploadedUrls.push(url);
      }
      setGallery((prev) => [...prev, ...uploadedUrls]);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Erro ao enviar fotos da galeria.",
      );
    } finally {
      setIsUploadingGallery(false);
      e.target.value = "";
    }
  };

  const handleRemoveGalleryPhoto = (index: number) => {
    const removedUrl = gallery[index]?.trim() ?? "";
    const remainingGallery = gallery.filter((_, i) => i !== index);
    setGallery(remainingGallery);
    if (removedUrl) {
      cleanupUnsavedAccUrl(removedUrl, [coverImage.trim(), ...remainingGallery]);
    }
  };

  const handleAddBed = () => {
    setBeds((prev) => [...prev, { count: 1, type: "Cama de Solteiro" }]);
  };

  const handleUpdateBed = (
    index: number,
    field: keyof BedConfigItem,
    value: string | number,
  ) => {
    setBeds((prev) =>
      prev.map((bed, i) =>
        i === index
          ? {
              ...bed,
              [field]:
                field === "count" ? Math.max(1, Number(value) || 1) : value,
            }
          : bed,
      ),
    );
  };

  const handleRemoveBed = (index: number) => {
    setBeds((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError("Informe o nome da acomodação.");
      return;
    }

    const payload: SaveAccommodationPayload = {
      title: title.trim(),
      slug: slug.trim() || slugifyAccommodationTitle(title),
      short_description: shortDescription.trim(),
      full_description: fullDescription.trim(),
      cover_image: coverImage.trim(),
      gallery: gallery.map((g) => g.trim()).filter(Boolean),
      max_guests: Math.max(1, Number(maxGuests) || 2),
      beds: beds.filter((b) => b.type.trim() !== ""),
      has_kitchen: hasKitchen,
      has_kitchen_utensils: hasKitchenUtensils,
      has_tv: hasTv,
      has_ac: hasAc,
      has_wifi: hasWifi,
      has_balcony: hasBalcony,
      has_private_bathroom: hasPrivateBathroom,
      has_bed_bath_linen: hasBedBathLinen,
      is_pet_friendly: isPetFriendly,
      is_active: isActive,
    };

    const previousAcc = editingId
      ? accommodations.find((a) => a.id === editingId)
      : undefined;
    const previousPersistedUrls = previousAcc
      ? [previousAcc.cover_image, ...previousAcc.gallery]
          .map((u) => u.trim())
          .filter(Boolean)
      : [];

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, updates: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      const nextSavedUrls = new Set(
        [payload.cover_image, ...payload.gallery]
          .map((u) => u.trim())
          .filter(Boolean),
      );
      const urlsToDelete = Array.from(
        new Set([...previousPersistedUrls, ...sessionUploadsRef.current]),
      ).filter((url) => url && !nextSavedUrls.has(url));

      sessionUploadsRef.current.clear();
      if (urlsToDelete.length > 0) {
        void deleteImagesFromR2(urlsToDelete);
      }

      setIsFormOpen(false);
      setPreferDetailView(false);
      resetForm();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Erro ao salvar acomodação. Verifique se a migration já foi aplicada no Supabase.",
      );
    }
  };

  const sourceKey = useMemo(
    () => accommodations.map((a) => `${a.id}:${a.position}`).join("|"),
    [accommodations],
  );

  const orderedAccommodations = useMemo(
    () =>
      optimisticOrder?.sourceKey === sourceKey
        ? optimisticOrder.items
        : accommodations,
    [optimisticOrder, sourceKey, accommodations],
  );

  const handleMove = async (
    index: number,
    direction: "up" | "down" | "top",
  ) => {
    const targetIndex =
      direction === "top"
        ? 0
        : direction === "up"
          ? index - 1
          : index + 1;
    if (
      targetIndex < 0 ||
      targetIndex >= orderedAccommodations.length ||
      targetIndex === index
    ) {
      return;
    }

    const next = [...orderedAccommodations];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);

    const withPositions = next.map((item, idx) => ({
      ...item,
      position: idx + 1,
    }));

    setOrderError(null);
    setPreferDetailView(false);
    setOptimisticOrder({ sourceKey, items: withPositions });

    const hasDemo = withPositions.some((item) => item.id.startsWith("demo-"));
    if (hasDemo) return;

    try {
      await reorderMutation.mutateAsync(
        withPositions.map((item) => ({
          id: item.id,
          position: item.position,
        })),
      );
    } catch (err) {
      setOptimisticOrder(null);
      setOrderError(
        err instanceof Error
          ? err.message
          : "Erro ao atualizar a ordem das acomodações.",
      );
    }
  };

  const formDraftAccommodation: TypedAccommodation | null = useMemo(() => {
    if (!isFormOpen) return null;
    const nowIso = new Date().toISOString();
    return {
      id: editingId ?? "draft-new-accommodation",
      title: title.trim() || "Nova acomodação",
      slug:
        slug.trim() ||
        slugifyAccommodationTitle(title.trim() || "nova-acomodacao"),
      short_description: shortDescription.trim(),
      full_description: fullDescription.trim(),
      cover_image: coverImage.trim(),
      gallery: gallery.map((g) => g.trim()).filter(Boolean),
      max_guests: Math.max(1, Number(maxGuests) || 1),
      beds: beds.filter((b) => b.type.trim() !== ""),
      has_kitchen: hasKitchen,
      has_kitchen_utensils: hasKitchenUtensils,
      has_tv: hasTv,
      has_ac: hasAc,
      has_wifi: hasWifi,
      has_balcony: hasBalcony,
      has_private_bathroom: hasPrivateBathroom,
      has_bed_bath_linen: hasBedBathLinen,
      is_pet_friendly: isPetFriendly,
      extra_amenities: [],
      is_active: isActive,
      position: orderedAccommodations.length + 1,
      created_at: nowIso,
      updated_at: nowIso,
    };
  }, [
    isFormOpen,
    editingId,
    title,
    slug,
    shortDescription,
    fullDescription,
    coverImage,
    gallery,
    maxGuests,
    beds,
    hasKitchen,
    hasKitchenUtensils,
    hasTv,
    hasAc,
    hasWifi,
    hasBalcony,
    hasPrivateBathroom,
    hasBedBathLinen,
    isPetFriendly,
    isActive,
    orderedAccommodations.length,
  ]);

  useEffect(() => {
    if (!onDraftChange) return;

    let previewList = orderedAccommodations;
    if (formDraftAccommodation) {
      if (editingId) {
        previewList = orderedAccommodations.map((item) =>
          item.id === editingId
            ? { ...formDraftAccommodation, position: item.position }
            : item,
        );
      } else {
        previewList = [...orderedAccommodations, formDraftAccommodation];
      }
    }

    const focused =
      formDraftAccommodation ??
      orderedAccommodations.find((item) => item.id === selectedPreviewId) ??
      orderedAccommodations[0] ??
      null;

    onDraftChange({
      orderedAccommodations: previewList,
      focusedAccommodation: focused,
      preferDetailView,
    });
  }, [
    onDraftChange,
    orderedAccommodations,
    formDraftAccommodation,
    editingId,
    selectedPreviewId,
    preferDetailView,
  ]);

  const handleToggleActive = async (acc: TypedAccommodation) => {
    if (acc.id.startsWith("demo-")) return;
    await updateMutation.mutateAsync({
      id: acc.id,
      updates: { is_active: !acc.is_active },
    });
  };

  const handleDelete = async (acc: TypedAccommodation) => {
    if (acc.id.startsWith("demo-")) return;
    if (
      !window.confirm(
        `Deseja realmente excluir a acomodação "${acc.title}"?`,
      )
    ) {
      return;
    }
    const urlsToRemove = [acc.cover_image, ...acc.gallery]
      .map((u) => u.trim())
      .filter(Boolean);
    await deleteMutation.mutateAsync(acc.id);
    if (urlsToRemove.length > 0) {
      void deleteImagesFromR2(urlsToRemove);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const previewBedsSummary =
    beds.filter((b) => b.type.trim() !== "").length > 0
      ? beds
          .filter((b) => b.type.trim() !== "")
          .map((b) => `${b.count}x ${b.type}`)
          .join(" • ")
      : "Camas confortáveis";

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Cabeçalho da Seção */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-brand-navy">
            Gerenciador de Acomodações ({orderedAccommodations.length})
          </h3>
          <p className="text-xs text-brand-ink-muted">
            Defina a ordem de exibição na Landing Page (as 6 primeiras ativas
            abrem na vitrine inicial)
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNew}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl bg-brand-navy hover:bg-brand-navy-light text-white text-xs sm:text-sm font-semibold transition-colors shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Nova Acomodação</span>
        </button>
      </div>

      {orderError && (
        <div
          role="alert"
          className="rounded-xl bg-white border border-brand-navy/20 p-3.5 text-xs font-semibold text-brand-navy"
        >
          {orderError}
        </div>
      )}

      {/* Formulário de Criação / Edição */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <h4 className="text-base font-bold text-brand-navy">
              {editingId ? "Editar Acomodação" : "Cadastrar Nova Acomodação"}
            </h4>
            <button
              type="button"
              onClick={() => {
                discardUnsavedSessionUploads();
                setIsFormOpen(false);
                setPreferDetailView(false);
                resetForm();
              }}
              aria-label="Fechar formulário de acomodação"
              className="w-11 h-11 rounded-lg bg-brand-bg border border-slate-200 text-brand-navy/70 hover:text-brand-navy flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <div className="rounded-xl bg-brand-bg border border-slate-200 p-3.5 text-xs font-semibold text-brand-navy">
              {formError}
            </div>
          )}

          {/* 1. Dados Principais e Capacidade (Alinhados perfeitamente na base) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1.5">
                Nome da Acomodação *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!editingId) {
                    setSlug(slugifyAccommodationTitle(e.target.value));
                  }
                }}
                placeholder="Ex: Suíte Casal Brisa do Mar"
                className="w-full h-11 px-3.5 rounded-xl bg-brand-bg border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1.5">
                Slug da URL (/acomodacoes/...)
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) =>
                  setSlug(slugifyAccommodationTitle(e.target.value))
                }
                placeholder="suite-casal-brisa-do-mar"
                className="w-full h-11 px-3.5 rounded-xl bg-brand-bg border border-slate-200 text-sm font-mono text-brand-navy focus:outline-none focus:border-brand-navy"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1.5 whitespace-nowrap">
                Capacidade (Pessoas)
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={maxGuests}
                onChange={(e) =>
                  setMaxGuests(Math.max(1, Number(e.target.value) || 1))
                }
                className="w-full h-11 px-3.5 rounded-xl bg-brand-bg border border-slate-200 text-sm font-bold text-brand-navy focus:outline-none focus:border-brand-navy"
              />
            </div>
          </div>

          {/* 2. Descrições */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1">
                Resumo Curto (Exibido no card da Landing Page)
              </label>
              <textarea
                rows={2}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Resumo atrativo de 1 a 2 linhas sobre a acomodação..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1">
                Descrição Completa (Exibida na página individual da acomodação)
              </label>
              <textarea
                rows={4}
                value={fullDescription}
                onChange={(e) => setFullDescription(e.target.value)}
                placeholder="Descreva todos os detalhes, ambiente, vista e diferenciais desta acomodação..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-slate-200 text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
              />
            </div>
          </div>

          {/* 3. Configuração de Camas e Tamanhos */}
          <div className="rounded-xl bg-brand-bg border border-slate-200 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-navy">
                  Camas & Tamanhos ({beds.length})
                </p>
                <p className="text-[11px] text-brand-navy/65">
                  Defina quantas camas e o tipo/tamanho de cada uma
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddBed}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-navy text-white text-xs font-semibold hover:bg-brand-navy-light transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Cama</span>
              </button>
            </div>

            <datalist id="bed-types-list">
              {BED_TYPE_SUGGESTIONS.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>

            <div className="space-y-2">
              {beds.map((bed, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap sm:flex-nowrap items-end gap-2 bg-white border border-slate-200 rounded-xl p-2.5"
                >
                  <div className="w-24 shrink-0">
                    <label className="block text-[10px] font-semibold uppercase text-brand-navy/60 mb-1">
                      Qtd.
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={bed.count}
                      onChange={(e) =>
                        handleUpdateBed(idx, "count", e.target.value)
                      }
                      className="w-full h-9 px-2.5 rounded-lg bg-brand-bg border border-slate-200 text-sm font-bold text-brand-navy"
                    />
                  </div>

                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-[10px] font-semibold uppercase text-brand-navy/60 mb-1">
                      Tipo / Tamanho da Cama
                    </label>
                    <input
                      type="text"
                      list="bed-types-list"
                      value={bed.type}
                      onChange={(e) =>
                        handleUpdateBed(idx, "type", e.target.value)
                      }
                      placeholder="Ex: Cama Casal Queen"
                      className="w-full h-9 px-3 rounded-lg bg-brand-bg border border-slate-200 text-sm text-brand-navy"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveBed(idx)}
                    className="h-9 px-2.5 rounded-lg bg-brand-bg border border-slate-200 text-brand-navy/70 hover:text-brand-navy flex items-center justify-center shrink-0"
                    title="Remover cama"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Tópicos de Características Pré-Definidas */}
          <div className="rounded-xl bg-brand-bg border border-slate-200 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-navy">
              Características & Comodidades da Acomodação
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {[
                {
                  label: "Possui Cozinha",
                  checked: hasKitchen,
                  onChange: setHasKitchen,
                },
                {
                  label: "Frigobar / Utensílios de Cozinha",
                  checked: hasKitchenUtensils,
                  onChange: setHasKitchenUtensils,
                },
                {
                  label: "Ar-condicionado",
                  checked: hasAc,
                  onChange: setHasAc,
                },
                {
                  label: "Televisão (TV)",
                  checked: hasTv,
                  onChange: setHasTv,
                },
                {
                  label: "Wi-Fi Gratuito",
                  checked: hasWifi,
                  onChange: setHasWifi,
                },
                {
                  label: "Varanda / Rede de Descanso",
                  checked: hasBalcony,
                  onChange: setHasBalcony,
                },
                {
                  label: "Banheiro Privativo",
                  checked: hasPrivateBathroom,
                  onChange: setHasPrivateBathroom,
                },
                {
                  label: "Roupas de Cama e Banho Inclusas",
                  checked: hasBedBathLinen,
                  onChange: setHasBedBathLinen,
                },
                {
                  label: "Pet Friendly (Aceita Animais)",
                  checked: isPetFriendly,
                  onChange: setIsPetFriendly,
                },
              ].map((item) => (
                <label
                  key={item.label}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-brand-navy/40 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => item.onChange(e.target.checked)}
                    className="w-4 h-4 rounded accent-brand-navy"
                  />
                  <span className="text-xs font-semibold text-brand-navy">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 5. Fotos da Acomodação + Preview Mobile do Card em Tempo Real */}
          <div className="grid grid-cols-1 gap-5 items-start">
            {/* Upload de Capa e Galeria (Sem input de URL) */}
            <div className="rounded-xl bg-brand-bg border border-slate-200 p-4 space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-navy">
                  Fotos da Acomodação
                </p>
                <p className="text-[11px] text-brand-ink-muted">
                  Convertidas automaticamente para WebP em alta definição; fotos
                  substituídas são removidas do R2 ao salvar
                </p>
              </div>

              {/* Foto Principal (Capa) */}
              <div className="rounded-xl bg-white border border-slate-200 p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-brand-navy">
                      Foto Principal (Capa)
                    </p>
                    <p className="text-[11px] text-brand-navy/60">
                      Exibida no card da Landing Page e no topo da página da
                      acomodação
                    </p>
                  </div>

                  <label className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-brand-navy text-white text-xs font-semibold cursor-pointer hover:bg-brand-navy-light transition-colors shrink-0">
                    {isUploadingCover ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Upload</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                      onChange={handleCoverUpload}
                      disabled={isUploadingCover}
                      className="hidden"
                    />
                  </label>
                </div>

                {coverImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-brand-bg h-44">
                    <img
                      src={coverImage}
                      alt="Preview capa"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveCoverImage}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 text-brand-navy shadow-xs hover:bg-white"
                      title="Remover foto de capa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="h-32 rounded-xl border border-dashed border-slate-300 bg-brand-bg/60 flex flex-col items-center justify-center text-brand-navy/50 text-xs gap-1.5">
                    <BedDouble className="w-6 h-6" />
                    <span>Nenhuma foto de capa selecionada</span>
                  </div>
                )}
              </div>

              {/* Galeria de Fotos Adicionais */}
              <div className="rounded-xl bg-white border border-slate-200 p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-brand-navy">
                      Galeria de Fotos Adicionais ({gallery.length})
                    </p>
                    <p className="text-[11px] text-brand-navy/60">
                      Você pode selecionar várias fotos de uma só vez
                    </p>
                  </div>

                  <label className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-brand-navy text-white text-xs font-semibold cursor-pointer hover:bg-brand-navy-light transition-colors shrink-0">
                    {isUploadingGallery ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Upload</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                      multiple
                      onChange={handleGalleryUpload}
                      disabled={isUploadingGallery}
                      className="hidden"
                    />
                  </label>
                </div>

                {gallery.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {gallery.map((url, idx) => (
                      <div
                        key={`${url}-${idx}`}
                        className="relative group rounded-xl overflow-hidden border border-slate-200 bg-brand-bg h-24"
                      >
                        <img
                          src={url}
                          alt={`Galeria ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryPhoto(idx)}
                          className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-white/90 text-brand-navy shadow-xs hover:bg-white"
                          title="Remover foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-24 rounded-xl border border-dashed border-slate-300 bg-brand-bg/60 flex items-center justify-center text-brand-navy/50 text-xs">
                    Nenhuma foto adicional na galeria
                  </div>
                )}
              </div>
            </div>

            {/* Preview do Card da Acomodação em Tempo Real (Apenas Mobile/Tablet; Desktop usa o aside oficial) */}
            <div className="lg:hidden rounded-xl bg-brand-bg border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-navy">
                  Preview do Card na Landing Page
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-brand-navy/70">
                  Tempo Real
                </span>
              </div>

              <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between">
                <div>
                  <div className="relative h-48 overflow-hidden bg-brand-bg">
                    {coverImage ? (
                      <img
                        src={coverImage}
                        alt={title || "Preview Acomodação"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-brand-navy/35">
                        <BedDouble className="w-10 h-10" />
                      </div>
                    )}

                    <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-xs border border-slate-200 text-brand-navy text-xs font-bold shadow-xs">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Até {maxGuests} {maxGuests === 1 ? "pessoa" : "pessoas"}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <h5 className="text-base font-bold text-brand-navy break-words leading-snug">
                        {title.trim() || "Nome da Acomodação"}
                      </h5>
                      <p className="mt-1 text-xs font-semibold text-brand-navy/65 flex items-center gap-1.5">
                        <BedDouble className="w-3.5 h-3.5 shrink-0" />
                        <span>{previewBedsSummary}</span>
                      </p>
                    </div>

                    <p className="text-xs text-brand-navy/75 leading-relaxed line-clamp-3 break-words">
                      {shortDescription.trim() ||
                        "O resumo curto da acomodação aparecerá aqui no card de preview da Landing Page."}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {hasAc && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-brand-bg border border-slate-200 text-[10px] font-semibold text-brand-navy">
                          <Snowflake className="w-3 h-3 shrink-0" />
                          <span>Ar-condicionado</span>
                        </span>
                      )}
                      {hasTv && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-brand-bg border border-slate-200 text-[10px] font-semibold text-brand-navy">
                          <Tv className="w-3 h-3 shrink-0" />
                          <span>TV</span>
                        </span>
                      )}
                      {hasKitchen && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-brand-bg border border-slate-200 text-[10px] font-semibold text-brand-navy">
                          <Utensils className="w-3 h-3 shrink-0" />
                          <span>Cozinha</span>
                        </span>
                      )}
                      {hasKitchenUtensils && !hasKitchen && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-brand-bg border border-slate-200 text-[10px] font-semibold text-brand-navy">
                          <Refrigerator className="w-3 h-3 shrink-0" />
                          <span>Frigobar / Utensílios</span>
                        </span>
                      )}
                      {hasWifi && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-brand-bg border border-slate-200 text-[10px] font-semibold text-brand-navy">
                          <Wifi className="w-3 h-3 shrink-0" />
                          <span>Wi-Fi</span>
                        </span>
                      )}
                      {hasPrivateBathroom && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-brand-bg border border-slate-200 text-[10px] font-semibold text-brand-navy">
                          <Bath className="w-3 h-3 shrink-0" />
                          <span>Banheiro Privativo</span>
                        </span>
                      )}
                      {isPetFriendly && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-brand-bg border border-slate-200 text-[10px] font-semibold text-brand-navy">
                          <Dog className="w-3 h-3 shrink-0" />
                          <span>Pet Friendly</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <div className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-navy text-white font-semibold text-xs">
                    <span>Ver Fotos e Detalhes</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded accent-brand-navy"
              />
              <span className="text-xs font-semibold text-brand-navy">
                Acomodação visível no site público
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  discardUnsavedSessionUploads();
                  setIsFormOpen(false);
                  setPreferDetailView(false);
                  resetForm();
                }}
                className="min-h-11 px-4 rounded-xl bg-brand-bg border border-slate-200 text-xs font-semibold text-brand-navy"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 min-h-11 px-5 rounded-xl bg-brand-navy hover:bg-brand-navy-light text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Acomodação</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Lista de Acomodações Cadastradas com Ordenação */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="h-24 rounded-2xl bg-white border border-slate-200"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
          {(() => {
            let activeRank = 0;
            return orderedAccommodations.map((acc, index) => {
              const isDemo = acc.id.startsWith("demo-");
              if (acc.is_active) activeRank += 1;
              const isInTopSixShowcase = acc.is_active && activeRank <= 6;
              const isPreviewFocused = selectedPreviewId === acc.id;

              return (
                <m.div
                  key={acc.id}
                  layout={!prefersReducedMotion}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className={`rounded-2xl bg-white border p-4 shadow-xs flex flex-col justify-between gap-4 transition-colors ${
                    isPreviewFocused
                      ? "border-brand-navy ring-1 ring-brand-navy/20"
                      : "border-slate-200"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Barra Superior de Posição e Status na Vitrine */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-brand-navy text-white text-xs font-semibold tabular-nums">
                          #{String(index + 1).padStart(2, "0")}
                        </span>
                        {acc.is_active ? (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                              isInTopSixShowcase
                                ? "bg-brand-green/45 border-brand-navy/15 text-brand-navy"
                                : "bg-brand-bg border-slate-200 text-brand-ink-muted"
                            }`}
                          >
                            {isInTopSixShowcase
                              ? "Vitrine inicial (Top 6)"
                              : "Botão Ver todas"}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-brand-bg border border-slate-200 text-[11px] font-semibold text-brand-ink-muted">
                            Oculta no site
                          </span>
                        )}
                      </div>

                      {/* Controles de Reordenação */}
                      <div className="flex items-center gap-1">
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => void handleMove(index, "top")}
                            disabled={reorderMutation.isPending}
                            title="Enviar para 1ª posição"
                            aria-label={`Mover ${acc.title} para a primeira posição`}
                            className="h-9 px-2 rounded-lg bg-brand-bg border border-slate-200 text-brand-navy hover:bg-brand-surface text-[11px] font-semibold inline-flex items-center gap-1 transition-colors disabled:opacity-40"
                          >
                            <ChevronsUp className="w-3.5 h-3.5 shrink-0" />
                            <span>Topo</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleMove(index, "up")}
                          disabled={index === 0 || reorderMutation.isPending}
                          title="Subir posição"
                          aria-label={`Subir ${acc.title}`}
                          className="w-9 h-9 rounded-lg bg-brand-bg border border-slate-200 text-brand-navy hover:bg-brand-surface flex items-center justify-center transition-colors disabled:opacity-35"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleMove(index, "down")}
                          disabled={
                            index === orderedAccommodations.length - 1 ||
                            reorderMutation.isPending
                          }
                          title="Descer posição"
                          aria-label={`Descer ${acc.title}`}
                          className="w-9 h-9 rounded-lg bg-brand-bg border border-slate-200 text-brand-navy hover:bg-brand-surface flex items-center justify-center transition-colors disabled:opacity-35"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5">
                      <div className="w-24 h-20 rounded-xl overflow-hidden bg-brand-bg border border-slate-200 shrink-0">
                        {acc.cover_image ? (
                          <img
                            src={acc.cover_image}
                            alt={acc.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-brand-navy/40">
                            <BedDouble className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm sm:text-base text-brand-navy truncate">
                            {acc.title}
                          </h4>
                          {isDemo && (
                            <span className="px-2 py-0.5 rounded-md bg-brand-bg border border-slate-200 text-[10px] font-semibold text-brand-ink-muted">
                              Exemplo
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-brand-ink-secondary flex items-center gap-1.5 flex-wrap">
                          <Users className="w-3.5 h-3.5 shrink-0" />
                          <span>Até {acc.max_guests} pessoas</span>
                          <span>•</span>
                          <span>
                            {acc.beds
                              .map((b) => `${b.count}x ${b.type}`)
                              .join(", ")}
                          </span>
                        </p>

                        <p className="text-xs text-brand-ink-muted line-clamp-2">
                          {acc.short_description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <Link
                      to={`/acomodacoes/${acc.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-ink-secondary hover:text-brand-navy min-w-0 truncate"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">/acomodacoes/{acc.slug}</span>
                    </Link>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPreviewId(acc.id);
                          setPreferDetailView(true);
                        }}
                        title="Visualizar página no painel lateral"
                        aria-label={`Visualizar ${acc.title} no preview lateral`}
                        className="hidden lg:inline-flex items-center gap-1 h-9 px-2.5 rounded-lg bg-brand-bg border border-slate-200 text-brand-navy hover:bg-brand-surface text-xs font-semibold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 shrink-0" />
                        <span>Preview</span>
                      </button>

                      {!isDemo && (
                        <button
                          type="button"
                          onClick={() => handleToggleActive(acc)}
                          className="w-9 h-9 rounded-lg bg-brand-bg border border-slate-200 text-brand-ink-secondary hover:text-brand-navy flex items-center justify-center"
                          title={
                            acc.is_active
                              ? "Visível no site (clique para ocultar)"
                              : "Oculta no site (clique para ativar)"
                          }
                          aria-label={
                            acc.is_active
                              ? `Ocultar ${acc.title}`
                              : `Ativar ${acc.title}`
                          }
                        >
                          {acc.is_active ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(acc)}
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-brand-navy text-white text-xs font-semibold hover:bg-brand-navy-light transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{isDemo ? "Personalizar" : "Editar"}</span>
                      </button>

                      {!isDemo && (
                        <button
                          type="button"
                          onClick={() => handleDelete(acc)}
                          className="w-9 h-9 rounded-lg bg-brand-bg border border-slate-200 text-brand-ink-secondary hover:text-brand-navy flex items-center justify-center"
                          title="Excluir acomodação"
                          aria-label={`Excluir ${acc.title}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </m.div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
