import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { priceCart, type CartLine } from "@/lib/catalog";
import type { getSupabaseAdmin } from "@/lib/supabase";

export const ORDER_REFERENCE = /^MCB-\d{10,24}$/;
export const CHECKOUT_KEY = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;
const RECOVERY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
type Database = ReturnType<typeof getSupabaseAdmin>;

export function checkoutKeyHash(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function createRecoveryToken(reference: string, startedAt: string) {
  const secret = process.env.CHECKOUT_RECOVERY_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error("CHECKOUT_RECOVERY_SECRET must contain at least 32 bytes");
  const expires = Date.parse(startedAt) + RECOVERY_TTL_MS;
  const payload = `${reference}.${expires}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function readRecoveryToken(value: unknown) {
  if (typeof value !== "string" || value.length > 128) return null;
  const [reference, expires, signature, extra] = value.split(".");
  if (extra !== undefined || !ORDER_REFERENCE.test(reference) || !/^\d{13}$/.test(expires) ||
      !/^[\da-f]{64}$/.test(signature) || Number(expires) <= Date.now()) return null;

  const expected = createRecoveryToken(reference, new Date(Number(expires) - RECOVERY_TTL_MS).toISOString());
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected)) ? reference : null;
}

export function recoverCart(order: { checkout_cart: unknown; dose_qty: number }): CartLine[] | null {
  // Before carts were stored, Stripe checkout sold one product: the 10-sachet pack.
  const cart = order.checkout_cart ?? [{ productId: 1, qty: order.dose_qty / 10 }];
  return priceCart(cart)?.lines.map(({ productId, qty }) => ({ productId, qty })) ?? null;
}

export async function hasLaterLegacyCheckout(db: Database, order: {
  checkout_cart: unknown;
  customer_email: string;
  dose_qty: number;
  created_at: string;
}) {
  if (order.checkout_cart !== null) return false;
  // Old checkout retries could create a separate reference without linking the two rows.
  // Suppress these reminders if a newer Stripe order for the same email and dose may be a retry.
  const { data, error } = await db.from("orders")
    .select("reference")
    .eq("customer_email", order.customer_email)
    .eq("dose_qty", order.dose_qty)
    .eq("currency", "eur")
    .gt("created_at", order.created_at)
    .in("status", ["PENDING", "APPROVED", "EXPIRED", "DECLINED"])
    .limit(1);
  if (error) throw error;
  return data.length > 0;
}

export async function claimOrderAction(db: Database, reference: string) {
  const now = Date.now();
  const lock = new Date(now + 5 * 60 * 1000).toISOString();
  const { data, error } = await db.from("orders")
    .update({ checkout_locked_until: lock })
    .eq("reference", reference)
    .or(`checkout_locked_until.is.null,checkout_locked_until.lt.${new Date(now).toISOString()}`)
    .select("reference")
    .maybeSingle();
  if (error) throw error;
  return data ? lock : null;
}

export async function releaseOrderAction(db: Database, reference: string, lock: string) {
  const { error } = await db.from("orders")
    .update({ checkout_locked_until: null })
    .eq("reference", reference)
    .eq("checkout_locked_until", lock);
  if (error) console.error("Checkout: failed to release order lock", { code: error.code });
}
