import type { Metadata } from "next";
import { CheckoutConfirmation } from "@/components/checkout/CheckoutFlow";

// Landing URL after an approved payment — used as the Google Ads conversion page.
// Kept out of search results so organic visits don't count as purchases.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CheckoutConfirmationPage() {
  return <CheckoutConfirmation />;
}
