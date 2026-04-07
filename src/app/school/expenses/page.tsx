import { redirect } from "next/navigation";
import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ExpenseManager } from "@/app/components/ExpenseManager";

const PAGE_SIZE = 10;

export default async function SchoolExpensesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "teacher") redirect("/school/teacher");
  if (session.role === "staff") redirect("/school/staff-attendance");
  const orgId = session.organizationId!;
  const branchId = await getResolvedBranchIdForSchool(session);

  const q = typeof searchParams?.q === "string" ? searchParams.q.trim() : "";
  const category = typeof searchParams?.category === "string" ? searchParams.category.trim() : "";
  const from = typeof searchParams?.from === "string" ? searchParams.from : "";
  const to = typeof searchParams?.to === "string" ? searchParams.to : "";
  const page = Math.max(1, Number(typeof searchParams?.page === "string" ? searchParams.page : "1") || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where: Record<string, unknown> = {
    organizationId: orgId,
    branchId,
    ...(category ? { category } : {}),
    ...(q
      ? {
          OR: [{ title: { contains: q } }, { notes: { contains: q } }],
        }
      : {}),
    ...((from || to)
      ? {
          expenseDate: {
            ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };

  const [rows, total, agg, cats] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { expenseDate: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        category: true,
        amount: true,
        expenseDate: true,
        paymentMethod: true,
        notes: true,
      },
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
    prisma.expense.findMany({
      where: { organizationId: orgId, branchId },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <h1 className="text-2xl font-bold text-primary-600">Expenses</h1>
      <p className="mt-1 text-slate-600">
        Track school/coaching expenses, edit/delete records, filter by date/category and monitor totals.
      </p>

      <form className="mt-4 grid gap-3 sm:grid-cols-5">
        <input name="q" defaultValue={q} className="input-field" placeholder="Search title / notes" />
        <select name="category" defaultValue={category} className="input-field">
          <option value="">All categories</option>
          {cats
            .map((x) => x.category)
            .filter(Boolean)
            .map((c) => (
              <option key={c!} value={c!}>
                {c}
              </option>
            ))}
        </select>
        <input type="date" name="from" defaultValue={from} className="input-field" />
        <input type="date" name="to" defaultValue={to} className="input-field" />
        <div className="flex gap-2">
          <button className="btn-primary" type="submit">Filter</button>
          <a href="/school/expenses" className="btn-secondary">Reset</a>
        </div>
      </form>

      <div className="mt-6">
        <ExpenseManager
          rows={rows.map((r) => ({ ...r, expenseDate: r.expenseDate.toISOString() }))}
          total={total}
          totalAmount={agg._sum.amount ?? 0}
          page={page}
          totalPages={totalPages}
          query={{ q, category, from, to }}
        />
      </div>
    </>
  );
}
