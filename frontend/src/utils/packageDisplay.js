// Shared display helpers for Service Packages.
//
// These only reshape data that already exists on a ServicePackage object
// (name, description, price, durationInMinutes) for presentation - they do
// not add any new fields, call any new endpoint, or change what gets sent
// to the backend anywhere.

/**
 * Turns a package's free-text description into a checklist of included
 * items whenever it looks like a list (comma/semicolon/newline/bullet
 * separated). Falls back to null - render the description as a plain
 * paragraph instead - when there's nothing meaningful to split.
 */
export const parsePackageIncludes = (description) => {
  if (!description || typeof description !== 'string') return null;
  const parts = description
    .split(/[,;\n\u2022]+/) // commas, semicolons, newlines, bullet char
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : null;
};

/** Formats minutes as "45 min" / "1h 30m" / "2h". Returns null for 0/blank. */
export const formatDuration = (minutes) => {
  const m = Number(minutes);
  if (!m || m <= 0) return null;
  if (m < 60) return `${m} min`;
  const hours = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

/** Formats a price as INR with thousands separators, e.g. 1500 -> "1,500". */
export const formatPrice = (price) => {
  const n = Number(price);
  if (Number.isNaN(n)) return price;
  return n.toLocaleString('en-IN');
};

/**
 * Given a service center's active packages and a booking's selected service
 * names, returns the packages that were actually chosen - the same
 * case-insensitive name match payment-service already uses server-side to
 * compute the real charge (see PaymentServiceImpl.resolveAuthoritativeAmount).
 * This is purely for display; it never decides what gets charged.
 */
export const matchSelectedPackages = (packages, selectedServices) => {
  if (!Array.isArray(packages) || packages.length === 0) return [];
  const selectedLower = (selectedServices || [])
    .filter((s) => typeof s === 'string')
    .map((s) => s.trim().toLowerCase());
  return packages.filter((pkg) => selectedLower.includes((pkg.name || '').trim().toLowerCase()));
};
