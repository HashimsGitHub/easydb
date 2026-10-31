import type { Env } from "./index";
import { applyTierChange, scheduleDowngradeToFree } from "./auth";
import { getAccessToken, fetchSubscriptionSnapshot, getSubscription, planIdToTier } from "./paypal";

type PriceCache = Map<string, { price: number; currency: string } | null>;
export type ReconcileResult = "ok" | "none" | "failed" | "reset";

export async function auditLog(env: Env, action: string, tenantId: string | null, detail = ""): Promise<void> {
  await env.DB.prepare(`INSERT INTO admin_audit (action, tenant_id, detail) VALUES (?, ?, ?)`)
    .bind(action, tenantId, detail.slice(0, 500))
    .run();
}

/**
 * PayPal is the source of truth for billing. This reads the tenant's
 * subscription from PayPal, caches the snapshot in D1 and makes the tenant's
 * plan match it. Transient PayPal errors never downgrade anyone.
 *
 * Subscriptions created against a different PayPal environment (Sandbox vs
 * Live) can't exist in the current one, so they are cleared and the tenant
 * returns to Free instead of lingering as stale data.
 */
export async function reconcileTenant(
  env: Env,
  tenantId: string,
  token?: string,
  cache: PriceCache = new Map()
): Promise<ReconcileResult> {
  const row = await env.DB.prepare(
    `SELECT tier, tier_expires_at, paypal_subscription_id, paypal_env FROM tenants WHERE tenant_id = ?`
  )
    .bind(tenantId)
    .first<{ tier: string; tier_expires_at: string | null; paypal_subscription_id: string | null; paypal_env: string | null }>();
  if (!row?.paypal_subscription_id) return "none";

  const currentEnv = env.PAYPAL_API_BASE || "";
  if (row.paypal_env && row.paypal_env !== currentEnv) {
    await env.DB.prepare(
      `UPDATE tenants SET paypal_status = NULL, paypal_plan_id = NULL, paypal_payer_email = NULL, paypal_price_monthly = NULL,
         paypal_start_time = NULL, paypal_currency = NULL, paypal_last_payment = NULL, paypal_last_payment_at = NULL, paypal_next_billing_at = NULL,
         paypal_failed_payments = NULL, paypal_collected_30d = NULL, paypal_synced_at = NULL, paypal_env = NULL
       WHERE tenant_id = ?`
    )
      .bind(tenantId)
      .run();
    await applyTierChange(env, tenantId, "free", null);
    await auditLog(env, "paypal-env-reset", tenantId, `subscription from ${row.paypal_env} cleared`);
    return "reset";
  }

  const snap = await fetchSubscriptionSnapshot(env, token ?? (await getAccessToken(env)), row.paypal_subscription_id, cache).catch(
    () => null
  );
  if (!snap) return "failed";

  await env.DB.prepare(
    `UPDATE tenants SET paypal_status = ?, paypal_plan_id = ?, paypal_start_time = ?, paypal_payer_email = ?, paypal_price_monthly = ?, paypal_currency = ?,
       paypal_last_payment = ?, paypal_last_payment_at = ?, paypal_next_billing_at = ?, paypal_failed_payments = ?,
       paypal_collected_30d = ?, paypal_env = ?, paypal_synced_at = CURRENT_TIMESTAMP WHERE tenant_id = ?`
  )
    .bind(snap.status, snap.planId, snap.startTime, snap.payerEmail, snap.priceMonthly, snap.currency, snap.lastPayment, snap.lastPaymentAt,
      snap.nextBillingAt, snap.failedPayments, snap.collected30d, currentEnv, tenantId)
    .run();

  if (snap.status === "ACTIVE") {
    const tier = planIdToTier(env, snap.planId || undefined);
    if (tier && (row.tier !== tier || row.tier_expires_at)) {
      await applyTierChange(env, tenantId, tier, row.paypal_subscription_id);
    }
  } else if (snap.status === "CANCELLED" || snap.status === "EXPIRED") {
    // A paid period may still be running; only schedule once, and never extend an existing schedule.
    if (row.tier !== "free" && !row.tier_expires_at) {
      const next = snap.status === "CANCELLED" ? snap.nextBillingAt : null;
      if (next && Date.parse(next) > Date.now()) await scheduleDowngradeToFree(env, tenantId, next);
      else await applyTierChange(env, tenantId, "free", null);
    }
  } else if (snap.status === "SUSPENDED") {
    if (row.tier !== "free") await applyTierChange(env, tenantId, "free", null);
  }
  return "ok";
}

/**
 * Handles a webhook event for one subscription. Events for a subscription
 * that is not the tenant's current one (e.g. an old cancelled plan) are
 * ignored so they can't downgrade an active subscriber.
 */
export async function handleSubscriptionEvent(env: Env, subscriptionId: string): Promise<void> {
  const sub = await getSubscription(env, subscriptionId);
  const tenantId = sub?.custom_id;
  if (!sub || !tenantId) return;

  const row = await env.DB.prepare(`SELECT paypal_subscription_id FROM tenants WHERE tenant_id = ?`)
    .bind(tenantId)
    .first<{ paypal_subscription_id: string | null }>();
  if (!row) return;

  if (row.paypal_subscription_id !== subscriptionId) {
    const tier = sub.status === "ACTIVE" ? planIdToTier(env, sub.plan_id) : null;
    if (!tier) return;
    await applyTierChange(env, tenantId, tier, subscriptionId);
  }
  await reconcileTenant(env, tenantId);
}

/** Scheduled safety net for missed webhooks: refreshes the stalest subscriptions. */
export async function reconcileStaleTenants(env: Env, limit = 10): Promise<{ checked: number; failed: number }> {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_API_BASE) return { checked: 0, failed: 0 };
  const { results } = await env.DB.prepare(
    `SELECT tenant_id FROM tenants WHERE paypal_subscription_id IS NOT NULL
       AND (paypal_synced_at IS NULL OR paypal_synced_at < datetime('now', '-1 hour'))
     ORDER BY COALESCE(paypal_synced_at, '') ASC LIMIT ?`
  )
    .bind(limit)
    .all<{ tenant_id: string }>();
  if (!results.length) return { checked: 0, failed: 0 };

  const token = await getAccessToken(env);
  const cache: PriceCache = new Map();
  let failed = 0;
  for (const t of results) {
    const r = await reconcileTenant(env, t.tenant_id, token, cache).catch(() => "failed" as const);
    if (r === "failed") failed++;
  }
  return { checked: results.length, failed };
}
