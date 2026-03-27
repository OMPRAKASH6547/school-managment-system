import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { RegisterForm } from "./RegisterForm";
import { AppLogo } from "@/components/AppLogo";

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect("/school");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-primary-50 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="card">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex justify-center">
              <AppLogo />
            </Link>
            <h1 className="mt-4 text-xl font-semibold text-slate-900">Register your school</h1>
            <p className="mt-1 text-sm text-slate-500">
              After approval you&apos;ll get full access to manage your institution
            </p>
          </div>
          <RegisterForm />
          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
