import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("admin123", 10);

  // Super Admin
  await prisma.user.upsert({
    where: { email: "superadmin@schoolsaas.com" },
    update: {},
    create: {
      email: "superadmin@schoolsaas.com",
      passwordHash: hash,
      name: "Super Admin",
      role: "super_admin",
      isActive: true,
    },
  });

  // Subscription plans
  const plans = [
    { name: "Starter", slug: "starter", price: 999, maxStudents: 50, maxStaff: 5, description: "For small coaching centers" },
    { name: "Growth", slug: "growth", price: 2499, maxStudents: 200, maxStaff: 20, description: "For growing schools" },
    { name: "Enterprise", slug: "enterprise", price: 5999, maxStudents: 1000, maxStaff: 100, description: "Unlimited scale" },
  ];

  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
  }

  console.log("Seed completed: Super admin (superadmin@schoolsaas.com / admin123) and plans created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
