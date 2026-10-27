import {
  ArrowLeft,
  Bath,
  BedDouble,
  Check,
  Dog,
  Loader2,
  Refrigerator,
  Snowflake,
  Sparkles,
  Sun,
  Tv,
  Users,
  Utensils,
  Wifi,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  useAccommodationBySlug,
  useBusinessInfo,
} from "../../hooks/usePortalData";
import {
  DEFAULT_BUSINESS_METADATA,
  trackLinkClick,
  trackPageView,
} from "../../services";
import { formatWhatsAppUrl } from "../../utils/embedUrl";
import { WhatsAppIcon } from "../../utils/iconMapper";

export function AccommodationDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: accommodation, isLoading } = useAccommodationBySlug(slug);
  const { data: businessInfo } = useBusinessInfo();

  const metadata = businessInfo?.metadata ?? DEFAULT_BUSINESS_METADATA;
  const [selectedImage, setSelectedImage] = useState<string>("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (slug) {
      trackPageView(`acomodacao_${slug}`);
    }
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg text-brand-navy flex flex-col items-center justify-center p-6">
        <Loader2 className="w-7 h-7 animate-spin mb-2" />
        <p className="text-sm font-medium text-brand-navy/75">
          Carregando detalhes da acomodação...
        </p>
      </div>
    );
  }

  if (!accommodation) {
    return (
      <div className="min-h-screen bg-brand-bg text-brand-navy flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="rounded-3xl bg-white border border-slate-200 p-8 max-w-md space-y-4 shadow-xs">
          <BedDouble className="w-10 h-10 mx-auto text-brand-navy" />
          <h1 className="text-xl font-bold text-brand-navy">
            Acomodação não encontrada
          </h1>
          <p className="text-sm text-brand-navy/75">
            Esta acomodação pode ter sido atualizada ou não está disponível no
            momento.
          </p>
          <Link
            to="/#acomodacoes"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-navy text-white text-xs sm:text-sm font-semibold hover:bg-brand-navy-light transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Voltar para a Pousada</span>
          </Link>
        </div>
      </div>
    );
  }

  const allPhotos = Array.from(
    new Set(
      [accommodation.cover_image, ...accommodation.gallery].filter(Boolean),
    ),
  );
  const activePhoto = selectedImage || allPhotos[0] || "";

  const whatsappBookingUrl =
    formatWhatsAppUrl(
      metadata.contacts.whatsapp,
      `Olá! Estou no site da Pousada Moradas do Gabriel e gostaria de consultar disponibilidade e valores da acomodação "${accommodation.title}".`,
    ) || "https://wa.me/";

  const amenityItems = [
    {
      label: "Capacidade Máxima",
      value: `Acomoda até ${accommodation.max_guests} ${accommodation.max_guests === 1 ? "pessoa" : "pessoas"}`,
      available: true,
      icon: Users,
    },
    {
      label: "Cozinha",
      value: accommodation.has_kitchen
        ? "Possui cozinha"
        : "Não possui cozinha",
      available: accommodation.has_kitchen,
      icon: Utensils,
    },
    {
      label: "Frigobar / Utensílios",
      value: accommodation.has_kitchen_utensils
        ? "Incluso na acomodação"
        : "Não incluso",
      available: accommodation.has_kitchen_utensils,
      icon: Refrigerator,
    },
    {
      label: "Ar-condicionado",
      value: accommodation.has_ac ? "Ambiente climatizado" : "Não possui",
      available: accommodation.has_ac,
      icon: Snowflake,
    },
    {
      label: "Televisão (TV)",
      value: accommodation.has_tv ? "Possui TV" : "Não possui",
      available: accommodation.has_tv,
      icon: Tv,
    },
    {
      label: "Internet Wi-Fi",
      value: accommodation.has_wifi ? "Wi-Fi gratuito" : "Não possui",
      available: accommodation.has_wifi,
      icon: Wifi,
    },
    {
      label: "Varanda / Rede de Descanso",
      value: accommodation.has_balcony ? "Possui varanda / rede" : "Não possui",
      available: accommodation.has_balcony,
      icon: Sun,
    },
    {
      label: "Banheiro Privativo",
      value: accommodation.has_private_bathroom
        ? "Banheiro exclusivo"
        : "Compartilhado",
      available: accommodation.has_private_bathroom,
      icon: Bath,
    },
    {
      label: "Roupas de Cama e Banho",
      value: accommodation.has_bed_bath_linen
        ? "Inclusas na estadia"
        : "Não inclusas",
      available: accommodation.has_bed_bath_linen,
      icon: Sparkles,
    },
    {
      label: "Pet Friendly",
      value: accommodation.is_pet_friendly
        ? "Aceita animais de estimação"
        : "Não aceita animais",
      available: accommodation.is_pet_friendly,
      icon: Dog,
    },
  ];

  return (
    <div className="min-h-screen bg-brand-bg text-brand-navy flex flex-col justify-between">
      <div className="w-full max-w-5xl mx-auto px-4 pt-6 pb-16 space-y-6">
        {/* Topo de Navegação */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/#acomodacoes"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-brand-navy text-xs sm:text-sm font-semibold shadow-xs hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Voltar para todas as acomodações</span>
          </Link>

          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center">
              <img
                src="/logoMoradasdoGabriel.svg"
                alt="Pousada Moradas do Gabriel"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xs sm:text-sm font-bold text-brand-navy hidden sm:inline">
              Pousada Moradas do Gabriel
            </span>
          </Link>
        </div>

        {/* Galeria de Fotos da Acomodação */}
        <section className="rounded-3xl bg-white border border-slate-200 p-3 sm:p-5 shadow-xs space-y-3">
          <div className="relative h-72 sm:h-[420px] rounded-2xl overflow-hidden bg-brand-bg">
            {activePhoto ? (
              <img
                src={activePhoto}
                alt={accommodation.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-brand-navy/40">
                <BedDouble className="w-12 h-12" />
              </div>
            )}

            <div className="absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-xs border border-slate-200 text-brand-navy text-xs font-bold shadow-xs">
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>
                Acomoda até {accommodation.max_guests}{" "}
                {accommodation.max_guests === 1 ? "pessoa" : "pessoas"}
              </span>
            </div>
          </div>

          {allPhotos.length > 1 && (
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
              {allPhotos.map((photoUrl, idx) => {
                const isSelected = photoUrl === activePhoto;
                return (
                  <button
                    key={`${photoUrl}-${idx}`}
                    type="button"
                    onClick={() => setSelectedImage(photoUrl)}
                    className={`relative w-20 h-16 sm:w-24 sm:h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      isSelected
                        ? "border-brand-navy shadow-xs"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={photoUrl}
                      alt={`${accommodation.title} - foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Detalhes Principais + Card de Reserva */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Coluna Esquerda: Descrição, Camas e Características */}
          <div className="lg:col-span-8 space-y-6">
            {/* Cabeçalho e Descrição Completa */}
            <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-bg border border-slate-200 text-brand-navy text-[11px] font-semibold uppercase tracking-wider">
                <BedDouble className="w-3.5 h-3.5 shrink-0" />
                <span>Acomodação Oficial</span>
              </span>

              <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy tracking-tight break-words">
                {accommodation.title}
              </h1>

              <p className="text-sm sm:text-base text-brand-navy/80 leading-relaxed whitespace-pre-line break-words">
                {accommodation.full_description ||
                  accommodation.short_description}
              </p>
            </section>

            {/* Configuração de Camas */}
            <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center shrink-0">
                  <BedDouble className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-brand-navy">
                    Configuração de Camas
                  </h2>
                  <p className="text-xs text-brand-navy/65">
                    Distribuição e tamanho das camas nesta acomodação
                  </p>
                </div>
              </div>

              {accommodation.beds.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {accommodation.beds.map((bed, idx) => (
                    <div
                      key={`${bed.type}-${idx}`}
                      className="rounded-2xl bg-brand-bg border border-slate-200 p-4 flex items-center gap-3"
                    >
                      <span className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-brand-navy font-bold text-sm flex items-center justify-center shrink-0">
                        {bed.count}x
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-brand-navy break-words">
                          {bed.type}
                        </p>
                        <p className="text-[11px] text-brand-navy/65">
                          {bed.count === 1
                            ? "1 unidade"
                            : `${bed.count} unidades`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-brand-navy/75">
                  Consulte a recepção para opções personalizadas de camas.
                </p>
              )}
            </section>

            {/* Tópicos de Características e Comodidades */}
            <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="text-base sm:text-lg font-bold text-brand-navy">
                Características da Acomodação
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {amenityItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className={`rounded-2xl border p-3.5 flex items-center justify-between gap-3 ${
                        item.available
                          ? "bg-brand-bg border-slate-200 text-brand-navy"
                          : "bg-slate-50/70 border-slate-200/70 text-brand-navy/45"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold break-words">
                            {item.label}
                          </p>
                          <p className="text-[11px] opacity-80 break-words">
                            {item.value}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {item.available ? (
                          <Check className="w-4 h-4 text-brand-navy" />
                        ) : (
                          <X className="w-4 h-4 text-brand-navy/40" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {accommodation.extra_amenities.length > 0 && (
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-navy/65">
                    Diferenciais Extras
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {accommodation.extra_amenities.map((extra, idx) => (
                      <span
                        key={`${extra}-${idx}`}
                        className="px-3 py-1.5 rounded-xl bg-brand-bg border border-slate-200 text-xs font-semibold text-brand-navy"
                      >
                        {extra}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Coluna Direita: Card de Reserva Direta no WhatsApp */}
          <aside className="lg:col-span-4 lg:sticky lg:top-20 rounded-3xl bg-white border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-navy/60">
                Reserva Direta Sem Taxas
              </span>
              <h3 className="text-lg font-bold text-brand-navy break-words">
                Gostou da {accommodation.title}?
              </h3>
              <p className="text-xs sm:text-sm text-brand-navy/75 leading-relaxed">
                Fale diretamente com a nossa recepção pelo WhatsApp para
                verificar disponibilidade nas datas desejadas e garantir a
                melhor tarifa.
              </p>
            </div>

            <div className="rounded-2xl bg-brand-bg border border-slate-200 p-4 space-y-2 text-xs text-brand-navy/80">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Capacidade:</span>
                <span className="font-bold text-brand-navy">
                  Até {accommodation.max_guests}{" "}
                  {accommodation.max_guests === 1 ? "pessoa" : "pessoas"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">Cozinha:</span>
                <span className="font-bold text-brand-navy">
                  {accommodation.has_kitchen ? "Sim" : "Não"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">Ar-condicionado:</span>
                <span className="font-bold text-brand-navy">
                  {accommodation.has_ac ? "Sim" : "Não"}
                </span>
              </div>
            </div>

            <a
              href={whatsappBookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackLinkClick(null, `book_accommodation_${accommodation.slug}`)
              }
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-brand-navy hover:bg-brand-navy-light text-white font-bold text-xs sm:text-sm transition-colors"
            >
              <WhatsAppIcon className="w-4 h-4 shrink-0" />
              <span>Consultar Disponibilidade</span>
            </a>

            <Link
              to="/#acomodacoes"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-bg hover:bg-slate-100 border border-slate-200 text-brand-navy font-semibold text-xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span>Ver outras acomodações</span>
            </Link>
          </aside>
        </div>
      </div>

      <footer className="py-6 px-4 text-center text-xs font-medium text-brand-navy/65 border-t border-slate-200 bg-white">
        © {new Date().getFullYear()} Pousada Moradas do Gabriel. Todos os
        direitos reservados.
      </footer>
    </div>
  );
}
