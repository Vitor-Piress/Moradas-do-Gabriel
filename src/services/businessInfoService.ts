import type {
  BusinessInfoMetadata,
  Json,
  PlaceTip,
  TypedBusinessInfo,
  WifiNetwork,
} from "../@types/database.types";
import { supabase } from "../lib/supabase";
import {
  extractEmbedUrl,
  extractInstagramHandle,
  extractPhoneDigits,
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
};

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
        .map((item) => ({
          name: typeof item.name === "string" ? item.name : "",
          category:
            typeof item.category === "string" && item.category.trim()
              ? item.category.trim()
              : "Gastronomia",
          description:
            typeof item.description === "string" ? item.description : "",
          link: typeof item.link === "string" ? item.link : "",
        }))
        .filter((item) => item.name.trim() !== "")
    : DEFAULT_BUSINESS_METADATA.places_tips;

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
          ? rawLocation.maps_url
          : DEFAULT_BUSINESS_METADATA.location.maps_url,
      waze_url:
        typeof rawLocation.waze_url === "string"
          ? rawLocation.waze_url
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
      maps_url: input.metadata.location.maps_url.trim(),
      waze_url: input.metadata.location.waze_url.trim(),
      embed_url: extractEmbedUrl(input.metadata.location.embed_url),
      instructions: input.metadata.location.instructions.trim(),
    },
    rules: input.metadata.rules.map((r) => r.trim()).filter(Boolean),
    places_tips: input.metadata.places_tips
      .map((p) => ({
        name: p.name.trim(),
        category: p.category.trim() || "Gastronomia",
        description: p.description.trim(),
        link: p.link.trim(),
      }))
      .filter((p) => p.name !== ""),
    contacts: {
      whatsapp: extractPhoneDigits(input.metadata.contacts.whatsapp),
      phone: extractPhoneDigits(input.metadata.contacts.phone),
      instagram: extractInstagramHandle(input.metadata.contacts.instagram),
    },
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
