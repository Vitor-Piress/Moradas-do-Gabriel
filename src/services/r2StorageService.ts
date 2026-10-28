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
 * - Suporta imagens JPEG, PNG, WebP e fotos de iPhone em HEIC/HEIF (decodificadas via libheif 1.23+
 *   no navegador e sempre convertidas para `.webp` antes do envio ao R2).
 * - Arquivos SVG ou executáveis são bloqueados para prevenir Stored XSS.
 * - A conversão para `.webp` via `<canvas>` no navegador também remove metadados EXIF/GPS das fotos.
 */

const ALLOWED_INPUT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

const MAX_INPUT_FILE_BYTES = 25 * 1024 * 1024; // 25 MB antes da compressão (suporta fotos HEIC 48MP de iPhone)
const MAX_WEBP_OUTPUT_BYTES = 5 * 1024 * 1024; // 5 MB após compressão WebP

export const ALLOWED_R2_FOLDERS = [
  "acomodacoes",
  "hero",
  "sobre",
  "lugares",
] as const;

export type R2UploadFolder = (typeof ALLOWED_R2_FOLDERS)[number];

function hasHeicExtensionOrMime(file: File): boolean {
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

/**
 * Inspeciona os primeiros bytes do arquivo para identificar se é um container ISO BMFF (ftyp)
 * usado por arquivos .HEIC / .HEIF reais, ou se já é JPEG/PNG/WebP.
 */
async function detectFileHeader(
  file: File,
): Promise<"heic" | "standard" | "unknown"> {
  try {
    const slice = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(slice);
    if (bytes.length < 12) return "unknown";

    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return "standard";
    }
    // PNG: 89 50 4E 47
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    ) {
      return "standard";
    }
    // WebP: RIFF....WEBP
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return "standard";
    }

    // ISO Base Media File Format: bytes 4..7 == "ftyp"
    const boxType = String.fromCharCode(
      bytes[4],
      bytes[5],
      bytes[6],
      bytes[7],
    ).toLowerCase();
    const majorBrand = String.fromCharCode(
      bytes[8],
      bytes[9],
      bytes[10],
      bytes[11],
    )
      .toLowerCase()
      .trim();

    if (
      boxType === "ftyp" &&
      [
        "heic",
        "heix",
        "hevc",
        "hevx",
        "heim",
        "heis",
        "hevm",
        "hevs",
        "mif1",
        "msf1",
      ].includes(majorBrand)
    ) {
      return "heic";
    }
  } catch {
    // Continua com detecção por extensão/MIME
  }
  return "unknown";
}

function encodeCanvasToWebP(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let width = sourceWidth;
    let height = sourceHeight;

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

    ctx.drawImage(source, 0, 0, width, height);
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
  });
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
      encodeCanvasToWebP(img, img.width, img.height, maxWidth, quality)
        .then(resolve)
        .catch(reject);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Arquivo de imagem inválido ou corrompido."));
    };

    img.src = objectUrl;
  });
}

/**
 * Valida e converte qualquer imagem suportada (JPEG, PNG, WebP, HEIC/HEIF) no navegador
 * para `.webp` (removendo metadados EXIF e reduzindo tamanho).
 * Arquivos SVG são explicitamente bloqueados para prevenir Stored XSS.
 */
export async function convertImageToWebP(
  file: File,
  maxWidth = 1600,
  quality = 0.84,
): Promise<Blob> {
  if (file.size <= 0 || file.size > MAX_INPUT_FILE_BYTES) {
    throw new Error("A imagem selecionada excede o limite máximo de 25 MB.");
  }

  const headerKind = await detectFileHeader(file);
  const isHeic = headerKind === "heic" || (headerKind === "unknown" && hasHeicExtensionOrMime(file));
  const isAllowed =
    headerKind === "standard" ||
    isHeic ||
    ALLOWED_INPUT_MIME_TYPES.has(file.type.toLowerCase());

  if (!isAllowed) {
    throw new Error(
      "Formato de imagem não permitido. Envie apenas fotos em JPEG, PNG, WebP ou HEIC/HEIF.",
    );
  }

  if (isHeic) {
    // 1ª tentativa: decodificador moderno `heic-to` (libheif 1.23.7 WASM — suporta iOS 16/17/18 10-bit)
    try {
      const { heicTo } = await import("heic-to");
      const bitmap = await heicTo({
        blob: file,
        type: "bitmap",
      });
      try {
        return await encodeCanvasToWebP(
          bitmap,
          bitmap.width,
          bitmap.height,
          maxWidth,
          quality,
        );
      } finally {
        bitmap.close();
      }
    } catch (primaryErr) {
      console.warn(
        "[r2StorageService] Fallback de heic-to para heic2any:",
        primaryErr,
      );
      // 2ª tentativa: fallback via `heic2any`
      try {
        const { default: heic2any } = await import("heic2any");
        const converted = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.92,
        });
        const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
        return await renderBlobToWebP(jpegBlob, maxWidth, quality);
      } catch (fallbackErr) {
        console.error(
          "[r2StorageService] Falha ao decodificar HEIC:",
          fallbackErr,
        );
        throw new Error(
          "Não foi possível decodificar esta imagem HEIC/HEIF no navegador.",
          { cause: fallbackErr },
        );
      }
    }
  }

  return renderBlobToWebP(file, maxWidth, quality);
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
