import crypto from "node:crypto";
import type { Env } from "./index";

export interface GithubIdentity {
  githubId: string;
  githubLogin: string;
  email: string | null;
}

export interface TenantKvRecord {
  tenantId: string;
  email: string | null;
  githubLogin: string;
  status: "active" | "revoked";
  tier: string;
  docQuota: number;
  mediaQuota: number;
}

export interface TenantContext {
  tenantId: string;
  docQuota: number;
  mediaQuota: number;
  authenticated: boolean;
}

export interface ProvisionResult {
  tenantId: string;
  email: string | null;
  isNew: boolean;
  apiSecret?: string;
}

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const GITHUB_SCOPE = "read:user user:email";

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function buildGithubAuthorizeUrl(env: Env, state: string): string {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID || "",
    redirect_uri: env.GITHUB_OAUTH_REDIRECT_URI || "",
    scope: GITHUB_SCOPE,
    state,
    allow_signup: "true",
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export function signState(secret: string): string {
  const ts = Date.now().toString();
  const payload = base64UrlEncode(ts);
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyState(secret: string, state: string | null): boolean {
  if (!state) return false;
  const parts = state.split(".");
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  if (signature.length !== expectedSignature.length) return false;
  const signatureMatches = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  if (!signatureMatches) return false;

  const ts = Number(base64UrlDecode(payload));
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= STATE_TTL_MS;
}

export async function exchangeCodeForToken(code: string, env: Env): Promise<string | null> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: env.GITHUB_OAUTH_REDIRECT_URI,
    }),
  });

  if (!response.ok) return null;
  const data: any = await response.json();
  return data.access_token || null;
}

/**
 * GitHub hides the account email unless it's public, even with the user:email
 * scope granted — the primary verified address only shows up via /user/emails.
 */
export async function fetchGithubIdentity(accessToken: string): Promise<GithubIdentity | null> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "EasyDB-Worker",
  };

  const userRes = await fetch("https://api.github.com/user", { headers });
  if (!userRes.ok) return null;
  const user: any = await userRes.json();

  let email: string | null = user.email || null;

  if (!email) {
    const emailsRes = await fetch("https://api.github.com/user/emails", { headers });
    if (emailsRes.ok) {
      const emails: any[] = await emailsRes.json();
      const primaryVerified = emails.find((e) => e.primary && e.verified);
      const anyVerified = emails.find((e) => e.verified);
      email = primaryVerified?.email || anyVerified?.email || null;
    }
  }

  return {
    githubId: String(user.id),
    githubLogin: user.login,
    email,
  };
}

export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(24);
  return `edb_live_${randomBytes.toString("hex")}`;
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function slugify(login: string): string {
  return login.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "tenant";
}

async function generateUniqueTenantId(env: Env, githubLogin: string): Promise<string> {
  const base = slugify(githubLogin);
  let candidate = base;
  let attempt = 0;

  while (attempt < 5) {
    const existing = await env.DB.prepare(`SELECT 1 FROM tenants WHERE tenant_id = ?`).bind(candidate).first();
    if (!existing) return candidate;
    attempt += 1;
    candidate = `${base}_${crypto.randomBytes(3).toString("hex")}`;
  }

  return `${base}_${crypto.randomBytes(6).toString("hex")}`;
}

const DEFAULT_TIER = "free";
const DEFAULT_DOC_QUOTA = 1000;
const DEFAULT_MEDIA_QUOTA = 20;

export async function provisionOrLoadTenant(
  env: Env,
  identity: GithubIdentity
): Promise<ProvisionResult> {
  const existing = await env.DB.prepare(
    `SELECT tenant_id, email FROM tenants WHERE github_id = ?`
  )
    .bind(identity.githubId)
    .first<{ tenant_id: string; email: string | null }>();

  if (existing) {
    const resolvedEmail = existing.email || identity.email;

    await env.DB.prepare(
      `UPDATE tenants SET last_seen_at = CURRENT_TIMESTAMP, email = COALESCE(email, ?) WHERE tenant_id = ?`
    )
      .bind(identity.email, existing.tenant_id)
      .run();

    if (!existing.email && identity.email) {
      const kvRaw = await findKvEntryForTenant(env, existing.tenant_id);
      if (kvRaw) {
        const { key, record } = kvRaw;
        await env.API_KEYS.put(key, JSON.stringify({ ...record, email: resolvedEmail }));
      }
    }

    return { tenantId: existing.tenant_id, email: resolvedEmail, isNew: false };
  }

  const tenantId = await generateUniqueTenantId(env, identity.githubLogin);
  const apiSecret = generateApiKey();
  const apiKeyHash = hashApiKey(apiSecret);

  await env.DB.prepare(
    `INSERT INTO tenants (tenant_id, email, github_id, github_login, api_key_hash, tier, doc_quota, media_quota)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      tenantId,
      identity.email,
      identity.githubId,
      identity.githubLogin,
      apiKeyHash,
      DEFAULT_TIER,
      DEFAULT_DOC_QUOTA,
      DEFAULT_MEDIA_QUOTA
    )
    .run();

  const kvRecord: TenantKvRecord = {
    tenantId,
    email: identity.email,
    githubLogin: identity.githubLogin,
    status: "active",
    tier: DEFAULT_TIER,
    docQuota: DEFAULT_DOC_QUOTA,
    mediaQuota: DEFAULT_MEDIA_QUOTA,
  };
  await env.API_KEYS.put(apiSecret, JSON.stringify(kvRecord));

  return { tenantId, email: identity.email, isNew: true, apiSecret };
}

/**
 * KV is keyed by the raw secret, not the tenant id, so updating a tenant's
 * record in-place (e.g. backfilling email) requires finding its current key
 * via the authenticated request that's doing the update. This helper is only
 * used right after OAuth login, where we don't yet have that key in hand.
 */
async function findKvEntryForTenant(
  env: Env,
  tenantId: string
): Promise<{ key: string; record: TenantKvRecord } | null> {
  const list = await env.API_KEYS.list();
  for (const entry of list.keys) {
    const record = await env.API_KEYS.get(entry.name, { type: "json" });
    if (record && (record as TenantKvRecord).tenantId === tenantId) {
      return { key: entry.name, record: record as TenantKvRecord };
    }
  }
  return null;
}

export async function resolveTenantContext(
  request: Request,
  env: Env
): Promise<TenantContext | Response> {
  const authHeader = request.headers.get("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const apiKey = authHeader.slice("Bearer ".length).trim();
    const record = await env.API_KEYS.get(apiKey, { type: "json" });

    if (!record || (record as TenantKvRecord).status !== "active") {
      return jsonResponse({ error: "Unauthorized: Invalid or revoked API key" }, 403);
    }

    const tenant = record as TenantKvRecord;
    return {
      tenantId: tenant.tenantId,
      docQuota: tenant.docQuota,
      mediaQuota: tenant.mediaQuota,
      authenticated: true,
    };
  }

  const requestedTenant = request.headers.get("x-tenant-id");
  if (requestedTenant && requestedTenant !== "demo_store") {
    return jsonResponse(
      {
        error:
          "Access Denied: Public preview sandbox is strictly restricted to 'demo_store'. Register for your own tenant via GET /api/v1/auth/github/login.",
        quotaNotice: "Public sandbox quota: 100 documents and 5 media files for 'demo_store'.",
      },
      403
    );
  }

  return {
    tenantId: "demo_store",
    docQuota: 100,
    mediaQuota: 5,
    authenticated: false,
  };
}

export async function requireAuthenticatedTenant(
  request: Request,
  env: Env
): Promise<{ apiKey: string; tenant: TenantKvRecord } | Response> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing Authorization: Bearer <api_secret> header" }, 401);
  }

  const apiKey = authHeader.slice("Bearer ".length).trim();
  const record = await env.API_KEYS.get(apiKey, { type: "json" });

  if (!record || (record as TenantKvRecord).status !== "active") {
    return jsonResponse({ error: "Unauthorized: Invalid or revoked API key" }, 403);
  }

  return { apiKey, tenant: record as TenantKvRecord };
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
