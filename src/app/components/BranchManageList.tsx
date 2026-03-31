"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Branch = {
  id: string;
  name: string;
  branchCode: string;
};

export function BranchManageList({ branches }: { branches: Branch[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function deleteBranch(branch: Branch) {
    const ok = confirm(
      `Delete branch "${branch.name}"?\n\nThis will permanently delete students, staff, classes, fees, attendance, exams, library, hostel, books, transport and other branch data.`
    );
    if (!ok) return;

    setError(null);
    setBusyId(branch.id);
    try {
      const res = await fetch(`/api/school/branches/${branch.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to delete branch");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  if (branches.length === 0) {
    return <p className="text-sm text-slate-500">No branches yet.</p>;
  }

  return (
    <div>
      {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <ul className="mt-2 space-y-2 text-sm">
        {branches.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
            <div>
              <span className="font-medium">{b.name}</span> <span className="text-slate-500">({b.branchCode})</span>
            </div>
            <button
              type="button"
              onClick={() => deleteBranch(b)}
              disabled={busyId === b.id}
              className="rounded-md border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              {busyId === b.id ? "Deleting..." : "Delete"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
