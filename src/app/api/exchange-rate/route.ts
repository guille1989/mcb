import { NextResponse } from "next/server";

// Kept in sync with the last known-good rate in case the upstream API is unreachable.
const FALLBACK_EUR_TO_COP = 3600;

export async function GET() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/EUR", {
      next: { revalidate: 86400 }, // upstream itself only refreshes once a day
    });
    const data = await res.json();
    const rate = data?.rates?.COP;
    if (typeof rate !== "number") throw new Error("COP rate missing from response");
    return NextResponse.json({ rate, updatedAt: data.time_last_update_utc ?? null });
  } catch {
    return NextResponse.json({ rate: FALLBACK_EUR_TO_COP, updatedAt: null });
  }
}
