"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";

export function DeleteRowButton({
  apiPath,
  label = "Delete",
}: {
  apiPath: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDeleteConfirmed() {
    setLoading(true);
    try {
      const res = await fetch(apiPath, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Failed to delete");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={loading}
        aria-busy={loading}
        className={`ml-2 text-sm text-red-600 hover:underline disabled:opacity-50 ${
          loading ? "btn-loading rounded" : ""
        }`}
      >
        {loading ? "Deleting..." : label}
      </button>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete record?"
        message="This will permanently delete this record and related data."
        confirmText="Delete"
        danger
        loading={loading}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDeleteConfirmed}
      />
    </>
  );
}

