import { NextResponse } from "next/server";
import { hasLaterLegacyCheckout, readRecoveryToken, recoverCart } from "@/lib/checkoutRecovery";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  try {
    const reference = readRecoveryToken(body?.token);
    if (!reference) return NextResponse.json({ error: "Invalid recovery link" }, { status: 404 });

    const db = getSupabaseAdmin();
    const { data: order, error } = await db.from("orders")
      .select("status,locale,checkout_cart,dose_qty,customer_email,created_at")
      .eq("reference", reference)
      .not("reminder_attempt", "is", null)
      .maybeSingle();
    if (error) throw error;
    if (!order || !["EXPIRED", "PENDING", "DECLINED"].includes(order.status) || await hasLaterLegacyCheckout(db, order)) {
      return NextResponse.json({ error: "Checkout unavailable" }, { status: 404 });
    }

    const cart = recoverCart(order);
    if (!cart) return NextResponse.json({ error: "Cart unavailable" }, { status: 404 });
    return NextResponse.json({ reference, cart, locale: order.locale === "en" ? "en" : "es" }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Could not recover the checkout" }, { status: 503 });
  }
}
