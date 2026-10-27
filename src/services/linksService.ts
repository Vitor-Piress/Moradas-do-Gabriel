import type { LinkInsert, LinkRow, LinkUpdate } from "../@types/database.types";
import { supabase } from "../lib/supabase";
import { sanitizeHttpUrl } from "../utils/embedUrl";

/**
 * Busca apenas os links ativos para exibição na Página Pública,
 * ordenados por `position` crescente.
 */
export async function getActiveLinks(): Promise<LinkRow[]> {
  const { data, error } = await supabase
    .from("links")
    .select("*")
    .eq("is_active", true)
    .order("position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[linksService] Erro ao buscar links ativos:", error.message);
    throw error;
  }

  return (data ?? []).map((row) => ({
    ...row,
    url: sanitizeHttpUrl(row.url, { allowMailtoTel: true }) || "#",
  }));
}

/**
 * Busca todos os links (ativos e inativos) para gerenciamento no Painel Admin,
 * ordenados por `position` crescente.
 */
export async function getAllLinks(): Promise<LinkRow[]> {
  const { data, error } = await supabase
    .from("links")
    .select("*")
    .order("position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error(
      "[linksService] Erro ao buscar todos os links:",
      error.message,
    );
    throw error;
  }

  return data ?? [];
}

/**
 * Cria um novo link. Se `position` não for informada, define automaticamente como o último.
 */
export async function createLink(payload: LinkInsert): Promise<LinkRow> {
  let nextPosition = payload.position;

  if (nextPosition === undefined || nextPosition === null) {
    const { data: existing } = await supabase
      .from("links")
      .select("position")
      .order("position", { ascending: false })
      .limit(1);

    const maxPos = existing?.[0]?.position ?? 0;
    nextPosition = maxPos + 1;
  }

  const safeUrl = sanitizeHttpUrl(payload.url, { allowMailtoTel: true });
  if (!safeUrl) {
    throw new Error(
      "URL inválida. Utilize um endereço iniciando com https://, http://, mailto:, tel: ou caminho relativo.",
    );
  }

  const { data, error } = await supabase
    .from("links")
    .insert({
      title: payload.title.trim().slice(0, 150),
      url: safeUrl,
      icon: payload.icon ?? "link",
      is_active: payload.is_active ?? true,
      position: nextPosition,
    })
    .select()
    .single();

  if (error) {
    console.error("[linksService] Erro ao criar link:", error.message);
    throw error;
  }

  return data;
}

/**
 * Atualiza os dados de um link existente.
 */
export async function updateLink(
  id: string,
  updates: LinkUpdate,
): Promise<LinkRow> {
  let safeUrl: string | undefined;
  if (updates.url !== undefined) {
    safeUrl = sanitizeHttpUrl(updates.url, { allowMailtoTel: true });
    if (!safeUrl) {
      throw new Error(
        "URL inválida. Utilize um endereço iniciando com https://, http://, mailto:, tel: ou caminho relativo.",
      );
    }
  }

  const cleanUpdates: LinkUpdate = {
    ...updates,
    ...(updates.title !== undefined
      ? { title: updates.title.trim().slice(0, 150) }
      : {}),
    ...(safeUrl !== undefined ? { url: safeUrl } : {}),
  };

  const { data, error } = await supabase
    .from("links")
    .update(cleanUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[linksService] Erro ao atualizar link:", error.message);
    throw error;
  }

  return data;
}

/**
 * Alterna o status ativo/inativo de um link.
 */
export async function toggleLinkStatus(
  id: string,
  isActive: boolean,
): Promise<LinkRow> {
  return updateLink(id, { is_active: isActive });
}

/**
 * Exclui um link pelo ID.
 */
export async function deleteLink(id: string): Promise<void> {
  const { error } = await supabase.from("links").delete().eq("id", id);

  if (error) {
    console.error("[linksService] Erro ao excluir link:", error.message);
    throw error;
  }
}

/**
 * Atualiza a ordenação (`position`) de múltiplos links.
 */
export async function reorderLinks(
  orderedItems: Array<{ id: string; position: number }>,
): Promise<void> {
  const updates = orderedItems.map(({ id, position }) =>
    supabase.from("links").update({ position }).eq("id", id),
  );

  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error)?.error;

  if (firstError) {
    console.error(
      "[linksService] Erro ao reordenar links:",
      firstError.message,
    );
    throw firstError;
  }
}
