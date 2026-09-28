import { Resend } from "resend";

// Server-only — never import this from a "use client" component.
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");
  return new Resend(apiKey);
}

function getFromAddress() {
  // Falls back to Resend's own test sender until the themothercoffebaby.com domain
  // is verified in Resend — swap RESEND_FROM_EMAIL once that's done.
  return process.env.RESEND_FROM_EMAIL || "The Mother Coffee Baby <onboarding@resend.dev>";
}

type OrderForEmail = {
  reference: string;
  customer_name: string;
  customer_email: string;
  dose_qty: number;
  dose_price_eur: number;
  shipping_address: string;
  shipping_apt: string | null;
  shipping_city: string;
  shipping_department: string;
  shipping_country: string;
  shipping_postal_code: string | null;
  locale?: string | null;
};

const EMAIL_TEXT = {
  es: {
    subject: (reference: string) => `Pedido confirmado — ${reference}`,
    title: "¡PEDIDO CONFIRMADO!",
    greeting: (name: string) => `Hola ${name}, tu pago fue aprobado. Gracias por tu compra.`,
    reference: "Referencia:",
    dose: "Dosis:",
    shipTo: "Envío a:",
    willNotify: "Te avisaremos cuando tu pedido salga hacia tu dirección.",
    questions: "¿Dudas? Escríbenos a",
  },
  en: {
    subject: (reference: string) => `Order confirmed — ${reference}`,
    title: "ORDER CONFIRMED!",
    greeting: (name: string) => `Hi ${name}, your payment was approved. Thanks for your purchase.`,
    reference: "Reference:",
    dose: "Dose:",
    shipTo: "Shipping to:",
    willNotify: "We'll let you know when your order ships.",
    questions: "Questions? Email us at",
  },
} as const;

export async function sendOrderConfirmationEmail(order: OrderForEmail) {
  const resend = getResendClient();
  const addressLine = [order.shipping_address, order.shipping_apt].filter(Boolean).join(", ");
  const text = order.locale === "en" ? EMAIL_TEXT.en : EMAIL_TEXT.es;

  await resend.emails.send({
    from: getFromAddress(),
    to: order.customer_email,
    ...(process.env.RESEND_REPLY_TO ? { replyTo: process.env.RESEND_REPLY_TO } : {}),
    subject: text.subject(order.reference),
    html: `
      <div style="font-family: monospace; background:#0a0a0a; color:#fafafa; padding: 32px;">
        <h1 style="color:#FFD000; letter-spacing: 2px;">${text.title}</h1>
        <p>${text.greeting(order.customer_name)}</p>
        <p><strong style="color:#FFD000;">${text.reference}</strong> ${order.reference}</p>
        <p><strong style="color:#FFD000;">${text.dose}</strong> ${order.dose_qty} sachets — €${order.dose_price_eur.toFixed(2)}</p>
        <p>
          <strong style="color:#FFD000;">${text.shipTo}</strong><br/>
          ${addressLine}<br/>
          ${order.shipping_city}, ${order.shipping_department}<br/>
          ${order.shipping_country}${order.shipping_postal_code ? " " + order.shipping_postal_code : ""}
        </p>
        <p>${text.willNotify}</p>
        <p style="opacity:0.6; font-size: 13px;">${text.questions} <a href="mailto:orders@themothercoffebaby.com" style="color:#FFD000;">orders@themothercoffebaby.com</a></p>
      </div>
    `,
  });
}
