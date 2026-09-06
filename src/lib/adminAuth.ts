import { createHash, timingSafeEqual } from "crypto";

// Simple shared-secret auth for the internal /admin orders portal — one owner,
// one password, no user accounts. The cookie stores a derived token (never the
// password itself), so it stays valid until ADMIN_PASSWORD changes in env vars.
export const ADMIN_COOKIE_NAME = "mcb_admin";

const SALT = "mcb-admin-portal-v1";

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD;
}

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function isCorrectPassword(password: string) {
  const real = getAdminPassword();
  if (!real || !password) return false;
  return safeEqual(password, real);
}

export function computeSessionToken(password: string) {
  return createHash("sha256").update(password + SALT).digest("hex");
}

export function isValidSessionToken(token: string | undefined | null) {
  const real = getAdminPassword();
  if (!real || !token) return false;
  return safeEqual(token, computeSessionToken(real));
}
