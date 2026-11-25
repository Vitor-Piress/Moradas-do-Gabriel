// Supabase Edge Function: r2-upload
// ---------------------------------------------------------------------------
// Gerencia upload (POST) e remoção segura (DELETE) de imagens no Cloudflare R2.
// As credenciais do R2 ficam SOMENTE aqui (secrets do Supabase) — nunca no
// bundle do navegador.
//
// Segurança:
//  - JWT obrigatório + checagem is_admin() no banco para POST e DELETE
//  - CORS restrito às origens em ALLOWED_ORIGINS
//  - Pastas em allowlist (acomodacoes, hero, sobre, lugares)
//  - Upload: tipo validado por "magic bytes" (WebP/JPEG/PNG). SVG é recusado
//  - Delete: aceita apenas URLs do R2_PUBLIC_URL dentro das pastas permitidas e
//    confirma no banco (accommodations, business_info, links) antes de remover
//  - Limpeza de órfãs (DELETE { action: "cleanup_orphans" }): lista objetos no
//    R2 e remove apenas arquivos sem nenhuma referência ativa no banco
//  - Assinatura AWS Signature V4 nativa via Web Crypto API (zero deps externas)
//
// Secrets necessários (supabase secrets set ...):
//   R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
//   R2_PUBLIC_URL, ALLOWED_ORIGINS (ex: "https://moradasdogabriel.com.br,http://localhost:5173")
// SUPABASE_URL e SUPABASE_ANON_KEY são injetados automaticamente pelo Supabase.
// ---------------------------------------------------------------------------

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_DELETE_BATCH = 50;
const MAX_LIST_PAGES = 20;
const ALLOWED_FOLDERS = ["acomodacoes", "hero", "sobre", "lugares"] as const;
const ALLOWED_FOLDER_SET = new Set<string>(ALLOWED_FOLDERS);
const MANAGED_KEY_REGEX =
  /^(acomodacoes|hero|sobre|lugares)\/[a-zA-Z0-9._-]+\.(webp|jpg|jpeg|png)$/i;
const EMPTY_PAYLOAD_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

const encoder = new TextEncoder();

interface R2Config {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
}

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
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
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

function readR2Config(): { config: R2Config | null; missing: string[] } {
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

  const missing = [
    !accountId && "R2_ACCOUNT_ID",
    !bucket && "R2_BUCKET_NAME",
    !accessKeyId && "R2_ACCESS_KEY_ID",
    !secretAccessKey && "R2_SECRET_ACCESS_KEY",
    !publicUrl && "R2_PUBLIC_URL",
  ].filter((item): item is string => Boolean(item));

  if (missing.length > 0) {
    return { config: null, missing };
  }

  return {
    config: { accountId, bucket, accessKeyId, secretAccessKey, publicUrl },
    missing: [],
  };
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

function awsUriEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Assina qualquer requisição S3/R2 (PUT, DELETE, GET) com AWS Signature V4
 * usando apenas a Web Crypto API nativa.
 */
async function signedR2Fetch(params: {
  config: R2Config;
  method: "PUT" | "DELETE" | "GET";
  canonicalUri: string;
  queryParams?: Record<string, string>;
  extraHeaders?: Record<string, string>;
  body?: Uint8Array;
}): Promise<Response> {
  const { config, method, canonicalUri, queryParams, extraHeaders, body } =
    params;
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const region = "auto";
  const service = "s3";

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const payloadBytes = body ? new Uint8Array(body) : undefined;
  const payloadHash = payloadBytes
    ? await sha256Hex(payloadBytes)
    : EMPTY_PAYLOAD_SHA256;

  const headersToSign: Record<string, string> = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };

  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) {
      headersToSign[k.toLowerCase()] = v.trim();
    }
  }

  const sortedHeaderKeys = Object.keys(headersToSign).sort();
  const canonicalHeaders =
    sortedHeaderKeys.map((k) => `${k}:${headersToSign[k]}\n`).join("");
  const signedHeaders = sortedHeaderKeys.join(";");

  const sortedQueryEntries = queryParams
    ? Object.entries(queryParams)
        .filter(([, v]) => v !== "")
        .map(([k, v]) => [awsUriEncode(k), awsUriEncode(v)] as const)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    : [];
  const canonicalQueryString = sortedQueryEntries
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
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
    encoder.encode(`AWS4${config.secretAccessKey}`),
    dateStamp,
  );
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, "aws4_request");
  const signature = toHex(await hmacSha256(kSigning, stringToSign));

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const requestHeaders: Record<string, string> = {
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    Authorization: authorization,
    ...(extraHeaders ?? {}),
  };

  const endpoint = canonicalQueryString
    ? `https://${host}${canonicalUri}?${canonicalQueryString}`
    : `https://${host}${canonicalUri}`;

  return fetch(endpoint, {
    method,
    headers: requestHeaders,
    ...(payloadBytes ? { body: payloadBytes } : {}),
  });
}

async function putObjectToR2(
  config: R2Config,
  objectKey: string,
  body: Uint8Array,
  contentType: string,
): Promise<Response> {
  return signedR2Fetch({
    config,
    method: "PUT",
    canonicalUri: `/${config.bucket}/${objectKey}`,
    extraHeaders: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": contentType,
    },
    body,
  });
}

async function deleteObjectFromR2(
  config: R2Config,
  objectKey: string,
): Promise<Response> {
  return signedR2Fetch({
    config,
    method: "DELETE",
    canonicalUri: `/${config.bucket}/${objectKey}`,
  });
}

async function listObjectsInR2Prefix(
  config: R2Config,
  prefix: string,
): Promise<Array<{ key: string; lastModified: string }>> {
  const items: Array<{ key: string; lastModified: string }> = [];
  let continuationToken = "";

  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const queryParams: Record<string, string> = {
      "list-type": "2",
      prefix,
    };
    if (continuationToken) {
      queryParams["continuation-token"] = continuationToken;
    }

    const res = await signedR2Fetch({
      config,
      method: "GET",
      canonicalUri: `/${config.bucket}`,
      queryParams,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(
        `Falha ao listar objetos R2 em ${prefix} (HTTP ${res.status}): ${errBody.slice(0, 180)}`,
      );
    }

    const xml = await res.text();
    const contentRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
    let match: RegExpExecArray | null;
    while ((match = contentRegex.exec(xml)) !== null) {
      const block = match[1];
      const keyMatch = /<Key>([^<]+)<\/Key>/.exec(block);
      const modMatch = /<LastModified>([^<]+)<\/LastModified>/.exec(block);
      if (keyMatch?.[1]) {
        const key = decodeXmlEntities(keyMatch[1]);
        if (MANAGED_KEY_REGEX.test(key) && !key.includes("..")) {
          items.push({
            key,
            lastModified: modMatch?.[1] ?? "",
          });
        }
      }
    }

    const isTruncated = /<IsTruncated>\s*true\s*<\/IsTruncated>/i.test(xml);
    const nextTokenMatch =
      /<NextContinuationToken>([^<]+)<\/NextContinuationToken>/.exec(xml);
    if (isTruncated && nextTokenMatch?.[1]) {
      continuationToken = decodeXmlEntities(nextTokenMatch[1]);
    } else {
      break;
    }
  }

  return items;
}

/**
 * Converte uma URL pública do nosso R2 (ou chave gerenciada) em `objectKey` seguro.
 * Retorna `null` para URLs externas (ex.: Unsplash) ou caminhos inválidos.
 */
function extractManagedObjectKey(
  rawUrlOrKey: string,
  publicUrl: string,
): string | null {
  const trimmed = rawUrlOrKey.trim();
  if (!trimmed) return null;

  const basePrefix = `${publicUrl.replace(/\/+$/, "")}/`;
  let candidateKey = "";

  if (trimmed.startsWith(basePrefix)) {
    candidateKey = trimmed.slice(basePrefix.length);
  } else if (!/^https?:\/\//i.test(trimmed)) {
    candidateKey = trimmed.replace(/^\/+/, "");
  } else {
    return null;
  }

  candidateKey = candidateKey.split("?")[0].split("#")[0];
  try {
    candidateKey = decodeURIComponent(candidateKey);
  } catch {
    return null;
  }

  if (candidateKey.includes("..") || !MANAGED_KEY_REGEX.test(candidateKey)) {
    return null;
  }

  return candidateKey;
}

/** Percorre qualquer JSON/objeto e extrai todas as chaves R2 referenciadas. */
function collectR2KeysFromValue(
  value: unknown,
  publicUrl: string,
  target: Set<string>,
): void {
  if (typeof value === "string") {
    const key = extractManagedObjectKey(value, publicUrl);
    if (key) target.add(key);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectR2KeysFromValue(item, publicUrl, target);
    }
    return;
  }
  if (value && typeof value === "object") {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      collectR2KeysFromValue(entry, publicUrl, target);
    }
  }
}

/**
 * Consulta todas as tabelas do banco que podem referenciar URLs do R2.
 * Se qualquer consulta falhar, lança erro para nunca excluir um arquivo em uso.
 */
async function collectActiveR2KeysFromDb(
  supabase: SupabaseClient,
  publicUrl: string,
): Promise<Set<string>> {
  const activeKeys = new Set<string>();

  const [accRes, bizRes, linksRes] = await Promise.all([
    supabase.from("accommodations").select("cover_image, gallery"),
    supabase.from("business_info").select("content, metadata"),
    supabase.from("links").select("url"),
  ]);

  if (accRes.error) {
    throw new Error(
      `Não foi possível consultar acomodações antes da limpeza: ${accRes.error.message}`,
    );
  }
  if (bizRes.error) {
    throw new Error(
      `Não foi possível consultar business_info antes da limpeza: ${bizRes.error.message}`,
    );
  }
  if (linksRes.error) {
    throw new Error(
      `Não foi possível consultar links antes da limpeza: ${linksRes.error.message}`,
    );
  }

  collectR2KeysFromValue(accRes.data, publicUrl, activeKeys);
  collectR2KeysFromValue(bizRes.data, publicUrl, activeKeys);
  collectR2KeysFromValue(linksRes.data, publicUrl, activeKeys);

  return activeKeys;
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

  if (req.method !== "POST" && req.method !== "DELETE") {
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

    const { config, missing } = readR2Config();
    if (!config) {
      console.error("[r2-upload] Secrets do R2 ausentes:", missing);
      return json(
        {
          error: `Secrets do R2 ausentes na Edge Function: ${missing.join(", ")}`,
        },
        500,
        origin,
      );
    }

    // =========================================================================
    // DELETE: Remoção de imagens substituídas ou limpeza completa de órfãs
    // =========================================================================
    if (req.method === "DELETE") {
      let body: {
        action?: string;
        urls?: unknown;
        url?: unknown;
      };
      try {
        body = (await req.json()) as {
          action?: string;
          urls?: unknown;
          url?: unknown;
        };
      } catch {
        return json({ error: "Corpo JSON inválido." }, 400, origin);
      }

      // Ação 1: Limpeza geral de arquivos órfãos já acumulados no R2
      if (body.action === "cleanup_orphans") {
        const activeKeys = await collectActiveR2KeysFromDb(
          supabase,
          config.publicUrl,
        );

        const listedPerFolder = await Promise.all(
          ALLOWED_FOLDERS.map((folder) =>
            listObjectsInR2Prefix(config, `${folder}/`),
          ),
        );
        const allObjects = listedPerFolder.flat();

        const orphanKeys = allObjects
          .map((obj) => obj.key)
          .filter((key) => !activeKeys.has(key));

        const deletedKeys: string[] = [];
        const failed: Array<{ key: string; status: number }> = [];

        // Deleta em lotes paralelos pequenos para não sobrecarregar conexões
        for (let i = 0; i < orphanKeys.length; i += 10) {
          const batch = orphanKeys.slice(i, i + 10);
          const results = await Promise.all(
            batch.map(async (key) => {
              const delRes = await deleteObjectFromR2(config, key);
              return { key, ok: delRes.ok || delRes.status === 404, status: delRes.status };
            }),
          );
          for (const r of results) {
            if (r.ok) {
              deletedKeys.push(r.key);
            } else {
              failed.push({ key: r.key, status: r.status });
            }
          }
        }

        return json(
          {
            action: "cleanup_orphans",
            scanned: allObjects.length,
            inUse: allObjects.length - orphanKeys.length,
            deletedCount: deletedKeys.length,
            deletedKeys,
            failed,
          },
          200,
          origin,
        );
      }

      // Ação 2: Remoção pontual de URLs substituídas/excluídas
      const rawInputs: string[] = [];
      if (typeof body.url === "string") {
        rawInputs.push(body.url);
      }
      if (Array.isArray(body.urls)) {
        for (const item of body.urls) {
          if (typeof item === "string") rawInputs.push(item);
        }
      }

      const uniqueInputs = Array.from(
        new Set(rawInputs.map((u) => u.trim()).filter(Boolean)),
      ).slice(0, MAX_DELETE_BATCH);

      if (uniqueInputs.length === 0) {
        return json({ deleted: [], skipped: [], failed: [] }, 200, origin);
      }

      const candidateKeys = new Set<string>();
      const skipped: string[] = [];

      for (const rawUrl of uniqueInputs) {
        const key = extractManagedObjectKey(rawUrl, config.publicUrl);
        if (key) {
          candidateKeys.add(key);
        } else {
          skipped.push(rawUrl);
        }
      }

      if (candidateKeys.size === 0) {
        return json({ deleted: [], skipped, failed: [] }, 200, origin);
      }

      // Defesa em profundidade: nunca remove um objeto que ainda esteja em uso no banco
      const activeKeys = await collectActiveR2KeysFromDb(
        supabase,
        config.publicUrl,
      );

      const keysToDelete: string[] = [];
      for (const key of candidateKeys) {
        if (activeKeys.has(key)) {
          skipped.push(key);
        } else {
          keysToDelete.push(key);
        }
      }

      const deleted: string[] = [];
      const failed: Array<{ key: string; status: number }> = [];

      const deleteResults = await Promise.all(
        keysToDelete.map(async (key) => {
          const delRes = await deleteObjectFromR2(config, key);
          return {
            key,
            ok: delRes.ok || delRes.status === 404,
            status: delRes.status,
          };
        }),
      );

      for (const r of deleteResults) {
        if (r.ok) {
          deleted.push(r.key);
        } else {
          failed.push({ key: r.key, status: r.status });
        }
      }

      return json({ deleted, skipped, failed }, 200, origin);
    }

    // =========================================================================
    // POST: Upload de nova imagem para o Cloudflare R2
    // =========================================================================
    const contentLength = Number(req.headers.get("Content-Length") ?? "0");
    if (contentLength > MAX_BYTES + 64 * 1024) {
      return json({ error: "Arquivo muito grande (máx. 5 MB)." }, 413, origin);
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return json({ error: "Requisição inválida." }, 400, origin);
    }

    const folder = String(form.get("folder") ?? "");
    const file = form.get("file");

    if (!ALLOWED_FOLDER_SET.has(folder)) {
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

    const objectKey = `${folder}/${crypto.randomUUID()}.${detected.ext}`;

    const putResponse = await putObjectToR2(
      config,
      objectKey,
      bytes,
      detected.mime,
    );

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
      { url: `${config.publicUrl}/${objectKey}`, key: objectKey },
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
