"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";

export function DeleteExamButton({ examId, examName }: { examId: string; examName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function confirmDelete() {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch(`/api/school/exams/${examId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr((data as { error?: string }).error || "Could not delete");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-red-600 hover:underline"
      >
        Delete
      </button>
      <ConfirmDialog
        open={open}
        title="Delete exam?"
        message={
          err ||
          `This will permanently remove “${examName}”, all subjects, and all entered marks. This cannot be undone.`
        }
        confirmText="Delete"
        cancelText="Cancel"
        danger
        loading={loading}
        onCancel={() => {
          if (!loading) {
            setOpen(false);
            setErr("");
          }
        }}
        onConfirm={confirmDelete}
      />
    </>
  );
}
