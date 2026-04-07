import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const schools = await prisma.organization.findMany({
    where: { status: "approved" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, type: true, branches: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
  });

  return NextResponse.json({
    schools: schools.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      branches: s.branches,
    })),
  });
}
