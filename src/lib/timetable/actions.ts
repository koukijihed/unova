"use server";

import { revalidatePath } from "next/cache";
import { fr } from "@/content/fr";
import { readText } from "@/lib/auth/validation";
import type { ManagementActionState } from "@/lib/management/action-state";
import { errorState, successState } from "@/lib/management/action-helpers";
import { isUuid } from "@/lib/management/admin-validation";
import {
  isForbiddenError,
  isUniqueViolation,
  type PostgrestErrorLike,
} from "@/lib/management/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  isSessionType,
  isTimetableStatus,
  isWeekday,
} from "./types";

const LABELS = fr.app.timetable.management;
const ERRORS = LABELS.errors;
const ROOMS = fr.app.timetable.rooms;
const ROOM_ERRORS = ROOMS.errors;
const ROOM_NAME_MAX = 60;
const ROOM_CAPACITY_MIN = 1;
const ROOM_CAPACITY_MAX = 1000;
const GROUP_MAX = 20;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_START_MINUTES = 8 * 60;
const DAY_END_MINUTES = 19 * 60;

const MANAGEMENT_PATH = "/gestion/emplois-du-temps";
const ROOMS_PATH = "/gestion/salles";
const PUBLIC_PATH = "/emplois-du-temps";

type SupabaseErrorLike = PostgrestErrorLike & {
  details?: string | null;
  hint?: string | null;
};

export type TimetableActionResult =
  | { ok: true }
  | { ok: false; error: string };

function logSupabaseError(queryName: string, error: SupabaseErrorLike) {
  console.error(`${queryName} failed`, {
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  });
}

async function getAuthenticatedClient() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return { supabase, user };
}

function mapTimetableError(error: PostgrestErrorLike | null): string {
  if (!error) {
    return ERRORS.generic;
  }

  const message = (error.message ?? "").toLowerCase();

  if (error.code === "23P01") {
    if (message.includes("conflict:class")) {
      return ERRORS.conflictClass;
    }

    if (message.includes("conflict:teacher")) {
      return ERRORS.conflictTeacher;
    }

    if (message.includes("conflict:room")) {
      return ERRORS.conflictRoom;
    }
  }

  if (error.code === "23514") {
    return ERRORS.invalidCourseOrTeacher;
  }

  if (isForbiddenError(error)) {
    return ERRORS.forbidden;
  }

  return ERRORS.generic;
}

function mapRoomError(error: PostgrestErrorLike | null): string {
  if (isForbiddenError(error)) {
    return ROOM_ERRORS.forbidden;
  }

  if (isUniqueViolation(error)) {
    return ROOM_ERRORS.nameTaken;
  }

  return ROOM_ERRORS.generic;
}

function parseTimeToMinutes(value: string): number | null {
  const match = TIME_PATTERN.exec(value.trim());

  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
}

function revalidateTimetable() {
  revalidatePath(MANAGEMENT_PATH);
  revalidatePath(PUBLIC_PATH);
}

export type SessionInput = {
  id?: string;
  classId: string;
  courseId: string;
  semester: string | number;
  sessionType: string;
  groupLabel: string;
  weekday: string | number;
  startTime: string;
  endTime: string;
  roomId: string;
  teacherId: string;
};

type ValidatedSession = {
  classId: string;
  courseId: string;
  semester: number;
  sessionType: string;
  groupLabel: string | null;
  weekday: number;
  startTime: string;
  endTime: string;
  roomId: string | null;
  teacherId: string | null;
};

function validateSession(
  input: SessionInput,
): { ok: true; value: ValidatedSession } | { ok: false; error: string } {
  const classId = String(input.classId ?? "").trim();
  const courseId = String(input.courseId ?? "").trim();
  const semester = Number(input.semester);
  const sessionType = String(input.sessionType ?? "").trim();
  const groupLabel = String(input.groupLabel ?? "").trim();
  const weekday = Number(input.weekday);
  const startTime = String(input.startTime ?? "").trim();
  const endTime = String(input.endTime ?? "").trim();
  const roomId = String(input.roomId ?? "").trim();
  const teacherId = String(input.teacherId ?? "").trim();

  if (!isUuid(classId)) {
    return { ok: false, error: ERRORS.forbidden };
  }

  if (!isUuid(courseId)) {
    return { ok: false, error: ERRORS.courseRequired };
  }

  if (semester !== 1 && semester !== 2) {
    return { ok: false, error: ERRORS.generic };
  }

  if (!isSessionType(sessionType)) {
    return { ok: false, error: ERRORS.typeInvalid };
  }

  if (groupLabel.length > GROUP_MAX) {
    return { ok: false, error: ERRORS.groupTooLong };
  }

  if (!isWeekday(weekday)) {
    return { ok: false, error: ERRORS.weekdayInvalid };
  }

  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (startMinutes === null || endMinutes === null) {
    return { ok: false, error: ERRORS.timeInvalid };
  }

  if (endMinutes <= startMinutes) {
    return { ok: false, error: ERRORS.timeOrder };
  }

  if (
    startMinutes < DAY_START_MINUTES ||
    endMinutes > DAY_END_MINUTES
  ) {
    return { ok: false, error: ERRORS.timeRange };
  }

  if (roomId && !isUuid(roomId)) {
    return { ok: false, error: ERRORS.invalidRoom };
  }

  if (teacherId && !isUuid(teacherId)) {
    return { ok: false, error: ERRORS.invalidTeacher };
  }

  return {
    ok: true,
    value: {
      classId,
      courseId,
      semester,
      sessionType,
      groupLabel: groupLabel || null,
      weekday,
      startTime: startTime.length === 5 ? startTime : startTime.slice(0, 5),
      endTime: endTime.length === 5 ? endTime : endTime.slice(0, 5),
      roomId: roomId || null,
      teacherId: teacherId || null,
    },
  };
}

export async function createTimetableEntry(
  input: SessionInput,
): Promise<TimetableActionResult> {
  const validated = validateSession(input);

  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return { ok: false, error: ERRORS.sessionExpired };
  }

  const value = validated.value;
  const { data, error } = await auth.supabase
    .from("timetable_entries")
    .insert({
      class_id: value.classId,
      course_id: value.courseId,
      semester: value.semester,
      session_type: value.sessionType,
      group_label: value.groupLabel,
      weekday: value.weekday,
      start_time: value.startTime,
      end_time: value.endTime,
      room_id: value.roomId,
      teacher_id: value.teacherId,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    logSupabaseError("createTimetableEntry", error);
    return { ok: false, error: mapTimetableError(error) };
  }

  if (!data) {
    return { ok: false, error: ERRORS.forbidden };
  }

  revalidateTimetable();

  return { ok: true };
}

export async function updateTimetableEntry(
  input: SessionInput,
): Promise<TimetableActionResult> {
  const id = String(input.id ?? "").trim();

  if (!isUuid(id)) {
    return { ok: false, error: ERRORS.forbidden };
  }

  const validated = validateSession(input);

  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return { ok: false, error: ERRORS.sessionExpired };
  }

  const value = validated.value;
  const { data, error } = await auth.supabase
    .from("timetable_entries")
    .update({
      course_id: value.courseId,
      session_type: value.sessionType,
      group_label: value.groupLabel,
      weekday: value.weekday,
      start_time: value.startTime,
      end_time: value.endTime,
      room_id: value.roomId,
      teacher_id: value.teacherId,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    logSupabaseError("updateTimetableEntry", error);
    return { ok: false, error: mapTimetableError(error) };
  }

  if (!data) {
    return { ok: false, error: ERRORS.forbidden };
  }

  revalidateTimetable();

  return { ok: true };
}

export async function deleteTimetableEntryFormAction(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const id = readText(formData, "entryId").trim();

  if (!isUuid(id)) {
    return errorState(ERRORS.forbidden);
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return errorState(ERRORS.sessionExpired);
  }

  const { data, error } = await auth.supabase
    .from("timetable_entries")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    logSupabaseError("deleteTimetableEntry", error);
    return errorState(mapTimetableError(error));
  }

  if (!data) {
    return errorState(ERRORS.forbidden);
  }

  revalidateTimetable();

  return successState(LABELS.deleted);
}

export async function setTimetableStatusFormAction(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const classId = readText(formData, "classId").trim();
  const semester = Number(readText(formData, "semester"));
  const status = readText(formData, "status").trim();

  if (
    !isUuid(classId) ||
    (semester !== 1 && semester !== 2) ||
    !isTimetableStatus(status)
  ) {
    return errorState(ERRORS.forbidden);
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return errorState(ERRORS.sessionExpired);
  }

  const { data, error } = await auth.supabase.rpc("set_timetable_status", {
    p_class: classId,
    p_semester: semester,
    p_status: status,
  });

  if (error) {
    logSupabaseError("setTimetableStatus", error);
    return errorState(mapTimetableError(error));
  }

  revalidateTimetable();

  const count = typeof data === "number" ? data : 0;

  return successState(
    LABELS.statusUpdated.replace("{count}", String(count)),
  );
}

type RoomFields = {
  name: string;
  capacity: number | null;
  values: { name: string; capacity: string };
};

function readRoomFields(
  formData: FormData,
): { ok: true; value: RoomFields } | { ok: false; error: string; values: RoomFields["values"] } {
  const name = readText(formData, "name").trim();
  const capacityRaw = readText(formData, "capacity").trim();
  const values = { name, capacity: capacityRaw };

  if (!name) {
    return { ok: false, error: ROOM_ERRORS.nameRequired, values };
  }

  if (name.length > ROOM_NAME_MAX) {
    return { ok: false, error: ROOM_ERRORS.nameTooLong, values };
  }

  let capacity: number | null = null;

  if (capacityRaw) {
    const parsed = Number(capacityRaw);

    if (
      !Number.isInteger(parsed) ||
      parsed < ROOM_CAPACITY_MIN ||
      parsed > ROOM_CAPACITY_MAX
    ) {
      return { ok: false, error: ROOM_ERRORS.capacityInvalid, values };
    }

    capacity = parsed;
  }

  return { ok: true, value: { name, capacity, values } };
}

export async function createRoom(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const fields = readRoomFields(formData);

  if (!fields.ok) {
    return errorState(fields.error, undefined, fields.values);
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return errorState(ROOM_ERRORS.sessionExpired, undefined, fields.value.values);
  }

  const { data, error } = await auth.supabase
    .from("rooms")
    .insert({ name: fields.value.name, capacity: fields.value.capacity })
    .select("id")
    .maybeSingle();

  if (error) {
    logSupabaseError("createRoom", error);
    return errorState(
      mapRoomError(error),
      undefined,
      fields.value.values,
    );
  }

  if (!data) {
    return errorState(ROOM_ERRORS.forbidden, undefined, fields.value.values);
  }

  revalidatePath(ROOMS_PATH);
  revalidateTimetable();

  return successState(ROOMS.created);
}

export async function updateRoom(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const roomId = readText(formData, "roomId").trim();
  const fields = readRoomFields(formData);

  if (!isUuid(roomId)) {
    return errorState(
      ROOM_ERRORS.forbidden,
      undefined,
      fields.ok ? fields.value.values : fields.values,
    );
  }

  if (!fields.ok) {
    return errorState(fields.error, undefined, fields.values);
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return errorState(ROOM_ERRORS.sessionExpired, undefined, fields.value.values);
  }

  const { data, error } = await auth.supabase
    .from("rooms")
    .update({ name: fields.value.name, capacity: fields.value.capacity })
    .eq("id", roomId)
    .select("id")
    .maybeSingle();

  if (error) {
    logSupabaseError("updateRoom", error);
    return errorState(
      mapRoomError(error),
      undefined,
      fields.value.values,
    );
  }

  if (!data) {
    return errorState(ROOM_ERRORS.forbidden, undefined, fields.value.values);
  }

  revalidatePath(ROOMS_PATH);
  revalidateTimetable();

  return successState(ROOMS.updated);
}

export async function setRoomActive(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const roomId = readText(formData, "roomId").trim();
  const active = readText(formData, "active") === "true";

  if (!isUuid(roomId)) {
    return errorState(ROOM_ERRORS.forbidden);
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return errorState(ROOM_ERRORS.sessionExpired);
  }

  const { data, error } = await auth.supabase
    .from("rooms")
    .update({ is_active: active })
    .eq("id", roomId)
    .select("id")
    .maybeSingle();

  if (error) {
    logSupabaseError("setRoomActive", error);
    return errorState(mapRoomError(error));
  }

  if (!data) {
    return errorState(ROOM_ERRORS.forbidden);
  }

  revalidatePath(ROOMS_PATH);
  revalidateTimetable();

  return successState(active ? ROOMS.activated : ROOMS.deactivated);
}
