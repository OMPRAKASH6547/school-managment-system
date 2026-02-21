"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";

interface NavItem {
  href: string;
  label: string;
  children?: { href: string; label: string }[];
}

interface SchoolLayoutProps {
  children: React.ReactNode;
  schoolName: string;
  schoolLogo: string | null;
  website: string | null;
  userName: string;
}

const navItems: NavItem[] = [
  { href: "/school", label: "Dashboard" },
  { href: "/school/students", label: "Students" },
  { href: "/school/staff", label: "Teachers & Staff" },
  { href: "/school/classes", label: "Classes & Subjects" },
  { href: "/school/examinations", label: "Examinations" },
  { href: "/school/attendance", label: "Attendance" },
  { href: "/school/staff-attendance", label: "Staff Attendance" },
  { href: "/school/fees", label: "Fee Management" },
  { href: "/school/library", label: "Library" },
  { href: "/school/books", label: "Books & Copy" },
  { href: "/school/hostel", label: "Hostel Management" },
  { href: "/school/settings", label: "Settings" },
];

export function SchoolLayout({
  children,
  schoolName,
  schoolLogo,
  website,
  userName,
}: SchoolLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top header - red/white like reference */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="flex h-16 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            {schoolLogo ? (
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-primary-600 bg-white">
                <Image src={schoolLogo} alt="" fill className="object-contain" />
              </div>
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white">
                {schoolName.charAt(0)}
              </div>
            )}
            <span className="text-lg font-bold text-school-navy max-w-[200px] truncate lg:max-w-none">
              {schoolName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Notifications"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-school-green px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                View Website
              </a>
            )}
            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-school-navy hover:bg-slate-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold">
                  {userName.slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden sm:inline">{userName}</span>
                <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute right-0 top-full z-10 mt-1 hidden w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg group-hover:block">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Left sidebar - dark grey */}
        <aside className="fixed left-0 top-16 z-20 h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-slate-700 bg-school-dark">
          <nav className="flex flex-col gap-0.5 p-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-white transition ${
                    isActive
                      ? "bg-primary-600 text-white"
                      : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <span>{item.label}</span>
                  <svg className="h-4 w-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 pl-64">
          <div className="p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
