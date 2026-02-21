import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardFilters } from "@/app/components/DashboardFilters";
import { DashboardKPIs } from "@/app/components/DashboardKPIs";
import { DashboardCharts } from "@/app/components/DashboardCharts";

export default async function SchoolDashboard() {
  const session = await getSession();
  const orgId = session?.organizationId!;

  const [
    students,
    classes,
    payments,
    bookSalesData,
    subscription,
  ] = await Promise.all([
    prisma.student.findMany({
      where: { organizationId: orgId },
      select: { id: true, gender: true, status: true, classId: true },
    }),
    prisma.class.findMany({
      where: { organizationId: orgId, status: "active" },
      include: { _count: { select: { students: true } } },
    }),
    prisma.payment.findMany({
      where: { organizationId: orgId, status: { in: ["verified", "completed"] } },
      select: { amount: true },
    }),
    prisma.bookSale.findMany({
      where: { organizationId: orgId },
      include: { items: true },
    }),
    prisma.subscription.findUnique({
      where: { organizationId: orgId },
      include: { plan: true },
    }),
  ]);

  const totalStudents = students.length;
  const boys = students.filter((s) => s.gender === "male").length;
  const girls = students.filter((s) => s.gender === "female").length;
  const active = students.filter((s) => s.status === "active").length;
  const left = students.filter((s) => s.status === "left" || s.status === "graduated").length;

  const totalFee = subscription?.plan?.price ? totalStudents * subscription.plan.price * 12 : 0;
  const collected = payments.reduce((s, p) => s + p.amount, 0);
  const pending = Math.max(0, totalFee - collected);

  let itemsSold = 0;
  let revenue = 0;
  for (const sale of bookSalesData) {
    revenue += sale.totalAmount;
    for (const item of sale.items) {
      itemsSold += item.quantity;
    }
  }

  const classStrength = classes.map((c) => ({
    name: c.name,
    strength: c._count.students,
  }));

  return (
    <>
      <h1 className="text-2xl font-bold text-primary-600">School Admin Dashboard</h1>

      <DashboardFilters />

      <DashboardKPIs
        total={totalStudents}
        boys={boys}
        girls={girls}
        active={active}
        left={left}
        totalFee={totalFee}
        collected={collected}
        pending={pending}
        itemsSold={itemsSold}
        revenue={revenue}
      />

      <DashboardCharts classStrength={classStrength} boys={boys} girls={girls} />
    </>
  );
}
