import type { Env } from "./index";

export interface PayPalSubscription {
  id: string;
  status: string;
  plan_id?: string;
  custom_id?: string;
  links?: Array<{ rel: string; href: string }>;
}

async function getAccessToken(env: Env): Promise<string> {
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
