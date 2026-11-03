import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, isValidSessionToken } from "@/lib/adminAuth";
import {
  ORDER_REFERENCE, claimOrderAction, createRecoveryToken, hasLaterLegacyCheckout,
  recoverCart, releaseOrderAction,
} from "@/lib/checkoutRecovery";
import { sendCheckoutReminderEmail } from "@/lib/email";
import { getSiteUrl, getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

// Resend keeps idempotency keys for 24 hours. Leave margin for clock skew and latency.
const RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;

type ReminderAttempt = {
  startedAt: string;
  to: string;
  locale: "es" | "en";
  origin: string;
};

export async function POST(req: Request) {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!isValidSessionToken(token)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (req.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 415 });
  }

  const body = await req.json().catch(() => null);
  const { reference, recipient } = body ?? {};
  if (typeof reference !== "string" || !ORDER_REFERENCE.test(reference) || typeof recipient !== "string") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  let lock: string | null = null;
  try {
    lock = await claimOrderAction(db, reference);
    if (!lock) {
      return NextResponse.json({ error: "El pedido no está disponible. Actualiza el panel e inténtalo de nuevo." }, { status: 409 });
    }

    const { data: order, error } = await db.from("orders")
      .select("reference,status,stripe_session_id,customer_email,locale,checkout_cart,dose_qty,created_at,reminder_attempt,reminder_sent_at")
      .eq("reference", reference)
      .single();
    if (error) throw error;
    if (order.customer_email !== recipient) {
      return NextResponse.json({ error: "El destinatario cambió. Revisa el pedido antes de volver a confirmar." }, { status: 409 });
    }
    if (order.reminder_sent_at) return NextResponse.json({ sentAt: order.reminder_sent_at });
    if (order.status !== "EXPIRED" || !order.stripe_session_id || !recoverCart(order) ||
        await hasLaterLegacyCheckout(db, order)) {
      return NextResponse.json({ error: "Este pedido ya no reúne las condiciones para enviar un recordatorio." }, { status: 409 });
    }

    const session = await getStripe().checkout.sessions.retrieve(order.stripe_session_id);
    if (session.status !== "expired" || session.payment_status !== "unpaid") {
      return NextResponse.json({ error: "Stripe indica que la compra ya no está abandonada." }, { status: 409 });
    }

    const attempt: ReminderAttempt = order.reminder_attempt ?? {
      startedAt: new Date().toISOString(),
      to: order.customer_email,
      locale: order.locale === "en" ? "en" : "es",
      origin: new URL(getSiteUrl(req)).origin,
    };
    if (attempt.to !== order.customer_email || Date.now() - Date.parse(attempt.startedAt) >= RETRY_WINDOW_MS) {
      return NextResponse.json({ error: "Revisa el intento anterior en Resend antes de volver a enviar." }, { status: 409 });
    }

    const recoveryToken = createRecoveryToken(reference, attempt.startedAt);
    const url = new URL("/checkout", attempt.origin);
    url.hash = `retomar=${recoveryToken}`;
    const { data: ready, error: prepareError } = await db.from("orders")
      .update({ reminder_attempt: attempt })
      .eq("reference", reference)
      .eq("checkout_locked_until", lock)
      .eq("stripe_session_id", order.stripe_session_id)
      .eq("status", "EXPIRED")
      .is("reminder_sent_at", null)
      .select("reference")
      .maybeSingle();
    if (prepareError) throw prepareError;
    if (!ready) {
      return NextResponse.json({ error: "El estado del pedido cambió. Actualiza el panel." }, { status: 409 });
    }

    const { data: email, error: emailError } = await sendCheckoutReminderEmail({ ...attempt, url: url.href }, reference);
    if (emailError || !email?.id) {
      console.error("Checkout reminder: Resend rejected the request", { reference, code: emailError?.name });
      return NextResponse.json({ error: "No se pudo confirmar el envío. Puedes reintentarlo desde el panel." }, { status: 502 });
    }

    const sentAt = new Date().toISOString();
    const { error: saveError } = await db.from("orders")
      .update({ reminder_sent_at: sentAt, reminder_email_id: email.id })
      .eq("reference", reference)
      .is("reminder_sent_at", null);
    if (saveError) throw saveError;
    return NextResponse.json({ sentAt });
  } catch (error) {
    console.error("Checkout reminder: request failed", { reference, error: error instanceof Error ? error.name : "database" });
    return NextResponse.json({ error: "No se pudo confirmar el envío. Puedes reintentarlo desde el panel." }, { status: 502 });
  } finally {
    if (lock) await releaseOrderAction(db, reference, lock);
  }
}
