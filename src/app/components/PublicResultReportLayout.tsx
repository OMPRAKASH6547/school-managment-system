import Image from "next/image";
import type { ReactNode } from "react";
import {
  CO_SCHOLASTIC_LABELS,
  GRADE_SCALE_ROWS,
  gradeFromFraction,
} from "@/lib/report-card-grade";

const BORDER = "border-[#2563eb]";
const BLUE = "text-[#1e40af]";
const BAR = "bg-[#1e40af]";
/** Field labels on white (matches on-screen report card reference). */
const LABEL = "font-bold uppercase text-slate-900";

function dash(v: string | null | undefined): string {
  const t = v?.trim();
  return t ? t : "—";
}

export type ResultExamRow = {
  id: string;
  name: string;
  examType?: string | null;
  academicYear?: string | null;
  subjects: { name: string; obtained: number; maxMarks: number }[];
};

function sessionFromExams(exams: ResultExamRow[]): string {
  const y = exams.map((e) => e.academicYear?.trim()).filter(Boolean) as string[];
  if (y.length) return y[0]!;
  const now = new Date().getFullYear();
  return `${now - 1} - ${now}`;
}

function scholasticLayout(exams: ResultExamRow[]) {
  if (exams.length === 0) return { kind: "none" as const };
  if (exams.length === 1) return { kind: "single" as const, exam: exams[0]! };
  const term2 = exams[0]!;
  const term1 = exams[1]!;
  const names = [...new Set([...term1.subjects.map((s) => s.name), ...term2.subjects.map((s) => s.name)])];
  return { kind: "dual" as const, term1, term2, subjectNames: names };
}

export function ReportCardSchoolHeader({
  schoolName,
  schoolLogo,
  schoolAddress,
  branchLine,
  branchAddress,
  affiliationNote,
  sessionTitle,
}: {
  schoolName: string;
  schoolLogo: string | null;
  schoolAddress: string | null;
  branchLine: string | null;
  branchAddress: string | null;
  affiliationNote?: string | null;
  sessionTitle?: string | null;
}) {
  const branchCombined =
    branchLine || branchAddress ? [branchLine, branchAddress].filter(Boolean).join(" · ") : null;
  const affiliationText = affiliationNote?.trim();
  const showAffiliation = !!affiliationText;

  return (
    <>
      <div className={`flex items-start gap-3 border-b ${BORDER} px-4 pb-4 pt-4 sm:px-5 sm:pt-5`}>
        <div className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-full border-2 border-[#2563eb] bg-white sm:h-14 sm:w-14">
          {schoolLogo ? (
            <Image src={schoolLogo} alt="" fill className="object-contain p-0.5" sizes="56px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[10px] text-slate-400">Logo</div>
          )}
        </div>
        <div className="min-w-0 flex-1 px-1 text-center sm:px-2">
          <h1 className={`text-base font-bold uppercase leading-snug sm:text-lg ${BLUE} break-words`}>
            {dash(schoolName)}
          </h1>
          <p className={`mt-1 text-xs sm:text-sm ${BLUE} break-words`}>{dash(schoolAddress)}</p>
          {showAffiliation ? (
            <p className={`mt-0.5 text-[11px] ${BLUE} break-words`}>{affiliationText}</p>
          ) : (
            <hr className="mx-auto mt-2 max-w-[140px] border-0 border-t border-blue-300" />
          )}
          <p className="mt-2 text-xs font-medium text-slate-800 sm:text-sm">{dash(branchCombined)}</p>
        </div>
      </div>
      {sessionTitle !== undefined && sessionTitle !== null ? (
        <div className={`${BAR} px-3 py-2.5 text-center sm:px-4`}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-white sm:text-xs">{sessionTitle}</p>
        </div>
      ) : null}
    </>
  );
}

export function PublicResultReportLayout({
  schoolName,
  schoolLogo,
  schoolAddress,
  branchLine,
  branchAddress,
  affiliationNote,
  academicSessionLabel,
  studentName,
  studentPhoto,
  rollNo,
  className,
  studentDob,
  studentAddress,
  fatherName,
  motherName,
  admissionNo,
  house,
  exams,
  emptyScholasticMessage,
  actions,
}: {
  schoolName: string;
  schoolLogo: string | null;
  schoolAddress: string | null;
  branchLine: string | null;
  branchAddress: string | null;
  affiliationNote?: string | null;
  academicSessionLabel: string | null;
  studentName: string;
  studentPhoto: string | null;
  rollNo: string | null;
  className: string | null;
  studentDob: string | null;
  studentAddress: string | null;
  fatherName: string | null;
  motherName?: string | null;
  admissionNo?: string | null;
  house?: string | null;
  exams: ResultExamRow[];
  emptyScholasticMessage?: string | null;
  actions?: ReactNode;
}) {
  const sessionText = academicSessionLabel?.trim() || sessionFromExams(exams);
  const sessionTitle = `REPORT CARD FOR ACADEMIC SESSION (${sessionText})`;
  const layout = scholasticLayout(exams);

  const cellBorder = `border ${BORDER}`;
  const labelCell = `${cellBorder} min-w-[6.75rem] whitespace-nowrap px-2 py-2 align-middle ${LABEL}`;
  const valueCell = `${cellBorder} px-2 py-2 align-middle text-slate-900`;

  return (
    <div className={`mx-auto max-w-3xl overflow-hidden border ${BORDER} bg-white shadow-sm`}>
      <ReportCardSchoolHeader
        schoolName={schoolName}
        schoolLogo={schoolLogo}
        schoolAddress={schoolAddress}
        branchLine={branchLine}
        branchAddress={branchAddress}
        affiliationNote={affiliationNote ?? null}
        sessionTitle={sessionTitle}
      />

      <div className="mt-4">
        <div className={`${BAR} px-2 py-2 text-center sm:px-3`}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-white sm:text-xs">STUDENT INFORMATION</p>
        </div>

        <table className="w-full border-collapse border border-t-0 border-[#2563eb] text-left text-[11px] sm:text-xs">
          <tbody>
            <tr>
              <td
                rowSpan={5}
                className={`w-[100px] border border-t-0 border-[#2563eb] bg-slate-50 px-2 py-3 align-top sm:w-[120px]`}
              >
                <div className="mx-auto flex flex-col items-center">
                  {/* Padding inside border so the image never paints over the stroke */}
                  <div className="box-border border-2 border-[#2563eb] bg-white p-2 sm:p-2.5">
                    <div className="relative h-16 w-16 overflow-hidden bg-slate-50 sm:h-[5.25rem] sm:w-[5.25rem]">
                      {studentPhoto ? (
                        <Image src={studentPhoto} alt="" fill className="object-contain" sizes="96px" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-200 text-[9px] text-slate-500">
                          Photo
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="mt-2 text-center text-[9px] text-slate-600">Student photo</span>
                </div>
              </td>
              <td className={labelCell}>STUDENT NAME :</td>
              <td className={valueCell}>{dash(studentName)}</td>
              <td className={labelCell}>CLASS :</td>
              <td className={valueCell}>{dash(className)}</td>
            </tr>
            <tr>
              <td className={labelCell}>FATHER&apos;S NAME :</td>
              <td className={valueCell}>{dash(fatherName)}</td>
              <td className={labelCell}>MOTHER&apos;S NAME :</td>
              <td className={valueCell}>{dash(motherName ?? null)}</td>
            </tr>
            <tr>
              <td className={labelCell}>ADDRESS :</td>
              <td className={valueCell}>{dash(studentAddress)}</td>
              <td className={labelCell}>HOUSE :</td>
              <td className={valueCell}>{dash(house ?? null)}</td>
            </tr>
            <tr>
              <td className={labelCell}>D.O.B. :</td>
              <td className={valueCell}>{dash(studentDob)}</td>
              <td className={labelCell}>ADMISSION NO. :</td>
              <td className={valueCell}>{dash(admissionNo ?? null)}</td>
            </tr>
            <tr>
              <td className={labelCell}>ROLL NO. :</td>
              <td className={valueCell}>{dash(rollNo)}</td>
              <td className={`${valueCell} bg-white`} colSpan={2} />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <div className={`${BAR} px-2 py-2 text-center sm:px-3`}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-white sm:text-xs">SCHOLASTIC AREAS</p>
        </div>
      </div>

      <div className={`border border-t-0 border-[#2563eb] overflow-x-auto`}>
        {layout.kind === "none" || emptyScholasticMessage ? (
          <p className="p-4 text-center text-sm text-slate-600">{emptyScholasticMessage ?? "—"}</p>
        ) : layout.kind === "single" ? (
          <table className="w-full min-w-[280px] border-collapse text-left text-[11px] sm:text-xs">
            <thead>
              <tr className="bg-blue-50">
                <th className={`border-b ${BORDER} px-2 py-2 font-bold ${BLUE}`}>SUBJECT</th>
                <th className={`border-b ${BORDER} px-2 py-2 text-center font-bold ${BLUE}`}>MAX</th>
                <th className={`border-b ${BORDER} px-2 py-2 text-center font-bold ${BLUE}`}>OBTAINED</th>
                <th className={`border-b ${BORDER} px-2 py-2 text-center font-bold ${BLUE}`}>GRADE</th>
              </tr>
            </thead>
            <tbody>
              {layout.exam.subjects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-3 text-center text-slate-500">
                    —
                  </td>
                </tr>
              ) : (
                layout.exam.subjects.map((sub, i) => (
                  <tr key={i} className="border-b border-blue-200">
                    <td className="px-2 py-1.5">{sub.name}</td>
                    <td className="px-2 py-1.5 text-center">{sub.maxMarks}</td>
                    <td className="px-2 py-1.5 text-center">{sub.obtained}</td>
                    <td className="px-2 py-1.5 text-center">{gradeFromFraction(sub.obtained, sub.maxMarks)}</td>
                  </tr>
                ))
              )}
              {layout.exam.subjects.length > 0 ? (
              <tr className="font-semibold">
                <td className="px-2 py-1.5">{layout.exam.name}</td>
                <td className="px-2 py-1.5 text-center">
                  {layout.exam.subjects.reduce((s, x) => s + x.maxMarks, 0)}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {layout.exam.subjects.reduce((s, x) => s + x.obtained, 0)}
                </td>
                <td className="px-2 py-1.5 text-center">—</td>
              </tr>
              ) : null}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[360px] border-collapse text-left text-[10px] sm:text-xs">
            <thead>
              <tr className="bg-blue-50">
                <th className={`border-b ${BORDER} px-1 py-1.5 font-bold ${BLUE}`}>SUBJECT</th>
                <th className={`border-b ${BORDER} px-1 py-1.5 text-center font-bold ${BLUE}`}>T1 OBT.</th>
                <th className={`border-b ${BORDER} px-1 py-1.5 text-center font-bold ${BLUE}`}>MAX</th>
                <th className={`border-b ${BORDER} px-1 py-1.5 text-center font-bold ${BLUE}`}>GR.</th>
                <th className={`border-b ${BORDER} px-1 py-1.5 text-center font-bold ${BLUE}`}>T2 OBT.</th>
                <th className={`border-b ${BORDER} px-1 py-1.5 text-center font-bold ${BLUE}`}>MAX</th>
                <th className={`border-b ${BORDER} px-1 py-1.5 text-center font-bold ${BLUE}`}>GR.</th>
              </tr>
            </thead>
            <tbody>
              {layout.subjectNames.map((name, i) => {
                const s1 = layout.term1.subjects.find((s) => s.name === name);
                const s2 = layout.term2.subjects.find((s) => s.name === name);
                return (
                  <tr key={i} className="border-b border-blue-200">
                    <td className="px-1 py-1">{name}</td>
                    <td className="px-1 py-1 text-center">{s1 ? s1.obtained : "—"}</td>
                    <td className="px-1 py-1 text-center">{s1 ? s1.maxMarks : "—"}</td>
                    <td className="px-1 py-1 text-center">{s1 ? gradeFromFraction(s1.obtained, s1.maxMarks) : "—"}</td>
                    <td className="px-1 py-1 text-center">{s2 ? s2.obtained : "—"}</td>
                    <td className="px-1 py-1 text-center">{s2 ? s2.maxMarks : "—"}</td>
                    <td className="px-1 py-1 text-center">{s2 ? gradeFromFraction(s2.obtained, s2.maxMarks) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className={`${BAR} mt-4 px-2 py-2 text-center sm:px-3`}>
        <p className="text-[11px] font-bold uppercase tracking-wide text-white sm:text-xs">CO-SCHOLASTIC AREAS</p>
      </div>
      <div className={`border border-t-0 ${BORDER} overflow-x-auto`}>
        <table className="w-full min-w-[260px] border-collapse text-left text-[11px] sm:text-xs">
          <thead>
            <tr className="bg-blue-50">
              <th className={`border-b ${BORDER} px-2 py-2 font-bold ${BLUE}`}>SUBJECT</th>
              <th className={`border-b ${BORDER} px-2 py-2 text-center font-bold ${BLUE}`}>TERM 1</th>
              <th className={`border-b ${BORDER} px-2 py-2 text-center font-bold ${BLUE}`}>TERM 2</th>
            </tr>
          </thead>
          <tbody>
            {CO_SCHOLASTIC_LABELS.map((label) => (
              <tr key={label} className="border-b border-blue-200">
                <td className="px-2 py-1.5">{label}</td>
                <td className="px-2 py-1.5 text-center">—</td>
                <td className="px-2 py-1.5 text-center">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className={`border ${BORDER}`}>
          <div className={`${BAR} px-2 py-1 text-center text-[10px] font-bold text-white`}>DISCIPLINE</div>
          <div className="grid grid-cols-2 text-center text-[11px]">
            <div className={`border-r ${BORDER} py-2`}>T1: —</div>
            <div className="py-2">T2: —</div>
          </div>
        </div>
        <div className={`border ${BORDER}`}>
          <div className={`${BAR} px-2 py-1 text-center text-[10px] font-bold text-white`}>ATTENDANCE</div>
          <div className="grid grid-cols-2 text-center text-[11px]">
            <div className={`border-r ${BORDER} py-2`}>T1: —</div>
            <div className="py-2">T2: —</div>
          </div>
        </div>
      </div>

      <div className={`${BAR} mt-4 px-2 py-2 text-center sm:px-3`}>
        <p className="text-[11px] font-bold uppercase tracking-wide text-white sm:text-xs">GENERAL REMARK</p>
      </div>
      <div className={`min-h-[48px] border border-t-0 ${BORDER} p-2 text-[11px] text-slate-600`}>
        <p>Term 1: —</p>
        <p className="mt-1">Term 2: —</p>
      </div>

      <div className={`${BAR} mt-4 px-2 py-2 text-center sm:px-3`}>
        <p className="text-[11px] font-bold uppercase tracking-wide text-white sm:text-xs">RESULT</p>
      </div>
      <div className={`border border-t-0 ${BORDER} p-2 text-[11px] text-slate-600`}>
        <p>ANNUAL RESULT: —</p>
        <p className="mt-1">PROMOTION: —</p>
        <p className="mt-1">Issue date: — · School reopens: —</p>
      </div>

      <div className="mt-6 flex justify-between px-3 text-center text-[10px] font-medium text-slate-700 sm:px-4 sm:text-xs">
        <span className="w-1/3">CLASS TEACHER</span>
        <span className="w-1/3">PRINCIPAL</span>
        <span className="w-1/3">PARENT</span>
      </div>

      <div className="px-3 pb-4 pt-2 sm:px-4">
        <p className={`mt-4 text-xs font-bold ${BLUE}`}>INSTRUCTIONS</p>
        <p className="mt-1 text-[11px] text-slate-600">Grading is based on marks obtained. Refer to the scale below.</p>
        <table className={`mt-2 w-full max-w-md border-collapse border ${BORDER} text-left text-[11px]`}>
          <thead>
            <tr className="bg-blue-50">
              <th className={`border-b ${BORDER} px-2 py-1 font-bold ${BLUE}`}>MARKS RANGE</th>
              <th className={`border-b ${BORDER} px-2 py-1 text-center font-bold ${BLUE}`}>GRADE</th>
            </tr>
          </thead>
          <tbody>
            {GRADE_SCALE_ROWS.map(([range, g]) => (
              <tr key={range} className="border-b border-blue-200">
                <td className="px-2 py-1">{range}</td>
                <td className="px-2 py-1 text-center">{g}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {actions ? <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-200 pt-4">{actions}</div> : null}
      </div>
    </div>
  );
}

/** Bordered chrome for the verification form (no marks tables). */
export function PublicResultVerifyShell({
  schoolName,
  schoolLogo,
  schoolAddress,
  branchLine,
  branchAddress,
  titleBar,
  children,
}: {
  schoolName: string;
  schoolLogo: string | null;
  schoolAddress: string | null;
  branchLine: string | null;
  branchAddress: string | null;
  titleBar: string;
  children: ReactNode;
}) {
  return (
    <div className={`mx-auto max-w-xl overflow-hidden border ${BORDER} bg-white p-4 shadow-sm sm:p-6`}>
      <ReportCardSchoolHeader
        schoolName={schoolName}
        schoolLogo={schoolLogo}
        schoolAddress={schoolAddress}
        branchLine={branchLine}
        branchAddress={branchAddress}
        affiliationNote={null}
        sessionTitle={titleBar}
      />
      <div className="mt-6">{children}</div>
    </div>
  );
}
