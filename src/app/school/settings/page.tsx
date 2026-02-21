import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LogoUploadForm } from "@/app/components/LogoUploadForm";

export default async function SchoolSettingsPage() {
  const session = await getSession();
  const orgId = session?.organizationId!;
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, logo: true, website: true, address: true, phone: true, email: true },
  });
  if (!org) return null;

  return (
    <>
      <h1 className="text-2xl font-bold text-primary-600">Settings</h1>
      <p className="mt-1 text-slate-600">Manage your school profile. Logo and name appear on all PDFs (report cards, fee cards, invoices).</p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-school-navy">School logo</h2>
        <LogoUploadForm currentLogo={org.logo} organizationId={orgId} />
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
    </>
  );
}
