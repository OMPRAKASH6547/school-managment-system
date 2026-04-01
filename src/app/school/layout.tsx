import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { getSession, getSelectedBranchId, resolveBranchIdForOrganization } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SchoolLayout } from "@/components/SchoolLayout";

function isTransientMongoError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("ReplicaSetNoPrimary") ||
    message.includes("Server selection timeout") ||
    message.includes("No available servers")
  );
}

function DatabaseUnavailableScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="card max-w-lg text-center">
        <h1 className="text-xl font-semibold text-slate-900">Database temporarily unavailable</h1>
        <p className="mt-2 text-slate-600">
          We could not connect to MongoDB right now. Please verify your `DATABASE_URL` and MongoDB
          cluster health, then refresh this page.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <a href="/school" className="btn-primary">
            Retry
          </a>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="btn-secondary">
              Log out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function defaultBranchCodeForOrg(orgId: string): string {
  return `BR-${orgId}`.toUpperCase();
}

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

  try {
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
              Your institution &quot;{org.name}&quot; is under review. You&apos;ll get full access once approved by our
              team.
            </p>
            <form action="/api/auth/logout" method="POST" className="mt-6">
              <button type="submit" className="btn-secondary">
                Log out
              </button>
            </form>
          </div>
        </div>
      );
    }

    let branches = await prisma.branch.findMany({
      where: { organizationId: org.id },
      select: { id: true, name: true, branchCode: true },
      orderBy: { createdAt: "desc" },
    });

    if (branches.length === 0) {
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

      const branchCode = defaultBranchCodeForOrg(org.id);
      try {
        await prisma.branch.create({
          data: {
            organizationId: org.id,
            name: "Main Branch",
            branchCode,
            address: null,
            contact: null,
          },
        });
      } catch (error) {
        // Parallel requests can race here; duplicate branchCode means branch already created.
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
          throw error;
        }
      }

      branches = await prisma.branch.findMany({
        where: { organizationId: org.id },
        select: { id: true, name: true, branchCode: true },
        orderBy: { createdAt: "desc" },
      });
    }

    // Cookie may be missing right after login; APIs resolve branch via resolveBranchIdForOrganization.
    const cookieBranch = await getSelectedBranchId();
    const selectedBranchId = await resolveBranchIdForOrganization(org.id, cookieBranch);
    const needsBranchCookie = !cookieBranch || cookieBranch !== selectedBranchId;

    return (
      <SchoolLayout
        schoolName={org.name}
        schoolLogo={org.logo}
        website={org.website}
        userName={session.name}
        role={session.role}
        permissions={session.permissions ?? null}
        branches={branches}
        selectedBranchId={selectedBranchId}
        needsBranchCookie={needsBranchCookie}
        dashboardTheme={org.dashboardTheme ?? "slate"}
        schoolType={org.type}
      >
        {children}
      </SchoolLayout>
    );
  } catch (error) {
    if (isTransientMongoError(error)) {
      return <DatabaseUnavailableScreen />;
    }
    throw error;
  }
}
