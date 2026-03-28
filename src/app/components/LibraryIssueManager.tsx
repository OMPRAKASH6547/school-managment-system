"use client";

import { useMemo, useState } from "react";
import { SearchablePaginatedSelect } from "@/app/components/SearchablePaginatedSelect";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";

type StudentOption = { id: string; name: string; rollNo: string | null };
type IssueItem = {
  id: string;
  studentName: string;
  rollNo: string | null;
  issuedAt: string;
  dueDate: string | null;
  status: string;
};

export function LibraryIssueManager({
  bookId,
  availableCopies,
  students,
  activeIssues,
}: {
  bookId: string;
  availableCopies: number;
  students: StudentOption[];
  activeIssues: IssueItem[];
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [returningId, setReturningId] = useState<string | null>(null);
  const [confirmReturnIssueId, setConfirmReturnIssueId] = useState<string | null>(null);

  const studentItems = useMemo(
    () => students.map((s) => ({ value: s.id, label: `${s.name}${s.rollNo ? ` (${s.rollNo})` : ""}` })),
    [students],
  );

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/school/library/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          studentId,
          dueDate: dueDate || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to assign book");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReturn(issueId: string) {
    setError("");
    setReturningId(issueId);
    try {
      const res = await fetch(`/api/school/library/issues/${issueId}/return`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to return book");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setReturningId(null);
      setConfirmReturnIssueId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Assign book</h2>
        <p className="mt-1 text-sm text-slate-600">Available copies: {availableCopies}</p>
        <form onSubmit={handleAssign} className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Student</label>
            <SearchablePaginatedSelect
              items={studentItems}
              value={studentId}
              onChange={setStudentId}
              emptyLabel="Select student"
              required
              className="mt-1"
              aria-label="Student"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input-field mt-1"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={submitting || availableCopies <= 0 || students.length === 0}
              aria-busy={submitting}
              className={`btn-primary ${submitting ? "btn-loading" : ""}`}
            >
              {submitting ? "Assigning..." : "Assign book"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">Issued books</h3>
        </div>
        {activeIssues.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">No active issues for this book.</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-slate-500">Student</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-slate-500">Issued</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-slate-500">Due</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {activeIssues.map((issue) => (
                <tr key={issue.id}>
                  <td className="px-5 py-4 text-sm text-slate-900">
                    {issue.studentName} {issue.rollNo ? `(${issue.rollNo})` : ""}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">
                    {new Date(issue.issuedAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">
                    {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setConfirmReturnIssueId(issue.id)}
                      disabled={returningId === issue.id}
                      aria-busy={returningId === issue.id}
                      className={`btn-secondary ${returningId === issue.id ? "btn-loading" : ""}`}
                    >
                      {returningId === issue.id ? "Returning..." : "Return"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <ConfirmDialog
        open={!!confirmReturnIssueId}
        title="Return book?"
        message="This will mark the book as returned and increase available copies."
        confirmText="Return"
        loading={!!returningId}
        onCancel={() => setConfirmReturnIssueId(null)}
        onConfirm={() => {
          if (confirmReturnIssueId) handleReturn(confirmReturnIssueId);
        }}
      />
    </div>
  );
}
