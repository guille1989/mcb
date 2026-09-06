import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, isValidSessionToken } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabase";

const ORDER_COLUMNS =
  "reference,status,wompi_transaction_id,dose_qty,dose_price_eur,amount_in_cents_cop," +
  "origin_huila,origin_tolima,origin_cauca,customer_name,customer_email,customer_phone," +
  "customer_phone_country,shipping_country,shipping_department,shipping_city,shipping_address," +
  "shipping_apt,shipping_postal_code,notes,confirmation_email_sent,shipped,shipped_at,created_at,updated_at";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!isValidSessionToken(token)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Admin orders: failed to read orders", error);
    return NextResponse.json({ error: "No se pudo leer los pedidos" }, { status: 500 });
  }

  return NextResponse.json({ orders: data });
}
