"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SearchablePaginatedSelect } from "@/app/components/SearchablePaginatedSelect";

const PRESETS = [
  { label: "Default blue", value: "#1e40af" },
  { label: "Teal", value: "#0d9488" },
  { label: "Purple", value: "#6d28d9" },
  { label: "Green", value: "#15803d" },
  { label: "Maroon", value: "#991b1b" },
];

const THEMES: { id: string; label: string }[] = [
  { id: "slate", label: "Slate (default)" },
  { id: "navy", label: "Deep navy" },
  { id: "emerald", label: "Emerald" },
  { id: "indigo", label: "Indigo" },
  { id: "rose", label: "Rose" },
];

export function SchoolAppearanceForm({
  pdfAccentColor,
  dashboardTheme,
}: {
  pdfAccentColor: string | null;
  dashboardTheme: string | null;
}) {
  const router = useRouter();
  const [color, setColor] = useState(pdfAccentColor ?? "#1e40af");
  const [useCustomPdf, setUseCustomPdf] = useState(!!pdfAccentColor?.trim());
  const [theme, setTheme] = useState(dashboardTheme ?? "slate");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const themeItems = useMemo(() => THEMES.map((t) => ({ value: t.id, label: t.label })), []);

  async function save() {
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/school/appearance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfAccentColor: useCustomPdf ? color : null,
          dashboardTheme: theme,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "Save failed");
        return;
      }
      setMessage("Saved.");
      router.refresh();
    } catch {
      setMessage("Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-school-navy">PDF accent color</label>
        <p className="mt-1 text-xs text-slate-500">
          Used on report cards, fee receipts, book invoices, and admission receipts. Leave default to use standard blue.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useCustomPdf}
              onChange={(e) => setUseCustomPdf(e.target.checked)}
            />
            Use custom color
          </label>
          {useCustomPdf ? (
            <>
              <input
                type="color"
                value={color.startsWith("#") && color.length === 7 ? color : "#1e40af"}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border border-slate-300 bg-white"
                aria-label="Pick PDF accent color"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="input-field w-28 font-mono text-sm"
                placeholder="#1e40af"
                maxLength={7}
              />
            </>
          ) : null}
        </div>
        {useCustomPdf ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setColor(p.value)}
                className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs hover:bg-slate-100"
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <label htmlFor="dash-theme" className="block text-sm font-medium text-school-navy">
          Dashboard sidebar theme
        </label>
        <p className="mt-1 text-xs text-slate-500">Changes the color of the school dashboard navigation.</p>
        <SearchablePaginatedSelect
          id="dash-theme"
          items={themeItems}
          value={theme}
          onChange={setTheme}
          emptyLabel="Theme"
          required
          className="mt-2 max-w-xs"
          aria-label="Dashboard sidebar theme"
        />
      </div>

      <button type="button" onClick={save} disabled={loading} className="btn-primary">
        {loading ? "Saving…" : "Save appearance"}
      </button>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
