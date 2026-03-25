import { redirect } from "next/navigation";
import { getSession, getSelectedBranchId, requireBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SchoolLayout } from "@/components/SchoolLayout";

export default async function SchoolLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (
    session.role !== "super_admin" &&
    session.role !== "school_admin" &&
    session.role !== "admin" &&
    session.role !== "accountant" &&
    session.role !== "teacher" &&
    session.role !== "staff"
  ) {
    redirect("/login");
  }
  if (!session.organizationId) {
    redirect("/login");
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    include: { subscription: { include: { plan: true } } },
  });
  if (!org) redirect("/login");
  if (org.status !== "approved") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="card max-w-md text-center">
          <h1 className="text-xl font-semibold text-slate-900">Pending approval</h1>
          <p className="mt-2 text-slate-600">
            Your institution &quot;{org.name}&quot; is under review. You&apos;ll get full access once approved by our team.
          </p>
          <form action="/api/auth/logout" method="POST" className="mt-6">
            <button type="submit" className="btn-secondary">Log out</button>
          </form>
        </div>
      </div>
    );
  }

  const branches = await prisma.branch.findMany({
    where: { organizationId: org.id },
    select: { id: true, name: true, branchCode: true },
    orderBy: { createdAt: "desc" },
  });

  // Pick a selected branch for this session (stored in an httpOnly cookie).
  // Note: cookies can only be set in Route Handlers / Server Actions, not in layouts.
  // When we default the branch, SchoolLayout POSTs to /api/school/select-branch to persist the cookie.
  let needsBranchCookie = false;
  let selectedBranchId = await getSelectedBranchId();
  if (selectedBranchId) {
    // Validate it belongs to this organization.
    try {
      selectedBranchId = await requireBranchAccess(org.id, selectedBranchId);
    } catch {
      selectedBranchId = null;
    }
  }

  if (!selectedBranchId) {
    needsBranchCookie = true;
    if (branches.length > 0) {
      selectedBranchId = branches[0].id;
    } else {
      // Auto-create the first branch for new tenants.
      // This keeps the branch selector usable without requiring extra setup.
      // Also ensure the school has a `schoolCode` for public `/result` URLs.
      if (!org.schoolCode) {
        const generateSchoolCode = async (): Promise<string> => {
          for (let attempt = 0; attempt < 10; attempt++) {
            const code = `SCH-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
            const exists = await prisma.organization.findFirst({ where: { schoolCode: code } });
            if (!exists) return code;
          }
          return `SCH-${Date.now()}`;
        };

        const nextSchoolCode = await generateSchoolCode();
        await prisma.organization.update({
          where: { id: org.id },
          data: { schoolCode: nextSchoolCode },
        });
      }

      const generateBranchCode = async (): Promise<string> => {
        for (let attempt = 0; attempt < 10; attempt++) {
          const code = `BR-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
          const exists = await prisma.branch.findUnique({ where: { branchCode: code } });
          if (!exists) return code;
        }
        // Fallback (extremely unlikely).
        return `BR-${Date.now()}`;
      };

      const branchCode = await generateBranchCode();
      const created = await prisma.branch.create({
        data: {
          organizationId: org.id,
          name: "Main Branch",
          branchCode,
          address: null,
          contact: null,
        },
        select: { id: true },
      });
      selectedBranchId = created.id;
    }
  }

  return (
    <SchoolLayout
      schoolName={org.name}
      schoolLogo={org.logo}
      website={org.website}
      userName={session.name}
      role={session.role}
      branches={branches}
      selectedBranchId={selectedBranchId}
      needsBranchCookie={needsBranchCookie}
    >
      {children}
    </SchoolLayout>
  );
}
