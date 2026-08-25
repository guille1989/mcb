// Server-only Wompi helpers. Never import this from a "use client" component —
// it reads secrets that must stay on the server.

const SANDBOX = process.env.WOMPI_SANDBOX !== "false";

export const WOMPI_API_BASE = SANDBOX
  ? "https://sandbox.wompi.co/v1"
  : "https://production.wompi.co/v1";

export function isWompiSandbox() {
  return SANDBOX;
}

export function getWompiPublicKey() {
  return SANDBOX
    ? process.env.TEST_WOMPI_PUBLIC_KEY
    : process.env.WOMPI_PUBLIC_KEY;
}

export function getWompiIntegritySecret() {
  return SANDBOX ? process.env.TEST_INTEGRITY_API_KEY : process.env.INTEGRITY_API_KEY;
}

export function getWompiEventsSecret() {
  return SANDBOX ? process.env.TEST_EVENTS_API_KEY : process.env.EVENTS_API_KEY;
}
