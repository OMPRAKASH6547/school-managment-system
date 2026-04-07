import Link from "next/link";
import { getSession } from "@/lib/auth";
import { HomeModuleShowcase } from "@/app/components/HomeModuleShowcase";
import { PricingPlansSection, type PublicPlan } from "@/app/components/PricingPlansSection";
import { AppLogo } from "@/components/AppLogo";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  let plans: PublicPlan[] = [];
  try {
    plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
      select: { id: true, name: true, slug: true, description: true, price: true, maxStudents: true, maxStaff: true },
    });
  } catch {
    plans = [];
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 text-white">
      <nav className="border-b border-white/10 bg-black/20 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <AppLogo dark compact />
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
          <div className="mb-8 flex justify-center">
            <AppLogo dark className="text-center" />
          </div>
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

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
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

        <HomeModuleShowcase />

        <PricingPlansSection plans={plans} />
      </main>

      <footer className="border-t border-white/10 bg-black/25">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
          <div>
            <AppLogo dark compact />
            <p className="mt-3 text-sm text-slate-300">
              Complete school and coaching operations in one place: admissions, attendance, fees, classes, and reports.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Quick links</h3>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <Link href="/login" className="text-slate-300 hover:text-white">Login</Link>
              <Link href="/student/login" className="text-slate-300 hover:text-white">Student Login</Link>
              <Link href="/register" className="text-slate-300 hover:text-white">Register School</Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Support</h3>
            <p className="mt-3 text-sm text-slate-300">
              Need help with setup, onboarding, or billing? Reach out to your account manager or support team.
            </p>
            <div className="mt-3 space-y-1 text-sm">
              <p>
                <a
                  href="https://wa.me/919708082526"
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-300 hover:text-white hover:underline"
                >
                  Mobile / WhatsApp: +91 9708082526
                </a>
              </p>
              <p>
                <a
                  href="mailto:rajk0723577@gmail.com"
                  className="text-slate-300 hover:text-white hover:underline"
                >
                  Email: rajk0723577@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 text-xs text-slate-400 sm:px-6 lg:px-8">
            <p>© {new Date().getFullYear()} School SaaS. All rights reserved.</p>
            <p>Built for Schools & Coaching Institutes</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
