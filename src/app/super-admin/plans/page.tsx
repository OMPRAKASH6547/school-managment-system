import { PlanCreateForm } from "@/app/components/PlanCreateForm";
import { PlanManageTable } from "@/app/components/PlanManageTable";
import { prisma } from "@/lib/db";

export default async function SuperAdminPlansPage() {
  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { price: "asc" },
    include: { _count: { select: { subscriptions: true } } },
  });

  return (
    <>
      <PlanCreateForm />
      <PlanManageTable plans={plans} />
      <p className="mt-4 text-sm text-slate-500">Create plans above; schools see active plans on the public home page.</p>
    </>
  );
}
