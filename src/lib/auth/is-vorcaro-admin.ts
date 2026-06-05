const DEFAULT_ADMIN_EMAILS = ["dev@logos.local"];

export function isVorcaroAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  const configured = process.env.VORCARO_ADMIN_EMAILS;
  const allowlist = configured
    ? configured.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
    : DEFAULT_ADMIN_EMAILS;
  return allowlist.includes(normalized);
}
