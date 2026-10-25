import crypto from "node:crypto";
import type { Env } from "./index";
import { getTier } from "./tiers";

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
}

export interface TenantContext {
  tenantId: string;
  tier: string;
  authenticated: boolean;
}

export interface ProvisionResult {
  tenantId: string;
  email: string | null;
  isNew: boolean;
  apiSecret?: string;
}

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const GITHUB_SCOPE = "read:user user:email";
const SESSION_COOKIE = "edb_session";

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

/**
 * Generic stateless signed-token helper (HMAC-SHA256 over a JSON payload).
 * Used for both the OAuth CSRF state and the dashboard session cookie so
 * there's one mechanism, and one secret, to reason about.
 */
export function signToken(secret: string, payload: Record<string, any>, ttlMs: number): string {
  const body = { ...payload, exp: Date.now() + ttlMs };
  const encoded = base64UrlEncode(JSON.stringify(body));
  const signature = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyToken<T = Record<string, any>>(secret: string, token: string | null): T | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  const expectedSignature = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  if (signature.length !== expectedSignature.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return null;

  let body: any;
  try {
    body = JSON.parse(base64UrlDecode(encoded));
  } catch {
    return null;
  }

  if (typeof body.exp !== "number" || Date.now() > body.exp) return null;
  return body as T;
}

export function signState(secret: string): string {
  return signToken(secret, {}, STATE_TTL_MS);
}

export function verifyState(secret: string, state: string | null): boolean {
  return verifyToken(secret, state) !== null;
}

function cookieValue(cookieHeader: string, name: string): string | null {
  return (
    cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${name}=`))
      ?.slice(name.length + 1) || null
  );
}

export function createSessionCookie(tenantId: string, env: Env): string {
  const token = signToken(env.OAUTH_STATE_SECRET || "", { tenantId }, SESSION_TTL_MS);
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}; Path=/`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`;
}

export function readSession(request: Request, env: Env): { tenantId: string } | null {
  const cookieHeader = request.headers.get("Cookie") || "";
  const token = cookieValue(cookieHeader, SESSION_COOKIE);
  const payload = verifyToken<{ tenantId: string }>(env.OAUTH_STATE_SECRET || "", token);
  return payload ? { tenantId: payload.tenantId } : null;
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
    `INSERT INTO tenants (tenant_id, email, github_id, github_login, api_key_hash, api_key_last4, key_rotated_at, tier)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`
  )
    .bind(
      tenantId,
      identity.email,
      identity.githubId,
      identity.githubLogin,
      apiKeyHash,
      apiSecret.slice(-4),
      DEFAULT_TIER
    )
    .run();

  const kvRecord: TenantKvRecord = {
    tenantId,
    email: identity.email,
    githubLogin: identity.githubLogin,
    status: "active",
    tier: DEFAULT_TIER,
  };
  await env.API_KEYS.put(apiSecret, JSON.stringify(kvRecord));

  return { tenantId, email: identity.email, isNew: true, apiSecret };
}

/**
 * KV is keyed by the raw secret, not the tenant id. Finding a tenant's current
 * KV entry by tenantId (needed to backfill email, or to rotate a key when all
 * we have is a session/tenantId and not the raw secret) requires a scan.
 * Fine at prototype scale; would need an index if the tenant count grows large.
 */
async function findKvEntryForTenant(
  env: Env,
  tenantId: string
): Promise<{ key: string; record: TenantKvRecord } | null> {
  const list = await env.API_KEYS.list();
  for (const entry of list.keys) {
    if (entry.name.startsWith("usage:") || entry.name.startsWith("adminfail:")) continue;
    const record = await env.API_KEYS.get(entry.name, { type: "json" });
    if (record && (record as TenantKvRecord).tenantId === tenantId) {
      return { key: entry.name, record: record as TenantKvRecord };
    }
  }
  return null;
}

/**
 * Looks up a tenant's current plaintext API secret for the dashboard's
 * reveal-key action. Session-authenticated callers only — never exposed
 * over Bearer auth, since anyone with the plaintext key already has it.
 */
export async function getPlaintextApiKeyForTenant(env: Env, tenantId: string): Promise<string | null> {
  const entry = await findKvEntryForTenant(env, tenantId);
  return entry ? entry.key : null;
}

/**
 * Rotates a tenant's API secret. Shared by the Bearer-authenticated
 * "I still have my key, rotate it proactively" endpoint and the
 * session-authenticated dashboard "I lost my key" recovery endpoint — the
 * latter is the one that actually delivers on key recovery, since Bearer
 * auth is impossible once the key is truly lost.
 */
export async function rotateKeyForTenant(
  env: Env,
  tenantId: string,
  currentKvEntry?: { key: string; record: TenantKvRecord }
): Promise<string> {
  const existingEntry = currentKvEntry || (await findKvEntryForTenant(env, tenantId));
  if (!existingEntry) {
    throw new Error(`No active API key found for tenant '${tenantId}'`);
  }

  const newApiSecret = generateApiKey();
  const newHash = hashApiKey(newApiSecret);

  await env.DB.prepare(
    `UPDATE tenants SET api_key_hash = ?, api_key_last4 = ?, key_rotated_at = CURRENT_TIMESTAMP WHERE tenant_id = ?`
  )
    .bind(newHash, newApiSecret.slice(-4), tenantId)
    .run();

  await env.API_KEYS.put(newApiSecret, JSON.stringify(existingEntry.record));
  await env.API_KEYS.delete(existingEntry.key);

  return newApiSecret;
}

/**
 * Applies a tier change (upgrade on subscription activation, downgrade to
 * 'free' on cancellation/expiration/suspension) to both D1 and the tenant's
 * KV record. Called from both the PayPal webhook (authoritative) and the
 * optimistic subscribe-return-path check — safe to call more than once with
 * the same tier.
 */
export async function applyTierChange(
  env: Env,
  tenantId: string,
  tier: string,
  subscriptionId: string | null
): Promise<void> {
  await env.DB.prepare(`UPDATE tenants SET tier = ?, paypal_subscription_id = ?, tier_expires_at = NULL WHERE tenant_id = ?`)
    .bind(tier, subscriptionId, tenantId)
    .run();

  const kvEntry = await findKvEntryForTenant(env, tenantId);
  if (kvEntry) {
    await env.API_KEYS.put(kvEntry.key, JSON.stringify({ ...kvEntry.record, tier }));
  }
}

/**
 * Records that a tenant's current paid tier should revert to Free once
 * `expiresAt` passes, without touching their tier (or the KV copy used for
 * live API auth) yet — they already paid for the current period, so access
 * keeps working at the paid tier until `processExpiredDowngrades` sees it's
 * due. Overwrites any previously scheduled downgrade for the same tenant.
 */
export async function scheduleDowngradeToFree(env: Env, tenantId: string, expiresAt: string): Promise<void> {
  await env.DB.prepare(`UPDATE tenants SET tier_expires_at = ? WHERE tenant_id = ?`).bind(expiresAt, tenantId).run();
}

/**
 * Sweeps tenants whose scheduled downgrade date has passed and actually
 * flips them to Free (D1 + KV). Meant to be called from the Worker's `scheduled`
 * (cron) handler — nothing about request traffic drives this.
 */
export async function processExpiredDowngrades(env: Env): Promise<void> {
  const { results } = await env.DB.prepare(
    `SELECT tenant_id FROM tenants WHERE tier_expires_at IS NOT NULL AND tier_expires_at <= CURRENT_TIMESTAMP AND tier != 'free'`
  ).all<{ tenant_id: string }>();

  for (const row of results || []) {
    await applyTierChange(env, row.tenant_id, "free", null);
  }
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
      tier: tenant.tier,
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
    tier: "free",
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

/**
 * Monthly request counter, used both for dashboard display and for the
 * per-tenant request-quota check in the top-level fetch handler. Recording is
 * best-effort and never blocks or throws on failure — an occasional missed
 * count is fine, but a KV outage must never break the real request. Reuses
 * the API_KEYS namespace under a "usage:" prefix rather than provisioning a
 * dedicated namespace just for a counter.
 */
function usageKey(tenantId: string, date = new Date()): string {
  const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  return `usage:${tenantId}:${month}`;
}

export async function recordRequestUsage(env: Env, tenantId: string): Promise<void> {
  try {
    const key = usageKey(tenantId);
    const current = await env.API_KEYS.get(key);
    const next = (current ? parseInt(current, 10) || 0 : 0) + 1;
    await env.API_KEYS.put(key, String(next), { expirationTtl: 60 * 60 * 24 * 45 });
  } catch {
    // Never let usage tracking affect the real request.
  }
}

export async function getMonthlyUsage(env: Env, tenantId: string): Promise<number> {
  const current = await env.API_KEYS.get(usageKey(tenantId));
  return current ? parseInt(current, 10) || 0 : 0;
}

export { getTier };

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function isTenantBlocked(env: Env, tenantId: string): Promise<boolean> {
  const row = await env.DB.prepare(`SELECT blocked_at FROM tenants WHERE tenant_id = ?`)
    .bind(tenantId)
    .first<{ blocked_at: string | null }>();
  return !!row?.blocked_at;
}

/**
 * Blocking revokes the live API key (KV status) and flags the D1 row so the
 * dashboard session is refused too. Unblocking reverses both.
 */
export async function setTenantBlocked(env: Env, tenantId: string, blocked: boolean): Promise<void> {
  await env.DB.prepare(`UPDATE tenants SET blocked_at = ${blocked ? "CURRENT_TIMESTAMP" : "NULL"} WHERE tenant_id = ?`)
    .bind(tenantId)
    .run();
  const kvEntry = await findKvEntryForTenant(env, tenantId);
  if (kvEntry) {
    await env.API_KEYS.put(
      kvEntry.key,
      JSON.stringify({ ...kvEntry.record, status: blocked ? "revoked" : "active" })
    );
  }
}

/** Removes the tenant's API key and monthly usage counters from KV. */
export async function deleteTenantKvData(env: Env, tenantId: string): Promise<void> {
  const kvEntry = await findKvEntryForTenant(env, tenantId);
  if (kvEntry) await env.API_KEYS.delete(kvEntry.key);
  const usage = await env.API_KEYS.list({ prefix: `usage:${tenantId}:` });
  for (const k of usage.keys) await env.API_KEYS.delete(k.name);
}

// ---------------------------------------------------------------------------
// Admin console auth: a single username/password configured as Worker secrets
// (ADMIN_USERNAME / ADMIN_PASSWORD), separate from tenant GitHub sessions.
// ---------------------------------------------------------------------------
const ADMIN_COOKIE = "edb_admin";
const ADMIN_TTL_MS = 8 * 60 * 60 * 1000;
const ADMIN_MAX_FAILURES = 5;
const ADMIN_LOCKOUT_SECONDS = 15 * 60;

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function isAdminConfigured(env: Env): boolean {
  return !!(env.ADMIN_USERNAME && env.ADMIN_PASSWORD && env.OAUTH_STATE_SECRET);
}

export function readAdminSession(request: Request, env: Env): boolean {
  if (!isAdminConfigured(env)) return false;
  const token = cookieValue(request.headers.get("Cookie") || "", ADMIN_COOKIE);
  const payload = verifyToken<{ admin: boolean; u: string }>(env.OAUTH_STATE_SECRET || "", token);
  return !!payload && payload.admin === true && safeEqual(payload.u, env.ADMIN_USERNAME || "");
}

export async function attemptAdminLogin(
  request: Request,
  env: Env,
  username: string,
  password: string
): Promise<{ ok: true; cookie: string } | { ok: false; status: number; error: string }> {
  if (!isAdminConfigured(env)) {
    return { ok: false, status: 503, error: "Admin login is not configured" };
  }
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const failKey = `adminfail:${ip}`;
  const failures = parseInt((await env.API_KEYS.get(failKey)) || "0", 10);
  if (failures >= ADMIN_MAX_FAILURES) {
    return { ok: false, status: 429, error: "Too many failed attempts. Try again later." };
  }

  // Evaluate both so timing doesn't reveal which field was wrong.
  const userOk = safeEqual(username, env.ADMIN_USERNAME || "");
  const passOk = safeEqual(password, env.ADMIN_PASSWORD || "");
  if (!(userOk && passOk)) {
    await env.API_KEYS.put(failKey, String(failures + 1), { expirationTtl: ADMIN_LOCKOUT_SECONDS });
    return { ok: false, status: 401, error: "Invalid username or password" };
  }

  await env.API_KEYS.delete(failKey);
  const token = signToken(env.OAUTH_STATE_SECRET || "", { admin: true, u: username }, ADMIN_TTL_MS);
  const cookie = `${ADMIN_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${ADMIN_TTL_MS / 1000}; Path=/`;
  return { ok: true, cookie };
}

export function clearAdminCookie(): string {
  return `${ADMIN_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`;
}
