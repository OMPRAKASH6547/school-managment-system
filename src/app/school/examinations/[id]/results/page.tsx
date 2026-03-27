import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession, getResolvedBranchIdForSchool } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CopyLinkButton } from "@/app/components/CopyLinkButton";
import { randomBytes } from "crypto";
import { ResultLinkActions } from "@/app/components/ResultLinkActions";

export default async function ExamResultsLinksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
    if (!session) redirect("/login");
  if (session.role !== "school_admin" && session.role !== "admin") redirect("/school/examinations");
  const orgId = session?.organizationId!;
  const branchId = await getResolvedBranchIdForSchool(session);
  const { id } = await params;
  const exam = await prisma.exam.findFirst({
    where: { id, organizationId: orgId, branchId },
  });
  if (!exam) notFound();

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { slug: true, name: true },
  });
  if (!org) notFound();

  const isDisabledToken = (token: string | null) => !!token && token.startsWith("disabled_");

  let students = await prisma.student.findMany({
    where: {
      organizationId: orgId,
      branchId,
      ...(exam.classId ? { classId: exam.classId } : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, rollNo: true, resultToken: true },
  });

  // Backfill missing tokens so every student row gets a unique result link.
  const missingTokenStudents = students.filter((s) => !s.resultToken);
  if (missingTokenStudents.length > 0) {
    await Promise.all(
      missingTokenStudents.map((s) =>
        prisma.student.updateMany({
          where: { id: s.id, organizationId: orgId, branchId, resultToken: null },
          data: { resultToken: randomBytes(24).toString("base64url") },
        })
      )
    );
    students = await prisma.student.findMany({
      where: {
        organizationId: orgId,
        branchId,
        ...(exam.classId ? { classId: exam.classId } : {}),
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, rollNo: true, resultToken: true },
    });
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  return (
    <>
      <div className="mb-6">
        <Link href={`/school/examinations/${id}`} className="text-sm text-primary-600 hover:underline">← Back to exam</Link>
      </div>
      <h1 className="text-2xl font-bold text-primary-600">Result links — {exam.name}</h1>
      <p className="mt-1 text-slate-600">Share the unique link with each student so they can view and download their score card (PDF).</p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Unique result link</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {students.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-school-navy">
                  {s.firstName} {s.lastName} {s.rollNo ? `(${s.rollNo})` : ""}
                </td>
                <td className="px-6 py-4">
                  {s.resultToken && !isDisabledToken(s.resultToken) ? (
                    <div className="flex items-start gap-2">
                      <a
                        href={`${baseUrl}/r/${org.slug}/${s.resultToken}?exam=${id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-school-green hover:underline break-all"
                      >
                        {baseUrl}/r/{org.slug}/{s.resultToken}?exam={id}
                      </a>
                      <CopyLinkButton url={`${baseUrl}/r/${org.slug}/${s.resultToken}?exam=${id}`} />
                    </div>
                  ) : (
                    <span className="text-slate-400">
                      {isDisabledToken(s.resultToken) ? "Link deleted" : "Publish exam to generate link"}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <ResultLinkActions studentId={s.id} hasLink={!!s.resultToken && !isDisabledToken(s.resultToken)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
