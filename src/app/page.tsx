import Link from "next/link";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 text-white">
      <nav className="border-b border-white/10 bg-black/20 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className="text-xl font-bold tracking-tight">SchoolSaaS</span>
          <div className="flex items-center gap-4">
            {session ? (
              <Link
                href={session.role === "super_admin" ? "/super-admin" : "/school"}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-white/10"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="btn-primary rounded-lg bg-primary-500 px-4 py-2"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            School & Coaching Management
            <span className="block text-primary-400">on one platform</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
            Subscribe, get approved, and run your institution with students, staff, fees, and attendance—all in one place.
          </p>
          {!session && (
            <div className="mt-10 flex justify-center gap-4">
              <Link
                href="/register"
                className="btn-primary rounded-lg bg-primary-500 px-6 py-3 text-base"
              >
                Register your school
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-white/30 bg-white/5 px-6 py-3 text-base hover:bg-white/10"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>

        <div className="mt-24 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Subscription plans", desc: "Choose a plan that fits your size. Scale as you grow." },
            { title: "Super Admin approval", desc: "We verify every school. After approval, full access." },
            { title: "Full management", desc: "Students, staff, classes, fees, attendance—all included." },
          ].map((f) => (
            <div key={f.title} className="card border-white/10 bg-white/5 backdrop-blur">
              <h3 className="text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-slate-300">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
