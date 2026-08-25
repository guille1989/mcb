import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getWompiIntegritySecret } from "@/lib/wompi";

// The integrity signature proves the amount/reference weren't tampered with between
// our server and Wompi's widget — it must be computed here, never in the browser,
// or the integrity secret would be exposed to anyone reading the page's JS.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { reference, amountInCents, currency } = body ?? {};

  if (!reference || !amountInCents || !currency) {
    return NextResponse.json({ error: "reference, amountInCents and currency are required" }, { status: 400 });
  }

  const secret = getWompiIntegritySecret();
  if (!secret) {
    return NextResponse.json({ error: "Wompi integrity secret not configured" }, { status: 500 });
  }

  const signature = createHash("sha256")
    .update(`${reference}${amountInCents}${currency}${secret}`)
    .digest("hex");

  return NextResponse.json({ signature });
}
