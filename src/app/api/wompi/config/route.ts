import { NextResponse } from "next/server";
import { getWompiPublicKey, isWompiSandbox } from "@/lib/wompi";

export async function GET() {
  const publicKey = getWompiPublicKey();
  if (!publicKey) {
    return NextResponse.json({ error: "Wompi public key not configured" }, { status: 500 });
  }
  return NextResponse.json({ publicKey, sandbox: isWompiSandbox() });
}
