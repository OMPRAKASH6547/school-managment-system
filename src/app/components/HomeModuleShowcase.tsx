"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";

type MockVariant =
  | "dashboard"
  | "table"
  | "grid"
  | "exams"
  | "calendar"
  | "teacher"
  | "fees"
  | "verify"
  | "library"
  | "products"
  | "route"
  | "hostel"
  | "settings";

/** Same order/labels as `navItems` in SchoolLayout (school mode). */
const ALL_DASHBOARD_NAV_LABELS = [
  "Dashboard",
  "Students",
  "Teachers & Staff",
  "Classes & Subjects",
  "Examinations",
  "Attendance",
  "Teacher Dashboard",
  "Staff Attendance",
  "Fee Management",
  "Payment Verification",
  "Library",
  "Books & Copy",
  "Transport",
  "Hostel Management",
  "Settings",
] as const;

type DashboardNavLabel = (typeof ALL_DASHBOARD_NAV_LABELS)[number];

type ModuleDef = {
  title: string;
  description: string;
  variant: MockVariant;
  /** Matches `ALL_DASHBOARD_NAV_LABELS` — highlights the same sidebar row as the real app */
  navActive: DashboardNavLabel;
};

function navWindowFor(active: DashboardNavLabel): DashboardNavLabel[] {
  const labels = [...ALL_DASHBOARD_NAV_LABELS];
  const idx = labels.indexOf(active);
  const i = idx === -1 ? 0 : idx;
  const size = 6;
  let start = Math.max(0, i - Math.floor(size / 2));
  if (start + size > labels.length) start = Math.max(0, labels.length - size);
  return labels.slice(start, start + size);
}

const NAV_ICON: Record<string, string> = {
  Dashboard: "🏠",
  Students: "🎓",
  "Teachers & Staff": "👥",
  "Classes & Subjects": "🏫",
  Examinations: "📝",
  Attendance: "📅",
  "Teacher Dashboard": "👥",
  "Staff Attendance": "👥",
  "Fee Management": "💳",
  "Payment Verification": "✅",
  Library: "📚",
  "Books & Copy": "📖",
  Transport: "🚌",
  "Hostel Management": "🏨",
  Settings: "⚙️",
};

const MODULES: ModuleDef[] = [
  {
    title: "Dashboard",
    description:
      "KPIs, attendance snapshot, charts, teacher class sessions, pending verifications, and collection summaries in one view.",
    variant: "dashboard",
    navActive: "Dashboard",
  },
  {
    title: "Students",
    description: "Admissions, profiles, roll numbers, class assignment, documents, and quick enrollment workflows.",
    variant: "table",
    navActive: "Students",
  },
  {
    title: "Teachers & Staff",
    description: "Staff records, roles, branch assignment, and generated login access with optional module permissions.",
    variant: "table",
    navActive: "Teachers & Staff",
  },
  {
    title: "Classes & Subjects",
    description: "Create classes or coaching batches, map subjects, capacity, and academic year in one place.",
    variant: "grid",
    navActive: "Classes & Subjects",
  },
  {
    title: "Examinations",
    description: "Exam setup, subject-wise marks, publish results, and public result links for students and parents.",
    variant: "exams",
    navActive: "Examinations",
  },
  {
    title: "Attendance",
    description: "Daily student attendance with present, absent, late, and leave—filterable by class and date.",
    variant: "calendar",
    navActive: "Attendance",
  },
  {
    title: "Teacher dashboard",
    description: "Start and end class sessions, optional auto-attendance, and assigned batch controls for teachers.",
    variant: "teacher",
    navActive: "Teacher Dashboard",
  },
  {
    title: "Staff attendance",
    description: "Mark and review staff presence with monthly views for your non-teaching team.",
    variant: "calendar",
    navActive: "Staff Attendance",
  },
  {
    title: "Fee management",
    description: "Fee plans, student and staff payments, line items, receipts, and period-wise fee tracking.",
    variant: "fees",
    navActive: "Fee Management",
  },
  {
    title: "Payment verification",
    description: "Queue pending submissions, verify or reject, and keep collections auditable.",
    variant: "verify",
    navActive: "Payment Verification",
  },
  {
    title: "Library",
    description: "Catalog books, copies, and issues with availability and student issue history.",
    variant: "library",
    navActive: "Library",
  },
  {
    title: "Books & copy",
    description: "Sell materials, book sets, invoices, and stock—ideal for uniform shop or study material sales.",
    variant: "products",
    navActive: "Books & Copy",
  },
  {
    title: "Transport",
    description: "Routes, vehicles, and student assignments with operational clarity for daily commutes.",
    variant: "route",
    navActive: "Transport",
  },
  {
    title: "Hostel",
    description: "Rooms, capacity, allocations, and vacate flows for residential students.",
    variant: "hostel",
    navActive: "Hostel Management",
  },
  {
    title: "Settings",
    description: "Branches, appearance, branding, and organization preferences your admins control.",
    variant: "settings",
    navActive: "Settings",
  },
];

function MockFrame({
  variant,
  navActive,
  moduleTitle,
}: {
  variant: MockVariant;
  navActive: DashboardNavLabel;
  moduleTitle: string;
}) {
  const isStaffTable = moduleTitle.includes("Staff") && moduleTitle.includes("Teachers");
  const isStaffAttendance = moduleTitle.toLowerCase().includes("staff attendance");

  const sidebar = (
    <div className="flex w-[34%] max-w-[5.75rem] shrink-0 flex-col gap-0.5 border-r border-slate-700 bg-school-dark p-1">
      {navWindowFor(navActive).map((label) => {
        const active = label === navActive;
        return (
          <div
            key={label}
            className={`flex items-center gap-0.5 truncate rounded-lg px-1 py-1 text-[5px] font-medium leading-tight text-white transition-colors ${
              active ? "bg-primary-600 text-white" : "text-slate-300"
            }`}
          >
            <span className="inline-flex h-3 w-3 shrink-0 items-center justify-center rounded bg-slate-800 text-[4px]">
              {NAV_ICON[label] ?? "•"}
            </span>
            <span className="min-w-0 truncate">{label}</span>
          </div>
        );
      })}
    </div>
  );

  const content = (() => {
    switch (variant) {
      case "dashboard":
        return (
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden p-1 text-[6px] leading-tight">
            <div className="flex flex-wrap items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50/80 p-0.5">
              <span className="w-full text-[5px] font-semibold uppercase tracking-wide text-slate-500">View</span>
              {["All", "KPIs", "Charts"].map((t, j) => (
                <span
                  key={t}
                  className={`rounded-full px-1 py-0.5 text-[5px] font-medium ${
                    j === 0 ? "bg-primary-600 text-white shadow-sm" : "bg-white text-slate-700 ring-1 ring-slate-200"
                  }`}
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-0.5">
              {[
                { k: "Total Students", v: "248", color: "text-school-navy" },
                { k: "Collected", v: "4.2L", color: "text-school-green" },
                { k: "Pending", v: "12", color: "text-primary-600" },
              ].map((c) => (
                <div
                  key={c.k}
                  className="flex flex-col items-center rounded-lg border border-slate-200 bg-white px-0.5 py-1 shadow-sm"
                >
                  <p className={`text-[9px] font-bold leading-none ${c.color}`}>{c.v}</p>
                  <p className="mt-0.5 text-center text-[5px] text-slate-500">{c.k}</p>
                </div>
              ))}
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="bg-primary-600 px-1 py-0.5 text-[5px] font-semibold text-white">Class Strength</div>
              <div className="flex h-7 items-end gap-0.5 border-t border-slate-100 px-1 pb-0.5 pt-1">
                {[12, 18, 9, 22, 15].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-[#2563eb]" style={{ height: `${h}px` }} />
                ))}
              </div>
            </div>
            <div className="mt-auto flex flex-wrap gap-0.5 text-[5px]">
              <span className="rounded-full bg-amber-50 px-1 py-0.5 font-medium text-amber-800 ring-1 ring-amber-200">
                3 pending pay
              </span>
              <span className="rounded-full bg-emerald-50 px-1 py-0.5 font-medium text-emerald-800 ring-1 ring-emerald-200">
                2 live classes
              </span>
            </div>
          </div>
        );
      case "table":
        if (isStaffTable) {
          const rows = [
            { name: "Anita Rao", role: "Teacher", id: "EMP-A12" },
            { name: "Rahul Mehta", role: "Accountant", id: "EMP-B04" },
            { name: "S. Khan", role: "Admin", id: "EMP-C09" },
          ];
          return (
            <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden p-1 text-[6px] text-slate-700">
              <div className="font-semibold text-school-navy">Staff directory</div>
              <div className="mt-0.5 grid grid-cols-[1fr_auto_auto] gap-x-1 border-b border-slate-200 bg-slate-50 py-0.5 text-[5px] font-semibold uppercase text-slate-500">
                <span>Name</span>
                <span>Role</span>
                <span>ID</span>
              </div>
              {rows.map((r) => (
                <div key={r.id} className="grid grid-cols-[1fr_auto_auto] gap-x-1 border-b border-slate-100 py-0.5">
                  <span className="truncate font-medium text-school-navy">{r.name}</span>
                  <span className="text-primary-700">{r.role}</span>
                  <span className="text-slate-500">{r.id}</span>
                </div>
              ))}
            </div>
          );
        }
        const students = [
          { name: "Priya Sharma", roll: "2401", cls: "10-A" },
          { name: "Arjun Patel", roll: "2402", cls: "10-A" },
          { name: "Neha Singh", roll: "2403", cls: "9-B" },
        ];
        return (
          <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden p-1 text-[6px] text-slate-700">
            <div className="font-semibold text-school-navy">Students</div>
            <div className="mt-0.5 grid grid-cols-[1fr_auto_auto] gap-x-1 border-b border-slate-200 bg-slate-50 py-0.5 text-[5px] font-semibold uppercase text-slate-500">
              <span>Name</span>
              <span>Roll</span>
              <span>Class</span>
            </div>
            {students.map((r) => (
              <div key={r.roll} className="grid grid-cols-[1fr_auto_auto] gap-x-1 border-b border-slate-100 py-0.5">
                <span className="truncate font-medium text-school-navy">{r.name}</span>
                <span className="text-slate-600">{r.roll}</span>
                <span className="font-medium text-school-green">{r.cls}</span>
              </div>
            ))}
          </div>
        );
      case "grid":
        const batches = [
          { n: "JEE Batch 1", sub: "Phy, Chem, Math", cap: "32/40" },
          { n: "NEET Weekend", sub: "Bio focus", cap: "28/35" },
          { n: "Class 10-A", sub: "All subs", cap: "38/40" },
          { n: "Doubt Lab", sub: "Open", cap: "12/20" },
        ];
        return (
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-0.5 p-1 text-[5px] leading-tight">
            {batches.map((b) => (
              <div key={b.n} className="rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                <div className="font-semibold text-school-navy">{b.n}</div>
                <div className="mt-0.5 text-slate-500">{b.sub}</div>
                <div className="mt-0.5 font-medium text-school-green">{b.cap}</div>
              </div>
            ))}
          </div>
        );
      case "exams":
        const exams = [
          { name: "Unit Test 2 — Apr", status: "Published", sub: "Class 10" },
          { name: "Half-Yearly Mock", status: "Draft", sub: "All batches" },
          { name: "Weekly Quiz 14", status: "Published", sub: "JEE 1" },
        ];
        return (
          <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden p-1 text-[6px]">
            {exams.map((e) => (
              <div
                key={e.name}
                className="flex items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-1 py-0.5 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-school-navy">{e.name}</div>
                  <div className="text-[5px] text-slate-500">{e.sub}</div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-1 py-0.5 text-[5px] font-semibold ${
                    e.status === "Published"
                      ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                      : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                  }`}
                >
                  {e.status}
                </span>
              </div>
            ))}
          </div>
        );
      case "calendar":
        if (isStaffAttendance) {
          return (
            <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 text-[6px] text-slate-700 shadow-sm">
              <div className="flex justify-between text-[5px] font-medium text-slate-500">
                <span>April 2026</span>
                <span>Staff</span>
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-[5px] text-slate-500">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, idx) => (
                  <span key={`staff-dow-${idx}`} className="text-center">
                    {d}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: 21 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex aspect-square items-center justify-center rounded border text-[5px] font-medium ${
                      i % 6 === 0
                        ? "border-sky-200 bg-sky-100 text-sky-900"
                        : "border-slate-100 bg-slate-50 text-slate-500"
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
              <div className="mt-auto border-t border-slate-100 pt-0.5 text-[5px] text-slate-500">R. Iyer — Present 22/22</div>
            </div>
          );
        }
        return (
          <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 text-[6px] text-slate-700 shadow-sm">
            <div className="flex justify-between text-[5px] font-medium text-slate-500">
              <span>Mon 7 Apr 2026</span>
              <span>Class 10-A</span>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-[5px] text-slate-500">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, idx) => (
                <span key={`stu-dow-${idx}`} className="text-center">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: 21 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex aspect-square items-center justify-center rounded border text-[5px] font-medium ${
                    i % 5 === 0
                      ? "border-emerald-200 bg-emerald-100 text-emerald-900"
                      : "border-slate-100 bg-slate-50 text-slate-500"
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="mt-auto border-t border-slate-100 pt-0.5 text-[5px] text-slate-500">Present 38 · Absent 2 · Late 1</div>
          </div>
        );
      case "teacher":
        return (
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden p-1 text-[6px] text-slate-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-school-navy">Your batches</span>
              <span className="rounded-full bg-emerald-100 px-1 py-0.5 text-[5px] font-bold uppercase text-emerald-800 ring-1 ring-emerald-200">
                Live
              </span>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-1 py-1 shadow-sm">
              <div className="text-[5px] font-medium text-emerald-900">Physics — JEE Batch 1</div>
              <div className="mt-0.5 text-[5px] text-slate-600">Started 10:05 AM · Auto attendance on</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-1 py-1 shadow-sm">
              <div className="flex items-center justify-between gap-1">
                <span className="font-medium text-school-navy">Chemistry — NEET</span>
                <span className="rounded-md bg-primary-600 px-1 py-0.5 text-[5px] font-semibold text-white shadow-sm">
                  Start
                </span>
              </div>
            </div>
          </div>
        );
      case "fees":
        return (
          <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden p-1 text-[6px] text-slate-700">
            <div className="text-[5px] font-medium text-slate-500">Record payment · Student</div>
            <div className="rounded-lg border border-slate-200 bg-white px-1 py-1 shadow-sm">
              <div className="font-medium text-school-navy">Aanya K. · Roll 2410</div>
              <div className="mt-0.5 flex justify-between text-[5px]">
                <span className="text-slate-600">Tuition Apr</span>
                <span className="font-semibold text-primary-600">₹4,500</span>
              </div>
              <div className="mt-0.5 flex justify-between text-[5px] text-slate-500">
                <span>UPI</span>
                <span>Pending verify</span>
              </div>
            </div>
            <div className="mt-auto flex justify-between border-t border-slate-200 pt-0.5 text-[5px] text-slate-600">
              <span>Today collected</span>
              <span className="font-semibold text-school-green">₹32,400</span>
            </div>
          </div>
        );
      case "verify":
        const queue = [
          { who: "Vikram S.", amt: "₹2,200", mode: "Cash" },
          { who: "Meera D.", amt: "₹5,000", mode: "UPI" },
          { who: "Fee — Batch 2", amt: "₹18,000", mode: "Bank" },
        ];
        return (
          <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden p-1 text-[6px]">
            <div className="text-[5px] font-semibold text-slate-500">Verification queue</div>
            {queue.map((q) => (
              <div
                key={q.who}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1 py-0.5 shadow-sm"
              >
                <span className="text-[6px] text-amber-500">○</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-school-navy">{q.who}</div>
                  <div className="text-[5px] text-slate-500">{q.mode}</div>
                </div>
                <span className="shrink-0 font-semibold text-primary-600">{q.amt}</span>
                <span className="shrink-0 rounded-md bg-school-green px-1 text-[5px] font-semibold text-white shadow-sm">
                  OK
                </span>
              </div>
            ))}
          </div>
        );
      case "library":
        const books = [
          { t: "Concepts of Physics", c: "12", a: "H.C. Verma" },
          { t: "RD Sharma Math", c: "8", a: "—" },
          { t: "NCERT Biology", c: "15", a: "NCERT" },
          { t: "English Wren", c: "6", a: "—" },
        ];
        return (
          <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden p-1 text-[5px] leading-tight text-slate-700">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-1 border-b border-slate-200 bg-slate-50 py-0.5 text-[5px] font-semibold uppercase text-slate-500">
              <span>Title</span>
              <span>Avail</span>
              <span>Author</span>
            </div>
            {books.map((b) => (
              <div key={b.t} className="grid grid-cols-[1fr_auto_auto] gap-x-1 border-b border-slate-100 py-0.5">
                <span className="truncate font-medium text-school-navy">{b.t}</span>
                <span className="font-medium text-[#2563eb]">{b.c}</span>
                <span className="truncate text-slate-500">{b.a}</span>
              </div>
            ))}
          </div>
        );
      case "products":
        const items = [
          { n: "Notebook", p: "₹45" },
          { n: "Register", p: "₹120" },
          { n: "Pen set", p: "₹80" },
          { n: "Lab coat", p: "₹350" },
          { n: "ID card", p: "₹25" },
          { n: "Bag", p: "₹890" },
        ];
        return (
          <div className="grid min-h-0 flex-1 grid-cols-3 gap-0.5 p-1 text-[5px]">
            {items.map((it) => (
              <div
                key={it.n}
                className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white px-0.5 py-0.5 shadow-sm"
              >
                <span className="line-clamp-2 font-medium leading-tight text-school-navy">{it.n}</span>
                <span className="mt-0.5 font-semibold text-primary-600">{it.p}</span>
              </div>
            ))}
          </div>
        );
      case "route":
        return (
          <div className="relative flex min-h-0 flex-1 flex-col justify-center gap-1 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 text-[6px] text-slate-700 shadow-sm">
            <div className="absolute left-2 top-1/2 h-0.5 w-[88%] -translate-y-1/2 rounded bg-slate-200" />
            <div className="relative z-10 flex items-center justify-between px-0.5">
              <div className="text-center">
                <div className="mx-auto h-2 w-2 rounded-full bg-school-green shadow-sm ring-2 ring-white" />
                <div className="mt-0.5 text-[5px] text-slate-500">Sector 5</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-1 py-0.5 text-center shadow-sm">
                <div className="font-semibold text-school-navy">Route R-12</div>
                <div className="text-[5px] text-slate-500">Bus KA-01-AB-4402</div>
              </div>
              <div className="text-center">
                <div className="mx-auto h-2 w-2 rounded-full bg-school-green shadow-sm ring-2 ring-white" />
                <div className="mt-0.5 text-[5px] text-slate-500">Campus</div>
              </div>
            </div>
            <div className="text-center text-[5px] text-slate-500">24 students assigned</div>
          </div>
        );
      case "hostel":
        const rooms = [
          { id: "A-101", occ: "2/4" },
          { id: "A-102", occ: "4/4" },
          { id: "B-201", occ: "1/2" },
          { id: "B-202", occ: "0/2" },
          { id: "C-301", occ: "3/4" },
          { id: "C-302", occ: "2/4" },
          { id: "D-401", occ: "1/3" },
          { id: "D-402", occ: "3/3" },
          { id: "E-501", occ: "2/2" },
          { id: "E-502", occ: "1/2" },
          { id: "F-601", occ: "0/4" },
          { id: "F-602", occ: "2/4" },
        ];
        return (
          <div className="grid min-h-0 flex-1 grid-cols-4 gap-0.5 p-1 text-[5px] leading-tight">
            {rooms.map((r) => (
              <div
                key={r.id}
                className={`flex flex-col items-center justify-center rounded border py-0.5 shadow-sm ${
                  r.occ.startsWith("0")
                    ? "border-slate-200 bg-slate-50 text-slate-500"
                    : "border-teal-200 bg-teal-50 text-teal-900"
                }`}
              >
                <span className="font-bold text-school-navy">{r.id}</span>
                <span className="text-[5px] opacity-90">{r.occ}</span>
              </div>
            ))}
          </div>
        );
      case "settings":
        return (
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden p-1 text-[6px] text-slate-700">
            {[
              { l: "Institute name", v: "Bright Future Academy" },
              { l: "Branch code", v: "BR-MAIN-01" },
              { l: "Dashboard theme", v: "Slate" },
            ].map((f) => (
              <div key={f.l}>
                <div className="text-[5px] font-medium text-slate-500">{f.l}</div>
                <div className="mt-0.5 rounded-lg border border-slate-200 bg-white px-1 py-0.5 font-medium text-school-navy shadow-sm">
                  {f.v}
                </div>
              </div>
            ))}
          </div>
        );
      default:
        return <div className="flex-1 bg-slate-100" />;
    }
  })();

  return (
    <div className="relative overflow-hidden border-t border-slate-200 bg-slate-100 text-left shadow-inner">
      <div className="flex h-6 items-center gap-1 border-b border-slate-200 bg-white px-1.5 shadow-sm">
        <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 border-primary-600 bg-white text-[6px] font-bold text-primary-600">
          B
        </div>
        <span className="min-w-0 truncate text-[6px] font-bold text-school-navy">Bright Future Academy</span>
        <span className="ml-auto hidden text-[5px] font-medium uppercase tracking-wide text-slate-400 sm:inline">
          Branch
        </span>
        <span className="hidden max-w-[3.5rem] truncate rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[5px] text-slate-700 sm:inline">
          Main
        </span>
      </div>
      <div className="relative flex h-[9.75rem] sm:h-[10.5rem]">
        {sidebar}
        <div className="min-w-0 flex-1 overflow-hidden p-1">{content}</div>
      </div>
    </div>
  );
}

const SLIDE_INTERVAL_MS = 5500;
const SWIPE_MIN_PX = 48;

function ModuleSlidePanel({ mod }: { mod: ModuleDef }) {
  return (
    <article className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-lg backdrop-blur-md transition-all duration-500 hover:border-primary-400/35 hover:bg-white/[0.07] hover:shadow-2xl hover:shadow-primary-900/20">
      <div className="mb-4 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 shadow-md transition-colors duration-500 group-hover:border-primary-500/40 group-hover:shadow-lg">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Snapshot</span>
          <span className="text-[10px] font-medium text-school-navy">{mod.title}</span>
        </div>
        <MockFrame variant={mod.variant} navActive={mod.navActive} moduleTitle={mod.title} />
      </div>
      <h3 className="text-lg font-semibold text-white transition-colors duration-300 group-hover:text-primary-200">
        {mod.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400 transition-colors duration-300 group-hover:text-slate-300">
        {mod.description}
      </p>
    </article>
  );
}

export function HomeModuleShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion || paused) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % MODULES.length);
    }, SLIDE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion, paused]);

  const go = (delta: number) => {
    setActive((i) => (i + delta + MODULES.length) % MODULES.length);
  };

  const onTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (touchStartX.current == null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const dx = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_MIN_PX) return;
    go(dx < 0 ? 1 : -1);
  };

  const slideId = (i: number) => `home-module-slide-${i}`;

  return (
    <section className="mt-24 border-t border-white/10 pt-20" aria-labelledby="modules-heading">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-300/90">Inside your dashboard</p>
        <h2 id="modules-heading" className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Every module, one connected workspace
        </h2>
        <p className="mt-4 text-base text-slate-400 sm:text-lg">
          A quick look at the tools your team uses every day—fees, classes, library, transport, and more in one place.
        </p>
      </div>

      <div
        className="mx-auto mt-14 w-full max-w-3xl px-4 sm:px-6"
        role="region"
        aria-roledescription="carousel"
        aria-label="Dashboard module previews"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
        }}
      >
        <div className="relative w-full">
          {/* Viewport: fixed width so each slide is exactly one full frame (no side peek). */}
          <div
            className="w-full overflow-hidden rounded-2xl"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div
              className={`flex ${reduceMotion ? "" : "transition-transform duration-500 ease-out"}`}
              style={{
                width: `${MODULES.length * 100}%`,
                transform: `translateX(-${(100 / MODULES.length) * active}%)`,
              }}
            >
              {MODULES.map((mod, i) => (
                <div
                  key={mod.title}
                  id={slideId(i)}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${MODULES.length}: ${mod.title}`}
                  aria-hidden={i !== active}
                  className="shrink-0"
                  style={{ width: `${100 / MODULES.length}%` }}
                >
                  <ModuleSlidePanel mod={mod} />
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-school-dark/90 text-white shadow-lg backdrop-blur-sm transition hover:border-primary-400/50 hover:bg-primary-600/90 sm:flex"
            aria-label="Previous module"
          >
            <span className="sr-only">Previous</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-school-dark/90 text-white shadow-lg backdrop-blur-sm transition hover:border-primary-400/50 hover:bg-primary-600/90 sm:flex"
            aria-label="Next module"
          >
            <span className="sr-only">Next</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2" role="tablist" aria-label="Choose module slide">
          {MODULES.map((mod, i) => (
            <button
              key={mod.title}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-controls={slideId(i)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === active ? "w-8 bg-primary-400" : "w-2.5 bg-white/25 hover:bg-white/40"
              }`}
              onClick={() => setActive(i)}
              aria-label={`Show ${mod.title}`}
            />
          ))}
        </div>

        <p className="mt-3 text-center text-xs text-slate-500 tabular-nums" aria-live="polite">
          {active + 1} / {MODULES.length}
        </p>
        <span className="sr-only" aria-live="polite">
          {reduceMotion
            ? "Slideshow is manual only because reduced motion is on."
            : paused
              ? "Slideshow paused."
              : ""}
        </span>
      </div>
    </section>
  );
}
