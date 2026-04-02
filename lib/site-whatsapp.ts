/**
 * Digits for `wa.me/{digits}`. Uses NEXT_PUBLIC_WHATSAPP_PHONE when valid;
 * otherwise matches contact/inquiry pages (app/contact/page.tsx, etc.).
 */
const DEFAULT_WHATSAPP_DIGITS = "8618157977478";

export function getSiteWhatsAppDigits(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? "").replace(
    /\D/g,
    "",
  );
  if (fromEnv.length >= 8) return fromEnv;
  return DEFAULT_WHATSAPP_DIGITS;
}
