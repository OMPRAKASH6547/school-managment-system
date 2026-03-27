"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Product = { id: string; name: string; price: number };
type ClassRow = { id: string; name: string };

type InitialSet = {
  id?: string;
  name: string;
  description: string | null;
  classId: string | null;
  isActive?: boolean;
  items: { productId: string; quantity: number }[];
};

export function BookSetForm({
  products,
  classes,
  initialSet,
}: {
  products: Product[];
  classes: ClassRow[];
  initialSet?: InitialSet;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(initialSet?.name ?? "");
  const [description, setDescription] = useState(initialSet?.description ?? "");
  const [classId, setClassId] = useState(initialSet?.classId ?? "");
  const [classQuery, setClassQuery] = useState(() => {
    const cls = classes.find((c) => c.id === (initialSet?.classId ?? ""));
    return cls?.name ?? "";
  });
  const [classOpen, setClassOpen] = useState(false);
  const [debouncedClassQuery, setDebouncedClassQuery] = useState("");
  const [isActive, setIsActive] = useState(initialSet?.isActive ?? true);
  const [modeOpen, setModeOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "count_total">("existing");
  const [bookCount, setBookCount] = useState("1");
  const [totalPrice, setTotalPrice] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [debouncedProductQuery, setDebouncedProductQuery] = useState("");
  const [items, setItems] = useState<{ productId: string; quantity: number }[]>(
    initialSet?.items?.length ? initialSet.items : [{ productId: "", quantity: 1 }]
  );

  const selectedProductIds = Array.from(new Set(items.map((i) => i.productId).filter(Boolean)));
  const MAX_SUGGESTIONS = 10;
  const selectedClassName = classes.find((c) => c.id === classId)?.name ?? "All classes";

  useEffect(() => {
    const t = setTimeout(() => setDebouncedClassQuery(classQuery.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [classQuery]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedProductQuery(productQuery.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [productQuery]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    let valid: { productId: string; quantity: number }[] = [];
    if (mode === "existing") {
      valid = items.filter((i) => i.productId && i.quantity > 0);
      if (valid.length === 0) {
        setError("Select at least one product.");
        return;
      }
    } else {
      if ((Number(bookCount) || 0) < 1) {
        setError("Book count must be at least 1.");
        return;
      }
      if ((Number(totalPrice) || 0) <= 0) {
        setError("Total price must be greater than 0.");
        return;
      }
    }
    setLoading(true);
    try {
      const isEdit = !!initialSet?.id;
      const res = await fetch(isEdit ? `/api/school/book-sets/${initialSet.id}` : "/api/school/book-sets", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: classId || null,
          name,
          description: description || null,
          isActive,
          mode,
          bookCount: Number(bookCount) || null,
          totalPrice: Number(totalPrice) || null,
          items: valid,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      if (!initialSet?.id) {
        setName("");
        setDescription("");
        setClassId("");
        setClassQuery("");
        setMode("existing");
        setBookCount("1");
        setTotalPrice("");
        setProductQuery("");
        setItems([{ productId: "", quantity: 1 }]);
      }
      if (initialSet?.id) {
        router.push("/school/books/sets");
      }
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Set name *</label>
          <input className="input-field mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Class (optional)</label>
          <div className="relative mt-1">
            <button
              type="button"
              className="input-field flex w-full items-center justify-between text-left"
              onClick={() => setClassOpen((v) => !v)}
            >
              <span>{selectedClassName}</span>
              <span className="text-slate-500">{classOpen ? "▲" : "▼"}</span>
            </button>
            {classOpen ? (
              <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                <input
                  className="input-field"
                  value={classQuery}
                  placeholder="Search class"
                  onChange={(e) => setClassQuery(e.target.value)}
                />
                <div className="mt-2 max-h-48 overflow-auto rounded-md border border-slate-100">
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => {
                      setClassId("");
                      setClassQuery("");
                      setClassOpen(false);
                    }}
                  >
                    All classes
                  </button>
                  {classes
                    .filter((c) => !debouncedClassQuery || c.name.toLowerCase().includes(debouncedClassQuery))
                    .slice(0, MAX_SUGGESTIONS)
                    .map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => {
                          setClassId(c.id);
                          setClassQuery(c.name);
                          setClassOpen(false);
                        }}
                      >
                        {c.name}
                      </button>
                    ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Description</label>
        <input className="input-field mt-1" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      {!initialSet?.id ? (
        <div>
          <label className="block text-sm font-medium text-slate-700">Set creation mode</label>
          <div className="relative mt-1">
            <button
              type="button"
              className="input-field flex w-full items-center justify-between text-left"
              onClick={() => setModeOpen((v) => !v)}
            >
              <span>{mode === "existing" ? "Select existing products" : "Only number + total price"}</span>
              <span className="text-slate-500">{modeOpen ? "▲" : "▼"}</span>
            </button>
            {modeOpen ? (
              <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                <button
                  type="button"
                  className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    setMode("existing");
                    setModeOpen(false);
                  }}
                >
                  Select existing products
                </button>
                <button
                  type="button"
                  className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    setMode("count_total");
                    setModeOpen(false);
                  }}
                >
                  Only number + total price
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {initialSet?.id ? (
        <div>
          <label className="block text-sm font-medium text-slate-700">Status</label>
          <div className="relative mt-1">
            <button
              type="button"
              className="input-field flex w-full items-center justify-between text-left"
              onClick={() => setStatusOpen((v) => !v)}
            >
              <span>{isActive ? "Active" : "Inactive"}</span>
              <span className="text-slate-500">{statusOpen ? "▲" : "▼"}</span>
            </button>
            {statusOpen ? (
              <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                <button
                  type="button"
                  className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    setIsActive(true);
                    setStatusOpen(false);
                  }}
                >
                  Active
                </button>
                <button
                  type="button"
                  className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    setIsActive(false);
                    setStatusOpen(false);
                  }}
                >
                  Inactive
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {mode === "existing" || initialSet?.id ? (
        <div>
          <label className="block text-sm font-medium text-slate-700">Select products</label>
          <div className="mt-2 flex gap-2">
            <input
              list="set-product-options"
              className="input-field flex-1"
              value={productQuery}
              placeholder="Search and add product"
              onChange={(e) => setProductQuery(e.target.value)}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                const selected = products.find((p) => `${p.name} - ₹${p.price}` === productQuery);
                if (!selected) return;
                setItems((prev) =>
                  prev.some((p) => p.productId === selected.id) ? prev : [...prev, { productId: selected.id, quantity: 1 }]
                );
                setProductQuery("");
              }}
            >
              Add
            </button>
          </div>
          <datalist id="set-product-options">
            {products
              .filter((p) => !selectedProductIds.includes(p.id))
              .filter((p) => !debouncedProductQuery || p.name.toLowerCase().includes(debouncedProductQuery))
              .slice(0, MAX_SUGGESTIONS)
              .map((p) => (
                <option key={p.id} value={`${p.name} - ₹${p.price}`} />
              ))}
          </datalist>
          <div className="mt-3 space-y-2">
            {items
              .filter((item) => item.productId)
              .map((item) => {
                const product = products.find((p) => p.id === item.productId);
                return (
                  <div key={item.productId} className="grid gap-2 sm:grid-cols-5">
                    <div className="sm:col-span-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <div className="flex items-center justify-between">
                        <span>{product?.name ?? "Product"}</span>
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:underline"
                          onClick={() => setItems((prev) => prev.filter((p) => p.productId !== item.productId))}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      min={1}
                      className="input-field"
                      value={item.quantity}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((p) =>
                            p.productId === item.productId ? { ...p, quantity: Number(e.target.value) || 1 } : p
                          )
                        )
                      }
                    />
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Number of books</label>
            <input
              type="number"
              min={1}
              className="input-field mt-1"
              value={bookCount}
              onChange={(e) => setBookCount(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Total price (₹)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              className="input-field mt-1"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
            />
          </div>
        </div>
      )}
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Saving..." : initialSet?.id ? "Save changes" : "Create set"}
      </button>
    </form>
  );
}
