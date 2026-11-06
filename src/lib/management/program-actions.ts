"use server";

import { revalidatePath } from "next/cache";
import { fr } from "@/content/fr";
import {
  EMAIL_PATTERN,
  normalizeEmail,
  readCheckbox,
  readText,
} from "@/lib/auth/validation";
import type { ManagementActionState } from "@/lib/management/action-state";
import {
  errorState,
  mapManagementError,
  successState,
} from "@/lib/management/action-helpers";
import { getAdminSupabaseClient } from "@/lib/management/admin-client";
import {
  CLASS_NAME_MAX_LENGTH,
  isUuid,
  PROGRAM_CODE_PATTERN,
  PROGRAM_NAME_MAX_LENGTH,
  SOURCE_NOTE_MAX_LENGTH,
  TRACK_NAME_MAX_LENGTH,
} from "@/lib/management/admin-validation";
import { isForeignKeyViolation } from "@/lib/management/errors";

const PROGRAMS_PATH = "/gestion/programmes";
const STUDENTS_PATH = "/gestion/etudiants";
const MESSAGES = fr.app.management.admin.messages;
const COMMON = fr.app.management.admin.common;
const PROGRAMS = fr.app.management.admin.programs;
const DETAIL = fr.app.management.admin.programDetail;
const TRACK = fr.app.management.admin.track;
const CLASS = fr.app.management.admin.class;
const DIRECTOR = fr.app.management.admin.director;

function programPath(programId: string): string {
  return `${PROGRAMS_PATH}/${programId}`;
}

type ProgramValues = {
  degreeTypeCode: string;
  code: string;
  name: string;
  departmentId: string;
  isCoConstructed: boolean;
  autoAccept: boolean;
  isActive: boolean;
  sourceNote: string;
};

function readProgramValues(formData: FormData): ProgramValues {
  return {
    degreeTypeCode: readText(formData, "degreeTypeCode").trim(),
    code: readText(formData, "code").trim().toUpperCase(),
    name: readText(formData, "name").trim(),
    departmentId: readText(formData, "departmentId").trim(),
    isCoConstructed: readCheckbox(formData, "isCoConstructed"),
    autoAccept: readCheckbox(formData, "autoAccept"),
    isActive: readCheckbox(formData, "isActive"),
    sourceNote: readText(formData, "sourceNote").trim(),
  };
}

function validateProgramValues(
  values: ProgramValues,
  includeCode: boolean,
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  if (!values.degreeTypeCode) {
    fieldErrors.degreeTypeCode = PROGRAMS.errors.degreeTypeRequired;
  }

  if (includeCode) {
    if (!values.code) {
      fieldErrors.code = PROGRAMS.errors.codeRequired;
    } else if (!PROGRAM_CODE_PATTERN.test(values.code)) {
      fieldErrors.code = PROGRAMS.errors.codeFormat;
    }
  }

  if (!values.name) {
    fieldErrors.name = PROGRAMS.errors.nameRequired;
  } else if (values.name.length > PROGRAM_NAME_MAX_LENGTH) {
    fieldErrors.name = PROGRAMS.errors.nameTooLong;
  }

  if (values.departmentId && !isUuid(values.departmentId)) {
    fieldErrors.departmentId = PROGRAMS.errors.departmentInvalid;
  }

  if (values.sourceNote.length > SOURCE_NOTE_MAX_LENGTH) {
    fieldErrors.sourceNote = PROGRAMS.errors.sourceNoteTooLong;
  }

  return fieldErrors;
}

export async function createProgram(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const values = readProgramValues(formData);
  const fieldErrors = validateProgramValues(values, true);

  if (Object.keys(fieldErrors).length > 0) {
    return errorState(COMMON.fixErrors, fieldErrors, values);
  }

  const client = await getAdminSupabaseClient();

  if (!client.ok) {
    return client.state;
  }

  const { error } = await client.supabase.from("programs").insert({
    degree_type_code: values.degreeTypeCode,
    code: values.code,
    name: values.name,
    department_id: values.departmentId || null,
    is_co_constructed: values.isCoConstructed,
    auto_accept: values.autoAccept,
    is_active: values.isActive,
    source_note: values.sourceNote || null,
  });

  if (error) {
    return errorState(mapManagementError(error), undefined, values);
  }

  revalidatePath(PROGRAMS_PATH);

  return successState(PROGRAMS.success.created);
}

export async function updateProgram(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const programId = readText(formData, "programId").trim();
  const values = readProgramValues(formData);
  const fieldErrors = validateProgramValues(values, false);

  if (!isUuid(programId)) {
    return errorState(MESSAGES.notFound);
  }

  if (Object.keys(fieldErrors).length > 0) {
    return errorState(COMMON.fixErrors, fieldErrors, values);
  }

  const client = await getAdminSupabaseClient();

  if (!client.ok) {
    return client.state;
  }

  const { data, error } = await client.supabase
    .from("programs")
    .update({
      degree_type_code: values.degreeTypeCode,
      name: values.name,
      department_id: values.departmentId || null,
      is_co_constructed: values.isCoConstructed,
      auto_accept: values.autoAccept,
      is_active: values.isActive,
      source_note: values.sourceNote || null,
    })
    .eq("id", programId)
    .select("id")
    .maybeSingle();

  if (error) {
    return errorState(mapManagementError(error), undefined, values);
  }

  if (!data) {
    return errorState(MESSAGES.notFound);
  }

  revalidatePath(PROGRAMS_PATH);
  revalidatePath(programPath(programId));

  return successState(PROGRAMS.success.updated, values);
}

export async function addTrack(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const programId = readText(formData, "programId").trim();
  const name = readText(formData, "name").trim();
  const values = { name };
  const fieldErrors: Record<string, string> = {};

  if (!isUuid(programId)) {
    return errorState(MESSAGES.notFound);
  }

  if (!name) {
    fieldErrors.name = TRACK.errors.nameRequired;
  } else if (name.length > TRACK_NAME_MAX_LENGTH) {
    fieldErrors.name = TRACK.errors.nameTooLong;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return errorState(COMMON.fixErrors, fieldErrors, values);
  }

  const client = await getAdminSupabaseClient();

  if (!client.ok) {
    return client.state;
  }

  const { error } = await client.supabase.from("program_tracks").insert({
    program_id: programId,
    name,
  });

  if (error) {
    return errorState(mapManagementError(error), undefined, values);
  }

  revalidatePath(programPath(programId));
  revalidatePath(PROGRAMS_PATH);

  return successState(TRACK.successAdded);
}

export async function deleteTrack(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const programId = readText(formData, "programId").trim();
  const trackId = readText(formData, "trackId").trim();

  if (!isUuid(programId) || !isUuid(trackId)) {
    return errorState(MESSAGES.notFound);
  }

  const client = await getAdminSupabaseClient();

  if (!client.ok) {
    return client.state;
  }

  const { error } = await client.supabase
    .from("program_tracks")
    .delete()
    .eq("id", trackId)
    .eq("program_id", programId);

  if (error) {
    return errorState(mapManagementError(error));
  }

  revalidatePath(programPath(programId));
  revalidatePath(PROGRAMS_PATH);

  return successState(TRACK.successDeleted);
}

export async function addClass(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const programId = readText(formData, "programId").trim();
  const academicYearId = readText(formData, "academicYearId").trim();
  const levelCode = readText(formData, "levelCode").trim();
  const name = readText(formData, "name").trim();
  const trackId = readText(formData, "trackId").trim();
  const values = { academicYearId, levelCode, name, trackId };
  const fieldErrors: Record<string, string> = {};

  if (!isUuid(programId)) {
    return errorState(MESSAGES.notFound);
  }

  if (!academicYearId) {
    fieldErrors.academicYearId = CLASS.errors.yearRequired;
  } else if (!isUuid(academicYearId)) {
    fieldErrors.academicYearId = MESSAGES.notFound;
  }

  if (!levelCode) {
    fieldErrors.levelCode = CLASS.errors.levelRequired;
  }

  if (!name) {
    fieldErrors.name = CLASS.errors.nameRequired;
  } else if (name.length > CLASS_NAME_MAX_LENGTH) {
    fieldErrors.name = CLASS.errors.nameTooLong;
  }

  if (trackId && !isUuid(trackId)) {
    fieldErrors.trackId = CLASS.errors.trackInvalid;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return errorState(COMMON.fixErrors, fieldErrors, values);
  }

  const client = await getAdminSupabaseClient();

  if (!client.ok) {
    return client.state;
  }

  if (trackId) {
    const { data: track, error: trackError } = await client.supabase
      .from("program_tracks")
      .select("id")
      .eq("id", trackId)
      .eq("program_id", programId)
      .maybeSingle();

    if (trackError) {
      return errorState(mapManagementError(trackError), undefined, values);
    }

    if (!track) {
      return errorState(
        COMMON.fixErrors,
        { trackId: CLASS.errors.trackInvalid },
        values,
      );
    }
  }

  const { error } = await client.supabase.from("classes").insert({
    program_id: programId,
    academic_year_id: academicYearId,
    level_code: levelCode,
    name,
    track_id: trackId || null,
  });

  if (error) {
    return errorState(mapManagementError(error), undefined, values);
  }

  revalidatePath(programPath(programId));
  revalidatePath(PROGRAMS_PATH);
  revalidatePath(STUDENTS_PATH);

  return successState(CLASS.successAdded);
}

export async function deleteClass(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const programId = readText(formData, "programId").trim();
  const classId = readText(formData, "classId").trim();

  if (!isUuid(programId) || !isUuid(classId)) {
    return errorState(MESSAGES.notFound);
  }

  const client = await getAdminSupabaseClient();

  if (!client.ok) {
    return client.state;
  }

  const { error } = await client.supabase
    .from("classes")
    .delete()
    .eq("id", classId)
    .eq("program_id", programId);

  if (error) {
    if (isForeignKeyViolation(error)) {
      return errorState(DETAIL.classDeleteHasStudents);
    }

    return errorState(mapManagementError(error));
  }

  revalidatePath(programPath(programId));
  revalidatePath(PROGRAMS_PATH);
  revalidatePath(STUDENTS_PATH);

  return successState(CLASS.successDeleted);
}

export async function addDirector(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const programId = readText(formData, "programId").trim();
  const email = normalizeEmail(readText(formData, "email"));
  const values = { email };
  const fieldErrors: Record<string, string> = {};

  if (!isUuid(programId)) {
    return errorState(MESSAGES.notFound);
  }

  if (!email) {
    fieldErrors.email = DIRECTOR.errors.emailRequired;
  } else if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = DIRECTOR.errors.emailInvalid;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return errorState(COMMON.fixErrors, fieldErrors, values);
  }

  const client = await getAdminSupabaseClient();

  if (!client.ok) {
    return client.state;
  }

  const { data, error } = await client.supabase.rpc("admin_find_user", {
    p_email: email,
  });

  if (error) {
    return errorState(mapManagementError(error), undefined, values);
  }

  const rows = (data ?? []) as {
    user_id: string;
    first_name: string | null;
    last_name: string | null;
  }[];
  const found = rows[0];

  if (!found) {
    return errorState(
      DIRECTOR.errors.notFound,
      { email: DIRECTOR.errors.notFound },
      values,
    );
  }

  const { error: insertError } = await client.supabase
    .from("program_directors")
    .insert({ program_id: programId, user_id: found.user_id });

  if (insertError) {
    return errorState(mapManagementError(insertError), undefined, values);
  }

  revalidatePath(programPath(programId));

  const fullName = `${found.first_name ?? ""} ${found.last_name ?? ""}`.trim();

  return successState(
    fullName
      ? DIRECTOR.successAdded.replace("{name}", fullName)
      : DIRECTOR.successAddedNoName,
  );
}

export async function removeDirector(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const programId = readText(formData, "programId").trim();
  const userId = readText(formData, "userId").trim();

  if (!isUuid(programId) || !isUuid(userId)) {
    return errorState(MESSAGES.notFound);
  }

  const client = await getAdminSupabaseClient();

  if (!client.ok) {
    return client.state;
  }

  const { error } = await client.supabase
    .from("program_directors")
    .delete()
    .eq("program_id", programId)
    .eq("user_id", userId);

  if (error) {
    return errorState(mapManagementError(error));
  }

  revalidatePath(programPath(programId));

  return successState(DIRECTOR.successRemoved);
}
