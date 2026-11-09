export const SESSION_TYPES = ["cours", "td", "tp"] as const;

export type SessionType = (typeof SESSION_TYPES)[number];

export const TIMETABLE_STATUSES = ["draft", "published"] as const;

export type TimetableStatus = (typeof TIMETABLE_STATUSES)[number];

export const WEEKDAYS = [1, 2, 3, 4, 5, 6] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export type Room = {
  id: string;
  name: string;
  capacity: number | null;
  isActive: boolean;
};

export type TimetableTeacher = {
  userId: string;
  fullName: string;
};

export type TimetableCourse = {
  id: string;
  name: string;
  teachers: TimetableTeacher[];
};

export type TimetableSession = {
  id: string;
  classId: string;
  courseId: string;
  courseName: string;
  semester: number;
  sessionType: SessionType;
  groupLabel: string | null;
  weekday: number;
  startTime: string;
  endTime: string;
  roomId: string | null;
  roomName: string;
  teacherId: string | null;
  teacherName: string;
  status: TimetableStatus;
  isLocked: boolean;
  generationId: string | null;
};

export type CourseRequirement = {
  id: string;
  courseId: string;
  courseName: string;
  sessionType: SessionType;
  groupLabel: string | null;
  sessionsPerWeek: number;
  durationMinutes: number;
  teacherId: string | null;
  teacherName: string;
  preferredRoomId: string | null;
  preferredRoomName: string;
};

export type TeacherUnavailability = {
  id: string;
  teacherId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  note: string | null;
};

export type TimetableGenerationParams = {
  dayStart: string | null;
  dayEnd: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  days: number[];
};

export type TimetableGenerationUnplaced = {
  courseId: string;
  courseName: string;
  sessionType: SessionType;
  group: string | null;
  missing: number;
};

export type TimetableGenerationResult = {
  placed: number;
  removedDrafts: number;
  kept: number;
  placedWithoutRoom: number;
  unplaced: TimetableGenerationUnplaced[];
};

export type TimetableGeneration = {
  id: string;
  classId: string;
  semester: number;
  params: TimetableGenerationParams;
  result: TimetableGenerationResult;
  createdAt: string;
};

export function isSessionType(value: string): value is SessionType {
  return (SESSION_TYPES as readonly string[]).includes(value);
}

export function isWeekday(value: number): value is Weekday {
  return WEEKDAYS.includes(value as Weekday);
}

export function isTimetableStatus(value: string): value is TimetableStatus {
  return (TIMETABLE_STATUSES as readonly string[]).includes(value);
}
