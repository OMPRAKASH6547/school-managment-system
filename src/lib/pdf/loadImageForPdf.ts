import { readFile } from "fs/promises";
import path from "path";

/** Only allow images under /uploads/ (served from public/). */
export function isSafePublicUploadPath(p: string): boolean {
  const normalized = path.posix.normalize(p.replace(/\\/g, "/"));
  return normalized.startsWith("/uploads/") && !normalized.includes("..");
}

/**
 * Resolves logos/photos for @react-pdf/renderer: local files are read from disk;
 * remote URLs are fetched. Relative URLs fail in many server PDF contexts without this.
 */
export async function loadImageDataUriForPdf(src: string | null | undefined): Promise<string | null> {
  if (!src?.trim()) return null;
  const s = src.trim();
  if (s.startsWith("data:image/")) return s;

  if (s.startsWith("http://") || s.startsWith("https://")) {
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 12_000);
      try {
        const res = await fetch(s, { signal: ac.signal });
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        const ct = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "image/png";
        if (!ct.startsWith("image/")) return null;
        return `data:${ct};base64,${buf.toString("base64")}`;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return null;
    }
  }

  const withSlash = s.startsWith("/") ? s : `/${s}`;
  if (!isSafePublicUploadPath(withSlash)) return null;

  const rel = withSlash.slice(1);
  const abs = path.join(process.cwd(), "public", rel);
  const resolved = path.resolve(abs);
  const publicRoot = path.resolve(process.cwd(), "public");
  if (!resolved.startsWith(publicRoot)) return null;

  try {
    const buf = await readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const mime =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".webp"
            ? "image/webp"
            : "image/png";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
