import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutConfirmation, type ConfirmedOrder } from "@/components/checkout/CheckoutFlow";
import { getStripe } from "@/lib/stripe";

// Landing URL after a payment — used as the Google Ads conversion page.
// Kept out of search results so organic visits don't count as purchases.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Stripe appends ?session_id=… when it sends the customer back after paying. The session is
// checked against Stripe here, so a hand-typed URL or an unfinished payment never shows
// "order confirmed".
export default async function CheckoutConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string | string[] }>;
}) {
  const { session_id } = await searchParams;
  const sessionId = typeof session_id === "string" ? session_id : null;
  if (!sessionId?.startsWith("cs_")) redirect("/checkout");

  let session = null;
  let notFound = false;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId);
  } catch (err) {
    notFound = (err as { statusCode?: number })?.statusCode === 404;
    if (!notFound) console.error("Checkout confirmation: could not read Stripe session", err);
  }

  if (notFound || (session && session.status !== "complete")) redirect("/checkout");

  // If Stripe couldn't be reached, the customer did arrive from a completed payment (Stripe
  // only redirects here then), so the confirmation is still shown, just without details.
  const order: ConfirmedOrder | null = session
    ? {
        reference: session.client_reference_id,
        email: session.customer_details?.email ?? session.customer_email,
        paid: session.payment_status === "paid",
      }
    : null;

  return <CheckoutConfirmation order={order} />;
}
