import type { SessionUser, UserRole } from "@/types";

export type PermissionAction = "read" | "write";

export type PermissionModule =
  | "dashboard"
  | "students"
  | "staff"
  | "classes"
  | "examinations"
  | "examinations.marks"
  | "examinations.publish"
  | "attendance"
  | "staff-attendance"
  | "fees"
  | "fees.plans"
  | "fees.verify"
  | "library"
  | "books"
  | "hostel"
  | "branches"
  | "branches.select"
  | "teacher-assignments"
  | "upload";

type PermissionRules = Partial<Record<PermissionModule, PermissionAction[]>>;

const roleRules: Record<UserRole, PermissionRules> = {
  super_admin: {
    dashboard: ["read", "write"],
    students: ["read", "write"],
    staff: ["read", "write"],
    classes: ["read", "write"],
    examinations: ["read", "write"],
    "examinations.marks": ["read", "write"],
    "examinations.publish": ["read", "write"],
    attendance: ["read", "write"],
    "staff-attendance": ["read", "write"],
    fees: ["read", "write"],
    "fees.plans": ["read", "write"],
    "fees.verify": ["read", "write"],
    library: ["read", "write"],
    books: ["read", "write"],
    hostel: ["read", "write"],
    branches: ["read", "write"],
    "branches.select": ["read", "write"],
    "teacher-assignments": ["read", "write"],
    upload: ["read", "write"],
  },
  school_admin: {
    dashboard: ["read", "write"],
    students: ["read", "write"],
    staff: ["read", "write"],
    classes: ["read", "write"],
    examinations: ["read", "write"],
    "examinations.marks": ["read", "write"],
    "examinations.publish": ["read", "write"],
    attendance: ["read", "write"],
    "staff-attendance": ["read", "write"],
    fees: ["read", "write"],
    "fees.plans": ["read", "write"],
    "fees.verify": ["read", "write"],
    library: ["read", "write"],
    books: ["read", "write"],
    hostel: ["read", "write"],
    branches: ["read", "write"],
    "branches.select": ["read", "write"],
    "teacher-assignments": ["read", "write"],
    upload: ["read", "write"],
  },
  admin: {
    dashboard: ["read", "write"],
    students: ["read", "write"],
    staff: ["read", "write"],
    classes: ["read", "write"],
    examinations: ["read", "write"],
    "examinations.marks": ["read", "write"],
    "examinations.publish": ["read", "write"],
    attendance: ["read", "write"],
    "staff-attendance": ["read", "write"],
    fees: ["read", "write"],
    "fees.plans": ["read", "write"],
    "fees.verify": ["read", "write"],
    library: ["read", "write"],
    books: ["read", "write"],
    hostel: ["read", "write"],
    branches: ["read", "write"],
    "branches.select": ["read", "write"],
    "teacher-assignments": ["read", "write"],
    upload: ["read", "write"],
  },
  accountant: {
    dashboard: ["read", "write"],
    fees: ["read", "write"],
    "fees.plans": ["read", "write"],
    "fees.verify": ["read", "write"],
    books: ["read", "write"],
    "staff-attendance": ["read", "write"],
  },
  teacher: {
    attendance: ["read", "write"],
    "examinations.marks": ["read", "write"],
  },
  staff: {
    dashboard: ["read", "write"],
    "staff-attendance": ["read", "write"],
  },
  student: {},
  parent: {},
};

export function canPermission(
  role: SessionUser["role"],
  module: PermissionModule,
  action: PermissionAction
): boolean {
  const rules = roleRules[role];
  const allowed = rules?.[module] ?? [];
  return allowed.includes(action);
}

// Alias to match the Phase 2 naming.
export function checkPermission(module: PermissionModule, action: PermissionAction, role: SessionUser["role"]) {
  return canPermission(role, module, action);
}

export function requirePermission(
  session: SessionUser | null,
  module: PermissionModule,
  action: PermissionAction
): asserts session is SessionUser {
  if (!session) throw new Error("Unauthorized");
  if (!canPermission(session.role, module, action)) {
    throw new Error("Unauthorized");
  }
}

