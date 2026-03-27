"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";

export function HostelVacateButton({ allocationId }: { allocationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function vacateConfirmed() {
    setLoading(true);
    try {
      const res = await fetch(`/api/school/hostel/allocations/${allocationId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
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
        className={`text-sm text-red-600 hover:underline ${loading ? "btn-loading rounded" : ""}`}
      >
        {loading ? "Vacating..." : "Vacate"}
      </button>
      <ConfirmDialog
        open={confirmOpen}
        title="Vacate student?"
        message="This will remove the student from the room allocation."
        confirmText="Vacate"
        danger
        loading={loading}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={vacateConfirmed}
      />
    </>
  );
}
