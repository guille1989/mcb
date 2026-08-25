import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// Called right before the Wompi widget opens, so the order is on record even if the
// customer closes the tab mid-payment. The webhook later updates its status field.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.reference || !body?.shipping) {
    return NextResponse.json({ error: "Missing reference or shipping data" }, { status: 400 });
  }

  const { reference, doseQty, dosePriceEur, amountInCents, origins, shipping } = body;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("orders").insert({
    reference,
    status: "PENDING",
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
  });

  if (error) {
    console.error("Failed to create order:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
