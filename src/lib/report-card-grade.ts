/** Same scale as PDF report card. */
export function gradeFromFraction(obtained: number, max: number): string {
  if (max <= 0) return "—";
  const p = Math.round((obtained / max) * 100);
  if (p >= 91) return "A1";
  if (p >= 81) return "A2";
  if (p >= 71) return "B1";
  if (p >= 61) return "B2";
  if (p >= 51) return "C1";
  if (p >= 41) return "C2";
  if (p >= 33) return "D";
  if (p > 0) return "E1";
  return "E2";
}

export const CO_SCHOLASTIC_LABELS = [
  "WORK EDUCATION",
  "ART EDUCATION",
  "G.K.",
  "HEALTH & PHYSICAL EDUCATION",
  "OTHER",
] as const;

export const GRADE_SCALE_ROWS: [string, string][] = [
  ["91 - 100", "A1"],
  ["81 - 90", "A2"],
  ["71 - 80", "B1"],
  ["61 - 70", "B2"],
  ["51 - 60", "C1"],
  ["41 - 50", "C2"],
  ["33 - 40", "D"],
  ["32 & Below", "E"],
];
