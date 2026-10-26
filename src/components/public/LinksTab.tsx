import {
  ArrowRight,
  Compass,
  ExternalLink,
  Globe,
  MapPin,
  Phone,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { ContactsMetadata, LinkRow } from "../../@types/database.types";
import { trackGuideInteraction, trackLinkClick } from "../../services";
import {
  formatInstagramMask,
  formatInstagramUrl,
  formatPhoneMask,
  formatWhatsAppUrl,
} from "../../utils/embedUrl";
import {
  InstagramIcon,
  resolveLinkIcon,
  WhatsAppIcon,
} from "../../utils/iconMapper";

interface LinksTabProps {
  links: LinkRow[];
  isLoading: boolean;
  contacts: ContactsMetadata;
  onSwitchToGuide: () => void;
  onNavigateToLocation: () => void;
}

export function LinksTab({
  links,
  isLoading,
  contacts,
  onSwitchToGuide,
  onNavigateToLocation,
}: LinksTabProps) {
  const handleExternalLinkClick = (link: LinkRow) => {
    trackLinkClick(link.id, link.title);
  };

  const handleSiteClick = () => {
    trackLinkClick(null, "site_institucional");
  };

  // Verifica se já existe link de WhatsApp ou Instagram cadastrado na tabela `links`
  // para evitar botões duplicados caso o admin já tenha criado no painel
  const hasWhatsappInLinks = links.some(
    (l) =>
      l.title.toLowerCase().includes("whatsapp") ||
      l.url.toLowerCase().includes("wa.me") ||
      l.url.toLowerCase().includes("whatsapp"),
  );

  const hasInstagramInLinks = links.some(
    (l) =>
      l.title.toLowerCase().includes("instagram") ||
      l.url.toLowerCase().includes("instagram.com"),
  );

  const whatsappHref =
    formatWhatsAppUrl(contacts.whatsapp) || "https://wa.me/";
  const instagramHref =
    formatInstagramUrl(contacts.instagram) || "https://instagram.com";

  const maskedWhatsapp = formatPhoneMask(contacts.whatsapp);
  const maskedPhone = formatPhoneMask(contacts.phone);
  const maskedInstagram = formatInstagramMask(contacts.instagram);

  const handleQuickWhatsAppClick = () => {
    trackLinkClick(null, "quick_whatsapp");
  };

  const handleQuickInstagramClick = () => {
    trackLinkClick(null, "quick_instagram");
  };

  const handleLocationClick = () => {
    trackGuideInteraction("quick_location");
    onNavigateToLocation();
  };

  return (
    <div className="space-y-2.5 animate-fade-in">
      {/* Botão Especial: Conhecer a Pousada (/site) */}
      <Link
        to="/site"
        onClick={handleSiteClick}
        className="group flex items-center justify-between gap-3 w-full p-4 rounded-2xl bg-brand-navy text-white border border-brand-navy hover:bg-brand-navy-light transition-colors shadow-xs"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div className="text-left min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-white/75">
              Site Oficial
            </span>
            <p className="text-sm sm:text-base font-bold text-white break-words leading-snug">
              Conheça a Pousada Moradas do Gabriel
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition-transform shrink-0" />
      </Link>

      {/* Estado de Carregamento */}
      {isLoading && (
        <div className="space-y-2.5 py-1">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-16 rounded-2xl bg-white animate-pulse border border-slate-200"
            />
          ))}
        </div>
      )}

      {/* Lista Unificada de Links Principais */}
      {!isLoading && (
        <div className="space-y-2.5">
          {/* Links ativos cadastrados no banco */}
          {links.map((link) => {
            const IconComponent = resolveLinkIcon(
              link.icon,
              link.title,
              link.url,
            );
            const isInternal = link.url.startsWith("/");

            if (isInternal) {
              return (
                <Link
                  key={link.id}
                  to={link.url}
                  onClick={() => handleExternalLinkClick(link)}
                  className="group flex items-center justify-between gap-3 w-full p-4 rounded-2xl bg-white border border-slate-200 text-brand-navy shadow-xs hover:border-brand-navy/35 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center shrink-0">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-sm sm:text-base text-brand-navy text-left break-words min-w-0 flex-1 leading-snug">
                      {link.title}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-brand-navy/45 group-hover:text-brand-navy group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              );
            }

            return (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleExternalLinkClick(link)}
                className="group flex items-center justify-between gap-3 w-full p-4 rounded-2xl bg-white border border-slate-200 text-brand-navy shadow-xs hover:border-brand-navy/35 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center shrink-0">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm sm:text-base text-brand-navy text-left break-words min-w-0 flex-1 leading-snug">
                    {link.title}
                  </span>
                </div>
                <ExternalLink className="w-4 h-4 text-brand-navy/45 group-hover:text-brand-navy group-hover:translate-x-0.5 transition-all shrink-0" />
              </a>
            );
          })}

          {/* Card Principal: WhatsApp (exibido caso não esteja na lista de links acima) */}
          {!hasWhatsappInLinks && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleQuickWhatsAppClick}
              className="group flex items-center justify-between gap-3 w-full p-4 rounded-2xl bg-white border border-slate-200 text-brand-navy shadow-xs hover:border-brand-navy/35 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center shrink-0">
                  <WhatsAppIcon className="w-5 h-5" />
                </div>
                <span className="font-semibold text-sm sm:text-base text-brand-navy text-left break-words min-w-0 flex-1 leading-snug">
                  {maskedWhatsapp
                    ? `WhatsApp: ${maskedWhatsapp}`
                    : "WhatsApp"}
                </span>
              </div>
              <ExternalLink className="w-4 h-4 text-brand-navy/45 group-hover:text-brand-navy group-hover:translate-x-0.5 transition-all shrink-0" />
            </a>
          )}

          {/* Card Principal: Instagram (exibido caso não esteja na lista de links acima) */}
          {!hasInstagramInLinks && (
            <a
              href={instagramHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleQuickInstagramClick}
              className="group flex items-center justify-between gap-3 w-full p-4 rounded-2xl bg-white border border-slate-200 text-brand-navy shadow-xs hover:border-brand-navy/35 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center shrink-0">
                  <InstagramIcon className="w-5 h-5" />
                </div>
                <span className="font-semibold text-sm sm:text-base text-brand-navy text-left break-words min-w-0 flex-1 leading-snug">
                  {maskedInstagram
                    ? `Instagram: ${maskedInstagram}`
                    : "Instagram"}
                </span>
              </div>
              <ExternalLink className="w-4 h-4 text-brand-navy/45 group-hover:text-brand-navy group-hover:translate-x-0.5 transition-all shrink-0" />
            </a>
          )}

          {/* Card Principal: Como Chegar */}
          <button
            type="button"
            onClick={handleLocationClick}
            className="group flex items-center justify-between gap-3 w-full p-4 rounded-2xl bg-white border border-slate-200 text-brand-navy shadow-xs hover:border-brand-navy/35 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <span className="font-semibold text-sm sm:text-base text-brand-navy text-left break-words min-w-0 flex-1 leading-snug">
                Como Chegar
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-brand-navy/45 group-hover:text-brand-navy group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        </div>
      )}

      {/* Card convite para o Guia do Hóspede */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onSwitchToGuide}
          className="w-full p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-brand-navy/30 text-brand-navy flex items-center justify-between gap-3 transition-colors text-left shadow-xs group"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-brand-bg border border-slate-200 text-brand-navy flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-navy/60">
                Já está hospedado conosco?
              </p>
              <p className="text-sm font-bold text-brand-navy break-words leading-snug">
                Acesse as redes Wi-Fi, mapas e dicas locais
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-brand-navy/60 shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Telefone direto em botão discreto no final se preenchido */}
      {maskedPhone && (
        <div className="pt-1 text-center">
          <a
            href={`tel:${contacts.phone.replace(/\D/g, "")}`}
            onClick={() => trackLinkClick(null, "phone_contact")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-brand-navy/80 hover:text-brand-navy py-2 px-3.5 rounded-xl bg-white border border-slate-200 shadow-xs break-words"
          >
            <Phone className="w-3.5 h-3.5 text-brand-navy shrink-0" />
            <span>Recepção: {maskedPhone}</span>
          </a>
        </div>
      )}
    </div>
  );
}
