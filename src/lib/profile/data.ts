import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { EnrollmentStatus } from "@/lib/types";

type Relation<T> = T | T[] | null;

function firstRelation<T>(value: Relation<T>): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export type ProfileRoleLabel = {
  code: string;
  label: string;
};

type RoleRow = {
  role_code: string;
  roles: Relation<{ label_fr: string | null }>;
};

export const getCurrentRoleLabels = cache(
  async (): Promise<ProfileRoleLabel[]> => {
    const user = await getCurrentUser();

    if (!user) {
      return [];
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("user_roles")
      .select("role_code, roles(label_fr)")
      .eq("user_id", user.id);

    if (error) {
      return [];
    }

    return ((data ?? []) as unknown as RoleRow[])
      .map((row) => ({
        code: row.role_code,
        label:
          firstRelation(row.roles)?.label_fr?.trim() || row.role_code,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  },
);

export type ProfileEnrollment = {
  id: string;
  status: EnrollmentStatus;
  className: string | null;
  programName: string | null;
  programCode: string | null;
  academicYearLabel: string | null;
};

type EnrollmentRow = {
  id: string;
  status: EnrollmentStatus;
  classes: Relation<{
    name: string | null;
    programs: Relation<{ name: string | null; code: string | null }>;
  }>;
  academic_years: Relation<{ label: string | null }>;
};

export type ProfileEnrollmentsResult = {
  items: ProfileEnrollment[];
  error: boolean;
};

export const getCurrentEnrollments = cache(
  async (): Promise<ProfileEnrollmentsResult> => {
    const user = await getCurrentUser();

    if (!user) {
      return { items: [], error: false };
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("student_enrollments")
      .select(
        `id, status,
         academic_years(label),
         classes(name, programs(name, code))`,
      )
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return { items: [], error: true };
    }

    const items = ((data ?? []) as unknown as EnrollmentRow[]).map((row) => {
      const enrollmentClass = firstRelation(row.classes);
      const program = enrollmentClass
        ? firstRelation(enrollmentClass.programs)
        : null;

      return {
        id: row.id,
        status: row.status,
        className: enrollmentClass?.name?.trim() || null,
        programName: program?.name?.trim() || null,
        programCode: program?.code?.trim() || null,
        academicYearLabel:
          firstRelation(row.academic_years)?.label?.trim() || null,
      };
    });

    return { items, error: false };
  },
);
