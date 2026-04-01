"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SearchablePaginatedSelect } from "@/app/components/SearchablePaginatedSelect";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { PageBreadcrumbs } from "@/components/PageBreadcrumbs";
import { canPermission, type PermissionModule } from "@/lib/permissions";
import type { UserRole } from "@/types";

interface NavItem {
  href: string;
  label: string;
  children?: { href: string; label: string }[];
  icon: string;
}

function dashboardSidebarShell(theme: string | null | undefined): string {
  const t = theme ?? "slate";
  const map: Record<string, string> = {
    slate: "border-slate-700 bg-school-dark",
    navy: "border-slate-800 bg-[#0a1628]",
    emerald: "border-emerald-900 bg-emerald-950",
    indigo: "border-indigo-900 bg-indigo-950",
    rose: "border-rose-900 bg-rose-950",
  };
  return map[t] ?? map.slate!;
}

interface SchoolLayoutProps {
  children: React.ReactNode;
  schoolName: string;
  schoolLogo: string | null;
  website: string | null;
  userName: string;
  role: UserRole;
  permissions?: Record<string, { view?: boolean; add?: boolean; edit?: boolean; delete?: boolean }> | null;
  branches: { id: string; name: string; branchCode: string }[];
  selectedBranchId: string | null;
  /** When true, layout defaulted a branch but could not set the httpOnly cookie — sync via API once. */
  needsBranchCookie?: boolean;
  /** School setting: slate | navy | emerald | indigo | rose */
  dashboardTheme?: string | null;
  /** Organization type: school | coaching */
  schoolType?: string | null;
}

const navItems: NavItem[] = [
  { href: "/school", label: "Dashboard", icon: "DB" },
  { href: "/school/students", label: "Students", icon: "ST" },
  { href: "/school/staff", label: "Teachers & Staff", icon: "TS" },
  { href: "/school/classes", label: "Classes & Subjects", icon: "CL" },
  { href: "/school/examinations", label: "Examinations", icon: "EX" },
  { href: "/school/attendance", label: "Attendance", icon: "AT" },
  { href: "/school/teacher", label: "Teacher Dashboard", icon: "TD" },
  { href: "/school/staff-attendance", label: "Staff Attendance", icon: "SA" },
  { href: "/school/fees", label: "Fee Management", icon: "FE" },
  { href: "/school/payment-verification", label: "Payment Verification", icon: "PV" },
  { href: "/school/library", label: "Library", icon: "LB" },
  { href: "/school/books", label: "Books & Copy", icon: "BK" },
  { href: "/school/transport", label: "Transport", icon: "TR" },
  { href: "/school/hostel", label: "Hostel Management", icon: "HS" },
  { href: "/school/settings", label: "Settings", icon: "SE" },
];

function MenuIcon({ href }: { href: string }) {
  if (href === "/school") return <span aria-hidden>🏠</span>;
  if (href === "/school/students") return <span aria-hidden>🎓</span>;
  if (href === "/school/staff" || href === "/school/teacher" || href === "/school/staff-attendance") {
    return <span aria-hidden>👥</span>;
  }
  if (href === "/school/classes") return <span aria-hidden>🏫</span>;
  if (href === "/school/examinations") return <span aria-hidden>📝</span>;
  if (href === "/school/attendance") return <span aria-hidden>📅</span>;
  if (href === "/school/fees") return <span aria-hidden>💳</span>;
  if (href === "/school/payment-verification") return <span aria-hidden>✅</span>;
  if (href === "/school/library") return <span aria-hidden>📚</span>;
  if (href === "/school/books") return <span aria-hidden>📖</span>;
  if (href === "/school/transport") return <span aria-hidden>🚌</span>;
  if (href === "/school/hostel") return <span aria-hidden>🏨</span>;
  if (href === "/school/settings") return <span aria-hidden>⚙️</span>;
  return <span aria-hidden>•</span>;
}

export function SchoolLayout({
  children,
  schoolName,
  schoolLogo,
  website,
  userName,
  role,
  permissions = null,
  branches,
  selectedBranchId,
  needsBranchCookie = false,
  dashboardTheme = null,
  schoolType = null,
}: SchoolLayoutProps) {
  const isCoaching = (schoolType ?? "").toLowerCase() === "coaching";
  const sidebarShell = dashboardSidebarShell(dashboardTheme);
  const dashboardHref = role === "teacher" ? "/school/teacher" : role === "staff" ? "/school/staff-attendance" : "/school";
  const coachingLabelsByHref: Record<string, string> = {
    "/school": "Coaching Dashboard",
    "/school/students": "Student Management",
    "/school/staff": "Teacher Management",
    "/school/classes": "Batch Management",
    "/school/examinations": "Exams / Test Series",
    "/school/attendance": "Attendance",
    "/school/teacher": "Live Class Control",
    "/school/fees": "Fee Management",
    "/school/payment-verification": "Fee Verification",
    "/school/books": "Material Management",
  };
  const coachingAllowedHrefs = new Set<string>([
    "/school",
    "/school/students",
    "/school/staff",
    "/school/classes",
    "/school/examinations",
    "/school/attendance",
    "/school/teacher",
    "/school/staff-attendance",
    "/school/fees",
    "/school/payment-verification",
    "/school/books",
    "/school/settings",
  ]);
  const displayNavItems = navItems
    .map((item) => {
      const withDashboardHref = item.href === "/school" ? { ...item, href: dashboardHref } : item;
      if (!isCoaching) return withDashboardHref;
      return {
        ...withDashboardHref,
        label: coachingLabelsByHref[withDashboardHref.href] ?? withDashboardHref.label,
      };
    })
    .filter((item) => {
      if (role === "teacher") return item.href !== "/school/staff-attendance";
      if (role === "staff") return item.href !== "/school/teacher";
      if (isCoaching && !coachingAllowedHrefs.has(item.href)) return false;
      return true;
    });

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const branchCookieSynced = useRef(false);

  const [branchLoading, setBranchLoading] = useState(false);
  const [activeBranchId, setActiveBranchId] = useState(selectedBranchId ?? null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuCollapsed, setMenuCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeProgress, setRouteProgress] = useState(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearRouteLoadingTimers() {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }
  }

  function startRouteLoading() {
    clearRouteLoadingTimers();
    setRouteLoading(true);
    setRouteProgress(12);
    progressIntervalRef.current = setInterval(() => {
      setRouteProgress((prev) => (prev >= 88 ? prev : prev + 8));
    }, 120);
  }

  function finishRouteLoading() {
    clearRouteLoadingTimers();
    setRouteProgress(100);
    finishTimeoutRef.current = setTimeout(() => {
      setRouteLoading(false);
      setRouteProgress(0);
    }, 280);
  }

  useEffect(() => {
    setActiveBranchId(selectedBranchId ?? null);
  }, [selectedBranchId]);

  useEffect(() => {
    if (routeLoading) finishRouteLoading();
    return () => {
      clearRouteLoadingTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!needsBranchCookie || !selectedBranchId || branchCookieSynced.current) return;
    branchCookieSynced.current = true;
    fetch("/api/school/select-branch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId: selectedBranchId }),
    })
      .then((res) => {
        if (res.ok) router.refresh();
        else branchCookieSynced.current = false;
      })
      .catch(() => {
        branchCookieSynced.current = false;
      });
  }, [needsBranchCookie, selectedBranchId, router]);

  async function handleSelectBranch(nextBranchId: string) {
    if (!nextBranchId || nextBranchId === activeBranchId) return;
    try {
      setBranchLoading(true);
      startRouteLoading();
      const res = await fetch("/api/school/select-branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: nextBranchId }),
      });
      if (!res.ok) return;
      setActiveBranchId(nextBranchId);
      router.refresh();
    } finally {
      setBranchLoading(false);
    }
  }

  async function handleLogout() {
    startRouteLoading();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const branchItems = useMemo(
    () => branches.map((b) => ({ value: b.id, label: `${b.name} (${b.branchCode})` })),
    [branches],
  );

  const moduleByHref: Record<string, PermissionModule> = {
    "/school": "dashboard",
    "/school/students": "students",
    "/school/staff": "staff",
    "/school/classes": "classes",
    "/school/examinations": "examinations",
    "/school/attendance": "attendance",
    "/school/teacher": "dashboard",
    "/school/staff-attendance": "staff-attendance",
    "/school/fees": "fees",
    "/school/payment-verification": "fees.verify",
    "/school/library": "library",
    "/school/books": "books",
    "/school/transport": "transport",
    "/school/hostel": "hostel",
    "/school/settings": "branches",
  };

  const allowedHrefs = new Set<string>(
    displayNavItems
      .filter((item) => {
        const mod = moduleByHref[item.href];
        if (!mod) return false;
        return canPermission(role, mod, "read", permissions);
      })
      .map((item) => item.href)
  );

  const fullPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  function isChildActive(item: NavItem) {
    return (item.children ?? []).some((child) => fullPath === child.href);
  }

  function isMenuOpen(item: NavItem) {
    if (!item.children || item.children.length === 0) return false;
    return openMenus[item.href] ?? isChildActive(item);
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
            {(role === "school_admin" || role === "admin") && (
              <Link
                href="/school/settings#branches"
                className="text-xs font-medium text-primary-600 hover:underline lg:hidden"
              >
                Branches
              </Link>
            )}

            {branches.length > 0 && (
              <div className="hidden min-w-0 flex-wrap items-center gap-2 lg:flex">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Branch</span>
                {branches.length === 1 ? (
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                    {branches[0].name}
                    <span className="ml-2 text-slate-500">({branches[0].branchCode})</span>
                  </span>
                ) : (
                  <SearchablePaginatedSelect
                    items={branchItems}
                    value={activeBranchId ?? ""}
                    onChange={(id) => void handleSelectBranch(id)}
                    required
                    disabled={branchLoading}
                    className="max-w-[220px]"
                    emptyLabel="Select branch"
                    aria-label="Select branch"
                  />
                )}
                {(role === "school_admin" || role === "admin") && (
                  <Link
                    href="/school/settings"
                    className="text-xs font-medium text-primary-600 hover:underline"
                  >
                    Manage branches
                  </Link>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-white shadow-sm hover:bg-primary-700 lg:hidden"
              aria-label="Toggle menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setMenuCollapsed((v) => !v)}
              className="hidden h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 lg:inline-flex lg:items-center"
            >
              {menuCollapsed ? "Show names" : "Hide names"}
            </button>
            <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-school-navy lg:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold">
                {userName.slice(0, 2).toUpperCase()}
              </span>
              <span className="hidden sm:inline">{userName}</span>
            </div>
          </div>
        </div>
        <div className="h-1 w-full bg-transparent">
          <div
            className={`h-full bg-primary-600 transition-[width,opacity] duration-200 ease-out ${
              routeLoading ? "opacity-100" : "opacity-0"
            }`}
            style={{ width: `${routeProgress}%` }}
            aria-hidden
          />
        </div>
      </header>

      <div className="flex">
        {mobileMenuOpen && (
          <button
            type="button"
            className="fixed inset-0 z-10 bg-black/30 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu overlay"
          />
        )}
        {/* Left sidebar - dark grey */}
        <aside
          className={`fixed left-0 top-16 z-20 flex h-[calc(100vh-4rem)] shrink-0 transform flex-col overflow-hidden border-r transition-all duration-200 ${sidebarShell} ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } ${menuCollapsed ? "w-20" : "w-64"} lg:translate-x-0`}
        >
          <div className="border-b border-slate-700 px-3 py-3 lg:hidden">
            <div className={`flex items-center gap-2 ${menuCollapsed ? "justify-center" : ""}`}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-semibold">
                {userName.slice(0, 2).toUpperCase()}
              </span>
              {!menuCollapsed && <span className="truncate text-sm font-medium text-white">{userName}</span>}
            </div>
            {!menuCollapsed && branches.length > 0 && (
              <div className="mt-3">
                <label className="block text-[11px] uppercase tracking-wide text-slate-400">Branch</label>
                {branches.length === 1 ? (
                  <div className="mt-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-xs text-slate-100">
                    {branches[0].name} ({branches[0].branchCode})
                  </div>
                ) : (
                  <SearchablePaginatedSelect
                    variant="dark"
                    items={branchItems}
                    value={activeBranchId ?? ""}
                    onChange={(id) => void handleSelectBranch(id)}
                    required
                    disabled={branchLoading}
                    className="w-full"
                    emptyLabel="Select branch"
                    aria-label="Select branch"
                  />
                )}
              </div>
            )}
          </div>
          <nav
            className="flex-1 overflow-y-auto flex flex-col gap-0.5 p-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {displayNavItems
              .filter((item) => allowedHrefs.has(item.href))
              .map((item) => {
                const isActive = pathname === item.href || isChildActive(item);
                const open = isMenuOpen(item);
                if (!item.children || item.children.length === 0) {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        if (pathname !== item.href) startRouteLoading();
                      }}
                      className={`flex items-center ${menuCollapsed ? "justify-center" : "justify-between"} rounded-lg px-3 py-2.5 text-sm font-medium text-white transition ${
                        isActive
                          ? "bg-primary-600 text-white"
                          : "text-slate-300 hover:bg-slate-700 hover:text-white"
                      }`}
                      title={item.label}
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-slate-800 text-xs">
                        <MenuIcon href={item.href} />
                      </span>
                      {!menuCollapsed && <span className="ml-2 flex-1 truncate">{item.label}</span>}
                      {!menuCollapsed && (
                        <svg className="h-4 w-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </Link>
                  );
                }
                return (
                  <div key={item.href} className="space-y-1">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenus((prev) => ({
                          ...prev,
                          [item.href]: !(prev[item.href] ?? isChildActive(item)),
                        }))
                      }
                      className={`flex w-full items-center ${menuCollapsed ? "justify-center" : "justify-between"} rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                        isActive ? "bg-primary-600 text-white" : "text-slate-300 hover:bg-slate-700 hover:text-white"
                      }`}
                      title={item.label}
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-slate-800 text-xs">
                        <MenuIcon href={item.href} />
                      </span>
                      {!menuCollapsed && <span className="ml-2 flex-1 truncate text-left">{item.label}</span>}
                      {!menuCollapsed && <span>{open ? "▾" : "▸"}</span>}
                    </button>
                    {!menuCollapsed && open && (
                      <div className="ml-8 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => {
                              setMobileMenuOpen(false);
                              if (pathname !== child.href) startRouteLoading();
                            }}
                            className={`block rounded-md px-3 py-2 text-sm ${
                              pathname === child.href
                                ? "bg-primary-700 text-white"
                                : "text-slate-300 hover:bg-slate-700 hover:text-white"
                            }`}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </nav>
          <div className="p-3 border-t border-slate-700">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-lg bg-slate-900/20 px-3 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-900/35"
            >
              {menuCollapsed ? "LO" : "Log out"}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className={`min-w-0 flex-1 ${menuCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
          <div className="min-w-0 max-w-full p-4 lg:p-6">
            <PageBreadcrumbs />
            <div className="min-w-0 max-w-full overflow-x-auto">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
