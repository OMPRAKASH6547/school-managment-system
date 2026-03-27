export type UserRole =
  | "super_admin"
  | "school_admin"
  | "admin"
  | "accountant"
  | "staff"
  | "teacher"
  | "student"
  | "parent";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string | null;
  permissions?: Record<string, { view?: boolean; add?: boolean; edit?: boolean; delete?: boolean }> | null;
}

export type OrganizationStatus = "pending" | "approved" | "rejected" | "suspended";
