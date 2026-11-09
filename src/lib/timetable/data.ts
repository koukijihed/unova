import { isUuid } from "@/lib/management/admin-validation";
import { getClassCourses } from "@/lib/management/course-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  Room,
  SessionType,
  TimetableCourse,
  TimetableSession,
  TimetableStatus,
} from "./types";

type Relation<T> = T | T[] | null;

type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

type RoomRow = {
  id: string;
  name: string;
  capacity: number | null;
  is_active: boolean;
};

type SessionRow = {
  id: string;
  class_id: string;
  course_id: string;
  semester: number;
  session_type: SessionType;
  group_label: string | null;
  weekday: number;
  start_time: string;
  end_time: string;
  room_id: string | null;
  teacher_id: string | null;
  status: TimetableStatus;
  courses: Relation<{ name: string | null }>;
  rooms: Relation<{ name: string | null }>;
};

type TeacherNameRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
};

const SESSION_COLUMNS = `id, class_id, course_id, semester, session_type,
  group_label, weekday, start_time, end_time, room_id, teacher_id, status,
  courses(name), rooms(name)`;

function firstRelation<T>(value: Relation<T>): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function logSupabaseError(queryName: string, error: SupabaseErrorLike) {
  console.error(`${queryName} failed`, {
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  });
}

function normalizeTime(value: string): string {
  return value.slice(0, 5);
}

async function getTeacherNamesByCourse(
  courseIds: string[],
): Promise<Map<string, Map<string, string>>> {
  const result = new Map<string, Map<string, string>>();
  const unique = Array.from(new Set(courseIds.filter((id) => isUuid(id))));

  if (unique.length === 0) {
    return result;
  }

  const supabase = await createServerSupabaseClient();

  await Promise.all(
    unique.map(async (courseId) => {
      const { data, error } = await supabase.rpc("course_teacher_names", {
        p_course: courseId,
      });

      if (error) {
        logSupabaseError("course_teacher_names", error);
        return;
      }

      const names = new Map<string, string>();

      for (const row of (data ?? []) as TeacherNameRow[]) {
        const fullName =
          `${row.first_name?.trim() ?? ""} ${row.last_name?.trim() ?? ""}`.trim();

        names.set(row.user_id, fullName);
      }

      result.set(courseId, names);
    }),
  );

  return result;
}

function parseSession(
  row: SessionRow,
  teacherNames: Map<string, Map<string, string>>,
): TimetableSession {
  return {
    id: row.id,
    classId: row.class_id,
    courseId: row.course_id,
    courseName: firstRelation(row.courses)?.name?.trim() ?? "",
    semester: Number(row.semester),
    sessionType: row.session_type,
    groupLabel: row.group_label,
    weekday: Number(row.weekday),
    startTime: normalizeTime(row.start_time),
    endTime: normalizeTime(row.end_time),
    roomId: row.room_id,
    roomName: firstRelation(row.rooms)?.name?.trim() ?? "",
    teacherId: row.teacher_id,
    teacherName: row.teacher_id
      ? (teacherNames.get(row.course_id)?.get(row.teacher_id) ?? "")
      : "",
    status: row.status,
  };
}

async function parseSessions(rows: SessionRow[]): Promise<TimetableSession[]> {
  const teacherNames = await getTeacherNamesByCourse(
    rows.map((row) => row.course_id),
  );

  return rows.map((row) => parseSession(row, teacherNames));
}

export type RoomsResult = {
  rooms: Room[];
  error: boolean;
};

export async function getRooms(): Promise<RoomsResult> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("id, name, capacity, is_active")
    .order("name", { ascending: true });

  if (error) {
    logSupabaseError("getRooms", error);
    return { rooms: [], error: true };
  }

  return {
    rooms: ((data ?? []) as RoomRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      capacity: row.capacity,
      isActive: row.is_active === true,
    })),
    error: false,
  };
}

export type TimetableCoursesResult = {
  courses: TimetableCourse[];
  error: boolean;
};

export async function getTimetableCourses(
  classId: string,
): Promise<TimetableCoursesResult> {
  if (!isUuid(classId)) {
    return { courses: [], error: false };
  }

  const result = await getClassCourses(classId);

  return {
    courses: result.courses.map((course) => ({
      id: course.id,
      name: course.name,
      teachers: course.teachers.map((teacher) => ({
        userId: teacher.userId,
        fullName: teacher.fullName,
      })),
    })),
    error: result.error,
  };
}

export type ClassTimetableResult = {
  sessions: TimetableSession[];
  error: boolean;
};

export async function getClassTimetable(
  classId: string,
  semester: number,
  includeDrafts: boolean,
): Promise<ClassTimetableResult> {
  if (!isUuid(classId)) {
    return { sessions: [], error: false };
  }

  const supabase = await createServerSupabaseClient();
  let request = supabase
    .from("timetable_entries")
    .select(SESSION_COLUMNS)
    .eq("class_id", classId)
    .eq("semester", semester);

  if (!includeDrafts) {
    request = request.eq("status", "published");
  }

  const { data, error } = await request
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    logSupabaseError("getClassTimetable", error);
    return { sessions: [], error: true };
  }

  return {
    sessions: await parseSessions((data ?? []) as unknown as SessionRow[]),
    error: false,
  };
}

export async function getTeacherTimetable(
  teacherId: string,
  semester: number,
): Promise<ClassTimetableResult> {
  if (!isUuid(teacherId)) {
    return { sessions: [], error: false };
  }

  const supabase = await createServerSupabaseClient();
  const { data: assignments, error: assignmentsError } = await supabase
    .from("course_teachers")
    .select("course_id")
    .eq("user_id", teacherId);

  if (assignmentsError) {
    logSupabaseError("getTeacherTimetable.assignments", assignmentsError);
    return { sessions: [], error: true };
  }

  const courseIds = new Set(
    ((assignments ?? []) as Array<{ course_id: string }>).map(
      (row) => row.course_id,
    ),
  );

  const { data, error } = await supabase
    .from("timetable_entries")
    .select(SESSION_COLUMNS)
    .eq("status", "published")
    .eq("semester", semester)
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    logSupabaseError("getTeacherTimetable", error);
    return { sessions: [], error: true };
  }

  const sessions = await parseSessions(
    (data ?? []) as unknown as SessionRow[],
  );

  return {
    sessions: sessions.filter(
      (session) =>
        session.teacherId === teacherId || courseIds.has(session.courseId),
    ),
    error: false,
  };
}

export type TimetableCounts = {
  drafts: number;
  published: number;
  error: boolean;
};

export async function getTimetableCounts(
  classId: string,
  semester: number,
): Promise<TimetableCounts> {
  if (!isUuid(classId)) {
    return { drafts: 0, published: 0, error: false };
  }

  const supabase = await createServerSupabaseClient();
  const [drafts, published] = await Promise.all([
    supabase
      .from("timetable_entries")
      .select("id", { count: "exact", head: true })
      .eq("class_id", classId)
      .eq("semester", semester)
      .eq("status", "draft"),
    supabase
      .from("timetable_entries")
      .select("id", { count: "exact", head: true })
      .eq("class_id", classId)
      .eq("semester", semester)
      .eq("status", "published"),
  ]);

  if (drafts.error) {
    logSupabaseError("getTimetableCounts.drafts", drafts.error);
  }

  if (published.error) {
    logSupabaseError("getTimetableCounts.published", published.error);
  }

  return {
    drafts: drafts.count ?? 0,
    published: published.count ?? 0,
    error: Boolean(drafts.error || published.error),
  };
}
