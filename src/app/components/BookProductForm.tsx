"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BOOK_PRODUCT_CATEGORY_ITEMS, SearchablePaginatedSelect } from "@/app/components/SearchablePaginatedSelect";

export function BookProductForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", price: "", stock: "0", category: "book" });
  const [scanForm, setScanForm] = useState({ scanCode: "", name: "", price: "", addStock: "1", category: "book" });
  const [csvRows, setCsvRows] = useState<
    { name: string; sku: string; price: string; stock: string; category: string }[]
  >([]);

  function parseCsvLine(line: string) {
    const out: string[] = [];
    let curr = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        out.push(curr.trim());
        curr = "";
      } else {
        curr += ch;
      }
    }
    out.push(curr.trim());
    return out;
  }

  async function handleCsvFile(file: File) {
    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setError("CSV is empty");
      return;
    }
    const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const idx = {
      name: header.indexOf("name"),
      sku: header.indexOf("sku"),
      price: header.indexOf("price"),
      stock: header.indexOf("stock"),
      category: header.indexOf("category"),
    };
    if (idx.name < 0 || idx.price < 0) {
      setError("CSV must include at least name and price columns.");
      return;
    }
    const parsed = lines.slice(1).map((line) => {
      const cols = parseCsvLine(line);
      return {
        name: cols[idx.name] ?? "",
        sku: idx.sku >= 0 ? cols[idx.sku] ?? "" : "",
        price: cols[idx.price] ?? "0",
        stock: idx.stock >= 0 ? cols[idx.stock] ?? "0" : "0",
        category: idx.category >= 0 ? cols[idx.category] ?? "book" : "book",
      };
    });
    setCsvRows(parsed.filter((r) => r.name));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/school/book-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          sku: form.sku || null,
          price: parseFloat(form.price) || 0,
          stock: parseInt(form.stock, 10) || 0,
          category: form.category,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed");
        return;
      }
      router.push("/school/books");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkUpload() {
    if (csvRows.length === 0) {
      setError("Upload a CSV first.");
      return;
    }
    setError("");
    setBulkLoading(true);
    try {
      const res = await fetch("/api/school/book-products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: csvRows.map((r) => ({
            name: r.name,
            sku: r.sku || null,
            price: Number(r.price),
            stock: Number(r.stock) || 0,
            category: r.category || "book",
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Bulk upload failed");
        return;
      }
      setCsvRows([]);
      router.push("/school/books");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleScanAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setScanLoading(true);
    try {
      const res = await fetch("/api/school/book-products/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanCode: scanForm.scanCode,
          name: scanForm.name || undefined,
          price: scanForm.price === "" ? undefined : Number(scanForm.price),
          addStock: Number(scanForm.addStock) || 1,
          category: scanForm.category,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Scanner add failed");
        return;
      }
      setScanForm((s) => ({ ...s, scanCode: "", name: "", price: "", addStock: "1" }));
      router.push("/school/books");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setScanLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 p-4">
        <h3 className="text-base font-semibold text-slate-900">Add single product</h3>
        <div>
          <label className="block text-sm font-medium text-slate-700">Name *</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input-field mt-1" placeholder="e.g. Physics Notebook" required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Price (₹) *</label>
            <input type="number" min={0} step={0.01} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className="input-field mt-1" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Stock</label>
            <input type="number" min={0} value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} className="input-field mt-1" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Category</label>
          <SearchablePaginatedSelect
            items={BOOK_PRODUCT_CATEGORY_ITEMS}
            value={form.category}
            onChange={(v) => setForm((f) => ({ ...f, category: v }))}
            emptyLabel="Category"
            required
            className="mt-1"
            aria-label="Category"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">SKU</label>
          <input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} className="input-field mt-1" />
        </div>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? "Adding..." : "Add product"}</button>
      </form>

      <div className="space-y-3 rounded-lg border border-slate-200 p-4">
        <h3 className="text-base font-semibold text-slate-900">Bulk add by CSV</h3>
        <p className="text-xs text-slate-500">
          CSV headers: <code>name,sku,price,stock,category</code> (name and price required)
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          className="input-field"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleCsvFile(file);
          }}
        />
        {csvRows.length > 0 && (
          <p className="text-sm text-slate-700">{csvRows.length} rows parsed and ready.</p>
        )}
        <button type="button" onClick={handleBulkUpload} disabled={bulkLoading || csvRows.length === 0} className="btn-primary">
          {bulkLoading ? "Uploading..." : "Create from CSV"}
        </button>
      </div>

      <form onSubmit={handleScanAdd} className="space-y-4 rounded-lg border border-slate-200 p-4">
        <h3 className="text-base font-semibold text-slate-900">Add by scanner</h3>
        <p className="text-xs text-slate-500">
          Scan barcode/SKU into scan code field. Existing SKU will auto-increase stock.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Scan code *</label>
            <input
              value={scanForm.scanCode}
              onChange={(e) => setScanForm((f) => ({ ...f, scanCode: e.target.value }))}
              className="input-field mt-1"
              placeholder="Scan barcode / SKU"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Add stock</label>
            <input
              type="number"
              min={1}
              value={scanForm.addStock}
              onChange={(e) => setScanForm((f) => ({ ...f, addStock: e.target.value }))}
              className="input-field mt-1"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Name (for new code)</label>
            <input
              value={scanForm.name}
              onChange={(e) => setScanForm((f) => ({ ...f, name: e.target.value }))}
              className="input-field mt-1"
              placeholder="Required if code is new"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Price (for new code)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={scanForm.price}
              onChange={(e) => setScanForm((f) => ({ ...f, price: e.target.value }))}
              className="input-field mt-1"
              placeholder="Required if code is new"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Category</label>
          <SearchablePaginatedSelect
            items={BOOK_PRODUCT_CATEGORY_ITEMS}
            value={scanForm.category}
            onChange={(v) => setScanForm((f) => ({ ...f, category: v }))}
            emptyLabel="Category"
            required
            className="mt-1"
            aria-label="Scan category"
          />
        </div>
        <button type="submit" disabled={scanLoading} className="btn-primary">
          {scanLoading ? "Processing..." : "Add/Update by scan"}
        </button>
      </form>
    </div>
  );
}
