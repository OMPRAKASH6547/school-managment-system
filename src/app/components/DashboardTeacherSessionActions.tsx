"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";

export function DashboardTeacherSessionActions({
  sessionId,
  verifiedAt,
}: {
  sessionId: string;
  verifiedAt: Date | string | null;
}) {
  const router = useRouter();
  const [delOpen, setDelOpen] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [err, setErr] = useState("");
  const isVerified = !!verifiedAt;

  async function verify() {
    setErr("");
    setVerifyLoading(true);
    try {
      const res = await fetch(`/api/school/teacher-class-sessions/${sessionId}/verify`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr((d as { error?: string }).error || "Failed");
        return;
      }
      router.refresh();
    } catch {
      setErr("Network error");
    } finally {
      setVerifyLoading(false);
    }
  }

  async function remove() {
    setErr("");
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/school/teacher-class-sessions/${sessionId}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr((d as { error?: string }).error || "Failed");
        return;
      }
      setDelOpen(false);
      router.refresh();
    } catch {
      setErr("Network error");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!isVerified ? (
        <button
          type="button"
          disabled={verifyLoading || deleteLoading}
          onClick={verify}
          className="rounded-lg bg-school-green px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {verifyLoading ? "…" : "Verify"}
        </button>
      ) : (
        <span className="text-xs font-medium text-emerald-700">Verified</span>
      )}
      <button
        type="button"
        disabled={verifyLoading || deleteLoading}
        onClick={() => setDelOpen(true)}
        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
      >
        Delete
      </button>
      {err ? <span className="text-xs text-red-600">{err}</span> : null}
      <ConfirmDialog
        open={delOpen}
        title="Delete class session?"
        message="This removes this session record from the log. It cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        danger
        loading={deleteLoading}
        onCancel={() => !deleteLoading && setDelOpen(false)}
        onConfirm={remove}
      />
    </div>
  );
}
