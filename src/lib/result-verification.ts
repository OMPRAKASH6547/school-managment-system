/** YYYY-MM-DD in local timezone (matches <input type="date"> in most locales). */
export function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** YYYY-MM-DD in UTC (handles DateTime stored at UTC midnight). */
export function formatDateUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isValidYmd(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Turns common typed/pasted values into canonical YYYY-MM-DD strings to compare with stored DOB.
 * Supports ISO (from &lt;input type="date"&gt;) and DD-MM-YYYY / DD/MM/YYYY (common in India).
 */
export function canonicalDobStringsFromInput(raw: string): string[] {
  const s = raw.trim();
  if (!s) return [];

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/;
  const mIso = s.match(iso);
  if (mIso) {
    const y = Number(mIso[1]);
    const m = Number(mIso[2]);
    const d = Number(mIso[3]);
    if (isValidYmd(y, m, d)) return [`${mIso[1]}-${mIso[2]}-${mIso[3]}`];
    return [];
  }

  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;
  const mDmy = s.match(dmy);
  if (mDmy) {
    const d = Number(mDmy[1]);
    const mo = Number(mDmy[2]);
    const y = Number(mDmy[3]);
    if (!isValidYmd(y, mo, d)) return [];
    return [`${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`];
  }

  return [];
}

/** Value for `defaultValue` on &lt;input type="date"&gt; (YYYY-MM-DD only). */
export function dobValueForDateInput(raw: string): string {
  const c = canonicalDobStringsFromInput(raw);
  return c[0] ?? "";
}

export function dobInputMatchesStored(dobInput: string, stored: Date | null): boolean {
  if (!stored || !dobInput?.trim()) return false;
  const local = formatDateLocal(new Date(stored));
  const utc = formatDateUTC(new Date(stored));
  const candidates = canonicalDobStringsFromInput(dobInput);
  if (candidates.length === 0) return false;
  return candidates.some((c) => c === local || c === utc);
}

/** Compare roll numbers ignoring case and internal spaces (e.g. "62 601" vs "62601"). */
export function normalizeRollForCompare(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

function normalizePersonName(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/**
 * True if the typed name matches the student (first + last), allowing "First Last" or "Last First" order.
 */
export function studentNameMatchesInput(
  nameInput: string,
  firstName: string,
  lastName: string
): boolean {
  const n = normalizePersonName(nameInput);
  if (!n) return false;
  const f = firstName.trim();
  const l = lastName.trim();
  const forward = normalizePersonName([f, l].filter(Boolean).join(" "));
  const backward = normalizePersonName([l, f].filter(Boolean).join(" "));
  if (!forward && !backward) return false;
  return n === forward || n === backward;
}
