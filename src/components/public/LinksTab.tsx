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
  mapsUrl?: string;
}

export function LinksTab({
  links,
  isLoading,
  contacts,
  mapsUrl,
}: LinksTabProps) {
  const handleExternalLinkClick = (link: LinkRow) => {
    trackLinkClick(link.id, link.title);
  };

  const handleSiteClick = () => {
    trackLinkClick(null, "site_institucional");
  };

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
  const guestGuideWhatsappHref =
    formatWhatsAppUrl(
      contacts.whatsapp,
      "Quero receber a guia do hóspede",
    ) ||
    `https://wa.me/?text=${encodeURIComponent("Quero receber a guia do hóspede")}`;
  const instagramHref =
    formatInstagramUrl(contacts.instagram) || "https://instagram.com";
  const locationHref = mapsUrl || "https://maps.google.com";

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
  };

  const handleRequestGuideClick = () => {
    trackLinkClick(null, "request_guest_guide_whatsapp");
  };

  return (
    <div className="space-y-2.5 animate-fade-in">
      <Link
        to="/"
        onClick={handleSiteClick}
        className="motion-card group flex items-center justify-between gap-3 w-full min-h-14 p-4 rounded-2xl bg-brand-navy text-white border border-brand-navy hover:bg-brand-navy-light transition-colors shadow-xs"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-white/12 text-white flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div className="text-left min-w-0 flex-1">
            <span className="block text-xs font-medium text-[#D8E1F0]">
              Site oficial
            </span>
            <p className="font-display text-sm sm:text-base font-semibold text-white break-words leading-snug">
              Conheça a Pousada Moradas do Gabriel
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-[#D8E1F0] group-hover:translate-x-0.5 transition-transform shrink-0" />
      </Link>

      {isLoading && (
        <div className="space-y-2.5 py-1">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              aria-hidden="true"
              className="h-16 rounded-2xl bg-white media-shimmer-light border border-brand-navy/10"
            />
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="stagger-reveal space-y-2.5">
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
                  className="motion-card group flex items-center justify-between gap-3 w-full min-h-14 p-4 rounded-2xl bg-white border border-brand-navy/10 text-brand-navy shadow-xs hover:border-brand-navy/25 hover:bg-brand-surface transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-brand-bg border border-brand-navy/10 text-brand-navy flex items-center justify-center shrink-0">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-sm sm:text-base text-brand-navy text-left break-words min-w-0 flex-1 leading-snug">
                      {link.title}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-brand-ink-muted group-hover:text-brand-navy group-hover:translate-x-0.5 transition-[color,transform] shrink-0" />
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
                className="motion-card group flex items-center justify-between gap-3 w-full min-h-14 p-4 rounded-2xl bg-white border border-brand-navy/10 text-brand-navy shadow-xs hover:border-brand-navy/25 hover:bg-brand-surface transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-brand-bg border border-brand-navy/10 text-brand-navy flex items-center justify-center shrink-0">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm sm:text-base text-brand-navy text-left break-words min-w-0 flex-1 leading-snug">
                    {link.title}
                  </span>
                </div>
                <ExternalLink className="w-4 h-4 text-brand-ink-muted group-hover:text-brand-navy group-hover:translate-x-0.5 transition-[color,transform] shrink-0" />
              </a>
            );
          })}

          {!hasWhatsappInLinks && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleQuickWhatsAppClick}
              className="motion-card group flex items-center justify-between gap-3 w-full min-h-14 p-4 rounded-2xl bg-white border border-brand-navy/10 text-brand-navy shadow-xs hover:border-brand-navy/25 hover:bg-brand-surface transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-brand-bg border border-brand-navy/10 text-brand-navy flex items-center justify-center shrink-0">
                  <WhatsAppIcon className="w-5 h-5" />
                </div>
                <span className="font-semibold text-sm sm:text-base text-brand-navy text-left break-words min-w-0 flex-1 leading-snug">
                  {maskedWhatsapp
                    ? `WhatsApp: ${maskedWhatsapp}`
                    : "WhatsApp"}
                </span>
              </div>
              <ExternalLink className="w-4 h-4 text-brand-ink-muted group-hover:text-brand-navy group-hover:translate-x-0.5 transition-[color,transform] shrink-0" />
            </a>
          )}

          {!hasInstagramInLinks && (
            <a
              href={instagramHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleQuickInstagramClick}
              className="motion-card group flex items-center justify-between gap-3 w-full min-h-14 p-4 rounded-2xl bg-white border border-brand-navy/10 text-brand-navy shadow-xs hover:border-brand-navy/25 hover:bg-brand-surface transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-brand-bg border border-brand-navy/10 text-brand-navy flex items-center justify-center shrink-0">
                  <InstagramIcon className="w-5 h-5" />
                </div>
                <span className="font-semibold text-sm sm:text-base text-brand-navy text-left break-words min-w-0 flex-1 leading-snug">
                  {maskedInstagram
                    ? `Instagram: ${maskedInstagram}`
                    : "Instagram"}
                </span>
              </div>
              <ExternalLink className="w-4 h-4 text-brand-ink-muted group-hover:text-brand-navy group-hover:translate-x-0.5 transition-[color,transform] shrink-0" />
            </a>
          )}

          <a
            href={locationHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLocationClick}
            className="motion-card group flex items-center justify-between gap-3 w-full min-h-14 p-4 rounded-2xl bg-white border border-brand-navy/10 text-brand-navy shadow-xs hover:border-brand-navy/25 hover:bg-brand-surface transition-colors text-left"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-brand-bg border border-brand-navy/10 text-brand-navy flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <span className="font-semibold text-sm sm:text-base text-brand-navy text-left break-words min-w-0 flex-1 leading-snug">
                Como chegar
              </span>
            </div>
            <ExternalLink className="w-4 h-4 text-brand-ink-muted group-hover:text-brand-navy group-hover:translate-x-0.5 transition-[color,transform] shrink-0" />
          </a>
        </div>
      )}

      <div className="pt-1">
        <a
          href={guestGuideWhatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleRequestGuideClick}
          className="w-full min-h-14 p-4 rounded-2xl bg-white hover:bg-brand-surface border border-brand-navy/10 hover:border-brand-navy/25 text-brand-navy flex items-center justify-between gap-3 transition-colors text-left shadow-xs group"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-brand-bg border border-brand-navy/10 text-brand-navy flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-brand-ink-muted">
                Já está hospedado conosco?
              </p>
              <p className="text-sm font-semibold text-brand-navy break-words leading-snug">
                Solicite o Guia do Hóspede pelo WhatsApp
              </p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-brand-ink-muted shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>

      {maskedPhone && (
        <div className="pt-1 text-center">
          <a
            href={`tel:${contacts.phone.replace(/\D/g, "")}`}
            onClick={() => trackLinkClick(null, "phone_contact")}
            className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl bg-white border border-brand-navy/12 text-xs font-semibold text-brand-ink-secondary hover:text-brand-navy hover:bg-brand-surface transition-colors break-words"
          >
            <Phone className="w-3.5 h-3.5 text-brand-navy shrink-0" />
            <span>Recepção: {maskedPhone}</span>
          </a>
        </div>
      )}
    </div>
  );
}
