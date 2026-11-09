import { isUuid } from "@/lib/management/admin-validation";
import { getClassCourses } from "@/lib/management/course-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  isSessionType,
  type CourseRequirement,
  type Room,
  type SessionType,
  type TeacherUnavailability,
  type TimetableCourse,
  type TimetableGeneration,
  type TimetableGenerationParams,
  type TimetableGenerationResult,
  type TimetableGenerationUnplaced,
  type TimetableSession,
  type TimetableStatus,
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
  is_locked: boolean;
  generation_id: string | null;
  courses: Relation<{ name: string | null }>;
  rooms: Relation<{ name: string | null }>;
};

type RequirementRow = {
  id: string;
  course_id: string;
  session_type: SessionType;
  group_label: string | null;
  sessions_per_week: number;
  duration_minutes: number;
  teacher_id: string | null;
  preferred_room_id: string | null;
  courses: Relation<{ name: string | null; class_id: string }>;
};

type UnavailabilityRow = {
  id: string;
  teacher_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  note: string | null;
};

type GenerationRow = {
  id: string;
  class_id: string;
  semester: number;
  params: unknown;
  result: unknown;
  created_at: string;
};

type TeacherNameRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
};

const SESSION_COLUMNS = `id, class_id, course_id, semester, session_type,
  group_label, weekday, start_time, end_time, room_id, teacher_id, status,
  is_locked, generation_id, courses(name), rooms(name)`;

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
    isLocked: row.is_locked === true,
    generationId: row.generation_id ?? null,
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

export type ClassRequirementsResult = {
  requirements: CourseRequirement[];
  error: boolean;
};

export async function getClassRequirements(
  classId: string,
): Promise<ClassRequirementsResult> {
  if (!isUuid(classId)) {
    return { requirements: [], error: false };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("course_requirements")
    .select(
      `id, course_id, session_type, group_label, sessions_per_week,
       duration_minutes, teacher_id, preferred_room_id,
       courses!inner(name, class_id)`,
    )
    .eq("courses.class_id", classId);

  if (error) {
    logSupabaseError("getClassRequirements", error);
    return { requirements: [], error: true };
  }

  const rows = (data ?? []) as unknown as RequirementRow[];
  const [teacherNames, roomsResult] = await Promise.all([
    getTeacherNamesByCourse(rows.map((row) => row.course_id)),
    getRooms(),
  ]);
  const roomNames = new Map(
    roomsResult.rooms.map((room) => [room.id, room.name]),
  );

  const requirements = rows
    .map((row) => ({
      id: row.id,
      courseId: row.course_id,
      courseName: firstRelation(row.courses)?.name?.trim() ?? "",
      sessionType: row.session_type,
      groupLabel: row.group_label,
      sessionsPerWeek: Number(row.sessions_per_week),
      durationMinutes: Number(row.duration_minutes),
      teacherId: row.teacher_id,
      teacherName: row.teacher_id
        ? (teacherNames.get(row.course_id)?.get(row.teacher_id) ?? "")
        : "",
      preferredRoomId: row.preferred_room_id,
      preferredRoomName: row.preferred_room_id
        ? (roomNames.get(row.preferred_room_id) ?? "")
        : "",
    }))
    .sort(
      (a, b) =>
        a.courseName.localeCompare(b.courseName, "fr", {
          sensitivity: "base",
        }) ||
        a.sessionType.localeCompare(b.sessionType, "fr") ||
        (a.groupLabel ?? "").localeCompare(b.groupLabel ?? "", "fr", {
          sensitivity: "base",
        }),
    );

  return { requirements, error: false };
}

export type UnavailabilityResult = {
  blocks: TeacherUnavailability[];
  error: boolean;
};

export async function getTeacherUnavailability(
  teacherId: string,
): Promise<UnavailabilityResult> {
  if (!isUuid(teacherId)) {
    return { blocks: [], error: false };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("teacher_unavailability")
    .select("id, teacher_id, weekday, start_time, end_time, note")
    .eq("teacher_id", teacherId)
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    logSupabaseError("getTeacherUnavailability", error);
    return { blocks: [], error: true };
  }

  return {
    blocks: ((data ?? []) as UnavailabilityRow[]).map((row) => ({
      id: row.id,
      teacherId: row.teacher_id,
      weekday: Number(row.weekday),
      startTime: normalizeTime(row.start_time),
      endTime: normalizeTime(row.end_time),
      note: row.note,
    })),
    error: false,
  };
}

function parseGenerationParams(value: unknown): TimetableGenerationParams {
  const record =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const rawDays = Array.isArray(record.days) ? record.days : [];
  const days = rawDays
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 6);

  function readTime(key: string): string | null {
    const raw = record[key];
    return typeof raw === "string" ? normalizeTime(raw) : null;
  }

  return {
    dayStart: readTime("day_start"),
    dayEnd: readTime("day_end"),
    breakStart: readTime("break_start"),
    breakEnd: readTime("break_end"),
    days,
  };
}

function parseGenerationUnplaced(
  value: unknown,
): TimetableGenerationUnplaced[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const row = item as Record<string, unknown>;
    const sessionType =
      typeof row.session_type === "string" && isSessionType(row.session_type)
        ? row.session_type
        : null;

    if (!sessionType) {
      return [];
    }

    return [
      {
        courseId: typeof row.course_id === "string" ? row.course_id : "",
        courseName:
          typeof row.course_name === "string" ? row.course_name : "",
        sessionType,
        group: typeof row.group === "string" ? row.group : null,
        missing: Number(row.missing ?? 0),
      },
    ];
  });
}

function parseGenerationResult(value: unknown): TimetableGenerationResult {
  const record =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    placed: Number(record.placed ?? 0),
    removedDrafts: Number(record.removed_drafts ?? 0),
    kept: Number(record.kept ?? 0),
    placedWithoutRoom: Number(record.placed_without_room ?? 0),
    unplaced: parseGenerationUnplaced(record.unplaced),
  };
}

export type TimetableGenerationsResult = {
  generations: TimetableGeneration[];
  error: boolean;
};

export async function getTimetableGenerations(
  classId: string,
  semester: number,
): Promise<TimetableGenerationsResult> {
  if (!isUuid(classId)) {
    return { generations: [], error: false };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("timetable_generations")
    .select("id, class_id, semester, params, result, created_at")
    .eq("class_id", classId)
    .eq("semester", semester)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    logSupabaseError("getTimetableGenerations", error);
    return { generations: [], error: true };
  }

  return {
    generations: ((data ?? []) as GenerationRow[]).map((row) => ({
      id: row.id,
      classId: row.class_id,
      semester: Number(row.semester),
      params: parseGenerationParams(row.params),
      result: parseGenerationResult(row.result),
      createdAt: row.created_at,
    })),
    error: false,
  };
}
