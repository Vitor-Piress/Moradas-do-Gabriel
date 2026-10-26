import {
  ArrowLeft,
  BedDouble,
  Coffee,
  Compass,
  MapPin,
  MessageCircle,
  Sun,
  Waves,
  Wifi,
} from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import logoMoradas from "../../assets/logoMoradasdoGabriel.png";
import { useBusinessInfo } from "../../hooks/usePortalData";
import {
  DEFAULT_BUSINESS_METADATA,
  trackLinkClick,
  trackPageView,
} from "../../services";
import { formatWhatsAppUrl } from "../../utils/embedUrl";

export function LandingPlaceholder() {
  const { data: businessInfo } = useBusinessInfo();
  const metadata = businessInfo?.metadata ?? DEFAULT_BUSINESS_METADATA;

  useEffect(() => {
    trackPageView("site_placeholder");
  }, []);

  const whatsappUrl =
    formatWhatsAppUrl(
      metadata.contacts.whatsapp,
      "Olá! Vim pelo site da Pousada Moradas do Gabriel e gostaria de consultar disponibilidade de hospedagem.",
    ) || "https://wa.me/";

  const highlights = [
    {
      icon: BedDouble,
      title: "Acomodações Aconchegantes",
      description:
        "Ambientes pensados para o seu descanso com charme costeiro e todo o conforto que você merece.",
    },
    {
      icon: Sun,
      title: "Clima Solar & Natureza",
      description:
        "Pertinho do mar e cercada pela brisa suave da região para dias inesquecíveis.",
    },
    {
      icon: Coffee,
      title: "Hospitalidade Acolhedora",
      description:
        "Atendimento próximo e cuidadoso para que você se sinta em casa desde o primeiro instante.",
    },
    {
      icon: Wifi,
      title: "Estrutura & Praticidade",
      description:
        "Wi-Fi rápido, localização privilegiada e curadoria completa com as melhores dicas locais.",
    },
  ];

  return (
    <div className="min-h-screen bg-brand-bg text-brand-navy flex flex-col justify-between">
      <div className="w-full max-w-3xl mx-auto px-4 pt-6 pb-12">
        {/* Barra Superior de Navegação Responsiva */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-6">
          <Link
            to="/links-contato"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-brand-navy text-xs sm:text-sm font-semibold shadow-xs hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Voltar para a Central do Hóspede</span>
          </Link>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-brand-navy text-xs font-semibold">
            Novo Site em Breve
          </span>
        </div>

        {/* Card Hero Principal Flat */}
        <section className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-10 shadow-xs text-center">
          <div className="mx-auto w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-white border border-slate-200 p-3 flex items-center justify-center">
            <img
              src={logoMoradas}
              alt="Logo Pousada Moradas do Gabriel"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="mt-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-bg border border-slate-200 text-brand-navy text-[11px] font-semibold uppercase tracking-wider">
            <Waves className="w-3.5 h-3.5 shrink-0" />
            <span>Pousada Moradas do Gabriel</span>
          </div>

          <h1 className="mt-3 text-xl sm:text-3xl font-bold text-brand-navy tracking-tight break-words">
            Nosso novo site completo está sendo preparado com carinho
          </h1>

          <p className="mt-3 text-sm sm:text-base text-brand-navy/75 max-w-xl mx-auto leading-relaxed break-words">
            Em breve você poderá explorar todas as nossas acomodações, galeria
            de fotos e experiências diretamente por aqui. Enquanto isso, nossa
            equipe está pronta para atender você e a nossa{" "}
            <strong className="font-semibold text-brand-navy">
              Central do Hóspede
            </strong>{" "}
            já está 100% disponível.
          </p>

          {/* Ações Principais */}
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackLinkClick(null, "landing_whatsapp_cta")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-navy text-white font-semibold text-xs sm:text-sm hover:bg-brand-navy-light transition-colors"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>Falar com a Recepção / Reservar</span>
            </a>

            <Link
              to="/guia-do-hospede"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-brand-navy font-semibold text-xs sm:text-sm border border-slate-200 transition-colors"
            >
              <Compass className="w-4 h-4 shrink-0" />
              <span>Acessar Guia do Hóspede</span>
            </Link>
          </div>
        </section>

        {/* Destaques da Pousada */}
        <section className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="font-bold text-base text-brand-navy break-words">
                  {item.title}
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-brand-navy/75 leading-relaxed break-words">
                  {item.description}
                </p>
              </div>
            );
          })}
        </section>

        {/* Localização Rápida */}
        {metadata.location.address && (
          <div className="mt-4 rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-navy/60">
                  Onde Estamos
                </p>
                <p className="text-sm font-semibold text-brand-navy break-words">
                  {metadata.location.address}
                </p>
              </div>
            </div>
            <Link
              to="/guia-do-hospede#como-chegar"
              className="text-xs font-semibold text-brand-navy underline underline-offset-4 hover:text-brand-navy-light shrink-0"
            >
              Ver mapa na Central do Hóspede →
            </Link>
          </div>
        )}
      </div>

      <footer className="py-6 px-4 text-center text-xs font-medium text-brand-navy/65 border-t border-slate-200">
        © {new Date().getFullYear()} Pousada Moradas do Gabriel
      </footer>
    </div>
  );
}
