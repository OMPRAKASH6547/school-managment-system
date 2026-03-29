import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LogoUploadForm } from "@/app/components/LogoUploadForm";
import { BranchCreateForm } from "@/app/components/BranchCreateForm";
import { SchoolAppearanceForm } from "@/app/components/SchoolAppearanceForm";
import { redirect } from "next/navigation";

export default async function SchoolSettingsPage() {
  const session = await getSession();
  if (session?.role === "teacher") redirect("/school/teacher");
  if (session?.role === "staff") redirect("/school/staff-attendance");
  if (session?.role === "accountant") redirect("/school");
  const orgId = session?.organizationId!;
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      name: true,
      logo: true,
      website: true,
      address: true,
      phone: true,
      email: true,
      pdfAccentColor: true,
      dashboardTheme: true,
    },
  });
  if (!org) return null;

  const branches = await prisma.branch.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, branchCode: true },
  });

  return (
    <>
      <h1 className="text-2xl font-bold text-primary-600">Settings</h1>
      <p className="mt-1 text-slate-600">Manage your school profile. Logo and name appear on all PDFs (report cards, fee cards, invoices).</p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-school-navy">School logo</h2>
        <LogoUploadForm currentLogo={org.logo} organizationId={orgId} />
      </div>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-school-navy">Appearance & PDF theme</h2>
        <SchoolAppearanceForm pdfAccentColor={org.pdfAccentColor} dashboardTheme={org.dashboardTheme} />
      </div>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-school-navy">School details</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div><dt className="text-slate-500">Name</dt><dd className="font-medium">{org.name}</dd></div>
          <div><dt className="text-slate-500">Email</dt><dd className="font-medium">{org.email}</dd></div>
          <div><dt className="text-slate-500">Phone</dt><dd className="font-medium">{org.phone ?? "—"}</dd></div>
          <div><dt className="text-slate-500">Website</dt><dd className="font-medium">{org.website ?? "—"}</dd></div>
          <div><dt className="text-slate-500">Address</dt><dd className="font-medium">{org.address ?? "—"}</dd></div>
        </dl>
        <p className="mt-4 text-xs text-slate-500">To change these, contact super admin or add an edit form here.</p>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-school-navy">Branches</h2>
        <p className="mt-1 text-sm text-slate-600">Create and manage multiple branches for your school.</p>

        <div className="mt-4">
          {branches.length === 0 ? (
            <p className="text-sm text-slate-500">No branches yet.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {branches.map((b) => (
                <li key={b.id}>
                  <span className="font-medium">{b.name}</span> <span className="text-slate-500">({b.branchCode})</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 border-t border-slate-200 pt-6">
          <BranchCreateForm />
        </div>
      </div>
    </>
  );
}
