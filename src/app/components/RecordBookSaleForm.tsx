"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Product = { id: string; name: string; price: number; stock: number };

export function RecordBookSaleForm({
  products,
  organizationId,
}: {
  products: Product[];
  organizationId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [items, setItems] = useState<{ productId: string; quantity: number }[]>([{ productId: "", quantity: 1 }]);

  function addLine() {
    setItems((i) => [...i, { productId: "", quantity: 1 }]);
  }
  function removeLine(idx: number) {
    setItems((i) => i.filter((_, j) => j !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = items.filter((i) => i.productId && i.quantity > 0);
    if (valid.length === 0) {
      setError("Add at least one product.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/school/book-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          items: valid.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed");
        return;
      }
      setItems([{ productId: "", quantity: 1 }]);
      setCustomerName("");
      setCustomerPhone("");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <label className="block text-sm font-medium text-slate-700">Customer name</label>
        <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="input-field mt-1" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Customer phone</label>
        <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="input-field mt-1" />
      </div>
      <div>
        <div className="flex justify-between">
          <label className="block text-sm font-medium text-slate-700">Items</label>
          <button type="button" onClick={addLine} className="text-sm text-primary-600 hover:underline">+ Line</button>
        </div>
        {items.map((item, idx) => (
          <div key={idx} className="mt-2 flex gap-2">
            <select
              value={item.productId}
              onChange={(e) => setItems((i) => { const n = [...i]; n[idx].productId = e.target.value; return n; })}
              className="input-field flex-1"
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — ₹{p.price}</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => setItems((i) => { const n = [...i]; n[idx].quantity = parseInt(e.target.value, 10) || 1; return n; })}
              className="input-field w-20"
            />
            <button type="button" onClick={() => removeLine(idx)} className="text-slate-400 hover:text-red-600">×</button>
          </div>
        ))}
      </div>
      <button type="submit" disabled={loading} className="btn-primary">Record sale</button>
    </form>
  );
}
