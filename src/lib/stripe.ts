import Stripe from "stripe";

// Server-only helpers. Never import this from a "use client" component —
// it reads secrets that must stay on the server.

// Created lazily so a build that runs without the key set doesn't fail on import.
let client: Stripe | null = null;

export function getStripe() {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    client = new Stripe(key);
  }
  return client;
}

export function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET;
}

// Where Stripe sends the customer back to. SITE_URL wins so it stays correct behind a
// proxy; otherwise it's the origin the request came in on.
export function getSiteUrl(req: Request) {
  const configured = process.env.SITE_URL?.replace(/\/+$/, "");
  return configured || new URL(req.url).origin;
}
