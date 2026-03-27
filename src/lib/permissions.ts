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
  | "transport"
  | "branches"
  | "branches.select"
  | "teacher-assignments"
  | "upload";

type PermissionRules = Partial<Record<PermissionModule, PermissionAction[]>>;
type CustomPermission = { view?: boolean; add?: boolean; edit?: boolean; delete?: boolean };

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
    transport: ["read", "write"],
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
    transport: ["read", "write"],
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
    transport: ["read", "write"],
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
    "branches.select": ["read", "write"],
  },
  teacher: {
    dashboard: ["read", "write"],
    attendance: ["read", "write"],
    "examinations.marks": ["read", "write"],
    books: ["read", "write"],
    transport: ["read", "write"],
    "branches.select": ["read", "write"],
  },
  staff: {
    dashboard: ["read", "write"],
    "staff-attendance": ["read", "write"],
    books: ["read", "write"],
    transport: ["read", "write"],
    "branches.select": ["read", "write"],
  },
  student: {},
  parent: {},
};

export function canPermission(
  role: SessionUser["role"],
  module: PermissionModule,
  action: PermissionAction,
  customPermissions?: SessionUser["permissions"] | null
): boolean {
  const hasCustomPermissions =
    !!customPermissions && Object.keys(customPermissions as Record<string, unknown>).length > 0;
  const override = customPermissions?.[module] as CustomPermission | undefined;
  if (hasCustomPermissions) {
    if (!override) return false;
    if (action === "read") return !!override.view;
    return !!(override.add || override.edit || override.delete);
  }
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
  if (!canPermission(session.role, module, action, session.permissions)) {
    throw new Error("Unauthorized");
  }
}

