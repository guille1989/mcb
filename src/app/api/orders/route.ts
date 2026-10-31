import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// Called right before the Wompi widget opens, so the order is on record even if the
// customer closes the tab mid-payment. The webhook later updates its status field.
//
// Idempotent per `reference`: the customer can close the widget and reopen it for the same
// order, and the client then sends the same reference again. A still-PENDING order is
// updated in place (the cart or address may have changed) instead of duplicated; one that
// already moved past PENDING is left alone and answered with 409 so the client starts a
// fresh order.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.reference || !body?.shipping) {
    return NextResponse.json({ error: "Missing reference or shipping data" }, { status: 400 });
  }

  const { reference, doseQty, dosePriceEur, amountInCents, origins, shipping, locale } = body;

  const supabase = getSupabaseAdmin();
  const fields = {
    locale: locale === "en" ? "en" : "es",
    dose_qty: doseQty,
    dose_price_eur: dosePriceEur,
    amount_in_cents_cop: amountInCents,
    origin_huila: origins?.huila ?? 0,
    origin_tolima: origins?.tolima ?? 0,
    origin_cauca: origins?.cauca ?? 0,
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

  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("reference", reference)
    .eq("status", "PENDING")
    .select("reference");

  if (updateError) {
    console.error("Failed to update pending order:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  if (updated && updated.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const { data: existing, error: lookupError } = await supabase
    .from("orders")
    .select("reference")
    .eq("reference", reference)
    .maybeSingle();

  if (lookupError) {
    console.error("Failed to look up order:", lookupError);
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }
  if (existing) {
    return NextResponse.json({ error: "Order already processed" }, { status: 409 });
  }

  const { error } = await supabase.from("orders").insert({ reference, status: "PENDING", ...fields });

  if (error) {
    console.error("Failed to create order:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
