import {
  BedDouble,
  Calendar,
  Camera,
  Coffee,
  Compass,
  ExternalLink,
  Globe,
  Heart,
  Home,
  Info,
  KeyRound,
  Link as LinkIcon,
  Mail,
  MapPin,
  Navigation,
  Palmtree,
  Phone,
  ShoppingBag,
  Sparkles,
  Star,
  Sun,
  Umbrella,
  Utensils,
  Waves,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { createElement, type ComponentType, type SVGProps } from "react";

export type PortalIcon =
  | LucideIcon
  | ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

/**
 * Ícone SVG Oficial do WhatsApp
 */
export function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.9,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      ...props,
    },
    createElement("path", {
      d: "M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21",
    }),
    createElement("path", {
      d: "M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1",
    }),
  );
}

/**
 * Ícone SVG Oficial do Instagram
 */
export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.9,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      ...props,
    },
    createElement("rect", {
      width: "20",
      height: "20",
      x: "2",
      y: "2",
      rx: "5",
      ry: "5",
    }),
    createElement("path", {
      d: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z",
    }),
    createElement("line", {
      x1: "17.5",
      x2: "17.51",
      y1: "6.5",
      y2: "6.5",
    }),
  );
}

/**
 * Ícone SVG Oficial do Waze
 */
export function WazeIcon(props: SVGProps<SVGSVGElement>) {
  return createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.9,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      ...props,
    },
    createElement("path", {
      d: "M10.5 17h5a6.5 6.5 0 1 0-11.9-3.6C3.2 15.2 2 16 2 16c1.5 1 3.1 1 4.5 1",
    }),
    createElement("circle", { cx: "8", cy: "18.5", r: "2" }),
    createElement("circle", { cx: "16.5", cy: "18.5", r: "2" }),
    createElement("circle", {
      cx: "10.5",
      cy: "9.5",
      r: "0.8",
      fill: "currentColor",
    }),
    createElement("circle", {
      cx: "15",
      cy: "9.5",
      r: "0.8",
      fill: "currentColor",
    }),
    createElement("path", {
      d: "M10.5 12.5c.8 1 2.9 1 3.8 0",
    }),
  );
}

export interface IconOption {
  value: string;
  label: string;
  icon: PortalIcon;
}

export const AVAILABLE_LINK_ICONS: IconOption[] = [
  { value: "whatsapp", label: "WhatsApp / Atendimento", icon: WhatsAppIcon },
  { value: "calendar", label: "Reservas / Calendário", icon: Calendar },
  { value: "bed", label: "Acomodações / Suítes", icon: BedDouble },
  { value: "instagram", label: "Instagram", icon: InstagramIcon },
  { value: "waze", label: "Waze / Navegação", icon: WazeIcon },
  { value: "map-pin", label: "Localização / Mapa", icon: MapPin },
  { value: "globe", label: "Site Oficial / Web", icon: Globe },
  { value: "phone", label: "Telefone", icon: Phone },
  { value: "sun", label: "Sol / Praia", icon: Sun },
  { value: "waves", label: "Mar / Experiências", icon: Waves },
  { value: "palmtree", label: "Natureza / Pousada", icon: Palmtree },
  { value: "utensils", label: "Gastronomia / Café", icon: Utensils },
  { value: "coffee", label: "Café da Manhã", icon: Coffee },
  { value: "compass", label: "Passeios / Guia", icon: Compass },
  { value: "camera", label: "Fotos / Tour", icon: Camera },
  { value: "star", label: "Avaliações / Destaque", icon: Star },
  { value: "sparkles", label: "Especial / Novidade", icon: Sparkles },
  { value: "heart", label: "Favorito / Bem-estar", icon: Heart },
  { value: "wifi", label: "Wi-Fi", icon: Wifi },
  { value: "key", label: "Check-in / Chave", icon: KeyRound },
  { value: "mail", label: "E-mail", icon: Mail },
  { value: "link", label: "Link Padrão", icon: LinkIcon },
];

const ICON_MAP: Record<string, PortalIcon> = {
  whatsapp: WhatsAppIcon,
  "message-circle": WhatsAppIcon,
  messagecircle: WhatsAppIcon,
  calendar: Calendar,
  bed: BedDouble,
  "bed-double": BedDouble,
  instagram: InstagramIcon,
  waze: WazeIcon,
  "map-pin": MapPin,
  mappin: MapPin,
  map: MapPin,
  navigation: Navigation,
  globe: Globe,
  site: Globe,
  home: Home,
  phone: Phone,
  sun: Sun,
  umbrella: Umbrella,
  waves: Waves,
  palmtree: Palmtree,
  utensils: Utensils,
  coffee: Coffee,
  compass: Compass,
  camera: Camera,
  star: Star,
  sparkles: Sparkles,
  heart: Heart,
  wifi: Wifi,
  key: KeyRound,
  mail: Mail,
  shopping: ShoppingBag,
  info: Info,
  link: LinkIcon,
  external: ExternalLink,
};

/**
 * Resolve o ícone ideal a partir do campo `icon` salvo no banco,
 * ou infere pelo título/URL caso `icon` esteja vazio.
 */
export function resolveLinkIcon(
  iconName?: string | null,
  title?: string,
  url?: string,
): PortalIcon {
  if (iconName) {
    const key = iconName.toLowerCase().trim();
    if (ICON_MAP[key]) {
      return ICON_MAP[key];
    }
  }

  const combined = `${title || ""} ${url || ""}`.toLowerCase();
  if (
    combined.includes("whatsapp") ||
    combined.includes("wa.me") ||
    combined.includes("atendimento") ||
    combined.includes("recepção")
  ) {
    return WhatsAppIcon;
  }
  if (combined.includes("instagram") || combined.includes("insta")) {
    return InstagramIcon;
  }
  if (
    combined.includes("reserva") ||
    combined.includes("booking") ||
    combined.includes("disponibilidade")
  ) {
    return Calendar;
  }
  if (
    combined.includes("suíte") ||
    combined.includes("suite") ||
    combined.includes("quarto") ||
    combined.includes("acomoda")
  ) {
    return BedDouble;
  }
  if (
    combined.includes("mapa") ||
    combined.includes("localiza") ||
    combined.includes("chegar") ||
    combined.includes("waze") ||
    combined.includes("maps")
  ) {
    return MapPin;
  }
  if (combined.includes("avali") || combined.includes("google") || combined.includes("review")) {
    return Star;
  }
  if (combined.includes("passeio") || combined.includes("roteiro") || combined.includes("praia")) {
    return Compass;
  }
  if (combined.includes("restaurante") || combined.includes("cardápio") || combined.includes("menu")) {
    return Utensils;
  }
  if (combined.includes("site") || combined.includes("pousada")) {
    return Globe;
  }

  return LinkIcon;
}
