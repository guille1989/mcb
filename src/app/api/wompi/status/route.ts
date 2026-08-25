import { NextResponse } from "next/server";
import { WOMPI_API_BASE, getWompiPublicKey } from "@/lib/wompi";

// Status checks only need the public key as a bearer token (per Wompi's docs) — the
// widget's own callback result shouldn't be trusted as final proof of payment on its
// own, so the order-confirmation step re-checks the transaction here, server-side.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const publicKey = getWompiPublicKey();
  if (!publicKey) {
    return NextResponse.json({ error: "Wompi public key not configured" }, { status: 500 });
  }

  const res = await fetch(`${WOMPI_API_BASE}/transactions/${id}`, {
    headers: { Authorization: `Bearer ${publicKey}` },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Could not fetch transaction from Wompi" }, { status: 502 });
  }

  const { data } = await res.json();
  return NextResponse.json({
    id: data.id,
    status: data.status,
    statusMessage: data.status_message,
    reference: data.reference,
    amountInCents: data.amount_in_cents,
  });
}
