import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getStripe, getSiteUrl } from "@/lib/stripe";
import { CURRENCY, priceCart } from "@/lib/catalog";
import {
  CHECKOUT_KEY, ORDER_REFERENCE, checkoutKeyHash, claimOrderAction, hasLaterLegacyCheckout,
  readRecoveryToken, releaseOrderAction,
} from "@/lib/checkoutRecovery";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Stripe won't accept a Checkout Session that expires in under 30 minutes.
const SESSION_TTL_SECONDS = 31 * 60;

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

// Keep one order across payment attempts so a reminder and its recovery link
// always follow the current payment state.
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
    checkout_cart: priced.lines.map(({ productId, qty }) => ({ productId, qty })),
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

  const suppliedReference = typeof body.reference === "string" && ORDER_REFERENCE.test(body.reference) ? body.reference : null;
  const keyHash = typeof body.checkoutKey === "string" && CHECKOUT_KEY.test(body.checkoutKey)
    ? checkoutKeyHash(body.checkoutKey)
    : null;
  const db = getSupabaseAdmin();
  let reference = suppliedReference;
  let lock: string | null = null;

  try {
    const stripe = getStripe();
    const recovery = body.recoveryToken != null;
    if (recovery && (!reference || readRecoveryToken(body.recoveryToken) !== reference)) {
      return NextResponse.json({ error: "Invalid recovery link", code: "RECOVERY_UNAVAILABLE" }, { status: 404 });
    }

    if (!reference && keyHash) {
      const { data, error } = await db.from("orders")
        .select("reference")
        .eq("checkout_key_hash", keyHash)
        .maybeSingle();
      if (error) throw error;
      reference = data?.reference ?? null;
    }

    if (!reference) {
      reference = `MCB-${Date.now()}${randomInt(100000, 1000000)}`;
      const { error } = await db.from("orders")
        .insert({ reference, status: "PENDING", checkout_key_hash: keyHash, ...fields });
      if (error?.code === "23505") {
        return NextResponse.json({ error: "Checkout already starting" }, { status: 409 });
      }
      if (error) throw error;
    }

    // Authorize before reserving the order and check again while holding the lock.
    const { data: candidate, error: lookupError } = await db.from("orders")
      .select("checkout_key_hash,customer_email")
      .eq("reference", reference)
      .maybeSingle();
    if (lookupError) throw lookupError;
    const ownsOrder = (order: { checkout_key_hash: string | null; customer_email: string }) => recovery ||
      (order.checkout_key_hash ? order.checkout_key_hash === keyHash : order.customer_email === shipping.email);
    if (!candidate || !ownsOrder(candidate)) {
      return NextResponse.json({ error: "Checkout unavailable", code: "RECOVERY_UNAVAILABLE" }, { status: 404 });
    }

    lock = await claimOrderAction(db, reference);
    if (!lock) return NextResponse.json({ error: "Checkout already starting" }, { status: 409 });

    const { data: order, error: orderError } = await db.from("orders")
      .select("status,stripe_session_id,checkout_key_hash,customer_email,checkout_cart,dose_qty,created_at,reminder_attempt")
      .eq("reference", reference)
      .eq("checkout_locked_until", lock)
      .single();
    if (orderError) throw orderError;
    if (!ownsOrder(order) || (recovery && (!order.reminder_attempt || await hasLaterLegacyCheckout(db, order)))) {
      return NextResponse.json({ error: "Checkout unavailable", code: "RECOVERY_UNAVAILABLE" }, { status: 404 });
    }

    const site = getSiteUrl(req);
    if (order.stripe_session_id) {
      const previous = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      if (previous.payment_status === "paid" || (previous.status === "complete" && order.status !== "DECLINED")) {
        return NextResponse.json({ url: `${site}/checkout/gracias?session_id=${previous.id}`, reference });
      }
      if (["PENDING", "EXPIRED", "DECLINED"].includes(order.status) && previous.status === "open") {
        // Close the old session before the new URL can be made payable.
        await stripe.checkout.sessions.expire(previous.id);
      }
    }
    if (!["PENDING", "EXPIRED", "DECLINED"].includes(order.status)) {
      return NextResponse.json({ error: "Checkout unavailable" }, { status: 409 });
    }

    // Stripe's dashboard uses this metadata to show where to ship the order.
    const shipTo = [shipping.address, shipping.apt, shipping.city, shipping.department, shipping.country, shipping.postalCode]
      .filter(Boolean)
      .join(", ");
    const metadata = { reference, ship_to: `${shipping.name} — ${shipTo}`.slice(0, 500) };
    const session = await stripe.checkout.sessions.create({
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

    const { data: linked, error: linkError } = await db.from("orders")
      .update({
        ...fields,
        status: "PENDING",
        checkout_key_hash: order.checkout_key_hash ?? keyHash,
        stripe_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("reference", reference)
      .eq("checkout_locked_until", lock)
      .in("status", ["PENDING", "EXPIRED", "DECLINED"])
      .select("reference")
      .maybeSingle();
    if (linkError || !linked || !session.url) {
      await stripe.checkout.sessions.expire(session.id).catch(() => {});
      if (linkError) throw linkError;
      return NextResponse.json({ error: "Could not start the payment" }, { status: 502 });
    }

    return NextResponse.json({ url: session.url, reference });
  } catch (error) {
    console.error("Checkout: could not start payment", { reference, error: error instanceof Error ? error.name : "database" });
    return NextResponse.json({ error: "Could not start the payment" }, { status: 502 });
  } finally {
    if (reference && lock) await releaseOrderAction(db, reference, lock);
  }
}
