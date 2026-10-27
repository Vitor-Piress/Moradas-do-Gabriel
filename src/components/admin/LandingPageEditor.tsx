import {
  ArrowRight,
  BedDouble,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Eye,
  FileText,
  Image,
  Loader2,
  Lock,
  Phone,
  Plus,
  Save,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  Waves,
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
        topic: "Novo Tópico",
        title: "Título do Slide",
        subtitle: "Descrição do slide na Hero Section",
        image_url: "",
        cta_label: "Ver Acomodações",
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
                cta_label: s.cta_label.trim() || "Saiba Mais",
                cta_href: s.cta_href.trim() || "#acomodacoes",
              }))
              .filter((s) => s.title !== ""),
            about: {
              badge: aboutBadge.trim() || "Sobre a Pousada",
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

  const activePreviewSlide =
    heroSlides[previewSlideIndex] ?? heroSlides[0] ?? null;

  const maskedWhatsapp = formatPhoneMask(initialMeta.contacts.whatsapp);
  const maskedPhone = formatPhoneMask(initialMeta.contacts.phone);
  const maskedInstagram = formatInstagramMask(initialMeta.contacts.instagram);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
      {/* Barra Superior Fixa de Salvamento */}
      <div className="sticky top-16 z-20 rounded-2xl bg-white border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-brand-navy">
            Editor da Landing Page (/)
          </h3>
          <p className="text-xs text-brand-navy/65">
            Personalize o Carrossel Hero, seção Sobre a Pousada e Rodapé Formal
            com visualização em tempo real
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
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Salvando...</span>
            </>
          ) : saveSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>Landing Page Salva!</span>
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
        <div className="rounded-xl bg-white border border-slate-200 p-4 text-xs sm:text-sm font-semibold text-brand-navy">
          {saveError}
        </div>
      )}

      {/* =====================================================================
          1. CARROSSEL DA HERO SECTION + PREVIEW DO COMPONENTE
      ===================================================================== */}
      <section className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-navy text-white flex items-center justify-center shrink-0">
              <Image className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-brand-navy">
                Hero Section • Carrossel por Tópicos ({heroSlides.length})
              </h4>
              <p className="text-xs text-brand-navy/65">
                Tópicos principais (Acomodações, Praias, Destinos e Sobre a
                Pousada)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddSlide}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-brand-navy text-white text-xs font-semibold hover:bg-brand-navy-light transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Slide</span>
          </button>
        </div>

        {/* PREVIEW DO COMPONENTE HERO SECTION EM TEMPO REAL */}
        <div className="rounded-2xl bg-brand-bg border border-slate-200 p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-navy">
              <Eye className="w-3.5 h-3.5" />
              <span>Preview do Componente • Hero Section</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-brand-navy/70">
              Clique nas abas abaixo para alternar o slide no preview
            </span>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-3 space-y-3">
            {/* Abas do Carrossel no Preview */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {heroSlides.map((slide, idx) => {
                  const isCurrent = idx === previewSlideIndex;
                  return (
                    <button
                      key={slide.id || idx}
                      type="button"
                      onClick={() => setPreviewSlideIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        isCurrent
                          ? "bg-brand-navy text-white shadow-xs"
                          : "bg-brand-bg text-brand-navy/75 border border-slate-200 hover:text-brand-navy"
                      }`}
                    >
                      {slide.topic || `Slide #${idx + 1}`}
                    </button>
                  );
                })}
              </div>

              {heroSlides.length > 1 && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewSlideIndex(
                        (prev) =>
                          (prev - 1 + heroSlides.length) % heroSlides.length,
                      )
                    }
                    className="w-8 h-8 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center hover:bg-slate-100"
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
                    className="w-8 h-8 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center hover:bg-slate-100"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Banner Visual do Slide Selecionado */}
            {activePreviewSlide && (
              <div className="relative overflow-hidden rounded-2xl min-h-[260px] sm:min-h-[320px] flex items-end bg-brand-navy">
                {activePreviewSlide.image_url && (
                  <img
                    src={activePreviewSlide.image_url}
                    alt={activePreviewSlide.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-80 transition-all duration-500"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/95 via-brand-navy/55 to-brand-navy/15" />

                <div className="relative z-10 w-full p-5 sm:p-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="max-w-xl space-y-2.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs border border-white/25 text-white text-[10px] font-semibold uppercase tracking-wider">
                      <Waves className="w-3 h-3 shrink-0" />
                      <span>{activePreviewSlide.topic || "Tópico"}</span>
                    </span>

                    <h5 className="text-xl sm:text-3xl font-bold text-white tracking-tight leading-tight break-words">
                      {activePreviewSlide.title || "Título Principal do Slide"}
                    </h5>

                    <p className="text-xs sm:text-sm text-white/85 leading-relaxed max-w-lg break-words">
                      {activePreviewSlide.subtitle ||
                        "Subtítulo explicativo do slide na Hero Section."}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-brand-navy font-bold text-xs">
                      <span>
                        {activePreviewSlide.cta_label || "Saiba Mais"}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </span>

                    <span className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-navy/85 border border-white/30 text-white font-semibold text-xs">
                      <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>Consultar Datas</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lista de Slides Editáveis */}
        <div className="space-y-3">
          {heroSlides.map((slide, idx) => {
            const isSelectedInPreview = idx === previewSlideIndex;
            return (
              <div
                key={slide.id || idx}
                onClick={() => setPreviewSlideIndex(idx)}
                className={`rounded-xl border p-4 space-y-3.5 transition-colors cursor-pointer ${
                  isSelectedInPreview
                    ? "bg-brand-bg border-brand-navy/40"
                    : "bg-brand-bg/60 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-brand-navy">
                      Slide #{idx + 1} • {slide.topic}
                    </span>
                    {isSelectedInPreview && (
                      <span className="px-2 py-0.5 rounded-md bg-brand-navy text-white text-[10px] font-semibold">
                        Visualizando no Preview
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveSlide(idx);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-navy/70 hover:text-brand-navy px-2.5 py-1 rounded-lg bg-white border border-slate-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                  {/* Preview da Imagem do Slide + Botão Upload (Esticado até a base dos últimos inputs ao lado) */}
                  <div className="lg:col-span-4 rounded-xl bg-white border border-slate-200 p-3 flex flex-col justify-between gap-2.5 h-full">
                    <div className="flex items-center justify-between gap-2 shrink-0">
                      <span className="text-[11px] font-bold uppercase text-brand-navy/75">
                        Imagem do Slide
                      </span>

                      <label
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-navy text-white text-xs font-semibold cursor-pointer hover:bg-brand-navy-light transition-colors shrink-0"
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
                          accept="image/*"
                          onChange={(e) => handleSlideImageUpload(idx, e)}
                          disabled={uploadingSlideIndex === idx}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {slide.image_url ? (
                      <div className="relative flex-1 min-h-[140px] rounded-xl overflow-hidden border border-slate-200 bg-brand-bg">
                        <img
                          src={slide.image_url}
                          alt={slide.title || `Slide ${idx + 1}`}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex-1 min-h-[140px] rounded-xl border border-dashed border-slate-300 bg-brand-bg/60 flex flex-col items-center justify-center text-brand-navy/50 text-xs gap-1">
                        <Image className="w-5 h-5" />
                        <span>Nenhuma imagem enviada</span>
                      </div>
                    )}
                  </div>

                  {/* Campos de Texto do Slide */}
                  <div className="lg:col-span-8 flex flex-col justify-between space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-brand-navy/70 mb-1">
                          Tópico (Aba do Carrossel)
                        </label>
                        <input
                          type="text"
                          value={slide.topic}
                          onChange={(e) =>
                            handleUpdateSlide(idx, "topic", e.target.value)
                          }
                          placeholder="Ex: Acomodações"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-brand-navy"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold uppercase text-brand-navy/70 mb-1">
                          Título Principal do Slide
                        </label>
                        <input
                          type="text"
                          value={slide.title}
                          onChange={(e) =>
                            handleUpdateSlide(idx, "title", e.target.value)
                          }
                          placeholder="Título de destaque..."
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-brand-navy"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-brand-navy/70 mb-1">
                        Subtítulo / Descrição Curta
                      </label>
                      <input
                        type="text"
                        value={slide.subtitle}
                        onChange={(e) =>
                          handleUpdateSlide(idx, "subtitle", e.target.value)
                        }
                        placeholder="Subtítulo explicativo..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-brand-navy"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-brand-navy/70 mb-1">
                          Texto do Botão
                        </label>
                        <input
                          type="text"
                          value={slide.cta_label}
                          onChange={(e) =>
                            handleUpdateSlide(idx, "cta_label", e.target.value)
                          }
                          placeholder="Ver Acomodações"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-brand-navy"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-brand-navy/70 mb-1">
                          Link / Âncora do Botão
                        </label>
                        <input
                          type="text"
                          value={slide.cta_href}
                          onChange={(e) =>
                            handleUpdateSlide(idx, "cta_href", e.target.value)
                          }
                          placeholder="#acomodacoes"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-mono text-brand-navy"
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
          2. SEÇÃO SOBRE A POUSADA + PREVIEW DO COMPONENTE
      ===================================================================== */}
      <section className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-brand-navy">
              Seção &ldquo;Sobre a Pousada&rdquo; & Destaques
            </h4>
            <p className="text-xs text-brand-navy/65">
              Texto institucional, foto em destaque e cards do Bento Grid
            </p>
          </div>
        </div>

        {/* PREVIEW DO COMPONENTE SOBRE A POUSADA EM TEMPO REAL */}
        <div className="rounded-2xl bg-brand-bg border border-slate-200 p-3.5 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-navy">
              <Eye className="w-3.5 h-3.5" />
              <span>Preview do Componente • Sobre a Pousada</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-brand-navy/70">
              Tempo Real
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Coluna Texto Principal no Preview */}
            <div className="lg:col-span-7 rounded-2xl bg-white border border-slate-200 p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-bg border border-slate-200 text-brand-navy text-[10px] font-semibold uppercase tracking-wider">
                  <Sun className="w-3 h-3 shrink-0" />
                  <span>{aboutBadge || "Sobre a Pousada"}</span>
                </div>

                <h5 className="text-xl sm:text-2xl font-bold text-brand-navy tracking-tight leading-snug break-words">
                  {aboutTitle || "Título da Seção Sobre a Pousada"}
                </h5>

                <p className="text-xs sm:text-sm text-brand-navy/80 leading-relaxed break-words">
                  {aboutDescription ||
                    "O parágrafo principal da seção Sobre a Pousada será exibido aqui."}
                </p>

                {aboutSecondaryDescription && (
                  <p className="text-xs sm:text-sm text-brand-navy/75 leading-relaxed break-words">
                    {aboutSecondaryDescription}
                  </p>
                )}
              </div>

              <div className="pt-3 flex flex-wrap items-center gap-2 border-t border-slate-200">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-navy text-white text-xs font-semibold">
                  <BedDouble className="w-3.5 h-3.5 shrink-0" />
                  <span>Explorar Acomodações</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy text-xs font-semibold">
                  <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Falar com nossa equipe</span>
                </span>
              </div>
            </div>

            {/* Coluna Foto Editorial no Preview */}
            <div className="lg:col-span-5 rounded-2xl overflow-hidden bg-white border border-slate-200 p-2.5 flex flex-col">
              <div className="relative flex-1 min-h-[220px] rounded-xl overflow-hidden bg-brand-bg">
                {aboutImageUrl ? (
                  <img
                    src={aboutImageUrl}
                    alt={aboutTitle || "Sobre a Pousada"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-brand-navy/40">
                    <Image className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 rounded-xl bg-white/95 backdrop-blur-xs border border-slate-200 p-2.5 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-navy text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-brand-navy truncate">
                      Ambiente Familiar & Costeiro
                    </p>
                    <p className="text-[10px] text-brand-navy/70 truncate">
                      Conforto, sossego e fácil acesso às praias
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bento Grid de Diferenciais no Preview */}
          {aboutHighlights.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {aboutHighlights.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-white border border-slate-200 p-3.5 flex flex-col justify-between space-y-2"
                >
                  <div className="space-y-1.5">
                    {item.badge && (
                      <span className="inline-block px-2 py-0.5 rounded-md bg-brand-bg border border-slate-200 text-[10px] font-semibold uppercase tracking-wider text-brand-navy/75">
                        {item.badge}
                      </span>
                    )}
                    <h6 className="text-sm font-bold text-brand-navy break-words">
                      {item.title || "Título do diferencial"}
                    </h6>
                    <p className="text-xs text-brand-navy/75 leading-relaxed break-words">
                      {item.description || "Descrição curta..."}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] font-semibold text-brand-navy/65">
                    <CheckCircle2 className="w-3 h-3 text-brand-navy shrink-0" />
                    <span>Pousada Moradas do Gabriel</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campos de Edição da Seção Sobre (Ocupando 100% da largura, sem duplicar preview da imagem) */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1.5">
                Selo Superior (Badge)
              </label>
              <input
                type="text"
                value={aboutBadge}
                onChange={(e) => setAboutBadge(e.target.value)}
                placeholder="Sobre a Pousada"
                className="w-full h-11 px-3.5 rounded-xl bg-brand-bg border border-slate-200 text-sm text-brand-navy"
              />
            </div>

            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1.5">
                Título da Seção Sobre
              </label>
              <input
                type="text"
                value={aboutTitle}
                onChange={(e) => setAboutTitle(e.target.value)}
                placeholder="Um refúgio costeiro pensado para você se sentir em casa"
                className="w-full h-11 px-3.5 rounded-xl bg-brand-bg border border-slate-200 text-sm font-semibold text-brand-navy"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1.5 whitespace-nowrap">
                Foto Editorial da Seção
              </label>
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
                  accept="image/*"
                  onChange={handleAboutImageUpload}
                  disabled={isUploadingAboutImage}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1">
                Parágrafo Principal
              </label>
              <textarea
                rows={4}
                value={aboutDescription}
                onChange={(e) => setAboutDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-slate-200 text-sm text-brand-navy"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1">
                Parágrafo Complementar
              </label>
              <textarea
                rows={4}
                value={aboutSecondaryDescription}
                onChange={(e) => setAboutSecondaryDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-slate-200 text-sm text-brand-navy"
              />
            </div>
          </div>
        </div>

        {/* Cards do Bento Grid */}
        <div className="space-y-2.5 pt-2">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-navy">
            Cards de Diferenciais (Bento Grid)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {aboutHighlights.map((hl, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-brand-bg border border-slate-200 p-3.5 space-y-2"
              >
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={hl.badge}
                    onChange={(e) =>
                      handleUpdateHighlight(idx, "badge", e.target.value)
                    }
                    placeholder="Selo"
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-brand-navy"
                  />
                  <input
                    type="text"
                    value={hl.title}
                    onChange={(e) =>
                      handleUpdateHighlight(idx, "title", e.target.value)
                    }
                    placeholder="Título do diferencial"
                    className="col-span-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-brand-navy"
                  />
                </div>
                <input
                  type="text"
                  value={hl.description}
                  onChange={(e) =>
                    handleUpdateHighlight(idx, "description", e.target.value)
                  }
                  placeholder="Descrição curta..."
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-brand-navy"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. INFORMAÇÕES FORMAIS DO RODAPÉ + PREVIEW DO COMPONENTE
      ===================================================================== */}
      <section className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-brand-navy">
              Rodapé Formal & Direitos Reservados
            </h4>
            <p className="text-xs text-brand-navy/65">
              Dados institucionais exibidos no rodapé da Landing Page
            </p>
          </div>
        </div>

        {/* PREVIEW DO COMPONENTE RODAPÉ FORMAL EM TEMPO REAL */}
        <div className="rounded-2xl bg-brand-bg border border-slate-200 p-3.5 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-navy">
              <Eye className="w-3.5 h-3.5" />
              <span>Preview do Componente • Rodapé Formal</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-brand-navy/70">
              Tempo Real
            </span>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Coluna 1: Identidade */}
              <div className="md:col-span-5 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0">
                    <img
                      src="/logoMoradasdoGabriel.svg"
                      alt="Logo Pousada Moradas do Gabriel"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-sm sm:text-base text-brand-navy">
                      {companyName || "Pousada Moradas do Gabriel"}
                    </p>
                    {cnpj && (
                      <p className="text-xs text-brand-navy/65">CNPJ: {cnpj}</p>
                    )}
                  </div>
                </div>

                {initialMeta.location.address && (
                  <p className="text-xs text-brand-navy/75 leading-relaxed">
                    {initialMeta.location.address}
                  </p>
                )}

                {checkInOutInfo && (
                  <p className="text-xs font-semibold text-brand-navy/70">
                    {checkInOutInfo}
                  </p>
                )}
              </div>

              {/* Coluna 2: Navegação */}
              <div className="md:col-span-3 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-navy/60">
                  Navegação
                </p>
                <ul className="space-y-1.5 text-xs font-semibold text-brand-navy/80">
                  <li>Início</li>
                  <li>Sobre a Pousada</li>
                  <li>Acomodações</li>
                  <li>Localização</li>
                  <li className="inline-flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 shrink-0" />
                    <span>Central de Links & Contatos</span>
                  </li>
                </ul>
              </div>

              {/* Coluna 3: Atendimento */}
              <div className="md:col-span-4 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-navy/60">
                  Atendimento & Reservas
                </p>
                <div className="space-y-1.5 text-xs font-semibold text-brand-navy/85">
                  <div className="flex items-center gap-2">
                    <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      WhatsApp{maskedWhatsapp ? `: ${maskedWhatsapp}` : ""}
                    </span>
                  </div>
                  {maskedPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>Recepção: {maskedPhone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <InstagramIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Instagram{maskedInstagram ? `: ${maskedInstagram}` : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-brand-navy/65">
              <p className="font-medium text-center sm:text-left">
                © {new Date().getFullYear()}{" "}
                {companyName || "Pousada Moradas do Gabriel"}.{" "}
                {copyrightNote || "Todos os direitos reservados."}
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-navy/50">
                <Lock className="w-3 h-3 shrink-0" />
                <span>Painel da Pousada</span>
              </span>
            </div>
          </div>
        </div>

        {/* Campos de Edição do Rodapé */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1">
              Nome Oficial / Razão Social
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Pousada Moradas do Gabriel"
              className="w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-slate-200 text-sm text-brand-navy"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1">
              CNPJ (Opcional)
            </label>
            <input
              type="text"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0001-00"
              className="w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-slate-200 text-sm text-brand-navy"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1">
              Nota de Check-in / Check-out no Rodapé
            </label>
            <input
              type="text"
              value={checkInOutInfo}
              onChange={(e) => setCheckInOutInfo(e.target.value)}
              placeholder="Check-in a partir das 14h00 • Check-out até as 12h00"
              className="w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-slate-200 text-sm text-brand-navy"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-navy/75 mb-1">
              Carimbo de Direitos Reservados
            </label>
            <input
              type="text"
              value={copyrightNote}
              onChange={(e) => setCopyrightNote(e.target.value)}
              placeholder="Todos os direitos reservados."
              className="w-full px-3.5 py-2.5 rounded-xl bg-brand-bg border border-slate-200 text-sm text-brand-navy"
            />
          </div>
        </div>
      </section>
    </form>
  );
}
