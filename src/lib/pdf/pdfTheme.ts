export type PdfThemeColors = {
  primary: string;
  border: string;
  light: string;
};

const DEFAULT: PdfThemeColors = {
  primary: "#1e40af",
  border: "#2563eb",
  light: "#dbeafe",
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (x: number) => Math.max(0, Math.min(255, Math.round(x)));
  return `#${[c(r), c(g), c(b)].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

/** Blend accent with white for table header backgrounds. */
function mixWithWhite(hex: string, whiteAmount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return DEFAULT.light;
  const t = Math.max(0, Math.min(1, whiteAmount));
  return rgbToHex(
    rgb.r + (255 - rgb.r) * t,
    rgb.g + (255 - rgb.g) * t,
    rgb.b + (255 - rgb.b) * t
  );
}

/**
 * Builds PDF palette from school accent (#RRGGBB). Bars use `primary`; borders match; `light` is a tinted fill.
 */
export function pdfThemeFromAccent(hex: string | null | undefined): PdfThemeColors {
  if (!hex?.trim()) return DEFAULT;
  const h = hex.trim();
  if (!/^#[0-9A-Fa-f]{6}$/.test(h)) return DEFAULT;
  return {
    primary: h,
    border: h,
    light: mixWithWhite(h, 0.88),
  };
}

export const DEFAULT_PDF_THEME = DEFAULT;
