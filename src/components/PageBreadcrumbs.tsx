"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Human-readable labels for URL segments under /school and /super-admin */
const SEGMENT_LABELS: Record<string, string> = {
  school: "Dashboard",
  "super-admin": "Super Admin",
  students: "Students",
  staff: "Teachers & Staff",
  classes: "Classes & Subjects",
  examinations: "Examinations",
  attendance: "Attendance",
  teacher: "Teacher Dashboard",
  "staff-attendance": "Staff Attendance",
  fees: "Fee Management",
  "payment-verification": "Payment Verification",
  library: "Library",
  books: "Books & Copy",
  transport: "Transport",
  hostel: "Hostel",
  settings: "Settings",
  organizations: "Organizations",
  plans: "Plans",
  register: "Register",
  login: "Log in",
  new: "New",
  results: "Results",
};

function labelForSegment(segment: string, index: number, parts: string[]): string {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  if (/^[a-z0-9]{20,}$/i.test(segment)) return "Details";
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PageBreadcrumbs() {
  const pathname = usePathname();
  if (!pathname || pathname === "/") return null;

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  const items: { href: string; label: string }[] = [{ href: "/", label: "Home" }];

  let acc = "";
  for (let i = 0; i < parts.length; i++) {
    acc += `/${parts[i]}`;
    const isLast = i === parts.length - 1;
    const label = labelForSegment(parts[i]!, i, parts);
    items.push({ href: acc, label: isLast ? label : label });
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-600">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.href}-${i}`} className="flex items-center gap-1">
              {i > 0 && <span className="text-slate-400" aria-hidden>/</span>}
              {isLast ? (
                <span className="font-medium text-slate-900">{item.label}</span>
              ) : (
                <Link href={item.href} className="text-primary-600 hover:underline">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
