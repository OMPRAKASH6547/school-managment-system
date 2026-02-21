import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "super_admin" ? "/super-admin" : "/school");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-primary-50 px-4">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-bold text-primary-600">
              SchoolSaaS
            </Link>
            <h1 className="mt-4 text-xl font-semibold text-slate-900">Sign in</h1>
            <p className="mt-1 text-sm text-slate-500">Enter your credentials</p>
          </div>
          <LoginForm />
          <p className="mt-6 text-center text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-primary-600 hover:text-primary-700">
              Register your school
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
