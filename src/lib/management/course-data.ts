import { isUuid } from "@/lib/management/admin-validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Relation<T> = T | T[] | null;

type SupabaseServerClient = Awaited<
  ReturnType<typeof createServerSupabaseClient>
>;

type TeacherNameRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
};

export type CourseTeacher = {
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
};

export type ManagementCourse = {
  id: string;
  name: string;
  semester: number | null;
  description: string | null;
  isActive: boolean;
  teachers: CourseTeacher[];
};

export type VisibleCourse = ManagementCourse & {
  classLabel: string;
  className: string | null;
  programCode: string | null;
  academicYearLabel: string | null;
};

type CourseRow = {
  id: string;
  name: string;
  semester: number | null;
  description: string | null;
  is_active: boolean;
};

type VisibleCourseRow = CourseRow & {
  classes: Relation<{
    name: string | null;
    programs: Relation<{ code: string | null }>;
    academic_years: Relation<{ label: string | null }>;
  }>;
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

async function getCourseTeacherNames(
  supabase: SupabaseServerClient,
  courseId: string,
): Promise<CourseTeacher[]> {
  const { data, error } = await supabase.rpc("course_teacher_names", {
    p_course: courseId,
  });

  if (error) {
    return [];
  }

  return ((data ?? []) as TeacherNameRow[])
    .map((row) => {
      const firstName = row.first_name?.trim() ?? "";
      const lastName = row.last_name?.trim() ?? "";

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
}

async function attachTeachers<
  T extends Omit<ManagementCourse, "teachers">,
>(
  supabase: SupabaseServerClient,
  courses: T[],
): Promise<Array<T & { teachers: CourseTeacher[] }>> {
  return Promise.all(
    courses.map(async (course) => ({
      ...course,
      teachers: await getCourseTeacherNames(supabase, course.id),
    })),
  );
}

export type ManagementCoursesResult = {
  courses: ManagementCourse[];
  error: boolean;
};

export async function getClassCourses(
  classId: string,
): Promise<ManagementCoursesResult> {
  if (!isUuid(classId)) {
    return { courses: [], error: false };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, name, semester, description, is_active")
    .eq("class_id", classId)
    .order("name", { ascending: true });

  if (error) {
    return { courses: [], error: true };
  }

  const courses = await attachTeachers(
    supabase,
    ((data ?? []) as CourseRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      semester: row.semester,
      description: row.description,
      isActive: row.is_active === true,
    })),
  );

  return { courses, error: false };
}

export type VisibleCoursesResult = {
  courses: VisibleCourse[];
  error: boolean;
};

function parseVisibleCourse(row: VisibleCourseRow): Omit<VisibleCourse, "teachers"> {
  const enrollmentClass = firstRelation(row.classes);
  const className = enrollmentClass?.name?.trim() ?? "";
  const programCode = enrollmentClass
    ? (firstRelation(enrollmentClass.programs)?.code?.trim() ?? "")
    : "";
  const academicYearLabel = enrollmentClass
    ? (firstRelation(enrollmentClass.academic_years)?.label?.trim() ?? "")
    : "";

  return {
    id: row.id,
    name: row.name,
    semester: row.semester,
    description: row.description,
    isActive: row.is_active === true,
    className: className || null,
    programCode: programCode || null,
    academicYearLabel: academicYearLabel || null,
    classLabel: className
      ? buildClassLabel(programCode, className, academicYearLabel)
      : "",
  };
}

export async function getVisibleCourses(): Promise<VisibleCoursesResult> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("courses")
    .select(
      `id, name, semester, description, is_active,
       classes(name, programs(code), academic_years(label))`,
    )
    .order("name", { ascending: true });

  if (error) {
    return { courses: [], error: true };
  }

  const courses = await attachTeachers(
    supabase,
    ((data ?? []) as unknown as VisibleCourseRow[]).map(parseVisibleCourse),
  );

  return { courses, error: false };
}

export type VisibleCourseResult = {
  course: VisibleCourse | null;
  error: boolean;
};

export async function getVisibleCourse(
  courseId: string,
): Promise<VisibleCourseResult> {
  if (!isUuid(courseId)) {
    return { course: null, error: false };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("courses")
    .select(
      `id, name, semester, description, is_active,
       classes(name, programs(code), academic_years(label))`,
    )
    .eq("id", courseId)
    .maybeSingle();

  if (error) {
    return { course: null, error: true };
  }

  if (!data) {
    return { course: null, error: false };
  }

  const base = parseVisibleCourse(data as unknown as VisibleCourseRow);
  const [course] = await attachTeachers(supabase, [base]);

  return { course: course ?? null, error: false };
}
