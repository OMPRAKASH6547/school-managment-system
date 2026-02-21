export type UserRole =
  | "super_admin"
  | "school_admin"
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
}

export type OrganizationStatus = "pending" | "approved" | "rejected" | "suspended";
