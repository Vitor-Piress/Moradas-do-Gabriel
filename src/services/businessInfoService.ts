import type {
  AboutHighlightItem,
  BusinessInfoMetadata,
  HeroSlideItem,
  Json,
  LandingPageMetadata,
  PlaceTip,
  TypedBusinessInfo,
  WifiNetwork,
} from "../@types/database.types";
import { supabase } from "../lib/supabase";
import {
  extractEmbedUrl,
  extractInstagramHandle,
  extractPhoneDigits,
  sanitizeHttpUrl,
} from "../utils/embedUrl";

export const DEFAULT_BUSINESS_METADATA: BusinessInfoMetadata = {
  wifi_networks: [
    {
      id: "wifi-1",
      label: "Recepção / Piscina",
      ssid: "MoradasDoGabriel_5G",
      password: "bemvindomoradas",
    },
  ],
  wifi: {
    ssid: "MoradasDoGabriel_5G",
    password: "bemvindomoradas",
  },
  location: {
    address: "Consulte a recepção para o endereço completo da Pousada Moradas do Gabriel",
    maps_url: "https://maps.google.com",
    waze_url: "https://waze.com/ul",
    embed_url: "",
    instructions:
      "Siga pela via principal até a placa indicativa da Pousada Moradas do Gabriel. Estacionamento privativo no local.",
  },
  rules: [
    "Check-in a partir das 14h00 e Check-out até as 12h00.",
    "Café da manhã servido diariamente em ambiente acolhedor das 08h00 às 10h00.",
    "Horário de silêncio das 22h00 às 08h00 para o descanso e tranquilidade de todos.",
    "Pedimos a gentileza de desligar o ar-condicionado e as luzes ao sair da acomodação.",
    "Dúvidas, toalhas extras ou dicas de passeios? Chame nossa equipe pelo WhatsApp!",
  ],
  places_tips: [
    {
      name: "Restaurante Sabor da Praia",
      category: "Gastronomia",
      description:
        "Frutos do mar frescos, moquecas artesanais e vista encantadora para o pôr do sol.",
      link: "https://maps.google.com",
    },
    {
      name: "Praia Principal",
      category: "Praias",
      description:
        "Águas calmas e cristalinas, ideal para banho de mar, caminhadas matinais e relaxar ao sol.",
      link: "https://maps.google.com",
    },
    {
      name: "Passeio de Barco pelas Ilhas",
      category: "Passeios",
      description:
        "Roteiro imperdível pelas enseadas e piscinas naturais da região com paradas para mergulho.",
      link: "https://maps.google.com",
    },
    {
      name: "Mercadinho & Padaria Local",
      category: "Mercados",
      description:
        "Pães quentinhos, frutas frescas, bebidas, gelo e itens de conveniência pertinho da pousada.",
      link: "https://maps.google.com",
    },
  ],
  contacts: {
    whatsapp: "",
    phone: "",
    instagram: "",
  },
  landing: {
    hero_slides: [
      {
        id: "slide-acomodacoes",
        topic: "Acomodações",
        title: "Conforto e tranquilidade para os seus melhores dias no litoral",
        subtitle:
          "Suítes e apartamentos aconchegantes, equipados e pensados para o descanso de casais e famílias.",
        image_url:
          "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1600&q=80",
        cta_label: "Ver Acomodações",
        cta_href: "#acomodacoes",
      },
      {
        id: "slide-praias",
        topic: "Praias",
        title: "As praias mais encantadoras da região pertinho de você",
        subtitle:
          "Águas cristalinas, brisa suave e fácil acesso às principais praias e trilhas costeiras.",
        image_url:
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80",
        cta_label: "Ver Localização",
        cta_href: "#localizacao",
      },
      {
        id: "slide-destinos",
        topic: "Destinos",
        title: "Roteiros, gastronomia local e experiências inesquecíveis",
        subtitle:
          "Descubra passeios de barco, restaurantes à beira-mar e mirantes naturais selecionados pela nossa equipe.",
        image_url:
          "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1600&q=80",
        cta_label: "Conhecer a Pousada",
        cta_href: "#sobre",
      },
      {
        id: "slide-pousada",
        topic: "Sobre a Pousada",
        title: "Pousada Moradas do Gabriel: hospitalidade que acolhe",
        subtitle:
          "Atendimento próximo, ambiente familiar e cada detalhe preparado com carinho para sua estadia.",
        image_url:
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80",
        cta_label: "Sobre Nós",
        cta_href: "#sobre",
      },
    ],
    about: {
      badge: "Sobre a Pousada",
      title: "Um refúgio costeiro pensado para você se sentir em casa",
      description:
        "Na Pousada Moradas do Gabriel, unimos a simplicidade charmosa do litoral com o conforto que transforma cada estadia em boas memórias. Nosso espaço foi projetado para receber casais, famílias e viajantes que valorizam ambientes limpos, arejados e um atendimento sempre prestativo.",
      secondary_description:
        "Com localização estratégica próxima às praias e comércios locais, oferecemos acomodações versáteis — desde suítes aconchegantes até apartamentos equipados com cozinha — para que você aproveite seus dias com total liberdade e sossego.",
      image_url:
        "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80",
      highlights: [
        {
          badge: "Localização",
          title: "Clima Solar & Mar",
          description:
            "Fácil acesso às melhores praias, restaurantes e passeios da região.",
        },
        {
          badge: "Aconchego",
          title: "Suítes & Apartamentos",
          description:
            "Opções para casais e famílias, com ar-condicionado, Smart TV e Wi-Fi rápido.",
        },
        {
          badge: "Atendimento",
          title: "Hospitalidade Próxima",
          description:
            "Recepção atenciosa e curadoria digital com dicas exclusivas para hóspedes.",
        },
        {
          badge: "Praticidade",
          title: "Estrutura Completa",
          description:
            "Unidades com cozinha equipada, varanda com rede e roupas de cama e banho.",
        },
      ],
    },
    footer: {
      company_name: "Pousada Moradas do Gabriel",
      cnpj: "",
      check_in_out_info: "Check-in a partir das 14h00 • Check-out até as 12h00",
      copyright_note: "Todos os direitos reservados.",
    },
  },
};

export const DEFAULT_LANDING_METADATA: LandingPageMetadata =
  DEFAULT_BUSINESS_METADATA.landing!;

function isRecord(
  value: unknown,
): value is { [key: string]: Json | undefined } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Normaliza o objeto `metadata` vindo do banco para garantir que todos os campos
 * da interface `BusinessInfoMetadata` existam com tipagem segura.
 * Mantém retrocompatibilidade convertendo o campo antigo `wifi` em `wifi_networks` (array de 1 item).
 */
export function normalizeBusinessMetadata(
  raw: Json | null | undefined,
): BusinessInfoMetadata {
  if (!isRecord(raw)) {
    return structuredClone(DEFAULT_BUSINESS_METADATA);
  }

  const rawWifi = isRecord(raw.wifi) ? raw.wifi : null;
  const rawLocation = isRecord(raw.location) ? raw.location : {};
  const rawContacts = isRecord(raw.contacts) ? raw.contacts : {};
  const rawLanding = isRecord(raw.landing) ? raw.landing : {};
  const rawAbout = isRecord(rawLanding.about) ? rawLanding.about : {};
  const rawFooter = isRecord(rawLanding.footer) ? rawLanding.footer : {};

  let wifi_networks: WifiNetwork[];

  if (Array.isArray(raw.wifi_networks)) {
    wifi_networks = raw.wifi_networks
      .filter(isRecord)
      .map((item, idx) => ({
        id:
          typeof item.id === "string" && item.id.trim()
            ? item.id.trim()
            : `wifi-${idx + 1}`,
        label: typeof item.label === "string" ? item.label.trim() : "",
        ssid: typeof item.ssid === "string" ? item.ssid.trim() : "",
        password:
          typeof item.password === "string" ? item.password.trim() : "",
      }))
      .filter((item) => item.ssid !== "" || item.password !== "");
  } else if (rawWifi) {
    const legacySsid =
      typeof rawWifi.ssid === "string" ? rawWifi.ssid.trim() : "";
    const legacyPassword =
      typeof rawWifi.password === "string" ? rawWifi.password.trim() : "";
    const legacyLabel =
      typeof rawWifi.label === "string" ? rawWifi.label.trim() : "";

    if (legacySsid || legacyPassword) {
      wifi_networks = [
        {
          id: "wifi-1",
          label: legacyLabel,
          ssid: legacySsid,
          password: legacyPassword,
        },
      ];
    } else {
      wifi_networks = structuredClone(DEFAULT_BUSINESS_METADATA.wifi_networks);
    }
  } else {
    wifi_networks = structuredClone(DEFAULT_BUSINESS_METADATA.wifi_networks);
  }

  const primaryWifi = wifi_networks[0] ?? { ssid: "", password: "" };

  const rules: string[] = Array.isArray(raw.rules)
    ? raw.rules
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : DEFAULT_BUSINESS_METADATA.rules;

  const places_tips: PlaceTip[] = Array.isArray(raw.places_tips)
    ? raw.places_tips
        .filter(isRecord)
        .map((item) => {
          const rawImages = Array.isArray(item.images)
            ? item.images
                .filter((img): img is string => typeof img === "string")
                .map((img) => sanitizeHttpUrl(img, { allowRelative: false }))
                .filter(Boolean)
            : [];
          const singleImage =
            typeof item.image_url === "string"
              ? sanitizeHttpUrl(item.image_url, { allowRelative: false })
              : "";
          const images =
            rawImages.length > 0
              ? rawImages
              : singleImage
                ? [singleImage]
                : [];

          return {
            name: typeof item.name === "string" ? item.name : "",
            category:
              typeof item.category === "string" && item.category.trim()
                ? item.category.trim()
                : "Gastronomia",
            description:
              typeof item.description === "string" ? item.description : "",
            link:
              typeof item.link === "string"
                ? sanitizeHttpUrl(item.link, { allowRelative: false })
                : "",
            embed_url:
              typeof item.embed_url === "string"
                ? extractEmbedUrl(item.embed_url)
                : "",
            image_url: images[0] ?? "",
            images,
          };
        })
        .filter((item) => item.name.trim() !== "")
    : DEFAULT_BUSINESS_METADATA.places_tips;

  const hero_slides: HeroSlideItem[] =
    Array.isArray(rawLanding.hero_slides) && rawLanding.hero_slides.length > 0
      ? rawLanding.hero_slides
          .filter(isRecord)
          .map((item, idx) => ({
            id:
              typeof item.id === "string" && item.id.trim()
                ? item.id.trim()
                : `slide-${idx + 1}`,
            topic:
              typeof item.topic === "string" && item.topic.trim()
                ? item.topic.trim()
                : "Acomodações",
            title: typeof item.title === "string" ? item.title : "",
            subtitle: typeof item.subtitle === "string" ? item.subtitle : "",
            image_url:
              typeof item.image_url === "string"
                ? sanitizeHttpUrl(item.image_url, { allowRelative: false })
                : "",
            cta_label:
              typeof item.cta_label === "string" && item.cta_label.trim()
                ? item.cta_label.trim()
                : "Saiba Mais",
            cta_href:
              typeof item.cta_href === "string" && item.cta_href.trim()
                ? sanitizeHttpUrl(item.cta_href.trim()) || "#acomodacoes"
                : "#acomodacoes",
          }))
          .filter((item) => item.title.trim() !== "")
      : structuredClone(DEFAULT_LANDING_METADATA.hero_slides);

  const aboutHighlights: AboutHighlightItem[] =
    Array.isArray(rawAbout.highlights) && rawAbout.highlights.length > 0
      ? rawAbout.highlights
          .filter(isRecord)
          .map((item) => ({
            badge: typeof item.badge === "string" ? item.badge : "",
            title: typeof item.title === "string" ? item.title : "",
            description:
              typeof item.description === "string" ? item.description : "",
          }))
          .filter((item) => item.title.trim() !== "")
      : structuredClone(DEFAULT_LANDING_METADATA.about.highlights);

  const landing: LandingPageMetadata = {
    hero_slides,
    about: {
      badge:
        typeof rawAbout.badge === "string" && rawAbout.badge.trim()
          ? rawAbout.badge
          : DEFAULT_LANDING_METADATA.about.badge,
      title:
        typeof rawAbout.title === "string" && rawAbout.title.trim()
          ? rawAbout.title
          : DEFAULT_LANDING_METADATA.about.title,
      description:
        typeof rawAbout.description === "string" && rawAbout.description.trim()
          ? rawAbout.description
          : DEFAULT_LANDING_METADATA.about.description,
      secondary_description:
        typeof rawAbout.secondary_description === "string"
          ? rawAbout.secondary_description
          : DEFAULT_LANDING_METADATA.about.secondary_description,
      image_url:
        typeof rawAbout.image_url === "string" && rawAbout.image_url.trim()
          ? sanitizeHttpUrl(rawAbout.image_url, { allowRelative: false }) ||
            DEFAULT_LANDING_METADATA.about.image_url
          : DEFAULT_LANDING_METADATA.about.image_url,
      highlights: aboutHighlights,
    },
    footer: {
      company_name:
        typeof rawFooter.company_name === "string" &&
        rawFooter.company_name.trim()
          ? rawFooter.company_name
          : DEFAULT_LANDING_METADATA.footer.company_name,
      cnpj: typeof rawFooter.cnpj === "string" ? rawFooter.cnpj : "",
      check_in_out_info:
        typeof rawFooter.check_in_out_info === "string"
          ? rawFooter.check_in_out_info
          : DEFAULT_LANDING_METADATA.footer.check_in_out_info,
      copyright_note:
        typeof rawFooter.copyright_note === "string" &&
        rawFooter.copyright_note.trim()
          ? rawFooter.copyright_note
          : DEFAULT_LANDING_METADATA.footer.copyright_note,
    },
  };

  return {
    wifi_networks,
    wifi: {
      ssid: primaryWifi.ssid,
      password: primaryWifi.password,
    },
    location: {
      address:
        typeof rawLocation.address === "string"
          ? rawLocation.address
          : DEFAULT_BUSINESS_METADATA.location.address,
      maps_url:
        typeof rawLocation.maps_url === "string"
          ? sanitizeHttpUrl(rawLocation.maps_url, { allowRelative: false })
          : DEFAULT_BUSINESS_METADATA.location.maps_url,
      waze_url:
        typeof rawLocation.waze_url === "string"
          ? sanitizeHttpUrl(rawLocation.waze_url, { allowRelative: false })
          : DEFAULT_BUSINESS_METADATA.location.waze_url,
      embed_url:
        typeof rawLocation.embed_url === "string"
          ? extractEmbedUrl(rawLocation.embed_url)
          : DEFAULT_BUSINESS_METADATA.location.embed_url,
      instructions:
        typeof rawLocation.instructions === "string"
          ? rawLocation.instructions
          : DEFAULT_BUSINESS_METADATA.location.instructions,
    },
    rules,
    places_tips,
    contacts: {
      whatsapp:
        typeof rawContacts.whatsapp === "string"
          ? extractPhoneDigits(rawContacts.whatsapp)
          : DEFAULT_BUSINESS_METADATA.contacts.whatsapp,
      phone:
        typeof rawContacts.phone === "string"
          ? extractPhoneDigits(rawContacts.phone)
          : DEFAULT_BUSINESS_METADATA.contacts.phone,
      instagram:
        typeof rawContacts.instagram === "string"
          ? extractInstagramHandle(rawContacts.instagram)
          : DEFAULT_BUSINESS_METADATA.contacts.instagram,
    },
    landing,
  };
}

/**
 * Busca as informações do Guia do Hóspede na tabela `business_info`.
 * Caso ainda não exista registro no banco, retorna um objeto padrão seguro.
 */
export async function getBusinessInfo(): Promise<TypedBusinessInfo> {
  const { data, error } = await supabase
    .from("business_info")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(
      "[businessInfoService] Erro ao buscar business_info:",
      error.message,
    );
    throw error;
  }

  if (!data || data.length === 0) {
    return {
      id: "",
      tab_title: "Guia do Hóspede",
      content:
        "Seja muito bem-vindo! Aqui você encontra tudo para aproveitar sua estadia com tranquilidade.",
      updated_at: new Date().toISOString(),
      metadata: structuredClone(DEFAULT_BUSINESS_METADATA),
    };
  }

  // Se houver mais de uma linha legada, consolida os metadados priorizando o registro mais recente
  const primaryRow = data[0];
  const mergedRawMetadata: Record<string, unknown> = {};

  for (let i = data.length - 1; i >= 0; i--) {
    const rowMeta = data[i].metadata;
    if (isRecord(rowMeta)) {
      Object.assign(mergedRawMetadata, rowMeta);
    }
  }

  return {
    ...primaryRow,
    tab_title: primaryRow.tab_title || "Guia do Hóspede",
    content:
      primaryRow.content ||
      "Seja muito bem-vindo! Aqui você encontra tudo para aproveitar sua estadia com tranquilidade.",
    metadata: normalizeBusinessMetadata(mergedRawMetadata as Json),
  };
}

export interface SaveBusinessInfoInput {
  id?: string;
  tab_title?: string;
  content?: string;
  metadata: BusinessInfoMetadata;
}

/**
 * Salva ou atualiza o Guia do Hóspede na tabela `business_info`.
 * Extrai automaticamente o atributo `src` caso o usuário tenha colado uma tag `<iframe>`
 * no campo `location.embed_url`.
 */
export async function saveBusinessInfo(
  input: SaveBusinessInfoInput,
): Promise<TypedBusinessInfo> {
  const rawNetworks = Array.isArray(input.metadata.wifi_networks)
    ? input.metadata.wifi_networks
    : input.metadata.wifi
      ? [
          {
            id: "wifi-1",
            label: "",
            ssid: input.metadata.wifi.ssid,
            password: input.metadata.wifi.password,
          },
        ]
      : [];

  const sanitizedWifiNetworks: WifiNetwork[] = rawNetworks
    .map((net, idx) => ({
      id: net.id?.trim() || `wifi-${idx + 1}`,
      label: (net.label ?? "").trim(),
      ssid: net.ssid.trim(),
      password: net.password.trim(),
    }))
    .filter((net) => net.ssid !== "" || net.password !== "");

  const primaryWifi = sanitizedWifiNetworks[0] ?? {
    ssid: "",
    password: "",
  };

  const sanitizedMetadata: BusinessInfoMetadata = {
    wifi_networks: sanitizedWifiNetworks,
    wifi: {
      ssid: primaryWifi.ssid,
      password: primaryWifi.password,
    },
    location: {
      address: input.metadata.location.address.trim(),
      maps_url: sanitizeHttpUrl(input.metadata.location.maps_url, {
        allowRelative: false,
      }),
      waze_url: sanitizeHttpUrl(input.metadata.location.waze_url, {
        allowRelative: false,
      }),
      embed_url: extractEmbedUrl(input.metadata.location.embed_url),
      instructions: input.metadata.location.instructions.trim(),
    },
    rules: input.metadata.rules.map((r) => r.trim()).filter(Boolean),
    places_tips: input.metadata.places_tips
      .map((p) => {
        const cleanedImages = Array.isArray(p.images)
          ? p.images
              .map((img) => sanitizeHttpUrl(img, { allowRelative: false }))
              .filter(Boolean)
          : p.image_url?.trim()
            ? [
                sanitizeHttpUrl(p.image_url, { allowRelative: false }),
              ].filter(Boolean)
            : [];
        return {
          name: p.name.trim(),
          category: p.category.trim() || "Gastronomia",
          description: p.description.trim(),
          link: sanitizeHttpUrl(p.link, { allowRelative: false }),
          embed_url: extractEmbedUrl(p.embed_url ?? ""),
          image_url: cleanedImages[0] ?? "",
          images: cleanedImages,
        };
      })
      .filter((p) => p.name !== ""),
    contacts: {
      whatsapp: extractPhoneDigits(input.metadata.contacts.whatsapp),
      phone: extractPhoneDigits(input.metadata.contacts.phone),
      instagram: extractInstagramHandle(input.metadata.contacts.instagram),
    },
    landing: input.metadata.landing ?? DEFAULT_LANDING_METADATA,
  };

  const tabTitle = (input.tab_title || "Guia do Hóspede").trim();
  const content = (
    input.content ||
    "Seja muito bem-vindo! Aqui você encontra tudo para aproveitar sua estadia com tranquilidade."
  ).trim();
  const nowIso = new Date().toISOString();

  let targetId = input.id;

  if (!targetId) {
    const { data: existing } = await supabase
      .from("business_info")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      targetId = existing[0].id;
    }
  }

  if (targetId) {
    const { data, error } = await supabase
      .from("business_info")
      .update({
        tab_title: tabTitle,
        content,
        metadata: sanitizedMetadata as unknown as Json,
        updated_at: nowIso,
      })
      .eq("id", targetId)
      .select()
      .single();

    if (error) {
      console.error(
        "[businessInfoService] Erro ao atualizar business_info:",
        error.message,
      );
      throw error;
    }

    return {
      ...data,
      metadata: normalizeBusinessMetadata(data.metadata),
    };
  }

  const { data, error } = await supabase
    .from("business_info")
    .insert({
      tab_title: tabTitle,
      content,
      metadata: sanitizedMetadata as unknown as Json,
      updated_at: nowIso,
    })
    .select()
    .single();

  if (error) {
    console.error(
      "[businessInfoService] Erro ao criar business_info:",
      error.message,
    );
    throw error;
  }

  return {
    ...data,
    metadata: normalizeBusinessMetadata(data.metadata),
  };
}
