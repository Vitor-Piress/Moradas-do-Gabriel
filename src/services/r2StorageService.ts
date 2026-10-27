/**
 * Serviço de Upload para Cloudflare R2 Object Storage com compressão automática para WebP.
 *
 * Variáveis de ambiente suportadas no `.env`:
 * - `VITE_R2_PUBLIC_URL`: URL pública do seu bucket R2 (ex: https://pub-xxxxxx.r2.dev ou https://cdn.moradasdogabriel.com.br)
 *
 * Opção A (Via Worker / Supabase Edge Function / Presigned URL):
 * - `VITE_R2_UPLOAD_ENDPOINT`: Endpoint que recebe o arquivo ou gera a Presigned URL
 *
 * Opção B (Upload S3 V4 direto do Admin autenticado para a API S3 do Cloudflare R2):
 * - `VITE_R2_ACCOUNT_ID`: Account ID da Cloudflare
 * - `VITE_R2_BUCKET_NAME`: Nome do bucket no R2
 * - `VITE_R2_ACCESS_KEY_ID`: Access Key ID do token R2
 * - `VITE_R2_SECRET_ACCESS_KEY`: Secret Access Key do token R2
 */

/**
 * Converte e redimensiona a imagem no navegador para o formato `.webp` antes de enviar ao R2,
 * reduzindo drasticamente o consumo de armazenamento e acelerando o carregamento da Landing Page.
 */
export async function convertImageToWebP(
  file: File,
  maxWidth = 1600,
  quality = 0.84,
): Promise<Blob> {
  if (file.type === "image/svg+xml") {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(file);
          }
        },
        "image/webp",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível processar a imagem selecionada."));
    };

    img.src = objectUrl;
  });
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(data: string | ArrayBuffer): Promise<string> {
  const buffer =
    typeof data === "string" ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return toHex(hash);
}

async function hmacSha256(
  key: ArrayBuffer | Uint8Array,
  message: string,
): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(message),
  );
}

export function isR2Configured(): boolean {
  const uploadEndpoint = import.meta.env.VITE_R2_UPLOAD_ENDPOINT as
    | string
    | undefined;
  const accountId = import.meta.env.VITE_R2_ACCOUNT_ID as string | undefined;
  const bucket = import.meta.env.VITE_R2_BUCKET_NAME as string | undefined;
  const accessKeyId = import.meta.env.VITE_R2_ACCESS_KEY_ID as
    | string
    | undefined;
  const secretAccessKey = import.meta.env.VITE_R2_SECRET_ACCESS_KEY as
    | string
    | undefined;

  return Boolean(
    uploadEndpoint || (accountId && bucket && accessKeyId && secretAccessKey),
  );
}

export type R2UploadFolder =
  | "acomodacoes"
  | "hero"
  | "sobre"
  | "lugares"
  | string;

/**
 * Faz o upload de um arquivo de imagem para o Cloudflare R2 Object Storage
 * e retorna a URL pública final da imagem.
 */
export async function uploadImageToR2(
  file: File,
  folder: R2UploadFolder = "acomodacoes",
): Promise<string> {
  const webpBlob = await convertImageToWebP(file);
  const ext = file.type === "image/svg+xml" ? "svg" : "webp";
  const contentType =
    file.type === "image/svg+xml" ? "image/svg+xml" : "image/webp";

  const cleanBaseName = file.name
    .replace(/\.[^/.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  const objectKey = `${folder}/${Date.now()}-${cleanBaseName || "foto"}.${ext}`;

  const uploadEndpoint = (
    (import.meta.env.VITE_R2_UPLOAD_ENDPOINT as string) || ""
  ).trim();
  const publicBaseUrl = ((import.meta.env.VITE_R2_PUBLIC_URL as string) || "")
    .trim()
    .replace(/\/+$/, "");

  // 1. Caso haja um Worker / Edge Function configurado em VITE_R2_UPLOAD_ENDPOINT
  if (uploadEndpoint) {
    const formData = new FormData();
    formData.append("file", webpBlob, objectKey);
    formData.append("key", objectKey);

    const response = await fetch(uploadEndpoint, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(
        `Falha no upload para o endpoint R2 (${response.status})`,
      );
    }

    const result = (await response.json()) as { url?: string; key?: string };
    if (result.url) return result.url;
    if (result.key && publicBaseUrl) return `${publicBaseUrl}/${result.key}`;
  }

  // 2. Upload direto via S3 Signature V4 para o Cloudflare R2
  const accountId = (
    (import.meta.env.VITE_R2_ACCOUNT_ID as string) || ""
  ).trim();
  const bucket = ((import.meta.env.VITE_R2_BUCKET_NAME as string) || "").trim();
  const accessKeyId = (
    (import.meta.env.VITE_R2_ACCESS_KEY_ID as string) || ""
  ).trim();
  const secretAccessKey = (
    (import.meta.env.VITE_R2_SECRET_ACCESS_KEY as string) || ""
  ).trim();

  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Credenciais do Cloudflare R2 não encontradas no .env (defina VITE_R2_ACCOUNT_ID, VITE_R2_BUCKET_NAME, VITE_R2_ACCESS_KEY_ID, VITE_R2_SECRET_ACCESS_KEY e VITE_R2_PUBLIC_URL).",
    );
  }

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const endpointUrl = `https://${host}/${bucket}/${objectKey}`;
  const region = "auto";
  const service = "s3";

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const payloadBuffer = await webpBlob.arrayBuffer();
  const payloadHash = await sha256Hex(payloadBuffer);

  const canonicalUri = `/${bucket}/${objectKey}`;
  const canonicalQueryString = "";
  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const kSecret = new TextEncoder().encode(`AWS4${secretAccessKey}`);
  const kDate = await hmacSha256(kSecret, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, "aws4_request");
  const signature = toHex(await hmacSha256(kSigning, stringToSign));

  const authorizationHeader =
    `${algorithm} Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const putResponse = await fetch(endpointUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization: authorizationHeader,
    },
    body: payloadBuffer,
  });

  if (!putResponse.ok) {
    throw new Error(
      `Erro ao enviar arquivo para o Cloudflare R2 (${putResponse.status}). Verifique o CORS do bucket R2.`,
    );
  }

  if (publicBaseUrl) {
    return `${publicBaseUrl}/${objectKey}`;
  }

  return endpointUrl;
}
