import type {
  AccommodationRow,
  AccommodationUpdate,
  BedConfigItem,
  Json,
  TypedAccommodation,
} from "../@types/database.types";
import { supabase } from "../lib/supabase";
import { sanitizeHttpUrl } from "../utils/embedUrl";

export const DEFAULT_ACCOMMODATIONS: TypedAccommodation[] = [
  {
    id: "demo-suite-casal",
    title: "Suíte Casal Brisa do Mar",
    slug: "suite-casal-brisa-do-mar",
    short_description:
      "Ideal para casais que buscam descanso e privacidade a poucos minutos da praia, com ambiente climatizado e varanda.",
    full_description:
      "A Suíte Casal Brisa do Mar foi planejada para proporcionar dias tranquilos e acolhedores. Conta com cama Queen Size, ar-condicionado split silencioso, Smart TV, frigobar e varanda privativa com rede de descanso para curtir a brisa costeira após um dia de praia.",
    cover_image:
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80",
    ],
    max_guests: 2,
    beds: [{ count: 1, type: "Cama Casal Queen" }],
    has_kitchen: false,
    has_kitchen_utensils: true,
    has_tv: true,
    has_ac: true,
    has_wifi: true,
    has_balcony: true,
    has_private_bathroom: true,
    has_bed_bath_linen: true,
    is_pet_friendly: false,
    extra_amenities: [],
    is_active: true,
    position: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-apto-familia",
    title: "Apartamento Família Sol Nascente",
    slug: "apartamento-familia-sol-nascente",
    short_description:
      "Espaço amplo com cozinha equipada, ideal para famílias ou pequenos grupos que desejam conforto e autonomia durante a estadia.",
    full_description:
      "O Apartamento Família Sol Nascente acomoda até 4 pessoas com total comodidade. Possui cozinha compacta equipada com fogão, geladeira e utensílios básicos, além de quarto climatizado, Wi-Fi de alta velocidade, Smart TV e espaço arejado para toda a família.",
    cover_image:
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
    ],
    max_guests: 4,
    beds: [
      { count: 1, type: "Cama de Casal Padrão" },
      { count: 2, type: "Cama de Solteiro" },
    ],
    has_kitchen: true,
    has_kitchen_utensils: true,
    has_tv: true,
    has_ac: true,
    has_wifi: true,
    has_balcony: true,
    has_private_bathroom: true,
    has_bed_bath_linen: true,
    is_pet_friendly: true,
    extra_amenities: [],
    is_active: true,
    position: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-estudio-gabriel",
    title: "Estúdio Conforto do Gabriel",
    slug: "estudio-conforto-do-gabriel",
    short_description:
      "Praticidade e charme para até 3 hóspedes, contando com copa de apoio, ar-condicionado e excelente iluminação natural.",
    full_description:
      "Perfeito para casais com criança ou amigos, o Estúdio Conforto do Gabriel combina praticidade e aconchego. Dispõe de cama de casal e cama auxiliar de solteiro, frigobar, utensílios de apoio, banheiro privativo amplo, TV e roupas de cama e banho inclusas.",
    cover_image:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80",
    ],
    max_guests: 3,
    beds: [
      { count: 1, type: "Cama de Casal Padrão" },
      { count: 1, type: "Cama de Solteiro" },
    ],
    has_kitchen: false,
    has_kitchen_utensils: true,
    has_tv: true,
    has_ac: true,
    has_wifi: true,
    has_balcony: false,
    has_private_bathroom: true,
    has_bed_bath_linen: true,
    is_pet_friendly: false,
    extra_amenities: [],
    is_active: true,
    position: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function slugifyAccommodationTitle(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeAccommodationRow(row: AccommodationRow): TypedAccommodation {
  const beds: BedConfigItem[] = Array.isArray(row.beds)
    ? row.beds
        .filter(
          (b): b is { [key: string]: Json | undefined } =>
            typeof b === "object" && b !== null && !Array.isArray(b),
        )
        .map((b) => ({
          count: Math.max(1, Number(b.count) || 1),
          type: typeof b.type === "string" ? b.type.trim() : "Cama de Casal",
        }))
        .filter((b) => b.type !== "")
    : [];

  const gallery: string[] = Array.isArray(row.gallery)
    ? row.gallery
        .filter((g): g is string => typeof g === "string")
        .map((g) => sanitizeHttpUrl(g, { allowRelative: false }))
        .filter(Boolean)
    : [];

  const extra_amenities: string[] = Array.isArray(row.extra_amenities)
    ? row.extra_amenities
        .filter((a): a is string => typeof a === "string")
        .map((a) => a.trim())
        .filter(Boolean)
    : [];

  return {
    ...row,
    cover_image: sanitizeHttpUrl(row.cover_image, { allowRelative: false }),
    beds,
    gallery,
    extra_amenities,
  };
}

export async function getActiveAccommodations(): Promise<TypedAccommodation[]> {
  const { data, error } = await supabase
    .from("accommodations")
    .select("*")
    .eq("is_active", true)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.warn(
      "[accommodationsService] Usando dados padrão de acomodações (verifique se a migration já foi aplicada):",
      error.message,
    );
    return structuredClone(DEFAULT_ACCOMMODATIONS);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map(normalizeAccommodationRow);
}

export async function getAllAccommodations(): Promise<TypedAccommodation[]> {
  const { data, error } = await supabase
    .from("accommodations")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.warn(
      "[accommodationsService] Erro ao listar todas as acomodações:",
      error.message,
    );
    return structuredClone(DEFAULT_ACCOMMODATIONS);
  }

  return (data ?? []).map(normalizeAccommodationRow);
}

export async function getAccommodationBySlug(
  slug: string,
): Promise<TypedAccommodation | null> {
  const { data, error } = await supabase
    .from("accommodations")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    const fallback = DEFAULT_ACCOMMODATIONS.find((a) => a.slug === slug);
    return fallback ? structuredClone(fallback) : null;
  }

  if (!data) {
    const fallback = DEFAULT_ACCOMMODATIONS.find((a) => a.slug === slug);
    return fallback ? structuredClone(fallback) : null;
  }

  return normalizeAccommodationRow(data);
}

export interface SaveAccommodationPayload {
  title: string;
  slug?: string;
  short_description: string;
  full_description: string;
  cover_image: string;
  gallery: string[];
  max_guests: number;
  beds: BedConfigItem[];
  has_kitchen: boolean;
  has_kitchen_utensils: boolean;
  has_tv: boolean;
  has_ac: boolean;
  has_wifi: boolean;
  has_balcony: boolean;
  has_private_bathroom: boolean;
  has_bed_bath_linen: boolean;
  is_pet_friendly: boolean;
  extra_amenities?: string[];
  is_active?: boolean;
  position?: number;
}

export async function createAccommodation(
  payload: SaveAccommodationPayload,
): Promise<TypedAccommodation> {
  const baseSlug =
    payload.slug?.trim() || slugifyAccommodationTitle(payload.title);

  let nextPos = payload.position;
  if (nextPos === undefined) {
    const { data: existing } = await supabase
      .from("accommodations")
      .select("position")
      .order("position", { ascending: false })
      .limit(1);
    nextPos = (existing?.[0]?.position ?? 0) + 1;
  }

  const { data, error } = await supabase
    .from("accommodations")
    .insert({
      title: payload.title.trim(),
      slug: baseSlug,
      short_description: payload.short_description.trim(),
      full_description: payload.full_description.trim(),
      cover_image: sanitizeHttpUrl(payload.cover_image, {
        allowRelative: false,
      }),
      gallery: payload.gallery
        .map((g) => sanitizeHttpUrl(g, { allowRelative: false }))
        .filter(Boolean) as unknown as Json,
      max_guests: Math.max(1, Number(payload.max_guests) || 2),
      beds: payload.beds as unknown as Json,
      has_kitchen: payload.has_kitchen,
      has_kitchen_utensils: payload.has_kitchen_utensils,
      has_tv: payload.has_tv,
      has_ac: payload.has_ac,
      has_wifi: payload.has_wifi,
      has_balcony: payload.has_balcony,
      has_private_bathroom: payload.has_private_bathroom,
      has_bed_bath_linen: payload.has_bed_bath_linen,
      is_pet_friendly: payload.is_pet_friendly,
      extra_amenities: (payload.extra_amenities ?? []) as unknown as Json,
      is_active: payload.is_active ?? true,
      position: nextPos,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error(
      "[accommodationsService] Erro ao criar acomodação:",
      error.message,
    );
    throw error;
  }

  return normalizeAccommodationRow(data);
}

export async function updateAccommodation(
  id: string,
  payload: Partial<SaveAccommodationPayload>,
): Promise<TypedAccommodation> {
  const updateData: AccommodationUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (payload.title !== undefined) updateData.title = payload.title.trim();
  if (payload.slug !== undefined) {
    updateData.slug =
      payload.slug.trim() ||
      slugifyAccommodationTitle(payload.title || "acomodacao");
  }
  if (payload.short_description !== undefined) {
    updateData.short_description = payload.short_description.trim();
  }
  if (payload.full_description !== undefined) {
    updateData.full_description = payload.full_description.trim();
  }
  if (payload.cover_image !== undefined) {
    updateData.cover_image = sanitizeHttpUrl(payload.cover_image, {
      allowRelative: false,
    });
  }
  if (payload.gallery !== undefined) {
    updateData.gallery = payload.gallery
      .map((g) => sanitizeHttpUrl(g, { allowRelative: false }))
      .filter(Boolean) as unknown as Json;
  }
  if (payload.max_guests !== undefined) {
    updateData.max_guests = Math.max(1, Number(payload.max_guests) || 1);
  }
  if (payload.beds !== undefined) updateData.beds = payload.beds as unknown as Json;
  if (payload.has_kitchen !== undefined) {
    updateData.has_kitchen = payload.has_kitchen;
  }
  if (payload.has_kitchen_utensils !== undefined) {
    updateData.has_kitchen_utensils = payload.has_kitchen_utensils;
  }
  if (payload.has_tv !== undefined) updateData.has_tv = payload.has_tv;
  if (payload.has_ac !== undefined) updateData.has_ac = payload.has_ac;
  if (payload.has_wifi !== undefined) updateData.has_wifi = payload.has_wifi;
  if (payload.has_balcony !== undefined) {
    updateData.has_balcony = payload.has_balcony;
  }
  if (payload.has_private_bathroom !== undefined) {
    updateData.has_private_bathroom = payload.has_private_bathroom;
  }
  if (payload.has_bed_bath_linen !== undefined) {
    updateData.has_bed_bath_linen = payload.has_bed_bath_linen;
  }
  if (payload.is_pet_friendly !== undefined) {
    updateData.is_pet_friendly = payload.is_pet_friendly;
  }
  if (payload.extra_amenities !== undefined) {
    updateData.extra_amenities = payload.extra_amenities as unknown as Json;
  }
  if (payload.is_active !== undefined) updateData.is_active = payload.is_active;
  if (payload.position !== undefined) updateData.position = payload.position;

  const { data, error } = await supabase
    .from("accommodations")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(
      "[accommodationsService] Erro ao atualizar acomodação:",
      error.message,
    );
    throw error;
  }

  return normalizeAccommodationRow(data);
}

export async function deleteAccommodation(id: string): Promise<void> {
  const { error } = await supabase.from("accommodations").delete().eq("id", id);

  if (error) {
    console.error(
      "[accommodationsService] Erro ao excluir acomodação:",
      error.message,
    );
    throw error;
  }
}
