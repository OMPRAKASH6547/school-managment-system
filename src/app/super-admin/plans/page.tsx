import { prisma } from "@/lib/db";

export default async function SuperAdminPlansPage() {
  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { price: "asc" },
    include: { _count: { select: { subscriptions: true } } },
  });

  return (
    <>
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Price (₹/mo)</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Max students</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Max staff</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Subscriptions</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{plan.name}</td>
                  <td className="px-6 py-4 text-slate-600">{plan.slug}</td>
                  <td className="px-6 py-4 text-slate-600">₹{plan.price}</td>
                  <td className="px-6 py-4 text-slate-600">{plan.maxStudents}</td>
                  <td className="px-6 py-4 text-slate-600">{plan.maxStaff}</td>
                  <td className="px-6 py-4 text-slate-600">{plan._count.subscriptions}</td>
                  <td className="px-6 py-4">
                    <span className={plan.isActive ? "text-green-600" : "text-slate-400"}>
                      {plan.isActive ? "Yes" : "No"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500">
        Plan pricing and limits can be edited via Prisma Studio or by adding edit UI here.
      </p>
    </>
  );
}
