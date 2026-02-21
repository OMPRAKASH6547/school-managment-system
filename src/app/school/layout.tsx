import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SchoolLayout } from "@/components/SchoolLayout";

export default async function SchoolLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "super_admin" && session.role !== "school_admin") {
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

  return (
    <SchoolLayout
      schoolName={org.name}
      schoolLogo={org.logo}
      website={org.website}
      userName={session.name}
    >
      {children}
    </SchoolLayout>
  );
}
