"use server";

import { revalidatePath } from "next/cache";
import { fr } from "@/content/fr";
import { readText } from "@/lib/auth/validation";
import type { ManagementActionState } from "@/lib/management/action-state";
import { errorState, successState } from "@/lib/management/action-helpers";
import { isUuid } from "@/lib/management/admin-validation";
import {
  isForbiddenError,
  isNotFoundError,
  isUniqueViolation,
  type PostgrestErrorLike,
} from "@/lib/management/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  isSessionType,
  isTimetableStatus,
  isWeekday,
  type TimetableGenerationResult,
  type TimetableGenerationUnplaced,
} from "./types";

const LABELS = fr.app.timetable.management;
const ERRORS = LABELS.errors;
const ROOMS = fr.app.timetable.rooms;
const ROOM_ERRORS = ROOMS.errors;
const REQUIREMENTS = fr.app.timetable.requirements;
const REQUIREMENT_ERRORS = REQUIREMENTS.errors;
const AVAILABILITY = fr.app.timetable.availability;
const AVAILABILITY_ERRORS = AVAILABILITY.errors;
const GENERATION = fr.app.timetable.generation;
const GENERATION_ERRORS = GENERATION.errors;
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

function revalidateRequirements() {
  revalidatePath("/gestion/cours");
  revalidateTimetable();
}

type RequirementValues = {
  courseId: string;
  sessionType: string;
  groupLabel: string;
  sessionsPerWeek: string;
  durationMinutes: string;
  teacherId: string;
  preferredRoomId: string;
};

type RequirementFields = {
  courseId: string;
  sessionType: string;
  groupLabel: string | null;
  sessionsPerWeek: number;
  durationMinutes: number;
  teacherId: string | null;
  preferredRoomId: string | null;
  values: RequirementValues;
};

function readRequirementFields(
  formData: FormData,
):
  | { ok: true; value: RequirementFields }
  | { ok: false; error: string; values: RequirementValues } {
  const courseId = readText(formData, "courseId").trim();
  const sessionType = readText(formData, "sessionType").trim();
  const groupLabel = readText(formData, "groupLabel").trim();
  const sessionsPerWeekRaw = readText(formData, "sessionsPerWeek").trim();
  const durationMinutesRaw = readText(formData, "durationMinutes").trim();
  const teacherId = readText(formData, "teacherId").trim();
  const preferredRoomId = readText(formData, "preferredRoomId").trim();
  const values: RequirementValues = {
    courseId,
    sessionType,
    groupLabel,
    sessionsPerWeek: sessionsPerWeekRaw,
    durationMinutes: durationMinutesRaw,
    teacherId,
    preferredRoomId,
  };

  if (!isUuid(courseId)) {
    return { ok: false, error: REQUIREMENT_ERRORS.courseInvalid, values };
  }

  if (!isSessionType(sessionType)) {
    return { ok: false, error: REQUIREMENT_ERRORS.typeInvalid, values };
  }

  if (groupLabel.length > GROUP_MAX) {
    return { ok: false, error: REQUIREMENT_ERRORS.groupTooLong, values };
  }

  const sessionsPerWeek = Number(sessionsPerWeekRaw);

  if (
    !Number.isInteger(sessionsPerWeek) ||
    sessionsPerWeek < 1 ||
    sessionsPerWeek > 6
  ) {
    return { ok: false, error: REQUIREMENT_ERRORS.sessionsInvalid, values };
  }

  const durationMinutes = Number(durationMinutesRaw);

  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 30 ||
    durationMinutes > 240 ||
    durationMinutes % 15 !== 0
  ) {
    return { ok: false, error: REQUIREMENT_ERRORS.durationInvalid, values };
  }

  if (teacherId && !isUuid(teacherId)) {
    return { ok: false, error: REQUIREMENT_ERRORS.teacherInvalid, values };
  }

  if (preferredRoomId && !isUuid(preferredRoomId)) {
    return { ok: false, error: REQUIREMENT_ERRORS.roomInvalid, values };
  }

  return {
    ok: true,
    value: {
      courseId,
      sessionType,
      groupLabel: groupLabel || null,
      sessionsPerWeek,
      durationMinutes,
      teacherId: teacherId || null,
      preferredRoomId: preferredRoomId || null,
      values,
    },
  };
}

function mapRequirementError(error: PostgrestErrorLike | null): string {
  if (isForbiddenError(error)) {
    return REQUIREMENT_ERRORS.forbidden;
  }

  if (isUniqueViolation(error)) {
    return REQUIREMENT_ERRORS.duplicate;
  }

  return REQUIREMENT_ERRORS.generic;
}

export async function createRequirement(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const fields = readRequirementFields(formData);

  if (!fields.ok) {
    return errorState(fields.error, undefined, fields.values);
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return errorState(
      REQUIREMENT_ERRORS.sessionExpired,
      undefined,
      fields.value.values,
    );
  }

  const { data, error } = await auth.supabase
    .from("course_requirements")
    .insert({
      course_id: fields.value.courseId,
      session_type: fields.value.sessionType,
      group_label: fields.value.groupLabel,
      sessions_per_week: fields.value.sessionsPerWeek,
      duration_minutes: fields.value.durationMinutes,
      teacher_id: fields.value.teacherId,
      preferred_room_id: fields.value.preferredRoomId,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    logSupabaseError("createRequirement", error);
    return errorState(
      mapRequirementError(error),
      undefined,
      fields.value.values,
    );
  }

  if (!data) {
    return errorState(
      REQUIREMENT_ERRORS.forbidden,
      undefined,
      fields.value.values,
    );
  }

  revalidateRequirements();

  return successState(REQUIREMENTS.created);
}

export async function updateRequirement(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const requirementId = readText(formData, "requirementId").trim();
  const fields = readRequirementFields(formData);

  if (!isUuid(requirementId)) {
    return errorState(
      REQUIREMENT_ERRORS.forbidden,
      undefined,
      fields.ok ? fields.value.values : fields.values,
    );
  }

  if (!fields.ok) {
    return errorState(fields.error, undefined, fields.values);
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return errorState(
      REQUIREMENT_ERRORS.sessionExpired,
      undefined,
      fields.value.values,
    );
  }

  const { data, error } = await auth.supabase
    .from("course_requirements")
    .update({
      session_type: fields.value.sessionType,
      group_label: fields.value.groupLabel,
      sessions_per_week: fields.value.sessionsPerWeek,
      duration_minutes: fields.value.durationMinutes,
      teacher_id: fields.value.teacherId,
      preferred_room_id: fields.value.preferredRoomId,
    })
    .eq("id", requirementId)
    .select("id")
    .maybeSingle();

  if (error) {
    logSupabaseError("updateRequirement", error);
    return errorState(
      mapRequirementError(error),
      undefined,
      fields.value.values,
    );
  }

  if (!data) {
    return errorState(
      REQUIREMENT_ERRORS.forbidden,
      undefined,
      fields.value.values,
    );
  }

  revalidateRequirements();

  return successState(REQUIREMENTS.updated);
}

export async function deleteRequirementFormAction(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const requirementId = readText(formData, "requirementId").trim();

  if (!isUuid(requirementId)) {
    return errorState(REQUIREMENT_ERRORS.forbidden);
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return errorState(REQUIREMENT_ERRORS.sessionExpired);
  }

  const { data, error } = await auth.supabase
    .from("course_requirements")
    .delete()
    .eq("id", requirementId)
    .select("id")
    .maybeSingle();

  if (error) {
    logSupabaseError("deleteRequirement", error);
    return errorState(mapRequirementError(error));
  }

  if (!data) {
    return errorState(REQUIREMENT_ERRORS.forbidden);
  }

  revalidateRequirements();

  return successState(REQUIREMENTS.deleted);
}

type UnavailabilityValues = {
  weekday: string;
  startTime: string;
  endTime: string;
  note: string;
};

type UnavailabilityFields = {
  weekday: number;
  startTime: string;
  endTime: string;
  note: string | null;
  values: UnavailabilityValues;
};

function readUnavailabilityFields(
  formData: FormData,
):
  | { ok: true; value: UnavailabilityFields }
  | { ok: false; error: string; values: UnavailabilityValues } {
  const weekdayRaw = readText(formData, "weekday").trim();
  const startTime = readText(formData, "startTime").trim();
  const endTime = readText(formData, "endTime").trim();
  const note = readText(formData, "note").trim();
  const values: UnavailabilityValues = {
    weekday: weekdayRaw,
    startTime,
    endTime,
    note,
  };
  const weekday = Number(weekdayRaw);

  if (!isWeekday(weekday)) {
    return { ok: false, error: AVAILABILITY_ERRORS.weekdayInvalid, values };
  }

  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (startMinutes === null || endMinutes === null) {
    return { ok: false, error: AVAILABILITY_ERRORS.timeRequired, values };
  }

  if (endMinutes <= startMinutes) {
    return { ok: false, error: AVAILABILITY_ERRORS.timeOrder, values };
  }

  if (startMinutes % 15 !== 0 || endMinutes % 15 !== 0) {
    return { ok: false, error: AVAILABILITY_ERRORS.timeStep, values };
  }

  if (note.length > 200) {
    return { ok: false, error: AVAILABILITY_ERRORS.noteTooLong, values };
  }

  return {
    ok: true,
    value: {
      weekday,
      startTime,
      endTime,
      note: note || null,
      values,
    },
  };
}

function mapUnavailabilityError(error: PostgrestErrorLike | null): string {
  if (isForbiddenError(error)) {
    return AVAILABILITY_ERRORS.forbidden;
  }

  return AVAILABILITY_ERRORS.generic;
}

function revalidateAvailability() {
  revalidatePath("/disponibilites");
  revalidateTimetable();
}

export async function createUnavailability(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const fields = readUnavailabilityFields(formData);

  if (!fields.ok) {
    return errorState(fields.error, undefined, fields.values);
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return errorState(
      AVAILABILITY_ERRORS.sessionExpired,
      undefined,
      fields.value.values,
    );
  }

  const { data, error } = await auth.supabase
    .from("teacher_unavailability")
    .insert({
      teacher_id: auth.user.id,
      weekday: fields.value.weekday,
      start_time: fields.value.startTime,
      end_time: fields.value.endTime,
      note: fields.value.note,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    logSupabaseError("createUnavailability", error);
    return errorState(
      mapUnavailabilityError(error),
      undefined,
      fields.value.values,
    );
  }

  if (!data) {
    return errorState(
      AVAILABILITY_ERRORS.forbidden,
      undefined,
      fields.value.values,
    );
  }

  revalidateAvailability();

  return successState(AVAILABILITY.created);
}

export async function updateUnavailability(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const unavailabilityId = readText(formData, "unavailabilityId").trim();
  const fields = readUnavailabilityFields(formData);

  if (!isUuid(unavailabilityId)) {
    return errorState(
      AVAILABILITY_ERRORS.forbidden,
      undefined,
      fields.ok ? fields.value.values : fields.values,
    );
  }

  if (!fields.ok) {
    return errorState(fields.error, undefined, fields.values);
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return errorState(
      AVAILABILITY_ERRORS.sessionExpired,
      undefined,
      fields.value.values,
    );
  }

  const { data, error } = await auth.supabase
    .from("teacher_unavailability")
    .update({
      weekday: fields.value.weekday,
      start_time: fields.value.startTime,
      end_time: fields.value.endTime,
      note: fields.value.note,
    })
    .eq("id", unavailabilityId)
    .select("id")
    .maybeSingle();

  if (error) {
    logSupabaseError("updateUnavailability", error);
    return errorState(
      mapUnavailabilityError(error),
      undefined,
      fields.value.values,
    );
  }

  if (!data) {
    return errorState(
      AVAILABILITY_ERRORS.forbidden,
      undefined,
      fields.value.values,
    );
  }

  revalidateAvailability();

  return successState(AVAILABILITY.updated);
}

export async function deleteUnavailabilityFormAction(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const unavailabilityId = readText(formData, "unavailabilityId").trim();

  if (!isUuid(unavailabilityId)) {
    return errorState(AVAILABILITY_ERRORS.forbidden);
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return errorState(AVAILABILITY_ERRORS.sessionExpired);
  }

  const { data, error } = await auth.supabase
    .from("teacher_unavailability")
    .delete()
    .eq("id", unavailabilityId)
    .select("id")
    .maybeSingle();

  if (error) {
    logSupabaseError("deleteUnavailability", error);
    return errorState(mapUnavailabilityError(error));
  }

  if (!data) {
    return errorState(AVAILABILITY_ERRORS.forbidden);
  }

  revalidateAvailability();

  return successState(AVAILABILITY.deleted);
}

export async function setSessionLock(
  entryId: string,
  locked: boolean,
): Promise<TimetableActionResult> {
  const id = String(entryId ?? "").trim();

  if (!isUuid(id)) {
    return { ok: false, error: ERRORS.forbidden };
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return { ok: false, error: ERRORS.sessionExpired };
  }

  const { data, error } = await auth.supabase
    .from("timetable_entries")
    .update({ is_locked: locked })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    logSupabaseError("setSessionLock", error);
    return { ok: false, error: mapTimetableError(error) };
  }

  if (!data) {
    return { ok: false, error: ERRORS.forbidden };
  }

  revalidateTimetable();

  return { ok: true };
}

export async function lockAllDraftSessionsFormAction(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const classId = readText(formData, "classId").trim();
  const semester = Number(readText(formData, "semester"));

  if (!isUuid(classId) || (semester !== 1 && semester !== 2)) {
    return errorState(ERRORS.forbidden);
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return errorState(ERRORS.sessionExpired);
  }

  const { data, error } = await auth.supabase
    .from("timetable_entries")
    .update({ is_locked: true })
    .eq("class_id", classId)
    .eq("semester", semester)
    .eq("status", "draft")
    .select("id");

  if (error) {
    logSupabaseError("lockAllDraftSessions", error);
    return errorState(mapTimetableError(error));
  }

  revalidateTimetable();

  return successState(
    LABELS.lockAllDone.replace("{count}", String(data?.length ?? 0)),
  );
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

function mapGenerationError(error: PostgrestErrorLike | null): string {
  if (!error) {
    return GENERATION_ERRORS.generic;
  }

  const message = (error.message ?? "").toLowerCase();

  if (message.includes("generation:published")) {
    return GENERATION_ERRORS.published;
  }

  if (message.includes("invalid hours")) {
    return GENERATION_ERRORS.invalidHours;
  }

  if (message.includes("invalid break")) {
    return GENERATION_ERRORS.invalidBreak;
  }

  if (message.includes("invalid days")) {
    return GENERATION_ERRORS.invalidDays;
  }

  if (isForbiddenError(error)) {
    return GENERATION_ERRORS.forbidden;
  }

  if (
    error.code === "57014" ||
    message.includes("statement timeout") ||
    message.includes("timeout")
  ) {
    return GENERATION_ERRORS.timeout;
  }

  return GENERATION_ERRORS.generic;
}

export type GenerateTimetableInput = {
  classId: string;
  semester: number;
  days: number[];
  dayStart: string;
  dayEnd: string;
  breakStart: string;
  breakEnd: string;
};

export type GenerateTimetableActionResult =
  | { ok: true; result: TimetableGenerationResult }
  | { ok: false; error: string };

export async function generateTimetable(
  input: GenerateTimetableInput,
): Promise<GenerateTimetableActionResult> {
  const classId = String(input.classId ?? "").trim();
  const semester = Number(input.semester);
  const days = Array.from(
    new Set(
      (Array.isArray(input.days) ? input.days : []).map((day) =>
        Number(day),
      ),
    ),
  )
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 6)
    .sort((a, b) => a - b);
  const dayStart = String(input.dayStart ?? "").trim();
  const dayEnd = String(input.dayEnd ?? "").trim();
  const breakStart = String(input.breakStart ?? "").trim();
  const breakEnd = String(input.breakEnd ?? "").trim();

  if (!isUuid(classId) || (semester !== 1 && semester !== 2)) {
    return { ok: false, error: GENERATION_ERRORS.forbidden };
  }

  if (days.length === 0) {
    return { ok: false, error: GENERATION_ERRORS.invalidDays };
  }

  const startMinutes = parseTimeToMinutes(dayStart);
  const endMinutes = parseTimeToMinutes(dayEnd);

  if (
    startMinutes === null ||
    endMinutes === null ||
    endMinutes <= startMinutes ||
    endMinutes > 22 * 60
  ) {
    return { ok: false, error: GENERATION_ERRORS.invalidHours };
  }

  const hasBreakStart = breakStart.length > 0;
  const hasBreakEnd = breakEnd.length > 0;

  if (hasBreakStart !== hasBreakEnd) {
    return { ok: false, error: GENERATION_ERRORS.invalidBreak };
  }

  if (hasBreakStart) {
    const breakStartMinutes = parseTimeToMinutes(breakStart);
    const breakEndMinutes = parseTimeToMinutes(breakEnd);

    if (
      breakStartMinutes === null ||
      breakEndMinutes === null ||
      breakEndMinutes <= breakStartMinutes
    ) {
      return { ok: false, error: GENERATION_ERRORS.invalidBreak };
    }
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return { ok: false, error: GENERATION_ERRORS.sessionExpired };
  }

  const { data, error } = await auth.supabase.rpc("generate_timetable", {
    p_class: classId,
    p_semester: semester,
    p_day_start: dayStart,
    p_day_end: dayEnd,
    p_break_start: hasBreakStart ? breakStart : null,
    p_break_end: hasBreakEnd ? breakEnd : null,
    p_days: days,
  });

  if (error) {
    logSupabaseError("generateTimetable", error);
    return { ok: false, error: mapGenerationError(error) };
  }

  revalidateTimetable();

  return { ok: true, result: parseGenerationResult(data) };
}

export type UndoGenerationActionResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

export async function undoTimetableGeneration(
  generationId: string,
): Promise<UndoGenerationActionResult> {
  const id = String(generationId ?? "").trim();

  if (!isUuid(id)) {
    return { ok: false, error: GENERATION_ERRORS.forbidden };
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return { ok: false, error: GENERATION_ERRORS.sessionExpired };
  }

  const { data, error } = await auth.supabase.rpc("undo_generation", {
    p_generation: id,
  });

  if (error) {
    logSupabaseError("undoTimetableGeneration", error);

    if (isForbiddenError(error)) {
      return { ok: false, error: GENERATION_ERRORS.forbidden };
    }

    if (isNotFoundError(error)) {
      return { ok: false, error: GENERATION_ERRORS.generic };
    }

    return { ok: false, error: GENERATION_ERRORS.generic };
  }

  revalidateTimetable();

  return {
    ok: true,
    count: typeof data === "number" ? data : 0,
  };
}
