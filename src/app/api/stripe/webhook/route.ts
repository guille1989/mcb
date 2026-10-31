import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendOrderConfirmationEmail } from "@/lib/email";

// Stripe calls this as a Checkout Session moves through its life — this is the only
// reliable place to persist a final order status, since the customer's browser might
// never return from Stripe. Statuses use the same words as before (APPROVED, DECLINED)
// so the admin and the confirmation email didn't need to change.
export async function POST(req: Request) {
  const secret = getStripeWebhookSecret();
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // The signature is computed over the exact bytes Stripe sent, so read the raw text.
  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    console.warn("Stripe webhook: invalid signature, ignoring event", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      // Delayed methods complete the session before the money arrives; those are
      // confirmed later by async_payment_succeeded.
      if (session.payment_status === "paid") return approve(session);
      return NextResponse.json({ ok: true });
    }
    case "checkout.session.async_payment_succeeded":
      return approve(event.data.object);
    case "checkout.session.async_payment_failed":
      return setStatus(event.data.object, "DECLINED");
    case "checkout.session.expired":
      // The customer never paid. Only a still-PENDING order is marked, so a late event
      // can't overwrite one that was paid through another session — and only when this is
      // the order's current session, since a retry closes the previous one on purpose.
      return setStatus(event.data.object, "EXPIRED", { status: "PENDING", currentSession: true });
    default:
      return NextResponse.json({ ok: true });
  }
}

function referenceOf(session: Stripe.Checkout.Session) {
  return session.client_reference_id ?? session.metadata?.reference ?? null;
}

async function setStatus(
  session: Stripe.Checkout.Session,
  status: string,
  only?: { status?: string; currentSession?: boolean },
) {
  const reference = referenceOf(session);
  if (!reference) return NextResponse.json({ ok: true });

  let query = getSupabaseAdmin()
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("reference", reference);
  if (only?.status) query = query.eq("status", only.status);
  if (only?.currentSession) query = query.eq("stripe_session_id", session.id);

  const { error } = await query;
  if (error) {
    console.error("Stripe webhook: failed to update order", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

async function approve(session: Stripe.Checkout.Session) {
  const reference = referenceOf(session);
  if (!reference) return NextResponse.json({ ok: true });

  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("orders")
    .update({
      status: "APPROVED",
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntent,
      updated_at: new Date().toISOString(),
    })
    .eq("reference", reference);

  if (error) {
    console.error("Stripe webhook: failed to update order", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }

  // Flips confirmation_email_sent false→true, but only for the row that's still false.
  // If Stripe retries this same event, the second call matches 0 rows and `claimed` is
  // null — so the email only ever goes out once.
  const { data: claimed } = await supabase
    .from("orders")
    .update({ confirmation_email_sent: true })
    .eq("reference", reference)
    .eq("confirmation_email_sent", false)
    .select()
    .maybeSingle();

  if (claimed) {
    try {
      await sendOrderConfirmationEmail(claimed);
    } catch (emailError) {
      // Don't fail the whole webhook over an email hiccup — the order is already saved.
      // The flag goes back to false so the admin shows that no email actually went out.
      console.error("Stripe webhook: failed to send confirmation email", emailError);
      await supabase.from("orders").update({ confirmation_email_sent: false }).eq("reference", reference);
    }
  }

  return NextResponse.json({ ok: true });
}
