const ALLOWED_EMBED_HOSTS = new Set([
  "www.google.com",
  "maps.google.com",
  "www.google.com.br",
  "maps.google.com.br",
]);

/**
 * Valida e sanitiza URLs destinadas a atributos `href` ou `src`, bloqueando
 * esquemas executáveis (`javascript:`, `data:`, `vbscript:`, `file:`, etc.).
 */
export function sanitizeHttpUrl(
  input: string,
  options: { allowRelative?: boolean; allowMailtoTel?: boolean } = {},
): string {
  const trimmed = (input || "").trim();
  if (!trimmed) return "";

  // Permite âncoras (#secao) ou caminhos internos (/rota) quando habilitado
  if (options.allowRelative && /^(#[a-zA-Z0-9_-]*|\/[a-zA-Z0-9/_-]*)$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();

    if (protocol === "https:" || protocol === "http:") {
      return parsed.toString();
    }

    if (
      options.allowMailtoTel &&
      (protocol === "mailto:" || protocol === "tel:")
    ) {
      return trimmed;
    }

    return "";
  } catch {
    return "";
  }
}

/**
 * Extrai apenas a URL do atributo `src` caso o usuário cole a tag `<iframe ...>`
 * completa do Google Maps Embed, e valida que o domínio pertence ao Google Maps
 * via HTTPS (prevenindo injeção de iframes arbitrários ou `javascript:`).
 */
export function extractEmbedUrl(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();

  let candidate = trimmed;

  // Verifica se contém uma tag <iframe ... src="..."> ou src='...'
  const srcMatch = trimmed.match(/<iframe[^>]*\ssrc=["']([^"']+)["'][^>]*>/i);
  if (srcMatch && srcMatch[1]) {
    candidate = srcMatch[1].replace(/&amp;/g, "&").trim();
  } else {
    // Fallback caso tenha apenas src="..." avulso
    const fallbackMatch = trimmed.match(/src=["']([^"']+)["']/i);
    if (fallbackMatch && fallbackMatch[1]) {
      candidate = fallbackMatch[1].replace(/&amp;/g, "&").trim();
    }
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:") {
      return "";
    }
    if (!ALLOWED_EMBED_HOSTS.has(parsed.hostname.toLowerCase())) {
      return "";
    }
    if (!parsed.pathname.startsWith("/maps")) {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

/**
 * Verifica se o input continha uma tag <iframe> antes da extração
 */
export function containsIframeTag(input: string): boolean {
  return /<iframe/i.test(input);
}

/**
 * Extrai apenas os dígitos locais do telefone/WhatsApp (máx. 11 dígitos: DDD + 9 dígitos).
 * Caso venha com o DDI 55 na frente (12 ou 13 dígitos), remove o prefixo 55 para padronizar.
 */
export function extractPhoneDigits(input: string): string {
  let digits = (input || "").replace(/\D/g, "");
  if (digits.length > 11 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 11);
}

/**
 * Aplica a máscara visual `(DD) 0 0000-0000` para exibição nos inputs e na página pública.
 */
export function formatPhoneMask(input: string): string {
  const digits = extractPhoneDigits(input);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Extrai apenas o texto do usuário do Instagram (sem `@` e sem URL), limitado a 30 caracteres.
 */
export function extractInstagramHandle(input: string): string {
  let clean = (input || "").trim();
  clean = clean.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
  clean = clean.split(/[/?#]/)[0] || "";
  clean = clean.replace(/^@+/, "").replace(/[^a-zA-Z0-9._]/g, "");
  return clean.slice(0, 30);
}

/**
 * Aplica a máscara `@texto` para exibição no input e na página pública.
 */
export function formatInstagramMask(input: string): string {
  if (input === "@") return "@";
  const handle = extractInstagramHandle(input);
  return handle ? `@${handle}` : "";
}

/**
 * Formata um número de telefone/WhatsApp ou link para URL oficial wa.me
 */
export function formatWhatsAppUrl(
  whatsappInput: string,
  defaultMessage = "Olá! Estou na Central do Hóspede da Pousada Moradas do Gabriel e gostaria de mais informações.",
): string {
  const trimmed = (whatsappInput || "").trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return sanitizeHttpUrl(trimmed);
  }

  const digits = extractPhoneDigits(trimmed);
  if (!digits) return "";

  const normalized = digits.startsWith("55") ? digits : `55${digits}`;

  return `https://wa.me/${normalized}?text=${encodeURIComponent(defaultMessage)}`;
}

/**
 * Formata um @usuario ou link do Instagram para URL completa
 */
export function formatInstagramUrl(instagramInput: string): string {
  const trimmed = (instagramInput || "").trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return sanitizeHttpUrl(trimmed);
  }

  const handle = extractInstagramHandle(trimmed);
  if (!handle) return "";
  return `https://instagram.com/${handle}`;
}
