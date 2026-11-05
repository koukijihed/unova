import { isForbiddenError } from "@/lib/management/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  EnrollmentStatus,
  ManagementClass,
  ManagementStudent,
} from "@/lib/types";

type Relation<T> = T | T[] | null;

type ClassRow = {
  id: string;
  name: string;
  programs: Relation<{ code: string | null }>;
  academic_years: Relation<{ label: string | null }>;
};

type DirectorStudentRow = {
  roster_id: string;
  first_name: string | null;
  last_name: string | null;
  claimed: boolean | null;
  enrollment_id: string | null;
  enrollment_status: EnrollmentStatus | null;
};

export type ManagementClassesResult = {
  classes: ManagementClass[];
  error: "load_failed" | null;
};

export type ManagementStudentsResult = {
  students: ManagementStudent[];
  error: "forbidden" | "load_failed" | null;
};

function firstRelation<T>(value: Relation<T>): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function buildClassLabel(
  programCode: string,
  className: string,
  academicYearLabel: string,
): string {
  const prefix = programCode ? `${programCode} — ` : "";
  const suffix = academicYearLabel ? ` (${academicYearLabel})` : "";

  return `${prefix}${className}${suffix}`;
}

export async function getManagementClasses(): Promise<ManagementClassesResult> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, programs(code), academic_years(label)")
    .order("name", { ascending: true });

  if (error) {
    return { classes: [], error: "load_failed" };
  }

  const classes = ((data ?? []) as unknown as ClassRow[])
    .map((row) => {
      const programCode = firstRelation(row.programs)?.code?.trim() ?? "";
      const academicYearLabel =
        firstRelation(row.academic_years)?.label?.trim() ?? "";

      return {
        id: row.id,
        name: row.name,
        programCode,
        academicYearLabel,
        label: buildClassLabel(programCode, row.name, academicYearLabel),
      };
    })
    .sort((a, b) =>
      a.label.localeCompare(b.label, "fr", { sensitivity: "base" }),
    );

  return { classes, error: null };
}

export async function getClassStudents(
  classId: string,
): Promise<ManagementStudentsResult> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("director_students", {
    p_class: classId,
  });

  if (error) {
    return {
      students: [],
      error: isForbiddenError(error) ? "forbidden" : "load_failed",
    };
  }

  const students = ((data ?? []) as DirectorStudentRow[]).map((row) => ({
    rosterId: row.roster_id,
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    claimed: row.claimed === true,
    enrollmentId: row.enrollment_id,
    enrollmentStatus: row.enrollment_status,
  }));

  return { students, error: null };
}
