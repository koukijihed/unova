export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  avatar_path: string | null;
  status: "active" | "suspended";
};

export type UserRole = {
  role_code: string;
};

export type ProfileNames = {
  firstName: string;
  lastName: string;
  fullName: string;
};

export type EnrollmentStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "interrupted"
  | "graduated";

export type StudentProfile = {
  user_id: string;
};

export type StudentEnrollment = {
  id: string;
  class_id: string;
  academic_year_id: string;
  status: EnrollmentStatus;
};

export type ManagementClass = {
  id: string;
  name: string;
  programCode: string;
  academicYearLabel: string;
  label: string;
};

export type ManagementStudent = {
  rosterId: string;
  firstName: string;
  lastName: string;
  claimed: boolean;
  enrollmentId: string | null;
  enrollmentStatus: EnrollmentStatus | null;
};
