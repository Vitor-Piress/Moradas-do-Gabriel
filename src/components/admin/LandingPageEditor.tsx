import {
  ArrowDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Eye,
  FileText,
  Image,
  Layers,
  Loader2,
  Lock,
  Phone,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { useState, type ChangeEvent, type FormEvent } from "react";
import type {
  AboutHighlightItem,
  HeroSlideItem,
  TypedBusinessInfo,
} from "../../@types/database.types";
import { useSaveBusinessInfo } from "../../hooks/usePortalData";
import {
  DEFAULT_BUSINESS_METADATA,
  DEFAULT_LANDING_METADATA,
  uploadImageToR2,
} from "../../services";
import {
  formatInstagramMask,
  formatPhoneMask,
} from "../../utils/embedUrl";
import { InstagramIcon, WhatsAppIcon } from "../../utils/iconMapper";

interface LandingPageEditorProps {
  businessInfo: TypedBusinessInfo | undefined;
}

function formatChapterNumber(n: number): string {
  return String(n).padStart(2, "0");
}

export function LandingPageEditor({ businessInfo }: LandingPageEditorProps) {
  const saveMutation = useSaveBusinessInfo();

  const initialMeta = businessInfo?.metadata ?? DEFAULT_BUSINESS_METADATA;
  const initialLanding = initialMeta.landing ?? DEFAULT_LANDING_METADATA;

  const [heroSlides, setHeroSlides] = useState<HeroSlideItem[]>(
    initialLanding.hero_slides,
  );
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);

  const [aboutBadge, setAboutBadge] = useState(initialLanding.about.badge);
  const [aboutTitle, setAboutTitle] = useState(initialLanding.about.title);
  const [aboutDescription, setAboutDescription] = useState(
    initialLanding.about.description,
  );
  const [aboutSecondaryDescription, setAboutSecondaryDescription] = useState(
    initialLanding.about.secondary_description,
  );
  const [aboutImageUrl, setAboutImageUrl] = useState(
    initialLanding.about.image_url,
  );
  const [aboutHighlights, setAboutHighlights] = useState<AboutHighlightItem[]>(
    initialLanding.about.highlights,
  );

  const [companyName, setCompanyName] = useState(
    initialLanding.footer.company_name,
  );
  const [cnpj, setCnpj] = useState(initialLanding.footer.cnpj);
  const [checkInOutInfo, setCheckInOutInfo] = useState(
    initialLanding.footer.check_in_out_info,
  );
  const [copyrightNote, setCopyrightNote] = useState(
    initialLanding.footer.copyright_note,
  );

  const [uploadingSlideIndex, setUploadingSlideIndex] = useState<number | null>(
    null,
  );
  const [isUploadingAboutImage, setIsUploadingAboutImage] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleUpdateSlide = (
    index: number,
    field: keyof HeroSlideItem,
    value: string,
  ) => {
    setHeroSlides((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
    setPreviewSlideIndex(index);
  };

  const handleAddSlide = () => {
    const newIndex = heroSlides.length;
    setHeroSlides((prev) => [
      ...prev,
      {
        id: `slide-${Date.now()}`,
        topic: "Novo tópico",
        title: "Título do slide",
        subtitle: "Descrição exibida na abertura principal",
        image_url: "",
        cta_label: "Ver acomodações",
        cta_href: "#acomodacoes",
      },
    ]);
    setPreviewSlideIndex(newIndex);
  };

  const handleRemoveSlide = (index: number) => {
    setHeroSlides((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (previewSlideIndex >= next.length) {
        setPreviewSlideIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
  };

  const handleSlideImageUpload = async (
    index: number,
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaveError(null);
    setUploadingSlideIndex(index);
    setPreviewSlideIndex(index);
    try {
      const url = await uploadImageToR2(file, "hero");
      handleUpdateSlide(index, "image_url", url);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Erro ao fazer upload da imagem.",
      );
    } finally {
      setUploadingSlideIndex(null);
      e.target.value = "";
    }
  };

  const handleAboutImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaveError(null);
    setIsUploadingAboutImage(true);
    try {
      const url = await uploadImageToR2(file, "sobre");
      setAboutImageUrl(url);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Erro ao enviar foto da seção Sobre.",
      );
    } finally {
      setIsUploadingAboutImage(false);
      e.target.value = "";
    }
  };

  const handleUpdateHighlight = (
    index: number,
    field: keyof AboutHighlightItem,
    value: string,
  ) => {
    setAboutHighlights((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)),
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await saveMutation.mutateAsync({
        id: businessInfo?.id || undefined,
        tab_title: businessInfo?.tab_title || "Guia do Hóspede",
        content: businessInfo?.content,
        metadata: {
          ...initialMeta,
          landing: {
            hero_slides: heroSlides
              .map((s, idx) => ({
                id: s.id || `slide-${idx + 1}`,
                topic: s.topic.trim() || "Destaque",
                title: s.title.trim(),
                subtitle: s.subtitle.trim(),
                image_url: s.image_url.trim(),
                cta_label: s.cta_label.trim() || "Ver acomodações",
                cta_href: s.cta_href.trim() || "#acomodacoes",
              }))
              .filter((s) => s.title !== ""),
            about: {
              badge: aboutBadge.trim() || "Sobre a pousada",
              title: aboutTitle.trim(),
              description: aboutDescription.trim(),
              secondary_description: aboutSecondaryDescription.trim(),
              image_url: aboutImageUrl.trim(),
              highlights: aboutHighlights
                .map((h) => ({
                  badge: h.badge.trim(),
                  title: h.title.trim(),
                  description: h.description.trim(),
                }))
                .filter((h) => h.title !== ""),
            },
            footer: {
              company_name:
                companyName.trim() || "Pousada Moradas do Gabriel",
              cnpj: cnpj.trim(),
              check_in_out_info: checkInOutInfo.trim(),
              copyright_note:
                copyrightNote.trim() || "Todos os direitos reservados.",
            },
          },
        },
      });

      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Erro ao salvar configurações da Landing Page.",
      );
    }
  };

  const safePreviewIndex =
    heroSlides.length > 0 ? Math.min(previewSlideIndex, heroSlides.length - 1) : 0;
  const activePreviewSlide = heroSlides[safePreviewIndex] ?? null;

  const maskedWhatsapp = formatPhoneMask(initialMeta.contacts.whatsapp);
  const maskedPhone = formatPhoneMask(initialMeta.contacts.phone);
  const maskedInstagram = formatInstagramMask(initialMeta.contacts.instagram);
  const displayCompanyName = companyName || "Pousada Moradas do Gabriel";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
      {/* Barra Superior Fixa de Salvamento */}
      <div className="sticky top-[68px] z-20 rounded-2xl bg-white border border-brand-navy/10 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base sm:text-lg font-semibold text-brand-navy tracking-tight">
            Editor da Landing Page (/)
          </h3>
          <p className="text-xs font-medium text-brand-ink-muted">
            Personalize o palco Hero full-bleed, a seção Sobre a pousada e o
            rodapé com preview em tempo real
          </p>
        </div>

        <button
          type="submit"
          disabled={saveMutation.isPending}
          className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl font-semibold text-xs sm:text-sm transition-colors shrink-0 disabled:opacity-60 ${
            saveSuccess
              ? "bg-brand-green text-brand-navy border border-brand-navy/20"
              : "bg-brand-navy hover:bg-brand-navy-light text-white"
          }`}
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Salvando...</span>
            </>
          ) : saveSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>Landing Page salva</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Salvar Landing Page</span>
            </>
          )}
        </button>
      </div>

      {saveError && (
        <div
          role="alert"
          className="rounded-xl bg-white border border-brand-navy/20 p-4 text-xs sm:text-sm font-semibold text-brand-navy"
        >
          {saveError}
        </div>
      )}

      {/* =====================================================================
          1. PALCO HERO FULL-BLEED + PREVIEW FIEL AO HEROSTAGE
      ===================================================================== */}
      <section className="rounded-2xl bg-white border border-brand-navy/10 p-4 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-navy text-white flex items-center justify-center shrink-0">
              <Image className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-display text-base sm:text-lg font-semibold text-brand-navy tracking-tight">
                Palco Hero Full-Bleed · Capítulos ({heroSlides.length})
              </h4>
              <p className="text-xs font-medium text-brand-ink-muted">
                Slides de abertura em tela cheia (Acomodações, Praias, Destinos
                e Sobre a pousada)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddSlide}
            className="inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-xl bg-brand-navy text-white text-xs sm:text-sm font-semibold hover:bg-brand-navy-light transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar slide</span>
          </button>
        </div>

        {/* PREVIEW DO PALCO HERO EM TEMPO REAL */}
        <div className="rounded-2xl bg-brand-surface border border-brand-navy/10 p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-navy">
              <Eye className="w-4 h-4" />
              <span>Preview da Hero full-bleed</span>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-white border border-brand-navy/10 text-xs font-medium text-brand-ink-muted">
              Use os capítulos da barra inferior para alternar o slide
            </span>
          </div>

          {activePreviewSlide ? (
            <div className="relative overflow-hidden rounded-2xl bg-brand-scrim text-white min-h-[360px] sm:min-h-[420px] flex flex-col justify-between">
              {/* Fotografia + scrim direcional */}
              <div aria-hidden="true" className="absolute inset-0">
                {activePreviewSlide.image_url && (
                  <img
                    src={activePreviewSlide.image_url}
                    alt={activePreviewSlide.title}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-[#071B42]/74 via-[#071B42]/14 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071B42]/92 via-[#071B42]/44 to-transparent pointer-events-none" />
                <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-[#071B42]/74 via-[#071B42]/24 to-transparent pointer-events-none" />
              </div>

              {/* Header integrado dentro do palco Hero */}
              <div className="relative z-10 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shrink-0">
                    <img
                      src="/logoMoradasdoGabriel.svg"
                      alt=""
                      width={24}
                      height={24}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="font-display text-xs sm:text-sm font-semibold text-white tracking-tight truncate">
                    {displayCompanyName}
                  </span>
                </div>

                <div className="hidden md:flex items-center gap-4 text-xs font-medium text-[#E5ECF7]">
                  <span>Sobre</span>
                  <span>Acomodações</span>
                  <span>Localização</span>
                  <span>Links e contatos</span>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-green text-brand-navy text-xs font-semibold shrink-0">
                  <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Reservar</span>
                </span>
              </div>

              {/* Conteúdo editorial em destaque */}
              <div className="relative z-10 flex-1 px-4 sm:px-6 pt-8 pb-5 sm:pb-7 flex items-end justify-between gap-6">
                <div className="max-w-xl space-y-2.5 sm:space-y-3">
                  <p className="flex items-center gap-2 text-xs font-medium text-[#D8E1F0]">
                    <span className="font-semibold tabular-nums text-brand-green">
                      {formatChapterNumber(safePreviewIndex + 1)} /{" "}
                      {formatChapterNumber(heroSlides.length)}
                    </span>
                    <span aria-hidden="true" className="text-white/40">
                      ·
                    </span>
                    <span>{activePreviewSlide.topic || "Tópico"}</span>
                  </p>

                  <h5 className="font-display font-semibold text-2xl sm:text-3xl leading-[1.05] tracking-[-0.03em] text-white break-words">
                    {activePreviewSlide.title || "Título principal do slide"}
                  </h5>

                  <p className="text-xs sm:text-sm text-[#E5ECF7] leading-relaxed max-w-lg break-words">
                    {activePreviewSlide.subtitle ||
                      "Subtítulo explicativo exibido sobre a fotografia da Hero."}
                  </p>

                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white text-brand-navy font-semibold text-xs">
                      {activePreviewSlide.cta_label || "Ver acomodações"}
                    </span>

                    <span className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#071B42]/78 border border-white/35 text-white font-medium text-xs">
                      <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>Consultar no WhatsApp</span>
                    </span>
                  </div>
                </div>

                <span className="hidden lg:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/25 bg-[#071B42]/65 text-xs font-medium text-[#E5ECF7] shrink-0">
                  <span>Explorar a pousada</span>
                  <ArrowDown className="w-3.5 h-3.5 text-brand-green shrink-0" />
                </span>
              </div>

              {/* Dock inferior de capítulos com linha de horizonte #CDDF8E */}
              <div className="relative z-10 border-t border-white/15 bg-[#071B42]/86 px-3 sm:px-6 flex items-stretch justify-between gap-2">
                <div className="hidden sm:flex items-stretch flex-1 min-w-0 gap-1">
                  {heroSlides.map((slide, idx) => {
                    const isCurrent = idx === safePreviewIndex;
                    return (
                      <button
                        key={slide.id || idx}
                        type="button"
                        onClick={() => setPreviewSlideIndex(idx)}
                        aria-current={isCurrent ? "true" : undefined}
                        className="relative flex-1 min-w-0 flex items-center gap-2 min-h-12 px-2.5 text-left transition-colors"
                      >
                        {isCurrent && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-x-0 inset-y-1 rounded-lg bg-white/10 pointer-events-none"
                          />
                        )}
                        <span
                          aria-hidden="true"
                          className={`absolute -top-px left-0 right-1 h-0.5 ${
                            isCurrent ? "bg-brand-green" : "bg-transparent"
                          }`}
                        />
                        <span
                          className={`relative z-10 text-[11px] font-semibold tabular-nums shrink-0 ${
                            isCurrent ? "text-brand-green" : "text-[#B8C7E0]"
                          }`}
                        >
                          {formatChapterNumber(idx + 1)}
                        </span>
                        <span
                          className={`relative z-10 text-xs font-medium truncate ${
                            isCurrent ? "text-white" : "text-[#B8C7E0]"
                          }`}
                        >
                          {slide.topic || `Slide ${idx + 1}`}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="sm:hidden relative flex-1 min-w-0 flex items-center gap-2 min-h-12 pr-2">
                  <span
                    aria-hidden="true"
                    className="absolute -top-px left-0 right-2 h-0.5 bg-brand-green"
                  />
                  <span className="text-xs font-semibold tabular-nums text-brand-green shrink-0">
                    {formatChapterNumber(safePreviewIndex + 1)}/
                    {formatChapterNumber(heroSlides.length)}
                  </span>
                  <span className="text-xs font-medium text-white truncate">
                    {activePreviewSlide.topic || "Slide"}
                  </span>
                </div>

                {heroSlides.length > 1 && (
                  <div className="flex items-center gap-1.5 py-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewSlideIndex(
                          (prev) =>
                            (prev - 1 + heroSlides.length) % heroSlides.length,
                        )
                      }
                      aria-label="Slide anterior no preview"
                      className="w-11 h-11 rounded-xl border border-white/22 bg-white/8 hover:bg-white/16 text-white flex items-center justify-center transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewSlideIndex(
                          (prev) => (prev + 1) % heroSlides.length,
                        )
                      }
                      aria-label="Próximo slide no preview"
                      className="w-11 h-11 rounded-xl border border-white/22 bg-white/8 hover:bg-white/16 text-white flex items-center justify-center transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-brand-navy/10 p-6 text-center text-xs text-brand-ink-muted">
              Adicione pelo menos um slide acima para visualizar o preview da
              Hero.
            </div>
          )}
        </div>

        {/* Lista de Slides Editáveis */}
        <div className="space-y-3">
          {heroSlides.map((slide, idx) => {
            const isSelectedInPreview = idx === safePreviewIndex;
            const slideNum = formatChapterNumber(idx + 1);
            return (
              <div
                key={slide.id || idx}
                onClick={() => setPreviewSlideIndex(idx)}
                className={`rounded-xl border p-4 space-y-3.5 transition-colors cursor-pointer ${
                  isSelectedInPreview
                    ? "bg-brand-bg border-brand-navy/35"
                    : "bg-brand-bg/60 border-brand-navy/10"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold tabular-nums text-brand-navy">
                      {slideNum} · {slide.topic || "Slide sem tópico"}
                    </span>
                    {isSelectedInPreview && (
                      <span className="px-2 py-0.5 rounded-md bg-brand-navy text-white text-[11px] font-medium">
                        No preview
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveSlide(idx);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-ink-secondary hover:text-brand-navy min-h-11 px-3 rounded-lg bg-white border border-brand-navy/12"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                  <div className="lg:col-span-4 rounded-xl bg-white border border-brand-navy/10 p-3 flex flex-col justify-between gap-2.5 h-full">
                    <div className="flex items-center justify-between gap-2 shrink-0">
                      <span className="text-xs font-semibold text-brand-ink-secondary">
                        Imagem do slide
                      </span>

                      <label
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3.5 rounded-xl bg-brand-navy text-white text-xs font-semibold cursor-pointer hover:bg-brand-navy-light transition-colors shrink-0"
                      >
                        {uploadingSlideIndex === idx ? (
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
                          onChange={(e) => handleSlideImageUpload(idx, e)}
                          disabled={uploadingSlideIndex === idx}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {slide.image_url ? (
                      <div className="relative flex-1 min-h-[140px] rounded-xl overflow-hidden border border-brand-navy/10 bg-brand-surface">
                        <img
                          src={slide.image_url}
                          alt={slide.title || `Slide ${idx + 1}`}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex-1 min-h-[140px] rounded-xl border border-dashed border-brand-navy/25 bg-brand-bg/60 flex flex-col items-center justify-center text-brand-ink-muted text-xs gap-1">
                        <Image className="w-5 h-5" />
                        <span>Nenhuma imagem enviada</span>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-8 flex flex-col justify-between space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label
                          htmlFor={`slide-topic-${idx}`}
                          className="block text-xs font-semibold text-brand-ink-secondary mb-1"
                        >
                          Capítulo (barra inferior)
                        </label>
                        <input
                          id={`slide-topic-${idx}`}
                          type="text"
                          value={slide.topic}
                          onChange={(e) =>
                            handleUpdateSlide(idx, "topic", e.target.value)
                          }
                          placeholder="Ex: Acomodações"
                          className="w-full min-h-11 px-3 py-2 rounded-xl bg-white border border-brand-navy/12 text-sm font-semibold text-brand-navy"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label
                          htmlFor={`slide-title-${idx}`}
                          className="block text-xs font-semibold text-brand-ink-secondary mb-1"
                        >
                          Título principal do slide
                        </label>
                        <input
                          id={`slide-title-${idx}`}
                          type="text"
                          value={slide.title}
                          onChange={(e) =>
                            handleUpdateSlide(idx, "title", e.target.value)
                          }
                          placeholder="Título de destaque..."
                          className="w-full min-h-11 px-3 py-2 rounded-xl bg-white border border-brand-navy/12 text-sm text-brand-navy"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor={`slide-subtitle-${idx}`}
                        className="block text-xs font-semibold text-brand-ink-secondary mb-1"
                      >
                        Subtítulo / descrição curta
                      </label>
                      <input
                        id={`slide-subtitle-${idx}`}
                        type="text"
                        value={slide.subtitle}
                        onChange={(e) =>
                          handleUpdateSlide(idx, "subtitle", e.target.value)
                        }
                        placeholder="Subtítulo explicativo..."
                        className="w-full min-h-11 px-3 py-2 rounded-xl bg-white border border-brand-navy/12 text-sm text-brand-navy"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor={`slide-cta-label-${idx}`}
                          className="block text-xs font-semibold text-brand-ink-secondary mb-1"
                        >
                          Texto do botão principal
                        </label>
                        <input
                          id={`slide-cta-label-${idx}`}
                          type="text"
                          value={slide.cta_label}
                          onChange={(e) =>
                            handleUpdateSlide(idx, "cta_label", e.target.value)
                          }
                          placeholder="Ver acomodações"
                          className="w-full min-h-11 px-3 py-2 rounded-xl bg-white border border-brand-navy/12 text-sm text-brand-navy"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`slide-cta-href-${idx}`}
                          className="block text-xs font-semibold text-brand-ink-secondary mb-1"
                        >
                          Link ou âncora do botão
                        </label>
                        <input
                          id={`slide-cta-href-${idx}`}
                          type="text"
                          value={slide.cta_href}
                          onChange={(e) =>
                            handleUpdateSlide(idx, "cta_href", e.target.value)
                          }
                          placeholder="#acomodacoes"
                          className="w-full min-h-11 px-3 py-2 rounded-xl bg-white border border-brand-navy/12 text-sm font-mono text-brand-navy"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          2. SEÇÃO SOBRE A POUSADA (COMPOSIÇÃO EDITORIAL ABERTA)
      ===================================================================== */}
      <section className="rounded-2xl bg-white border border-brand-navy/10 p-4 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-surface border border-brand-navy/10 text-brand-navy flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-display text-base sm:text-lg font-semibold text-brand-navy tracking-tight">
              Seção &ldquo;Sobre a pousada&rdquo; e diferenciais
            </h4>
            <p className="text-xs font-medium text-brand-ink-muted">
              Texto institucional, foto em destaque e faixa horizontal de
              diferenciais (01 a 04)
            </p>
          </div>
        </div>

        {/* PREVIEW EDITORIAL EM TEMPO REAL */}
        <div className="rounded-2xl bg-brand-surface border border-brand-navy/10 p-3.5 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-navy">
              <Eye className="w-4 h-4" />
              <span>Preview da seção Sobre a pousada</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-md bg-white border border-brand-navy/10 text-xs font-medium text-brand-ink-muted">
              Tempo real
            </span>
          </div>

          <div className="rounded-2xl bg-brand-bg border border-brand-navy/10 p-5 sm:p-7 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              {/* Coluna texto direto no fundo linho (sem card branco) */}
              <div className="lg:col-span-6 space-y-3.5">
                <div className="flex items-center gap-2.5 text-xs font-medium text-brand-ink-muted">
                  <span
                    aria-hidden="true"
                    className="w-7 h-0.5 bg-brand-green shrink-0"
                  />
                  <span className="tabular-nums font-semibold text-brand-navy">
                    01
                  </span>
                  <span aria-hidden="true" className="text-brand-navy/30">
                    ·
                  </span>
                  <span>{aboutBadge || "Sobre a pousada"}</span>
                </div>

                <h5 className="font-display font-semibold text-2xl sm:text-3xl text-brand-navy tracking-[-0.025em] leading-[1.1] break-words">
                  {aboutTitle || "Título da seção Sobre a pousada"}
                </h5>

                <p className="text-xs sm:text-sm text-brand-ink-secondary leading-relaxed break-words">
                  {aboutDescription ||
                    "O parágrafo principal da seção Sobre a pousada será exibido aqui."}
                </p>

                {aboutSecondaryDescription && (
                  <p className="text-xs text-brand-ink-muted leading-relaxed break-words">
                    {aboutSecondaryDescription}
                  </p>
                )}

                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-4 py-2 rounded-xl bg-brand-navy text-white text-xs font-semibold">
                    Ver acomodações
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-brand-navy/15 text-brand-navy text-xs font-semibold">
                    <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Falar pelo WhatsApp</span>
                  </span>
                </div>
              </div>

              {/* Coluna foto limpa (sem card flutuante por cima) */}
              <div className="lg:col-span-6">
                <div className="aspect-[4/3] sm:aspect-[5/4] rounded-2xl overflow-hidden bg-brand-surface border border-brand-navy/10">
                  {aboutImageUrl ? (
                    <img
                      src={aboutImageUrl}
                      alt={aboutTitle || "Sobre a pousada"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-brand-ink-muted">
                      <Image className="w-8 h-8" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Faixa horizontal aberta de diferenciais */}
            {aboutHighlights.length > 0 && (
              <div className="border-t border-brand-navy/12 pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {aboutHighlights.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-medium text-brand-ink-muted">
                      <span className="tabular-nums font-semibold text-brand-navy">
                        {formatChapterNumber(idx + 1)}
                      </span>
                      {item.badge && (
                        <>
                          <span
                            aria-hidden="true"
                            className="text-brand-navy/30"
                          >
                            ·
                          </span>
                          <span>{item.badge}</span>
                        </>
                      )}
                    </div>
                    <h6 className="text-sm font-semibold text-brand-navy leading-snug break-words">
                      {item.title || "Título do diferencial"}
                    </h6>
                    <p className="text-xs text-brand-ink-secondary leading-relaxed break-words">
                      {item.description || "Descrição curta..."}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Campos de Edição da Seção Sobre */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-3">
              <label
                htmlFor="about-badge-input"
                className="block text-xs font-semibold text-brand-ink-secondary mb-1.5"
              >
                Rótulo do capítulo (01 · ...)
              </label>
              <input
                id="about-badge-input"
                type="text"
                value={aboutBadge}
                onChange={(e) => setAboutBadge(e.target.value)}
                placeholder="Sobre a pousada"
                className="w-full h-11 px-3.5 rounded-xl bg-brand-bg border border-brand-navy/12 text-sm text-brand-navy"
              />
            </div>

            <div className="sm:col-span-6">
              <label
                htmlFor="about-title-input"
                className="block text-xs font-semibold text-brand-ink-secondary mb-1.5"
              >
                Título da seção Sobre
              </label>
              <input
                id="about-title-input"
                type="text"
                value={aboutTitle}
                onChange={(e) => setAboutTitle(e.target.value)}
                placeholder="Um refúgio costeiro pensado para você se sentir em casa"
                className="w-full h-11 px-3.5 rounded-xl bg-brand-bg border border-brand-navy/12 text-sm font-semibold text-brand-navy"
              />
            </div>

            <div className="sm:col-span-3">
              <span className="block text-xs font-semibold text-brand-ink-secondary mb-1.5 whitespace-nowrap">
                Foto da seção
              </span>
              <label className="w-full h-11 inline-flex items-center justify-center gap-2 px-4 rounded-xl bg-brand-navy text-white text-xs sm:text-sm font-semibold cursor-pointer hover:bg-brand-navy-light transition-colors">
                {isUploadingAboutImage ? (
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
                  onChange={handleAboutImageUpload}
                  disabled={isUploadingAboutImage}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="about-description-input"
                className="block text-xs font-semibold text-brand-ink-secondary mb-1"
              >
                Parágrafo principal
              </label>
              <textarea
                id="about-description-input"
                rows={4}
                value={aboutDescription}
                onChange={(e) => setAboutDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-brand-navy/12 text-sm text-brand-navy"
              />
            </div>

            <div>
              <label
                htmlFor="about-secondary-input"
                className="block text-xs font-semibold text-brand-ink-secondary mb-1"
              >
                Parágrafo complementar
              </label>
              <textarea
                id="about-secondary-input"
                rows={4}
                value={aboutSecondaryDescription}
                onChange={(e) => setAboutSecondaryDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-brand-navy/12 text-sm text-brand-navy"
              />
            </div>
          </div>
        </div>

        {/* Faixa Horizontal de Diferenciais */}
        <div className="space-y-2.5 pt-2">
          <p className="text-xs font-semibold text-brand-navy">
            Faixa horizontal de diferenciais (01 a 04)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {aboutHighlights.map((hl, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-brand-bg border border-brand-navy/10 p-3.5 space-y-2"
              >
                <div className="flex items-center gap-2 text-xs font-semibold tabular-nums text-brand-ink-muted">
                  <span>{formatChapterNumber(idx + 1)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    aria-label={`Rótulo do diferencial ${idx + 1}`}
                    value={hl.badge}
                    onChange={(e) =>
                      handleUpdateHighlight(idx, "badge", e.target.value)
                    }
                    placeholder="Categoria"
                    className="min-h-10 px-2.5 py-1.5 rounded-lg bg-white border border-brand-navy/12 text-xs font-semibold text-brand-navy"
                  />
                  <input
                    type="text"
                    aria-label={`Título do diferencial ${idx + 1}`}
                    value={hl.title}
                    onChange={(e) =>
                      handleUpdateHighlight(idx, "title", e.target.value)
                    }
                    placeholder="Título do diferencial"
                    className="col-span-2 min-h-10 px-2.5 py-1.5 rounded-lg bg-white border border-brand-navy/12 text-xs font-semibold text-brand-navy"
                  />
                </div>
                <input
                  type="text"
                  aria-label={`Descrição do diferencial ${idx + 1}`}
                  value={hl.description}
                  onChange={(e) =>
                    handleUpdateHighlight(idx, "description", e.target.value)
                  }
                  placeholder="Descrição curta..."
                  className="w-full min-h-10 px-2.5 py-1.5 rounded-lg bg-white border border-brand-navy/12 text-xs text-brand-navy"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. INFORMAÇÕES FORMAIS DO RODAPÉ + PREVIEW ATUALIZADO
      ===================================================================== */}
      <section className="rounded-2xl bg-white border border-brand-navy/10 p-4 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-surface border border-brand-navy/10 text-brand-navy flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-display text-base sm:text-lg font-semibold text-brand-navy tracking-tight">
              Rodapé formal e direitos reservados
            </h4>
            <p className="text-xs font-medium text-brand-ink-muted">
              Dados institucionais exibidos no rodapé da Landing Page
            </p>
          </div>
        </div>

        {/* PREVIEW DO RODAPÉ EM TEMPO REAL */}
        <div className="rounded-2xl bg-brand-surface border border-brand-navy/10 p-3.5 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-navy">
              <Eye className="w-4 h-4" />
              <span>Preview do rodapé</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-md bg-white border border-brand-navy/10 text-xs font-medium text-brand-ink-muted">
              Tempo real
            </span>
          </div>

          <div className="rounded-2xl bg-white border border-brand-navy/10 p-5 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Coluna 1: Identidade */}
              <div className="md:col-span-5 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white border border-brand-navy/10 p-1.5 flex items-center justify-center shrink-0">
                    <img
                      src="/logoMoradasdoGabriel.svg"
                      alt="Logo Pousada Moradas do Gabriel"
                      width={34}
                      height={34}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-base text-brand-navy leading-tight">
                      {displayCompanyName}
                    </p>
                    {cnpj && (
                      <p className="text-xs text-brand-ink-muted mt-0.5 tabular-nums">
                        CNPJ: {cnpj}
                      </p>
                    )}
                  </div>
                </div>

                {initialMeta.location.address && (
                  <p className="text-xs sm:text-sm text-brand-ink-secondary leading-relaxed">
                    {initialMeta.location.address}
                  </p>
                )}

                {checkInOutInfo && (
                  <p className="text-xs font-medium text-brand-ink-muted">
                    {checkInOutInfo}
                  </p>
                )}
              </div>

              {/* Coluna 2: Navegação */}
              <div className="md:col-span-3 space-y-2.5">
                <p className="text-xs sm:text-sm font-semibold text-brand-navy">
                  Navegação
                </p>
                <ul className="space-y-1.5 text-xs sm:text-sm font-medium text-brand-ink-secondary">
                  <li>Início</li>
                  <li>Sobre a pousada</li>
                  <li>Acomodações</li>
                  <li>Localização</li>
                  <li className="inline-flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 shrink-0" />
                    <span>Central de links e contatos</span>
                  </li>
                </ul>
              </div>

              {/* Coluna 3: Atendimento */}
              <div className="md:col-span-4 space-y-2.5">
                <p className="text-xs sm:text-sm font-semibold text-brand-navy">
                  Atendimento e reservas
                </p>
                <div className="space-y-1.5 text-xs sm:text-sm font-medium text-brand-ink-secondary">
                  <div className="flex items-center gap-2">
                    <WhatsAppIcon className="w-3.5 h-3.5 shrink-0 text-brand-navy" />
                    <span>
                      WhatsApp{maskedWhatsapp ? `: ${maskedWhatsapp}` : ""}
                    </span>
                  </div>
                  {maskedPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 shrink-0 text-brand-navy" />
                      <span>Recepção: {maskedPhone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <InstagramIcon className="w-3.5 h-3.5 shrink-0 text-brand-navy" />
                    <span>
                      Instagram{maskedInstagram ? `: ${maskedInstagram}` : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-brand-navy/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-brand-ink-muted">
              <p className="font-medium text-center sm:text-left">
                © {new Date().getFullYear()} {displayCompanyName}.{" "}
                {copyrightNote || "Todos os direitos reservados."}
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-ink-muted">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Painel da pousada</span>
              </span>
            </div>
          </div>
        </div>

        {/* Campos de Edição do Rodapé */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="footer-company-name"
              className="block text-xs font-semibold text-brand-ink-secondary mb-1"
            >
              Nome oficial / Razão social
            </label>
            <input
              id="footer-company-name"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Pousada Moradas do Gabriel"
              className="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-brand-bg border border-brand-navy/12 text-sm text-brand-navy"
            />
          </div>

          <div>
            <label
              htmlFor="footer-cnpj"
              className="block text-xs font-semibold text-brand-ink-secondary mb-1"
            >
              CNPJ (opcional)
            </label>
            <input
              id="footer-cnpj"
              type="text"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0001-00"
              className="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-brand-bg border border-brand-navy/12 text-sm text-brand-navy"
            />
          </div>

          <div>
            <label
              htmlFor="footer-checkinout"
              className="block text-xs font-semibold text-brand-ink-secondary mb-1"
            >
              Nota de check-in / check-out no rodapé
            </label>
            <input
              id="footer-checkinout"
              type="text"
              value={checkInOutInfo}
              onChange={(e) => setCheckInOutInfo(e.target.value)}
              placeholder="Check-in a partir das 14h00 · Check-out até as 12h00"
              className="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-brand-bg border border-brand-navy/12 text-sm text-brand-navy"
            />
          </div>

          <div>
            <label
              htmlFor="footer-copyright"
              className="block text-xs font-semibold text-brand-ink-secondary mb-1"
            >
              Carimbo de direitos reservados
            </label>
            <input
              id="footer-copyright"
              type="text"
              value={copyrightNote}
              onChange={(e) => setCopyrightNote(e.target.value)}
              placeholder="Todos os direitos reservados."
              className="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-brand-bg border border-brand-navy/12 text-sm text-brand-navy"
            />
          </div>
        </div>
      </section>
    </form>
  );
}
