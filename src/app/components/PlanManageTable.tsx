"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PlanRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  maxStudents: number;
  maxStaff: number;
  isActive: boolean;
  _count: { subscriptions: number };
};

type EditForm = {
  name: string;
  slug: string;
  description: string;
  price: string;
  maxStudents: string;
  maxStaff: string;
  isActive: boolean;
};

function toEditForm(plan: PlanRow): EditForm {
  return {
    name: plan.name,
    slug: plan.slug,
    description: plan.description ?? "",
    price: String(plan.price),
    maxStudents: String(plan.maxStudents),
    maxStaff: String(plan.maxStaff),
    isActive: plan.isActive,
  };
}

export function PlanManageTable({ plans }: { plans: PlanRow[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);

  async function startEdit(plan: PlanRow) {
    setError("");
    setEditingId(plan.id);
    setForm(toEditForm(plan));
  }

  async function saveEdit(planId: string) {
    if (!form) return;
    setError("");
    setBusyId(planId);
    try {
      const res = await fetch(`/api/super-admin/plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug.trim().toLowerCase(),
          description: form.description || undefined,
          price: Number(form.price),
          maxStudents: Number(form.maxStudents),
          maxStaff: Number(form.maxStaff),
          isActive: form.isActive,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to update plan");
        return;
      }
      setEditingId(null);
      setForm(null);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  async function deletePlan(plan: PlanRow) {
    if (!confirm(`Delete plan "${plan.name}"?`)) return;
    setError("");
    setBusyId(plan.id);
    try {
      const res = await fetch(`/api/super-admin/plans/${plan.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to delete plan");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card overflow-hidden p-0">
      {error && <div className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Slug</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Price (Rs/mo)</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Max students</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Max staff</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Subscriptions</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Active</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {plans.map((plan) => {
              const isEditing = editingId === plan.id && form !== null;
              return (
                <tr key={plan.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {isEditing ? (
                      <input
                        className="input-field"
                        value={form.name}
                        onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                      />
                    ) : (
                      plan.name
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {isEditing ? (
                      <input
                        className="input-field"
                        value={form.slug}
                        onChange={(e) =>
                          setForm((f) =>
                            f ? { ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") } : f
                          )
                        }
                      />
                    ) : (
                      plan.slug
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {isEditing ? (
                      <input
                        className="input-field"
                        value={form.description}
                        onChange={(e) => setForm((f) => (f ? { ...f, description: e.target.value } : f))}
                      />
                    ) : (
                      <span className="line-clamp-2">{plan.description || "-"}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {isEditing ? (
                      <input
                        type="number"
                        min={1}
                        className="input-field"
                        value={form.price}
                        onChange={(e) => setForm((f) => (f ? { ...f, price: e.target.value } : f))}
                      />
                    ) : (
                      `Rs${plan.price}`
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {isEditing ? (
                      <input
                        type="number"
                        min={1}
                        className="input-field"
                        value={form.maxStudents}
                        onChange={(e) => setForm((f) => (f ? { ...f, maxStudents: e.target.value } : f))}
                      />
                    ) : (
                      plan.maxStudents
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {isEditing ? (
                      <input
                        type="number"
                        min={1}
                        className="input-field"
                        value={form.maxStaff}
                        onChange={(e) => setForm((f) => (f ? { ...f, maxStaff: e.target.value } : f))}
                      />
                    ) : (
                      plan.maxStaff
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{plan._count.subscriptions}</td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.isActive}
                          onChange={(e) => setForm((f) => (f ? { ...f, isActive: e.target.checked } : f))}
                        />
                        Active
                      </label>
                    ) : (
                      <span className={plan.isActive ? "text-green-600" : "text-slate-400"}>
                        {plan.isActive ? "Yes" : "No"}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-primary px-3 py-1 text-xs"
                          onClick={() => saveEdit(plan.id)}
                          disabled={busyId === plan.id}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="btn-secondary px-3 py-1 text-xs"
                          onClick={() => {
                            setEditingId(null);
                            setForm(null);
                          }}
                          disabled={busyId === plan.id}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-secondary px-3 py-1 text-xs"
                          onClick={() => startEdit(plan)}
                          disabled={busyId === plan.id}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                          onClick={() => deletePlan(plan)}
                          disabled={busyId === plan.id}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
