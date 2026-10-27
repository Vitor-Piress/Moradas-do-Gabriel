// Supabase Edge Function: r2-upload
// ---------------------------------------------------------------------------
// Recebe uma imagem do painel admin e envia ao Cloudflare R2.
// As credenciais do R2 ficam SOMENTE aqui (secrets do Supabase) — nunca no
// bundle do navegador.
//
// Segurança:
//  - JWT obrigatório (verify_jwt padrão do Supabase) + checagem is_admin() no banco
//  - CORS restrito às origens em ALLOWED_ORIGINS
//  - Pastas em allowlist, nome do arquivo gerado no servidor (UUID)
//  - Tipo validado por "magic bytes" (WebP/JPEG/PNG). SVG é recusado (pode conter script)
//  - Assinatura AWS Signature V4 nativa via Web Crypto API (zero dependências externas)
//
// Secrets necessários (supabase secrets set ...):
//   R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
//   R2_PUBLIC_URL, ALLOWED_ORIGINS (ex: "https://moradasdogabriel.com.br,http://localhost:5173")
// SUPABASE_URL e SUPABASE_ANON_KEY são injetados automaticamente pelo Supabase.
// ---------------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_FOLDERS = new Set(["acomodacoes", "hero", "sobre", "lugares"]);
const encoder = new TextEncoder();

/** Remove espaços extras e aspas acidentais ao ler variáveis de ambiente/Secrets. */
function cleanEnv(key: string): string {
  const raw = Deno.env.get(key) ?? "";
  return raw.trim().replace(/^["']+|["']+$/g, "").trim();
}

const configuredOrigins = cleanEnv("ALLOWED_ORIGINS")
  .split(",")
  .map((o) => o.trim().replace(/^["']+|["']+$/g, "").replace(/\/+$/, ""))
  .filter(Boolean);

const DEFAULT_DEV_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
];

const allowedOrigins = Array.from(
  new Set([...configuredOrigins, ...DEFAULT_DEV_ORIGINS]),
);

function corsHeaders(
  origin: string | null,
  requestHeaders?: string | null,
): Record<string, string> {
  const normalizedOrigin = origin?.replace(/\/+$/, "") ?? "";
  const allowOrigin =
    normalizedOrigin &&
    (configuredOrigins.length === 0 ||
      allowedOrigins.includes(normalizedOrigin))
      ? origin!
      : (configuredOrigins[0] ?? "*");

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      requestHeaders ||
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin, Access-Control-Request-Headers",
  };
}

function json(
  body: Record<string, unknown>,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** Detecta o tipo real do arquivo pelos primeiros bytes (ignora o MIME enviado). */
function detectImageType(
  bytes: Uint8Array,
): { mime: string; ext: string } | null {
  if (bytes.length < 12) return null;
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }
  // WebP: "RIFF" .... "WEBP"
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
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

async function sha256Hex(data: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

async function hmacSha256(
  key: BufferSource,
  message: string,
): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
}

/**
 * Envia o binário ao Cloudflare R2 assinando a requisição PUT com AWS Signature V4
 * usando apenas a Web Crypto API nativa.
 */
async function putObjectToR2(params: {
  accountId: string;
  bucket: string;
  objectKey: string;
  accessKeyId: string;
  secretAccessKey: string;
  body: Uint8Array;
  contentType: string;
}): Promise<Response> {
  const host = `${params.accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${params.bucket}/${params.objectKey}`;
  const endpoint = `https://${host}${canonicalUri}`;
  const region = "auto";
  const service = "s3";

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const cacheControl = "public, max-age=31536000, immutable";

  const payloadBytes = new Uint8Array(params.body);
  const payloadHash = await sha256Hex(payloadBytes);

  const canonicalHeaders =
    `cache-control:${cacheControl}\n` +
    `content-type:${params.contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders =
    "cache-control;content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = await sha256Hex(
    encoder.encode(canonicalRequest),
  );

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join("\n");

  const kDate = await hmacSha256(
    encoder.encode(`AWS4${params.secretAccessKey}`),
    dateStamp,
  );
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, "aws4_request");
  const signature = toHex(await hmacSha256(kSigning, stringToSign));

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${params.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(endpoint, {
    method: "PUT",
    body: payloadBytes,
    headers: {
      "Cache-Control": cacheControl,
      "Content-Type": params.contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization: authorization,
    },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const reqHeaders = req.headers.get("Access-Control-Request-Headers");

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders(origin, reqHeaders),
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Método não permitido." }, 405, origin);
  }

  const normalizedOrigin = origin?.replace(/\/+$/, "") ?? "";
  if (
    configuredOrigins.length > 0 &&
    normalizedOrigin &&
    !allowedOrigins.includes(normalizedOrigin)
  ) {
    return json({ error: "Origem não autorizada." }, 403, origin);
  }

  try {
    // 1. Autenticação + autorização (somente administradores)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Não autenticado." }, 401, origin);
    }

    const token = authHeader.slice(7).trim();
    const supabaseUrl =
      cleanEnv("SUPABASE_URL") || "https://ejdrmaananlxqvbmbcpz.supabase.co";
    const supabaseAnonKey =
      req.headers.get("apikey")?.trim() ||
      cleanEnv("SUPABASE_ANON_KEY") ||
      "sb_publishable_ISpW1jzNvB9nVL15yOIOZQ_05-A4i0_";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } =
      await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return json(
        {
          error: `Sessão inválida ou expirada (${userError?.message ?? "sem usuário"}).`,
        },
        401,
        origin,
      );
    }

    const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
    if (adminError || isAdmin !== true) {
      return json(
        {
          error: `Acesso restrito a administradores (${adminError?.message ?? "usuário não está em admin_users"}).`,
        },
        403,
        origin,
      );
    }

    // 2. Limite de tamanho antes de ler o corpo
    const contentLength = Number(req.headers.get("Content-Length") ?? "0");
    if (contentLength > MAX_BYTES + 64 * 1024) {
      return json({ error: "Arquivo muito grande (máx. 5 MB)." }, 413, origin);
    }

    // 3. Validação da requisição
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return json({ error: "Requisição inválida." }, 400, origin);
    }

    const folder = String(form.get("folder") ?? "");
    const file = form.get("file");

    if (!ALLOWED_FOLDERS.has(folder)) {
      return json({ error: "Pasta de destino inválida." }, 400, origin);
    }
    if (!(file instanceof File) || file.size === 0) {
      return json({ error: "Nenhum arquivo enviado." }, 400, origin);
    }
    if (file.size > MAX_BYTES) {
      return json({ error: "Arquivo muito grande (máx. 5 MB)." }, 413, origin);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = detectImageType(bytes);
    if (!detected) {
      return json(
        { error: "Formato não suportado. Envie WebP, JPEG ou PNG." },
        415,
        origin,
      );
    }

    // 4. Upload para o R2 (nome gerado no servidor — sem path traversal)
    // Aceita tanto apenas o ID ("a11b...") quanto a URL S3 completa caso tenha sido colada no Secret
    const accountId = cleanEnv("R2_ACCOUNT_ID")
      .replace(/^https?:\/\//i, "")
      .replace(/\.r2\.cloudflarestorage\.com.*$/i, "")
      .replace(/\/+$/, "");
    const bucket = cleanEnv("R2_BUCKET_NAME").replace(/^\/+|\/+$/g, "");
    const accessKeyId = cleanEnv("R2_ACCESS_KEY_ID");
    const secretAccessKey = cleanEnv("R2_SECRET_ACCESS_KEY");
    const rawPublicUrl = cleanEnv("R2_PUBLIC_URL").replace(/\/+$/, "");
    const publicUrl =
      rawPublicUrl && !/^https?:\/\//i.test(rawPublicUrl)
        ? `https://${rawPublicUrl}`
        : rawPublicUrl;

    if (!accountId || !bucket || !accessKeyId || !secretAccessKey || !publicUrl) {
      const missing = [
        !accountId && "R2_ACCOUNT_ID",
        !bucket && "R2_BUCKET_NAME",
        !accessKeyId && "R2_ACCESS_KEY_ID",
        !secretAccessKey && "R2_SECRET_ACCESS_KEY",
        !publicUrl && "R2_PUBLIC_URL",
      ].filter(Boolean);
      console.error("[r2-upload] Secrets do R2 ausentes:", missing);
      return json(
        {
          error: `Secrets do R2 ausentes na Edge Function: ${missing.join(", ")}`,
        },
        500,
        origin,
      );
    }

    const objectKey = `${folder}/${crypto.randomUUID()}.${detected.ext}`;

    const putResponse = await putObjectToR2({
      accountId,
      bucket,
      objectKey,
      accessKeyId,
      secretAccessKey,
      body: bytes,
      contentType: detected.mime,
    });

    if (!putResponse.ok) {
      const r2ErrText = await putResponse.text().catch(() => "");
      console.error(
        "[r2-upload] Falha no PUT para o R2:",
        putResponse.status,
        r2ErrText,
      );
      return json(
        {
          error: `Falha ao armazenar a imagem no R2 (HTTP ${putResponse.status}). Verifique R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_BUCKET_NAME.`,
        },
        502,
        origin,
      );
    }

    return json(
      { url: `${publicUrl}/${objectKey}`, key: objectKey },
      200,
      origin,
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[r2-upload] Erro interno:", err);
    return json(
      { error: `Erro interno na Edge Function: ${detail}` },
      500,
      origin,
    );
  }
});
