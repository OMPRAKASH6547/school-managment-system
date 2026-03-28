import { z } from "zod";

/**
 * Character and numeric limits for API validation.
 * Reuse `LIMITS` on client inputs (`maxLength`, etc.) to match server rules.
 */
export const LIMITS = {
  personName: 80,
  orgName: 120,
  shortLabel: 120,
  mediumLine: 240,
  longText: 500,
  notesMax: 2000,
  email: 254,
  passwordMin: 6,
  passwordMax: 128,
  phoneDisplay: 24,
  reference: 200,
  employeeId: 64,
  className: 120,
  section: 40,
  academicYear: 20,
  room: 80,
  designation: 120,
  idString: 40,
  paymentLabel: 240,
  admissionFeeLabel: 120,
  examName: 120,
  examType: 40,
  subjectName: 120,
  bookTitle: 200,
  bookAuthor: 120,
  isbn: 32,
  libraryCategory: 80,
  transportPlace: 120,
  routeDescription: 500,
  hostelRoomName: 80,
  hostelFloor: 40,
  branchCode: 32,
  roleKey: 40,
  statusKey: 24,
  gender: 20,
  category: 24,
  maxAttendanceEntries: 2000,
  maxFeeLines: 50,
  maxSubjectsPerExam: 80,
} as const;

const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

function trim(v: unknown): unknown {
  return typeof v === "string" ? v.trim() : v;
}

/** Trimmed string; empty becomes `undefined`. Max length after trim. */
export function zOptionalStr(max: number) {
  return z
    .preprocess(
      (v) => (v === undefined || v === null || v === "" ? "" : trim(v)),
      z.union([z.literal(""), z.string().max(max)]),
    )
    .transform((s) => (s === "" ? undefined : s));
}

export const zCuidId = z.string().min(1, "Required").max(LIMITS.idString);

export const zPersonName = z.preprocess(trim, z.string().min(1, "Required").max(LIMITS.personName));

export const zOrgName = z.preprocess(trim, z.string().min(2, "At least 2 characters").max(LIMITS.orgName));

export const zEmail = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
  z.string().email("Invalid email").max(LIMITS.email),
);

export const zEmailOpt = z.preprocess(
  (v) => (v === undefined || v === null ? "" : typeof v === "string" ? v.trim().toLowerCase() : v),
  z.union([z.literal(""), z.string().email("Invalid email").max(LIMITS.email)]),
).transform((s) => (s === "" ? undefined : s));

export const zPasswordRegister = z
  .string()
  .min(LIMITS.passwordMin, `Password must be at least ${LIMITS.passwordMin} characters`)
  .max(LIMITS.passwordMax, `Max ${LIMITS.passwordMax} characters`);

export const zPasswordLogin = z.string().min(1, "Password required").max(LIMITS.passwordMax);

export const zPhoneOpt = z.preprocess(
  (v) => (v === undefined || v === null ? "" : trim(v)),
  z.union([z.literal(""), z.string().max(LIMITS.phoneDisplay)]),
).superRefine((val, ctx) => {
  if (val === "") return;
  const digits = val.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Phone must be 10–15 digits" });
  }
});

function digitsOnly(v: unknown): unknown {
  return typeof v === "string" ? v.replace(/\D/g, "") : v;
}

export const zAadhaar = z.preprocess(digitsOnly, z.string().regex(/^\d{12}$/, "Aadhaar must be exactly 12 digits"));

export const zPinOpt = z
  .preprocess((v) => (typeof v === "string" ? v.replace(/\D/g, "") : ""), z.union([z.literal(""), z.string().max(8)]))
  .superRefine((val, ctx) => {
    if (val === "") return;
    if (!/^\d{6}$/.test(val)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "PIN code must be exactly 6 digits" });
    }
  })
  .transform((v) => (v === "" ? undefined : v));

export const zBloodGroup = z.enum(BLOOD, { message: "Invalid blood group" });

export const zBloodGroupOpt = z.preprocess(trim, z.union([z.literal(""), z.enum(BLOOD)])).transform((v) =>
  v === "" ? undefined : v,
);

export const zMoney = z.number().positive("Amount must be positive").max(1_000_000_000, "Amount too large");

export const zMoneyCoerce = z.coerce.number().positive("Amount must be positive").max(1_000_000_000, "Amount too large");

export const zIsoDateString = z
  .string()
  .min(1)
  .max(32)
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const zPaymentMethodAdmission = z.enum(["cash", "online"]);

export const zPaymentMethodRecord = z.enum(["cash", "online", "upi", "card", "bank_transfer"], {
  message: "Invalid payment method",
});

const admissionLineItemSchema = z.object({
  label: z.preprocess(trim, z.string().min(1).max(LIMITS.admissionFeeLabel)),
  amount: z.number().positive().max(1_000_000_000),
});

export const zAdmissionLineItems = z.array(admissionLineItemSchema).min(1).max(20);

const recordLineItemSchema = z.object({
  label: z.preprocess(trim, z.string().min(1).max(LIMITS.paymentLabel)),
  amount: z.coerce.number().positive().max(1_000_000_000),
  feePlanId: z.string().max(LIMITS.idString).nullable().optional(),
});

export const zRecordLineItems = z.array(recordLineItemSchema).min(1).max(LIMITS.maxFeeLines);

export function firstZodIssueMessage(e: z.ZodError): string {
  return e.errors[0]?.message ?? "Invalid input";
}
