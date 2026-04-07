import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./LoginForm";
import { AppLogo } from "@/components/AppLogo";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "super_admin" ? "/super-admin" : session.role === "student" ? "/student" : "/school");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-primary-50 px-4">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex justify-center">
              <AppLogo />
            </Link>
            <h1 className="mt-4 text-xl font-semibold text-slate-900">Sign in</h1>
            <p className="mt-1 text-sm text-slate-500">Enter your credentials</p>
          </div>
          <LoginForm />
          <div className="mt-6 space-y-2 text-center text-sm">
            <p className="text-slate-600">
              Student?{" "}
              <Link href="/student/login" className="font-medium text-primary-600 hover:text-primary-700">
                Login here
              </Link>
            </p>
            <p className="text-slate-500">For new student access, contact your school office.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
