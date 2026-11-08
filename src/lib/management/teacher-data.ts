import { createServerSupabaseClient } from "@/lib/supabase/server";

type Relation<T> = T | T[] | null;

type TeacherRow = {
  user_id: string;
  profiles: Relation<{
    first_name: string | null;
    last_name: string | null;
  }>;
};

export type ManagementTeacher = {
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
};

export type ManagementTeachersResult = {
  teachers: ManagementTeacher[];
  error: boolean;
};

function firstRelation<T>(value: Relation<T>): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export async function getTeachers(): Promise<ManagementTeachersResult> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id, profiles(first_name, last_name)")
    .eq("role_code", "teacher");

  if (error) {
    return { teachers: [], error: true };
  }

  const teachers = ((data ?? []) as unknown as TeacherRow[])
    .map((row) => {
      const profile = firstRelation(row.profiles);
      const firstName = profile?.first_name?.trim() ?? "";
      const lastName = profile?.last_name?.trim() ?? "";

      return {
        userId: row.user_id,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
      };
    })
    .sort((a, b) =>
      (a.lastName || a.firstName).localeCompare(
        b.lastName || b.firstName,
        "fr",
        { sensitivity: "base" },
      ),
    );

  return { teachers, error: false };
}
