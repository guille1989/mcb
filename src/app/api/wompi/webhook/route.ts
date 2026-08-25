import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { getWompiEventsSecret } from "@/lib/wompi";
import { getSupabaseAdmin } from "@/lib/supabase";

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function safeHexEqual(a: string, b: string) {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// Wompi calls this on every transaction status change — this is the only reliable
// place to persist a final order status, since the customer's own browser might
// disappear (closed tab, lost connection) right after paying.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const properties: string[] | undefined = body?.signature?.properties;
  const checksum: string | undefined = body?.signature?.checksum;
  const timestamp = body?.signature?.timestamp;

  if (!body || !Array.isArray(properties) || !checksum || timestamp === undefined) {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  const secret = getWompiEventsSecret();
  if (!secret) {
    return NextResponse.json({ error: "Events secret not configured" }, { status: 500 });
  }

  const concatenated =
    properties.map((path) => String(getByPath(body.data, path) ?? "")).join("") +
    timestamp +
    secret;
  const expected = createHash("sha256").update(concatenated).digest("hex");

  if (!safeHexEqual(expected, String(checksum))) {
    console.warn("Wompi webhook: checksum mismatch, ignoring event", { event: body.event });
    return NextResponse.json({ error: "Invalid checksum" }, { status: 401 });
  }

  const transaction = body.data?.transaction;
  if (!transaction?.reference || !transaction?.status) {
    return NextResponse.json({ error: "Missing transaction data" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("orders")
    .update({
      status: transaction.status,
      wompi_transaction_id: transaction.id,
      updated_at: new Date().toISOString(),
    })
    .eq("reference", transaction.reference);

  if (error) {
    console.error("Wompi webhook: failed to update order", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
