import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Change these if you want different local credentials, then run `npm run db:seed`. */
const SUPER_ADMIN_EMAIL = "superadmin@schoolsaas.com";
const SUPER_ADMIN_PASSWORD = "admin123";

async function main() {
  const hash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

  // Super Admin (platform user — no organizationId)
  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: SUPER_ADMIN_EMAIL },
  });

  if (existingSuperAdmin) {
    await prisma.user.update({
      where: { id: existingSuperAdmin.id },
      data: { passwordHash: hash, role: "super_admin", isActive: true },
    });
  } else {
    await prisma.user.create({
      data: {
        email: SUPER_ADMIN_EMAIL,
        passwordHash: hash,
        name: "Super Admin",
        role: "super_admin",
        isActive: true,
      },
    });
  }

  // Subscription plans
  const plans = [
    { name: "Starter", slug: "starter", price: 999, maxStudents: 50, maxStaff: 5, description: "For small coaching centers" },
    { name: "Growth", slug: "growth", price: 2499, maxStudents: 200, maxStaff: 20, description: "For growing schools" },
    { name: "Enterprise", slug: "enterprise", price: 5999, maxStudents: 1000, maxStaff: 100, description: "Unlimited scale" },
  ];

  for (const p of plans) {
    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { slug: p.slug },
    });

    if (existingPlan) {
      await prisma.subscriptionPlan.update({
        where: { id: existingPlan.id },
        data: p,
      });
    } else {
      await prisma.subscriptionPlan.create({ data: p });
    }
  }

  console.log(
    `Seed completed: Super admin (${SUPER_ADMIN_EMAIL} / ${SUPER_ADMIN_PASSWORD}) and plans created.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
