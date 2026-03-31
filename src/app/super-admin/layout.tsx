import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DashboardLayout } from "@/components/DashboardLayout";

const nav = [
  { href: "/", label: "Home" },
  { href: "/super-admin", label: "Dashboard" },
  { href: "/register", label: "School signup" },
  { href: "/super-admin/organizations", label: "Organizations" },
  { href: "/super-admin/plans", label: "Plans" },
];

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    redirect("/login");
  }

  return (
    <DashboardLayout title="Super Admin" nav={nav} role="super_admin">
      {children}
    </DashboardLayout>
  );
}
