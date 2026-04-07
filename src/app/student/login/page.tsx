import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppLogo } from "@/components/AppLogo";
import { StudentLoginForm } from "./StudentLoginForm";

export default async function StudentLoginPage() {
  const session = await getSession();
  if (session?.role === "student") redirect("/student");
  if (session) redirect(session.role === "super_admin" ? "/super-admin" : "/school");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-primary-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex justify-center">
              <AppLogo />
            </Link>
            <h1 className="mt-4 text-xl font-semibold text-slate-900">Student login</h1>
            <p className="mt-1 text-sm text-slate-500">Login with school, branch, roll number and phone verification.</p>
          </div>
          <StudentLoginForm />
        </div>
      </div>
    </div>
  );
}
