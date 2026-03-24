"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  nav: NavItem[];
  role: "super_admin" | "school_admin";
}

export function DashboardLayout({ children, title, nav, role }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-4 sm:gap-8 w-full">
            <Link href={role === "super_admin" ? "/super-admin" : "/school"} className="text-base sm:text-lg font-bold text-primary-600 whitespace-nowrap">
              SchoolSaaS
            </Link>
            <nav className="hidden gap-1 sm:flex flex-wrap">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-2 py-2 text-xs sm:px-3 sm:py-2 sm:text-sm font-medium ${
                    pathname === item.href
                      ? "bg-primary-50 text-primary-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            {/* Mobile nav */}
            <nav className="flex gap-1 sm:hidden ml-2">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    pathname === item.href
                      ? "bg-primary-50 text-primary-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="ml-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-2 py-4 sm:px-4 sm:py-8 md:px-6 lg:px-8">
        {title && <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{title}</h1>}
        <div className={title ? "mt-4 sm:mt-6" : ""}>{children}</div>
      </main>
    </div>
  );
}
