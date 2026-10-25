import type { Env } from "./index";

export interface PayPalSubscription {
  id: string;
  status: string;
  plan_id?: string;
  custom_id?: string;
  links?: Array<{ rel: string; href: string }>;
  subscriber?: { email_address?: string };
  billing_info?: {
    next_billing_time?: string;
    failed_payments_count?: number;
    last_payment?: { amount?: { value: string; currency_code: string }; time?: string };
  };
}

export interface PayPalSnapshot {
  status: string;
  planId: string | null;
  payerEmail: string | null;
  priceMonthly: number | null;
  currency: string | null;
  lastPayment: number | null;
  lastPaymentAt: string | null;
  nextBillingAt: string | null;
  failedPayments: number;
  collected30d: number;
}

export async function getAccessToken(env: Env): Promise<string> {
  const response = await fetch(`${env.PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`PayPal OAuth token request failed (${response.status})`);
  }

  const data: any = await response.json();
  return data.access_token;
}

export async function createSubscription(
  env: Env,
  planId: string,
  tenantId: string,
  returnUrl: string,
  cancelUrl: string
): Promise<string> {
  const token = await getAccessToken(env);

  const response = await fetch(`${env.PAYPAL_API_BASE}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `sub-${tenantId}-${Date.now()}`,
    },
    body: JSON.stringify({
      plan_id: planId,
      custom_id: tenantId,
      application_context: {
        brand_name: "EasyDB",
        user_action: "SUBSCRIBE_NOW",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`PayPal subscription creation failed (${response.status}): ${errText}`);
  }

  const subscription: PayPalSubscription = await response.json();
  const approveLink = subscription.links?.find((l) => l.rel === "approve")?.href;
  if (!approveLink) {
    throw new Error("PayPal did not return an approval link for the subscription");
  }

  return approveLink;
}

export async function getSubscription(env: Env, subscriptionId: string): Promise<PayPalSubscription | null> {
  const token = await getAccessToken(env);

  const response = await fetch(`${env.PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return null;
  return response.json();
}

/**
 * Cancels a PayPal subscription immediately, stopping any future billing.
 * Does not refund the already-paid current period — callers are responsible
 * for keeping the tenant's paid access alive until that period's end date.
 */
export async function cancelSubscription(env: Env, subscriptionId: string, reason: string): Promise<boolean> {
  const token = await getAccessToken(env);

  const response = await fetch(`${env.PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason }),
  });

  return response.ok;
}

/**
 * Delegates signature verification to PayPal's own API rather than
 * reimplementing certificate-chain crypto ourselves. A webhook that fails
 * this check must never be allowed to grant a paid tier.
 */
export async function verifyWebhookSignature(env: Env, request: Request, rawBody: string): Promise<boolean> {
  const transmissionId = request.headers.get("PAYPAL-TRANSMISSION-ID");
  const transmissionTime = request.headers.get("PAYPAL-TRANSMISSION-TIME");
  const certUrl = request.headers.get("PAYPAL-CERT-URL");
  const authAlgo = request.headers.get("PAYPAL-AUTH-ALGO");
  const transmissionSig = request.headers.get("PAYPAL-TRANSMISSION-SIG");

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return false;
  }

  let webhookEvent: any;
  try {
    webhookEvent = JSON.parse(rawBody);
  } catch {
    return false;
  }

  const token = await getAccessToken(env);

  const response = await fetch(`${env.PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSig,
      webhook_id: env.PAYPAL_WEBHOOK_ID,
      webhook_event: webhookEvent,
    }),
  });

  if (!response.ok) return false;
  const result: any = await response.json();
  return result.verification_status === "SUCCESS";
}

export function planIdToTier(env: Env, planId: string | undefined): string | null {
  if (!planId) return null;
  if (planId === env.PAYPAL_PLAN_DEVELOPER) return "developer";
  if (planId === env.PAYPAL_PLAN_SCALE) return "scale";
  return null;
}

export function tierToPlanId(env: Env, tier: string): string | null {
  if (tier === "developer") return env.PAYPAL_PLAN_DEVELOPER || null;
  if (tier === "scale") return env.PAYPAL_PLAN_SCALE || null;
  return null;
}

/** Monthly-normalised price of a PayPal billing plan's regular cycle. */
async function fetchPlanMonthlyPrice(
  env: Env,
  token: string,
  planId: string
): Promise<{ price: number; currency: string } | null> {
  const res = await fetch(`${env.PAYPAL_API_BASE}/v1/billing/plans/${encodeURIComponent(planId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const plan: any = await res.json();
  const cycle = (plan.billing_cycles || []).find((c: any) => c.tenure_type === "REGULAR");
  const fixed = cycle?.pricing_scheme?.fixed_price;
  if (!fixed) return null;
  const perCycle = parseFloat(fixed.value);
  const freq = cycle.frequency || {};
  const count = freq.interval_count || 1;
  const monthsPerCycle = freq.interval_unit === "YEAR" ? 12 * count : freq.interval_unit === "MONTH" ? count : freq.interval_unit === "WEEK" ? (count * 7) / 30.4 : (count) / 30.4;
  return { price: perCycle / monthsPerCycle, currency: fixed.currency_code };
}

/**
 * Pulls the authoritative state of one subscription from PayPal: status,
 * plan, price, last/next payment, failures, and money actually collected in
 * the last 30 days. Returns null if PayPal doesn't know the subscription.
 */
export async function fetchSubscriptionSnapshot(
  env: Env,
  token: string,
  subscriptionId: string,
  planPriceCache: Map<string, { price: number; currency: string } | null>
): Promise<PayPalSnapshot | null> {
  const subRes = await fetch(`${env.PAYPAL_API_BASE}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!subRes.ok) return null;
  const sub: PayPalSubscription = await subRes.json();

  let plan: { price: number; currency: string } | null = null;
  if (sub.plan_id) {
    if (!planPriceCache.has(sub.plan_id)) {
      planPriceCache.set(sub.plan_id, await fetchPlanMonthlyPrice(env, token, sub.plan_id));
    }
    plan = planPriceCache.get(sub.plan_id) ?? null;
  }

  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 3600 * 1000);
  let collected = 0;
  const txRes = await fetch(
    `${env.PAYPAL_API_BASE}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/transactions?start_time=${start.toISOString()}&end_time=${end.toISOString()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (txRes.ok) {
    const tx: any = await txRes.json();
    for (const t of tx.transactions || []) {
      if (t.status === "COMPLETED") collected += parseFloat(t.amount_with_breakdown?.gross_amount?.value || "0");
    }
  }

  const last = sub.billing_info?.last_payment;
  return {
    status: sub.status,
    planId: sub.plan_id ?? null,
    payerEmail: sub.subscriber?.email_address ?? null,
    priceMonthly: plan ? Math.round(plan.price * 100) / 100 : null,
    currency: plan?.currency ?? last?.amount?.currency_code ?? null,
    lastPayment: last?.amount ? parseFloat(last.amount.value) : null,
    lastPaymentAt: last?.time ?? null,
    nextBillingAt: sub.billing_info?.next_billing_time ?? null,
    failedPayments: sub.billing_info?.failed_payments_count ?? 0,
    collected30d: Math.round(collected * 100) / 100,
  };
}
