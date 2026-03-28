"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Product = { id: string; name: string; price: number; stock: number };
type BookSet = {
  id: string;
  name: string;
  items: { productId: string; quantity: number; productName: string | null; unitPrice: number | null }[];
};

type LookupStudent = {
  id: string;
  firstName: string;
  lastName: string;
  rollNo: string | null;
  phone: string | null;
  guardianPhone: string | null;
  class: { name: string; section: string | null } | null;
};

const MAX_SUGGESTIONS = 10;

const PAYMENT_METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

function productLabel(p: Product) {
  return `${p.name} — ₹${p.price} [${p.id.slice(-6)}]`;
}

export function RecordBookSaleForm({
  products,
  sets,
  organizationId,
  sellerDisplayName,
  sellerEmail,
}: {
  products: Product[];
  sets: BookSet[];
  organizationId: string;
  /** Logged-in user name saved on the sale (read-only; server uses session). */
  sellerDisplayName: string;
  sellerEmail?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [lookupStudent, setLookupStudent] = useState<LookupStudent | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [bookSetId, setBookSetId] = useState("");
  const [bookSetQuery, setBookSetQuery] = useState("");
  const [bookSetOpen, setBookSetOpen] = useState(false);
  const [debouncedBookSetQuery, setDebouncedBookSetQuery] = useState("");
  const [items, setItems] = useState<{ productId: string; quantity: number; query: string }[]>([
    { productId: "", quantity: 1, query: "" },
  ]);
  const [debouncedItemQueries, setDebouncedItemQueries] = useState<string[]>([""]);
  const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null);
  const selectedSet = bookSetId ? sets.find((s) => s.id === bookSetId) ?? null : null;
  const selectedSetTotal = selectedSet
    ? selectedSet.items.reduce((sum, it) => sum + (it.unitPrice ?? 0) * it.quantity, 0)
    : 0;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedBookSetQuery(bookSetQuery.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [bookSetQuery]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedItemQueries(items.map((i) => i.query.trim().toLowerCase())), 300);
    return () => clearTimeout(t);
  }, [items]);

  function addLine() {
    setItems((i) => [...i, { productId: "", quantity: 1, query: "" }]);
  }
  function removeLine(idx: number) {
    setItems((i) => i.filter((_, j) => j !== idx));
  }

  async function lookupByRoll() {
    const q = rollNo.trim();
    if (!q) {
      setError("Enter a roll number first.");
      return;
    }
    setError("");
    setLookupLoading(true);
    setLookupStudent(null);
    setStudentId(null);
    try {
      const res = await fetch(`/api/school/students/lookup-by-roll?rollNo=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Lookup failed");
        return;
      }
      const s = data.student as LookupStudent;
      setLookupStudent(s);
      setStudentId(s.id);
      setCustomerName(`${s.firstName} ${s.lastName}`.trim());
      setCustomerPhone(s.phone || s.guardianPhone || "");
    } catch {
      setError("Lookup failed");
    } finally {
      setLookupLoading(false);
    }
  }

  function clearStudent() {
    setStudentId(null);
    setLookupStudent(null);
    setRollNo("");
    setCustomerName("");
    setCustomerPhone("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = selectedSet
      ? selectedSet.items
          .filter((i) => i.productId && i.quantity > 0)
          .map((i) => ({ productId: i.productId, quantity: i.quantity }))
      : items.filter((i) => i.productId && i.quantity > 0).map((i) => ({ productId: i.productId, quantity: i.quantity }));
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
          studentId: studentId || null,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          bookSetId: bookSetId || null,
          paymentMethod,
          items: valid.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed");
        return;
      }
      setItems([{ productId: "", quantity: 1, query: "" }]);
      clearStudent();
      setBookSetId("");
      setBookSetQuery("");
      setBookSetOpen(false);
      setPaymentMethod("cash");
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

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-700">Find student by roll number</p>
        <p className="mt-1 text-xs text-slate-500">Enter roll number and click Lookup — name, class, and phone fill in for the sale.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={rollNo}
            onChange={(e) => setRollNo(e.target.value)}
            className="input-field flex-1 min-w-[140px]"
            placeholder="e.g. 10123"
          />
          <button type="button" onClick={lookupByRoll} disabled={lookupLoading} className="btn-secondary whitespace-nowrap">
            {lookupLoading ? "…" : "Lookup"}
          </button>
          {lookupStudent && (
            <button type="button" onClick={clearStudent} className="text-sm text-slate-600 hover:underline">
              Clear student
            </button>
          )}
        </div>
        {lookupStudent && (
          <div className="mt-3 rounded-md bg-white px-3 py-2 text-sm text-slate-800 border border-slate-200">
            <span className="font-medium">
              {lookupStudent.firstName} {lookupStudent.lastName}
            </span>
            {lookupStudent.class && (
              <span className="text-slate-600">
                {" "}
                · Class {lookupStudent.class.name}
                {lookupStudent.class.section ? `-${lookupStudent.class.section}` : ""}
              </span>
            )}
            {lookupStudent.rollNo && <span className="text-slate-500"> · Roll {lookupStudent.rollNo}</span>}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Book set (optional)</label>
        <div className="relative mt-1">
          <input
            value={bookSetQuery}
            onFocus={() => setBookSetOpen(true)}
            onChange={(e) => {
              const q = e.target.value;
              setBookSetQuery(q);
              const selected = sets.find((s) => s.name === q);
              if (selected) {
                setBookSetId(selected.id);
              } else {
                setBookSetId("");
                if (!q.trim()) {
                  setItems([{ productId: "", quantity: 1, query: "" }]);
                }
              }
            }}
            className="input-field"
            placeholder="Search set name"
          />
          {bookSetOpen ? (
            <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
              {sets
                .filter((s) => !debouncedBookSetQuery || s.name.toLowerCase().includes(debouncedBookSetQuery))
                .slice(0, MAX_SUGGESTIONS)
                .map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => {
                      setBookSetQuery(s.name);
                      setBookSetId(s.id);
                      setItems(
                        s.items.map((i) => {
                          const p = products.find((x) => x.id === i.productId);
                          const fallbackLabel =
                            i.productName && i.unitPrice !== null ? `${i.productName} — ₹${i.unitPrice}` : "";
                          return { productId: i.productId, quantity: i.quantity, query: p ? productLabel(p) : fallbackLabel };
                        })
                      );
                      setBookSetOpen(false);
                    }}
                  >
                    {s.name}
                  </button>
                ))}
            </div>
          ) : null}
          {bookSetId ? (
            <button
              type="button"
              className="mt-2 text-xs text-slate-600 hover:underline"
              onClick={() => {
                setBookSetId("");
                setBookSetQuery("");
                setBookSetOpen(false);
                setItems([{ productId: "", quantity: 1, query: "" }]);
              }}
            >
              Clear selected set
            </button>
          ) : null}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Customer name</label>
        <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="input-field mt-1" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Customer phone</label>
        <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="input-field mt-1" />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Payment method *</label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="input-field mt-1"
          required
        >
          {PAYMENT_METHOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        <span className="font-medium text-slate-800">Sale recorded under your login</span>
        <p className="mt-1">
          <span className="font-medium">{sellerDisplayName || "—"}</span>
          {sellerEmail ? <span className="text-slate-600"> · {sellerEmail}</span> : null}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          This name is saved on the invoice and recent sales (from your session, not editable here).
        </p>
      </div>

      {selectedSet ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-emerald-800">Set selected: {selectedSet.name}</p>
            <p className="text-sm font-semibold text-emerald-900">Total: ₹{selectedSetTotal}</p>
          </div>
          <p className="mt-1 text-xs text-emerald-700">Items are auto-filled from selected set.</p>
        </div>
      ) : (
        <div>
          <div className="flex justify-between">
            <label className="block text-sm font-medium text-slate-700">Items</label>
            <button type="button" onClick={addLine} className="text-sm text-primary-600 hover:underline">
              + Line
            </button>
          </div>
          {items.map((item, idx) => (
            <div key={idx} className="relative mt-2 flex gap-2">
              <input
                value={item.query}
                placeholder="Search product"
                onFocus={() => setActiveItemIdx(idx)}
                onChange={(e) =>
                  setItems((i) => {
                    const n = [...i];
                    const q = e.target.value;
                    n[idx].query = q;
                    const selected = products.find((p) => productLabel(p) === q);
                    n[idx].productId = selected?.id ?? "";
                    return n;
                  })
                }
                className="input-field flex-1"
              />
              {activeItemIdx === idx ? (
                <div className="absolute z-20 mt-12 w-[55%] rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                  {products
                    .filter((p) => {
                      const q = debouncedItemQueries[idx] ?? "";
                      if (!q) return true;
                      return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
                    })
                    .slice(0, MAX_SUGGESTIONS)
                    .map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => {
                          setItems((i) => {
                            const n = [...i];
                            n[idx].query = productLabel(p);
                            n[idx].productId = p.id;
                            return n;
                          });
                          setActiveItemIdx(null);
                        }}
                      >
                        {p.name} - ₹{p.price}
                      </button>
                    ))}
                </div>
              ) : null}
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) =>
                  setItems((i) => {
                    const n = [...i];
                    n[idx].quantity = parseInt(e.target.value, 10) || 1;
                    return n;
                  })
                }
                className="input-field w-20"
              />
              <button type="button" onClick={() => removeLine(idx)} className="text-slate-400 hover:text-red-600">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <button type="submit" disabled={loading} className="btn-primary">
        Record sale
      </button>
    </form>
  );
}
