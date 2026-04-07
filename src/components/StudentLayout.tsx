"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const MENU = [
  { key: "dashboard", label: "Dashboard" },
  { key: "profile", label: "Profile" },
  { key: "attendance", label: "Attendance" },
  { key: "marks", label: "Marks / Results" },
  { key: "assignments", label: "Assignments" },
  { key: "notices", label: "Notices" },
  { key: "fees", label: "Fee Payment" },
  { key: "live", label: "Live Classes" },
  { key: "past", label: "Past Classes" },
  { key: "reviews", label: "My Reviews" },
] as const;

export function StudentLayout({
  children,
  schoolName,
  branchName,
  userName,
}: {
  children: React.ReactNode;
  schoolName: string;
  branchName: string | null;
  userName: string;
}) {
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") || "dashboard").toLowerCase();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
              {schoolName.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{schoolName}</p>
              <p className="text-xs text-slate-500">{branchName ?? "Main Branch"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{userName}</span>
            <form action="/api/auth/logout" method="POST">
              <button className="btn-secondary text-xs">Log out</button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] gap-4 p-4">
        <aside className="sticky top-[72px] h-[calc(100vh-88px)] w-64 shrink-0 overflow-y-auto rounded-xl border border-slate-700 bg-school-dark p-2 text-slate-100 shadow-sm">
          <p className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Student menu</p>
          <nav className="space-y-1">
            {MENU.map((m) => {
              const active = tab === m.key || (m.key === "dashboard" && !tab);
              return (
                <Link
                  key={m.key}
                  href={`/student?tab=${m.key}`}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                    active ? "bg-primary-600 text-white" : "text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <span>{m.label}</span>
                  <span aria-hidden>›</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
