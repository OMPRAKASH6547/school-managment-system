"use client";

import { useMemo, useState } from "react";
import { StudentPayNowButton } from "./StudentPayNowButton";
import { useSearchParams } from "next/navigation";

type SessionRow = {
  id: string;
  subjectName: string;
  teacherName: string;
  startedAt: string;
  endedAt: string | null;
  status: "Ongoing" | "Completed" | "Scheduled";
  avgTeacherRating: number | null;
  avgSubjectRating: number | null;
  myReviewId: string | null;
};

type ReviewRow = {
  id: string;
  sessionId: string;
  subjectName: string | null;
  teacherName: string;
  rating: number;
  comment: string;
  tags: string[];
  createdAt: string;
};

type Props = {
  studentName: string;
  profile: { rollNo: string | null; phone: string | null; className: string | null; schoolName: string | null };
  attendanceSummary: { present: number; absent: number; late: number; leave: number };
  marks: Array<{ exam: string; subject: string; marks: number; maxMarks: number }>;
  liveSessions: SessionRow[];
  pastSessions: SessionRow[];
  reviews: ReviewRow[];
  reviewPageInfo: { page: number; totalPages: number };
  nowMonth: string;
  feeRows: Array<{ id: string; name: string; amount: number; frequency: string; paid: boolean; canPayOnline: boolean }>;
};

type SectionKey = "Dashboard" | "Profile" | "Attendance" | "Marks / Results" | "Assignments" | "Notices" | "Fee Payment" | "Live Classes" | "Past Classes" | "My Reviews";

function activeFromTab(tab: string | null): SectionKey {
  switch ((tab ?? "dashboard").toLowerCase()) {
    case "profile":
      return "Profile";
    case "attendance":
      return "Attendance";
    case "marks":
      return "Marks / Results";
    case "assignments":
      return "Assignments";
    case "notices":
      return "Notices";
    case "fees":
      return "Fee Payment";
    case "live":
      return "Live Classes";
    case "past":
      return "Past Classes";
    case "reviews":
      return "My Reviews";
    default:
      return "Dashboard";
  }
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1 text-amber-500">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? "" : "opacity-30"}>
          ★
        </span>
      ))}
    </div>
  );
}

export function StudentDashboardClient(props: Props) {
  const searchParams = useSearchParams();
  const active = activeFromTab(searchParams.get("tab"));
  const [pastDate, setPastDate] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<SessionRow | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "", tags: "" });
  const [flash, setFlash] = useState("");
  const [pastViewMode, setPastViewMode] = useState<"latest" | "all">("latest");

  const filteredPast = useMemo(() => {
    if (!pastDate) return props.pastSessions;
    return props.pastSessions.filter((s) => s.startedAt.slice(0, 10) === pastDate);
  }, [pastDate, props.pastSessions]);
  const dedupedPast = useMemo(() => {
    if (pastViewMode === "all") return filteredPast;
    // Avoid duplicate-looking rows: keep latest class for same subject+teacher on same date.
    const byKey = new Map<string, SessionRow>();
    for (const row of filteredPast) {
      const d = row.startedAt.slice(0, 10);
      const key = `${d}|${row.subjectName}|${row.teacherName}`;
      const prev = byKey.get(key);
      if (!prev || new Date(row.startedAt).getTime() > new Date(prev.startedAt).getTime()) {
        byKey.set(key, row);
      }
    }
    return [...byKey.values()].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [filteredPast, pastViewMode]);

  async function openReview(session: SessionRow) {
    setReviewTarget(session);
    setReviewForm({ rating: 5, comment: "", tags: "" });
    setModalOpen(true);
  }
  function openEditReviewFromMyReviews(r: ReviewRow) {
    setReviewTarget({
      id: r.sessionId,
      subjectName: r.subjectName ?? "General",
      teacherName: r.teacherName,
      startedAt: r.createdAt,
      endedAt: r.createdAt,
      status: "Completed",
      avgTeacherRating: null,
      avgSubjectRating: null,
      myReviewId: r.id,
    });
    setReviewForm({ rating: r.rating, comment: r.comment, tags: r.tags.join(", ") });
    setModalOpen(true);
  }

  async function submitReview() {
    if (!reviewTarget) return;
    setReviewLoading(true);
    setFlash("");
    try {
      const payload = {
        sessionId: reviewTarget.id,
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim(),
        tags: reviewForm.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };
      const isEdit = !!reviewTarget.myReviewId;
      const url = isEdit ? `/api/student/reviews/${reviewTarget.myReviewId}` : "/api/student/reviews";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setFlash("Review submitted successfully.");
      setModalOpen(false);
      window.location.reload();
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "Failed to save review.");
    } finally {
      setReviewLoading(false);
    }
  }

  async function deleteReview(id: string) {
    if (!confirm("Delete this review?")) return;
    const res = await fetch(`/api/student/reviews/${id}`, { method: "DELETE" });
    if (res.ok) window.location.reload();
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-primary-600">{active}</h1>
          <p className="mt-1 text-sm text-slate-600">Welcome, {props.studentName}</p>
          {flash ? <p className="mt-2 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{flash}</p> : null}
        </div>

        {active === "Dashboard" && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded border bg-slate-50 p-3">Present: {props.attendanceSummary.present}</div>
            <div className="rounded border bg-slate-50 p-3">Absent: {props.attendanceSummary.absent}</div>
            <div className="rounded border bg-slate-50 p-3">Live classes: {props.liveSessions.length}</div>
            <div className="rounded border bg-slate-50 p-3">Pending fees: {props.feeRows.filter((f) => !f.paid).length}</div>
          </div>
        )}

        {active === "Profile" && (
          <dl className="space-y-2 text-sm">
            <div><dt className="text-slate-500">Roll Number</dt><dd className="font-medium">{props.profile.rollNo ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Phone</dt><dd className="font-medium">{props.profile.phone ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Class</dt><dd className="font-medium">{props.profile.className ?? "—"}</dd></div>
            <div><dt className="text-slate-500">School</dt><dd className="font-medium">{props.profile.schoolName ?? "—"}</dd></div>
          </dl>
        )}

        {active === "Attendance" && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded border bg-emerald-50 p-3">Present: {props.attendanceSummary.present}</div>
            <div className="rounded border bg-rose-50 p-3">Absent: {props.attendanceSummary.absent}</div>
            <div className="rounded border bg-amber-50 p-3">Late: {props.attendanceSummary.late}</div>
            <div className="rounded border bg-slate-50 p-3">Leave: {props.attendanceSummary.leave}</div>
          </div>
        )}

        {active === "Marks / Results" && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="text-left text-xs uppercase text-slate-500"><th className="py-2">Exam</th><th>Subject</th><th>Marks</th></tr></thead>
              <tbody>{props.marks.map((m, i) => <tr key={i} className="border-t"><td className="py-2">{m.exam}</td><td>{m.subject}</td><td>{m.marks} / {m.maxMarks}</td></tr>)}</tbody>
            </table>
          </div>
        )}

        {(active === "Assignments" || active === "Notices") && <p className="text-sm text-slate-500">No {active.toLowerCase()} available.</p>}

        {active === "Fee Payment" && (
          <div>
            <p className="mb-2 text-sm text-slate-600">Fee structure for {props.nowMonth}</p>
            <div className="space-y-2">
              {props.feeRows.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded border p-3 text-sm">
                  <div>
                    <p className="font-medium">{f.name}</p>
                    <p className="text-slate-500">₹{f.amount} · {f.frequency}</p>
                  </div>
                  <div>
                    {f.paid ? (
                      <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-800">Paid</span>
                    ) : f.canPayOnline ? (
                      <StudentPayNowButton feePlanId={f.id} feePeriodMonth={props.nowMonth} />
                    ) : (
                      <span className="text-xs text-slate-500">Online payment disabled</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {active === "Live Classes" && (
          <div className="space-y-3">
            {props.liveSessions.length === 0 ? <p className="text-sm text-slate-500">No ongoing classes now.</p> : null}
            {props.liveSessions.map((s) => (
              <div key={s.id} className={`rounded border p-3 ${s.status === "Ongoing" ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{s.subjectName}</p>
                    <p className="text-xs text-slate-600">{s.teacherName}</p>
                  </div>
                  <span className={`rounded px-2 py-1 text-xs ${s.status === "Ongoing" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{s.status}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {new Date(s.startedAt).toLocaleTimeString()} {s.endedAt ? `- ${new Date(s.endedAt).toLocaleTimeString()}` : ""}
                </p>
                <div className="mt-2 flex gap-4 text-xs text-slate-600">
                  <span>Teacher avg: {s.avgTeacherRating ? s.avgTeacherRating.toFixed(1) : "—"}</span>
                  <span>Subject avg: {s.avgSubjectRating ? s.avgSubjectRating.toFixed(1) : "—"}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {active === "Past Classes" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm text-slate-600">Filter date</label>
              <input type="date" value={pastDate} onChange={(e) => setPastDate(e.target.value)} className="input-field max-w-[180px]" />
              <div className="ml-2 inline-flex overflow-hidden rounded border border-slate-200 text-xs">
                <button
                  type="button"
                  className={`px-2 py-1 ${pastViewMode === "latest" ? "bg-primary-600 text-white" : "bg-white text-slate-700"}`}
                  onClick={() => setPastViewMode("latest")}
                >
                  Latest/day
                </button>
                <button
                  type="button"
                  className={`px-2 py-1 ${pastViewMode === "all" ? "bg-primary-600 text-white" : "bg-white text-slate-700"}`}
                  onClick={() => setPastViewMode("all")}
                >
                  All sessions
                </button>
              </div>
              <span className="text-xs text-slate-500">{dedupedPast.length} record(s)</span>
            </div>
            {dedupedPast.length === 0 ? <p className="text-sm text-slate-500">No classes found.</p> : null}
            {dedupedPast.map((s) => (
              <div key={s.id} className="rounded border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{s.subjectName}</p>
                    <p className="text-xs text-slate-600">{s.teacherName}</p>
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">{s.status}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {new Date(s.startedAt).toLocaleDateString()} · {new Date(s.startedAt).toLocaleTimeString()} - {s.endedAt ? new Date(s.endedAt).toLocaleTimeString() : "—"}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex gap-4 text-xs text-slate-600">
                    <span>Teacher avg: {s.avgTeacherRating ? s.avgTeacherRating.toFixed(1) : "—"}</span>
                    <span>Subject avg: {s.avgSubjectRating ? s.avgSubjectRating.toFixed(1) : "—"}</span>
                  </div>
                  <button className="btn-secondary text-xs" onClick={() => openReview(s)}>
                    {s.myReviewId ? "Edit Review" : "Give Review"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {active === "My Reviews" && (
          <div className="space-y-3">
            {props.reviews.length === 0 ? <p className="text-sm text-slate-500">No reviews submitted yet.</p> : null}
            {props.reviews.map((r) => (
              <div key={r.id} className="rounded border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{r.subjectName ?? "General"}</p>
                    <p className="text-xs text-slate-600">{r.teacherName}</p>
                  </div>
                  <Stars value={r.rating} />
                </div>
                <p className="mt-2 text-sm">{r.comment}</p>
                {r.tags.length ? <p className="mt-1 text-xs text-slate-500">{r.tags.join(", ")}</p> : null}
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{new Date(r.createdAt).toLocaleString()}</span>
                  <div className="flex items-center gap-3">
                    <button className="text-primary-600 hover:underline" onClick={() => openEditReviewFromMyReviews(r)}>Edit</button>
                    <button className="text-red-600 hover:underline" onClick={() => deleteReview(r.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm">
              <a className={`btn-secondary ${props.reviewPageInfo.page <= 1 ? "pointer-events-none opacity-50" : ""}`} href={`/student?reviewsPage=${Math.max(1, props.reviewPageInfo.page - 1)}#reviews`}>Previous</a>
              <span>Page {props.reviewPageInfo.page} / {props.reviewPageInfo.totalPages}</span>
              <a className={`btn-secondary ${props.reviewPageInfo.page >= props.reviewPageInfo.totalPages ? "pointer-events-none opacity-50" : ""}`} href={`/student?reviewsPage=${Math.min(props.reviewPageInfo.totalPages, props.reviewPageInfo.page + 1)}#reviews`}>Next</a>
            </div>
          </div>
        )}
      {modalOpen && reviewTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
            <h3 className="text-lg font-semibold">Give Review</h3>
            <p className="text-sm text-slate-600">{reviewTarget.subjectName} · {reviewTarget.teacherName}</p>
            <div className="mt-3">
              <label className="block text-sm font-medium">Rating</label>
              <div className="mt-1 flex gap-1 text-2xl text-amber-500">
                {[1,2,3,4,5].map((n)=><button key={n} onClick={()=>setReviewForm((f)=>({...f,rating:n}))} className={n<=reviewForm.rating?"":"opacity-30"}>★</button>)}
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium">Comment</label>
              <textarea className="input-field mt-1 min-h-[100px]" value={reviewForm.comment} onChange={(e)=>setReviewForm((f)=>({...f,comment:e.target.value}))} />
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium">Tags (optional, comma separated)</label>
              <input className="input-field mt-1" value={reviewForm.tags} onChange={(e)=>setReviewForm((f)=>({...f,tags:e.target.value}))} placeholder="Good Explanation, Doubt Cleared" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-secondary" onClick={()=>setModalOpen(false)}>Cancel</button>
              <button className="btn-primary" disabled={reviewLoading} onClick={submitReview}>{reviewLoading ? "Saving..." : "Submit Review"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
