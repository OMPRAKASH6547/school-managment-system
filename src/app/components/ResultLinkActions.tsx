"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResultLinkActions({
  studentId,
  hasLink,
}: {
  studentId: string;
  hasLink: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this student's result link?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/school/students/${studentId}/result-link`, { method: "DELETE" });
      if (!res.ok) return;
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/school/students/${studentId}/result-link`, { method: "POST" });
      if (!res.ok) return;
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return hasLink ? (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
    >
      {loading ? "..." : "Delete link"}
    </button>
  ) : (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={loading}
      className="rounded-md bg-primary-600 px-2 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
    >
      {loading ? "..." : "Generate link"}
    </button>
  );
}

