import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getStripe, getSiteUrl } from "@/lib/stripe";
import { CURRENCY, priceCart } from "@/lib/catalog";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REFERENCE_RE = /^MCB-\d{10,}$/;
// Stripe won't accept a Checkout Session that expires in under 30 minutes.
const SESSION_TTL_SECONDS = 31 * 60;

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

// Creates (or refreshes) the PENDING order and a Stripe Checkout Session for it, and
// returns the URL to send the customer to. The amount is worked out here from the
// catalog — the browser only says which products and how many.
//
// Idempotent per `reference`: if the customer comes back from Stripe without paying and
// presses pay again, the client sends the same reference, the still-PENDING order is
// updated in place and its previous session is closed, so one purchase stays one order.
// A reference that already moved past PENDING (paid, declined, expired) gets a new one.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const priced = priceCart(body?.cart);
  if (!priced) {
    return NextResponse.json({ error: "Invalid cart" }, { status: 400 });
  }

  const s = body?.shipping ?? {};
  const shipping = {
    name: clean(s.name),
    phone: clean(s.phone),
    phoneIso: clean(s.phoneIso),
    email: clean(s.email),
    country: clean(s.country),
    department: clean(s.department),
    city: clean(s.city),
    address: clean(s.address),
    apt: clean(s.apt),
    postalCode: clean(s.postalCode),
    notes: clean(s.notes),
  };
  const required = [shipping.name, shipping.phone, shipping.phoneIso, shipping.country, shipping.department, shipping.city, shipping.address];
  if (required.some((v) => !v) || !EMAIL_RE.test(shipping.email)) {
    return NextResponse.json({ error: "Missing or invalid shipping data" }, { status: 400 });
  }

  const locale = body?.locale === "en" ? "en" : "es";

  // The origin mix is only trusted if it adds up to the doses ordered; otherwise the whole
  // order is Huila, the only origin offered for now.
  const o = body?.origins ?? {};
  const mix = { huila: Number(o.huila) || 0, tolima: Number(o.tolima) || 0, cauca: Number(o.cauca) || 0 };
  const origins = mix.huila + mix.tolima + mix.cauca === priced.doseQty && Object.values(mix).every((n) => Number.isInteger(n) && n >= 0)
    ? mix
    : { huila: priced.doseQty, tolima: 0, cauca: 0 };

  const fields = {
    locale,
    dose_qty: priced.doseQty,
    dose_price_eur: priced.totalEur,
    amount_in_cents: priced.amountInCents,
    currency: CURRENCY,
    origin_huila: origins.huila,
    origin_tolima: origins.tolima,
    origin_cauca: origins.cauca,
    customer_name: shipping.name,
    customer_email: shipping.email,
    customer_phone: shipping.phone,
    customer_phone_country: shipping.phoneIso,
    shipping_country: shipping.country,
    shipping_department: shipping.department,
    shipping_city: shipping.city,
    shipping_address: shipping.address,
    shipping_apt: shipping.apt || null,
    shipping_postal_code: shipping.postalCode || null,
    notes: shipping.notes || null,
  };

  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    console.error("Checkout: Stripe is not configured", err);
    return NextResponse.json({ error: "Payments are not configured" }, { status: 500 });
  }
  const supabase = getSupabaseAdmin();

  let reference: string = REFERENCE_RE.test(body?.reference ?? "") ? body.reference : `MCB-${Date.now()}`;

  const { data: existing, error: lookupError } = await supabase
    .from("orders")
    .select("status,stripe_session_id")
    .eq("reference", reference)
    .maybeSingle();
  if (lookupError) {
    console.error("Checkout: failed to look up order", lookupError);
    return NextResponse.json({ error: "Could not prepare the order" }, { status: 500 });
  }

  // Set when this order already has a session from an earlier attempt; closed further down,
  // once the new session is stored on the order.
  let previousSessionId: string | null = null;

  if (existing && existing.status === "PENDING") {
    const { error } = await supabase
      .from("orders")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("reference", reference)
      .eq("status", "PENDING");
    if (error) {
      console.error("Checkout: failed to update pending order", error);
      return NextResponse.json({ error: "Could not prepare the order" }, { status: 500 });
    }
    previousSessionId = existing.stripe_session_id;
  } else {
    if (existing) reference = `MCB-${Date.now()}`;
    const { error } = await supabase.from("orders").insert({ reference, status: "PENDING", ...fields });
    if (error) {
      console.error("Checkout: failed to create order", error);
      return NextResponse.json({ error: "Could not prepare the order" }, { status: 500 });
    }
  }

  // Shown on the payment in the Stripe dashboard, so where to ship it is visible there too
  // (the address itself was collected on our form, not on Stripe's page).
  const shipTo = [shipping.address, shipping.apt, shipping.city, shipping.department, shipping.country, shipping.postalCode]
    .filter(Boolean)
    .join(", ");
  const metadata = { reference, ship_to: `${shipping.name} — ${shipTo}`.slice(0, 500) };

  const site = getSiteUrl(req);
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale,
      customer_email: shipping.email,
      client_reference_id: reference,
      metadata,
      payment_intent_data: { metadata },
      expires_at: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
      line_items: priced.lines.map((l) => ({
        quantity: l.qty,
        price_data: {
          currency: CURRENCY,
          unit_amount: l.unitAmountCents,
          product_data: {
            name: "MCB PERSONAL",
            description: `${l.sachetsPerPack} sachets`,
          },
        },
      })),
      success_url: `${site}/checkout/gracias?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/checkout`,
    });
  } catch (err) {
    console.error("Checkout: failed to create Stripe session", err);
    return NextResponse.json({ error: "Could not start the payment" }, { status: 502 });
  }

  const { error: linkError } = await supabase
    .from("orders")
    .update({ stripe_session_id: session.id, updated_at: new Date().toISOString() })
    .eq("reference", reference);
  if (linkError) {
    // The webhook finds the order by reference, so payment still works; only the
    // "close the previous session" step on a retry is lost.
    console.error("Checkout: failed to store session id", linkError);
  } else if (previousSessionId) {
    // Only one session may be payable per order, or a customer with two tabs open could pay
    // the same order twice. It's closed only now that the order points at the new session:
    // Stripe answers with a "session expired" event, and the webhook ignores it unless it
    // belongs to the order's current session — closing it earlier would mark the order
    // EXPIRED while its new session is still open.
    await stripe.checkout.sessions.expire(previousSessionId).catch(() => {});
  }

  if (!session.url) {
    return NextResponse.json({ error: "Could not start the payment" }, { status: 502 });
  }
  return NextResponse.json({ url: session.url, reference });
}
