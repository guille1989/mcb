// Single source of truth for what's for sale. The checkout page uses it to display
// prices; the server uses it to work out what to charge, so a price is never taken from
// the browser.

export const SACHET_OPTIONS = [
  { id: 1, qty: 10, price: 15.0, tagKey: "trial" },
] as const;

export const CURRENCY = "eur";
export const MAX_PACKS_PER_ITEM = 99;

export type CartLine = { productId: number; qty: number };

export type PricedCart = {
  lines: { productId: number; qty: number; sachetsPerPack: number; unitAmountCents: number }[];
  doseQty: number;
  totalEur: number;
  amountInCents: number;
};

// Returns null if the cart is empty or holds an unknown product / invalid quantity.
export function priceCart(cart: unknown): PricedCart | null {
  if (!Array.isArray(cart) || cart.length === 0) return null;

  const lines: PricedCart["lines"] = [];
  for (const item of cart) {
    const option = SACHET_OPTIONS.find((o) => o.id === item?.productId);
    const qty = item?.qty;
    if (!option || !Number.isInteger(qty) || qty < 1 || qty > MAX_PACKS_PER_ITEM) return null;
    lines.push({ productId: option.id, qty, sachetsPerPack: option.qty, unitAmountCents: Math.round(option.price * 100) });
  }

  const doseQty = lines.reduce((s, l) => s + l.sachetsPerPack * l.qty, 0);
  const amountInCents = lines.reduce((s, l) => s + l.unitAmountCents * l.qty, 0);
  return { lines, doseQty, totalEur: amountInCents / 100, amountInCents };
}
