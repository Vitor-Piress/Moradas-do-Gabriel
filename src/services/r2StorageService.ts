import { supabase } from "../lib/supabase";
import { sanitizeHttpUrl } from "../utils/embedUrl";

/**
 * Serviço Seguro de Upload e Limpeza para Cloudflare R2 Object Storage
 * com preservação de alta definição por seção e conversão automática para WebP.
 *
 * Arquitetura de Segurança:
 * - As credenciais do Cloudflare R2 (`R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`,
 *   `R2_SECRET_ACCESS_KEY`) NUNCA ficam no frontend (`VITE_*`), evitando exposição no bundle público.
 * - O upload e a exclusão passam pela Supabase Edge Function `r2-upload`
 *   (em `supabase/functions/r2-upload/index.ts`) autenticada via JWT + `is_admin()`.
 * - Suporta JPEG, PNG, WebP e fotos HEIC/HEIF de iPhone (decodificadas via libheif 1.23+).
 * - Arquivos SVG ou executáveis são bloqueados para prevenir Stored XSS.
 * - A conversão para `.webp` via `<canvas>` com downscale progressivo preserva nitidez
 *   e remove metadados EXIF/GPS das fotos.
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
const MAX_WEBP_OUTPUT_BYTES = 5 * 1024 * 1024; // 5 MB após compressão WebP (alinhado ao limite da Edge Function)

export const ALLOWED_R2_FOLDERS = [
  "acomodacoes",
  "hero",
  "sobre",
  "lugares",
] as const;

export type R2UploadFolder = (typeof ALLOWED_R2_FOLDERS)[number];

interface ImageUploadPreset {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  minQuality: number;
}

const IMAGE_UPLOAD_PRESETS: Record<R2UploadFolder, ImageUploadPreset> = {
  // Hero full-bleed (100vw x 100dvh, monitores Full HD / QHD / Retina)
  hero: {
    maxWidth: 3200,
    maxHeight: 2400,
    quality: 0.93,
    minQuality: 0.85,
  },
  // Seção institucional Sobre a pousada
  sobre: {
    maxWidth: 2400,
    maxHeight: 2400,
    quality: 0.91,
    minQuality: 0.84,
  },
  // Capas, galerias e lightbox de acomodações
  acomodacoes: {
    maxWidth: 2400,
    maxHeight: 2400,
    quality: 0.9,
    minQuality: 0.82,
  },
  // Curadoria de lugares no Guia do Hóspede
  lugares: {
    maxWidth: 2200,
    maxHeight: 2200,
    quality: 0.9,
    minQuality: 0.82,
  },
};

function resolveR2EndpointUrl(): string {
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

  return endpointUrl;
}

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
 * usado por arquivos .HEIC / .HEIF reais, WebP, ou JPEG/PNG.
 */
async function detectFileHeader(
  file: File,
): Promise<"heic" | "webp" | "standard" | "unknown"> {
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
      return "webp";
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

function computeTargetDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const ratio = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
  return {
    width: Math.max(1, Math.round(sourceWidth * ratio)),
    height: Math.max(1, Math.round(sourceHeight * ratio)),
  };
}

function canvasToWebPBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Falha ao converter a imagem para WebP."));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      quality,
    );
  });
}

/**
 * Redimensiona a imagem com suavização de alta qualidade e redução progressiva
 * (em passos de 50% quando reduz mais de 2x) para evitar serrilhado e perda de nitidez,
 * ajustando a qualidade WebP apenas se necessário para respeitar o limite de 5 MB.
 */
async function encodeCanvasToWebP(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  preset: ImageUploadPreset,
): Promise<Blob> {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error("Dimensões de imagem inválidas.");
  }

  const { width: targetWidth, height: targetHeight } = computeTargetDimensions(
    sourceWidth,
    sourceHeight,
    preset.maxWidth,
    preset.maxHeight,
  );

  let currentSource: CanvasImageSource = source;
  let currentWidth = sourceWidth;
  let currentHeight = sourceHeight;
  const tempCanvases: HTMLCanvasElement[] = [];

  try {
    // Downscale progressivo quando a redução excede 2x (ex.: fotos 48MP -> 2400px/3200px)
    while (
      currentWidth * 0.5 > targetWidth &&
      currentHeight * 0.5 > targetHeight
    ) {
      const nextWidth = Math.max(targetWidth, Math.round(currentWidth * 0.5));
      const nextHeight = Math.max(
        targetHeight,
        Math.round(currentHeight * 0.5),
      );
      const stepCanvas = document.createElement("canvas");
      stepCanvas.width = nextWidth;
      stepCanvas.height = nextHeight;

      const stepCtx = stepCanvas.getContext("2d");
      if (!stepCtx) {
        throw new Error("Não foi possível inicializar o processador de imagem.");
      }
      stepCtx.imageSmoothingEnabled = true;
      stepCtx.imageSmoothingQuality = "high";
      stepCtx.drawImage(currentSource, 0, 0, nextWidth, nextHeight);

      tempCanvases.push(stepCanvas);
      currentSource = stepCanvas;
      currentWidth = nextWidth;
      currentHeight = nextHeight;
    }

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = targetWidth;
    finalCanvas.height = targetHeight;
    tempCanvases.push(finalCanvas);

    const ctx = finalCanvas.getContext("2d");
    if (!ctx) {
      throw new Error("Não foi possível inicializar o processador de imagem.");
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(currentSource, 0, 0, targetWidth, targetHeight);

    // Tenta na qualidade máxima do perfil e reduz suavemente apenas se ultrapassar 5 MB
    let currentQuality = preset.quality;
    let blob = await canvasToWebPBlob(finalCanvas, currentQuality);

    while (
      blob.size > MAX_WEBP_OUTPUT_BYTES &&
      currentQuality > preset.minQuality
    ) {
      currentQuality = Math.max(
        preset.minQuality,
        Number((currentQuality - 0.03).toFixed(2)),
      );
      blob = await canvasToWebPBlob(finalCanvas, currentQuality);
    }

    if (blob.size > MAX_WEBP_OUTPUT_BYTES) {
      throw new Error(
        "A imagem comprimida excede o limite de 5 MB. Tente uma foto menor.",
      );
    }

    return blob;
  } finally {
    for (const c of tempCanvases) {
      c.width = 0;
      c.height = 0;
    }
  }
}

function renderBlobToWebP(
  sourceBlob: Blob,
  preset: ImageUploadPreset,
  preserveOriginalWebP = false,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(sourceBlob);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const naturalW = img.naturalWidth || img.width;
      const naturalH = img.naturalHeight || img.height;

      // Se o arquivo já é WebP e já está dentro das dimensões e tamanho, preserva sem re-encodar
      if (
        preserveOriginalWebP &&
        naturalW > 0 &&
        naturalH > 0 &&
        naturalW <= preset.maxWidth &&
        naturalH <= preset.maxHeight &&
        sourceBlob.size <= MAX_WEBP_OUTPUT_BYTES
      ) {
        resolve(sourceBlob);
        return;
      }

      encodeCanvasToWebP(img, naturalW, naturalH, preset)
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
 * para `.webp` preservando alta resolução conforme o destino.
 * Arquivos SVG são explicitamente bloqueados para prevenir Stored XSS.
 */
export async function convertImageToWebP(
  file: File,
  folder: R2UploadFolder = "acomodacoes",
): Promise<Blob> {
  const preset = IMAGE_UPLOAD_PRESETS[folder] ?? IMAGE_UPLOAD_PRESETS.acomodacoes;

  if (file.size <= 0 || file.size > MAX_INPUT_FILE_BYTES) {
    throw new Error("A imagem selecionada excede o limite máximo de 25 MB.");
  }

  const headerKind = await detectFileHeader(file);
  const isHeic =
    headerKind === "heic" ||
    (headerKind === "unknown" && hasHeicExtensionOrMime(file));
  const isAlreadyWebP =
    headerKind === "webp" || file.type.toLowerCase() === "image/webp";
  const isAllowed =
    headerKind === "standard" ||
    headerKind === "webp" ||
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
          preset,
        );
      } finally {
        bitmap.close();
      }
    } catch (primaryErr) {
      console.warn(
        "[r2StorageService] Fallback de heic-to para heic2any:",
        primaryErr,
      );
      // 2ª tentativa: fallback via `heic2any` usando PNG sem perdas como intermediário
      try {
        const { default: heic2any } = await import("heic2any");
        const converted = await heic2any({
          blob: file,
          toType: "image/png",
        });
        const pngBlob = Array.isArray(converted) ? converted[0] : converted;
        return await renderBlobToWebP(pngBlob, preset, false);
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

  return renderBlobToWebP(file, preset, isAlreadyWebP);
}

/**
 * Envia a imagem convertida em WebP de alta definição para o Cloudflare R2 através
 * da Edge Function autenticada (`r2-upload`).
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

  const webpBlob = await convertImageToWebP(file, folder);
  const safeFile = new File([webpBlob], "upload.webp", { type: "image/webp" });

  const formData = new FormData();
  formData.append("folder", folder);
  formData.append("file", safeFile);

  const endpointUrl = resolveR2EndpointUrl();

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

function isLikelyExternalSampleUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "images.unsplash.com" || host.endsWith(".unsplash.com");
  } catch {
    return true;
  }
}

/**
 * Remove imagens substituídas ou excluídas do Cloudflare R2 (melhor esforço, não bloqueante).
 * A Edge Function valida se a URL pertence ao nosso bucket e se não está mais em uso no banco.
 */
export async function deleteImagesFromR2(
  urls: string[],
): Promise<{ deleted: string[]; skipped: string[] }> {
  const candidates = Array.from(
    new Set(
      urls
        .map((u) => u.trim())
        .filter((u) => u.startsWith("https://") && !isLikelyExternalSampleUrl(u)),
    ),
  );

  if (candidates.length === 0) {
    return { deleted: [], skipped: [] };
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { deleted: [], skipped: candidates };
    }

    const endpointUrl = resolveR2EndpointUrl();
    const response = await fetch(endpointUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ urls: candidates }),
    });

    if (!response.ok) {
      const errBody = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      console.warn(
        "[r2StorageService] Aviso ao remover imagens antigas do R2:",
        errBody.error || `HTTP ${response.status}`,
      );
      return { deleted: [], skipped: candidates };
    }

    const data = (await response.json().catch(() => ({}))) as {
      deleted?: string[];
      skipped?: string[];
    };

    return {
      deleted: Array.isArray(data.deleted) ? data.deleted : [],
      skipped: Array.isArray(data.skipped) ? data.skipped : [],
    };
  } catch (err) {
    console.warn(
      "[r2StorageService] Não foi possível contatar a limpeza automática do R2:",
      err,
    );
    return { deleted: [], skipped: candidates };
  }
}

export interface R2OrphanCleanupResult {
  scanned: number;
  inUse: number;
  deletedCount: number;
  deletedKeys: string[];
}

/**
 * Executa varredura no Cloudflare R2 e remove todos os arquivos antigos que não possuem
 * mais nenhuma referência ativa no banco de dados (accommodations, business_info e links).
 */
export async function cleanupOrphanImagesInR2(): Promise<R2OrphanCleanupResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const endpointUrl = resolveR2EndpointUrl();

  let response: Response;
  try {
    response = await fetch(endpointUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "cleanup_orphans" }),
    });
  } catch {
    throw new Error(
      "Falha ao conectar na Edge Function 'r2-upload'. Verifique se a versão atualizada já foi publicada no Supabase.",
    );
  }

  const payload = (await response.json().catch(() => ({}))) as {
    scanned?: number;
    inUse?: number;
    deletedCount?: number;
    deletedKeys?: string[];
    error?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      payload.error ||
        payload.message ||
        `Falha ao limpar arquivos sem uso no R2 (HTTP ${response.status}).`,
    );
  }

  return {
    scanned: payload.scanned ?? 0,
    inUse: payload.inUse ?? 0,
    deletedCount: payload.deletedCount ?? 0,
    deletedKeys: Array.isArray(payload.deletedKeys) ? payload.deletedKeys : [],
  };
}
