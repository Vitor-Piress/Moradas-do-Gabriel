import { supabase } from "../lib/supabase";
import { sanitizeHttpUrl } from "../utils/embedUrl";

/**
 * Serviço Seguro de Upload para Cloudflare R2 Object Storage com compressão automática para WebP.
 *
 * Arquitetura de Segurança:
 * - As credenciais do Cloudflare R2 (`R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`,
 *   `R2_SECRET_ACCESS_KEY`) NUNCA ficam no frontend (`VITE_*`), evitando exposição no bundle público.
 * - O upload passa pela Supabase Edge Function `r2-upload` (em `supabase/functions/r2-upload/index.ts`)
 *   ou por um Worker autenticado definido em `VITE_R2_UPLOAD_ENDPOINT`.
 * - Suporta imagens JPEG, PNG, WebP e fotos de iPhone em HEIC/HEIF (decodificadas sob demanda
 *   no navegador e sempre convertidas para `.webp` antes do envio ao R2).
 * - Arquivos SVG ou executáveis são bloqueados para prevenir Stored XSS.
 * - A conversão para `.webp` via `<canvas>` no navegador também remove metadados EXIF/GPS das fotos.
 */

const ALLOWED_INPUT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

const MAX_INPUT_FILE_BYTES = 20 * 1024 * 1024; // 20 MB antes da compressão (suporta fotos HEIC de alta resolução)
const MAX_WEBP_OUTPUT_BYTES = 5 * 1024 * 1024; // 5 MB após compressão WebP

export const ALLOWED_R2_FOLDERS = [
  "acomodacoes",
  "hero",
  "sobre",
  "lugares",
] as const;

export type R2UploadFolder = (typeof ALLOWED_R2_FOLDERS)[number];

function isHeicFile(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (
    mime === "image/heic" ||
    mime === "image/heif" ||
    mime === "image/heic-sequence" ||
    mime === "image/heif-sequence"
  ) {
    return true;
  }
  return /\.(heic|heif)$/i.test(file.name);
}

function isAllowedImageFile(file: File): boolean {
  if (ALLOWED_INPUT_MIME_TYPES.has(file.type.toLowerCase())) {
    return true;
  }
  // No Linux/Windows, o navegador frequentemente deixa `file.type` vazio para arquivos .heic/.heif
  if (isHeicFile(file)) {
    return true;
  }
  return false;
}

function renderBlobToWebP(
  sourceBlob: Blob,
  maxWidth: number,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(sourceBlob);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      if (width <= 0 || height <= 0) {
        reject(new Error("Dimensões de imagem inválidas."));
        return;
      }

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(
          new Error("Não foi possível inicializar o processador de imagem."),
        );
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Falha ao converter a imagem para WebP."));
            return;
          }
          if (blob.size > MAX_WEBP_OUTPUT_BYTES) {
            reject(
              new Error(
                "A imagem comprimida excede o limite de 5 MB. Tente uma foto menor.",
              ),
            );
            return;
          }
          resolve(blob);
        },
        "image/webp",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Arquivo de imagem inválido ou corrompido."));
    };

    img.src = objectUrl;
  });
}

/**
 * Valida e converte a imagem no navegador para `.webp` (removendo metadados EXIF e reduzindo tamanho).
 * Caso o arquivo seja `.heic` / `.heif`, decodifica sob demanda via `heic2any` antes de gerar o `.webp`.
 * Arquivos SVG são explicitamente bloqueados para prevenir Stored XSS.
 */
export async function convertImageToWebP(
  file: File,
  maxWidth = 1600,
  quality = 0.84,
): Promise<Blob> {
  if (!isAllowedImageFile(file)) {
    throw new Error(
      "Formato de imagem não permitido. Envie apenas fotos em JPEG, PNG, WebP ou HEIC/HEIF.",
    );
  }

  if (file.size <= 0 || file.size > MAX_INPUT_FILE_BYTES) {
    throw new Error("A imagem selecionada excede o limite máximo de 20 MB.");
  }

  let sourceBlob: Blob = file;

  if (isHeicFile(file)) {
    try {
      const { default: heic2any } = await import("heic2any");
      const converted = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.92,
      });
      sourceBlob = Array.isArray(converted) ? converted[0] : converted;
    } catch {
      throw new Error(
        "Não foi possível decodificar a foto HEIC/HEIF. Verifique se o arquivo não está corrompido.",
      );
    }
  }

  return renderBlobToWebP(sourceBlob, maxWidth, quality);
}

/**
 * Envia a imagem convertida em WebP para o Cloudflare R2 através da Edge Function
 * autenticada (`r2-upload`), garantindo que nenhuma chave secreta fique exposta no cliente.
 */
export async function uploadImageToR2(
  file: File,
  folder: R2UploadFolder = "acomodacoes",
): Promise<string> {
  if (!ALLOWED_R2_FOLDERS.includes(folder)) {
    throw new Error("Pasta de destino inválida.");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Sessão expirada. Faça login novamente para enviar imagens.");
  }

  const webpBlob = await convertImageToWebP(file);
  const safeFile = new File([webpBlob], "upload.webp", { type: "image/webp" });

  const formData = new FormData();
  formData.append("folder", folder);
  formData.append("file", safeFile);

  const supabaseUrl = (
    (import.meta.env.VITE_SUPABASE_URL as string) || ""
  ).replace(/\/+$/, "");
  const customEndpoint = (
    (import.meta.env.VITE_R2_UPLOAD_ENDPOINT as string) || ""
  ).trim();

  const endpointUrl = sanitizeHttpUrl(
    customEndpoint || `${supabaseUrl}/functions/v1/r2-upload`,
    { allowRelative: false },
  );

  if (!endpointUrl) {
    throw new Error("Endpoint de upload não configurado.");
  }

  let response: Response;
  try {
    response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    });
  } catch {
    throw new Error(
      "Falha de conexão (CORS/Rede) ao acessar a Edge Function 'r2-upload'. Certifique-se de que ela foi publicada no Supabase com: npx supabase functions deploy r2-upload --no-verify-jwt",
    );
  }

  const payload = (await response.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      payload.error ||
        payload.message ||
        `Falha no upload da imagem (HTTP ${response.status}).`,
    );
  }

  const cleanUrl = sanitizeHttpUrl(payload.url || "", { allowRelative: false });
  if (!cleanUrl) {
    throw new Error(
      payload.error || "Não foi possível obter a URL pública da imagem enviada.",
    );
  }

  return cleanUrl;
}
