"use server";

import { revalidatePath } from "next/cache";
import { fr } from "@/content/fr";
import {
  EMAIL_PATTERN,
  normalizeEmail,
  readText,
} from "@/lib/auth/validation";
import type {
  ManagementActionState,
  ManagementFieldErrors,
  ManagementFormValues,
} from "@/lib/management/action-state";
import {
  errorState,
  successState,
} from "@/lib/management/action-helpers";
import { isUuid } from "@/lib/management/admin-validation";
import {
  isForbiddenError,
  isUniqueViolation,
  type PostgrestErrorLike,
} from "@/lib/management/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const MANAGEMENT_PATH = "/gestion/cours";
const COURSES_PATH = "/cours";
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 2000;
const SEMESTER_MIN = 1;
const SEMESTER_MAX = 10;

const LABELS = fr.app.management.courses;
const TEACHER_LABELS = LABELS.teachers;

type FoundTeacherRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
};

function mapError(error: PostgrestErrorLike | null): string {
  if (isForbiddenError(error)) {
    return LABELS.messages.forbidden;
  }

  if (isUniqueViolation(error)) {
    return LABELS.messages.unique;
  }

  return LABELS.messages.generic;
}

type CourseFields = {
  name: string;
  semester: number | null;
  description: string;
  values: ManagementFormValues;
  fieldErrors: ManagementFieldErrors;
};

function readCourseFields(formData: FormData): CourseFields {
  const name = readText(formData, "name").trim();
  const semesterRaw = readText(formData, "semester").trim();
  const description = readText(formData, "description").trim();
  const fieldErrors: ManagementFieldErrors = {};

  if (!name) {
    fieldErrors.name = LABELS.errors.nameRequired;
  } else if (name.length < NAME_MIN_LENGTH) {
    fieldErrors.name = LABELS.errors.nameTooShort;
  } else if (name.length > NAME_MAX_LENGTH) {
    fieldErrors.name = LABELS.errors.nameTooLong;
  }

  let semester: number | null = null;

  if (semesterRaw) {
    const parsed = Number(semesterRaw);

    if (
      !Number.isInteger(parsed) ||
      parsed < SEMESTER_MIN ||
      parsed > SEMESTER_MAX
    ) {
      fieldErrors.semester = LABELS.errors.semesterInvalid;
    } else {
      semester = parsed;
    }
  }

  if (description.length > DESCRIPTION_MAX_LENGTH) {
    fieldErrors.description = LABELS.errors.descriptionTooLong;
  }

  return {
    name,
    semester,
    description,
    values: { name, semester: semesterRaw, description },
    fieldErrors,
  };
}

export async function createCourse(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const classId = readText(formData, "classId").trim();
  const fields = readCourseFields(formData);

  if (!isUuid(classId)) {
    return errorState(LABELS.messages.forbidden, undefined, fields.values);
  }

  if (Object.keys(fields.fieldErrors).length > 0) {
    return errorState(
      fr.app.management.admin.common.fixErrors,
      fields.fieldErrors,
      fields.values,
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return errorState(LABELS.messages.sessionExpired, undefined, fields.values);
  }

  const { error } = await supabase.from("courses").insert({
    class_id: classId,
    name: fields.name,
    semester: fields.semester,
    description: fields.description || null,
  });

  if (error) {
    return errorState(mapError(error), undefined, fields.values);
  }

  revalidatePath(MANAGEMENT_PATH);
  revalidatePath(COURSES_PATH);

  return successState(LABELS.messages.created);
}

export async function updateCourse(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const courseId = readText(formData, "courseId").trim();
  const fields = readCourseFields(formData);

  if (!isUuid(courseId)) {
    return errorState(LABELS.messages.forbidden, undefined, fields.values);
  }

  if (Object.keys(fields.fieldErrors).length > 0) {
    return errorState(
      fr.app.management.admin.common.fixErrors,
      fields.fieldErrors,
      fields.values,
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return errorState(LABELS.messages.sessionExpired, undefined, fields.values);
  }

  const { data, error } = await supabase
    .from("courses")
    .update({
      name: fields.name,
      semester: fields.semester,
      description: fields.description || null,
    })
    .eq("id", courseId)
    .select("id")
    .maybeSingle();

  if (error) {
    return errorState(mapError(error), undefined, fields.values);
  }

  if (!data) {
    return errorState(
      LABELS.messages.forbidden,
      undefined,
      fields.values,
    );
  }

  revalidatePath(MANAGEMENT_PATH);
  revalidatePath(COURSES_PATH);

  return successState(LABELS.messages.updated);
}

export async function setCourseActive(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const courseId = readText(formData, "courseId").trim();
  const active = readText(formData, "active") === "true";

  if (!isUuid(courseId)) {
    return errorState(LABELS.messages.forbidden);
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return errorState(LABELS.messages.sessionExpired);
  }

  const { data, error } = await supabase
    .from("courses")
    .update({ is_active: active })
    .eq("id", courseId)
    .select("id")
    .maybeSingle();

  if (error) {
    return errorState(mapError(error));
  }

  if (!data) {
    return errorState(LABELS.messages.forbidden);
  }

  revalidatePath(MANAGEMENT_PATH);
  revalidatePath(COURSES_PATH);

  return successState(
    active ? LABELS.messages.activated : LABELS.messages.deactivated,
  );
}

export async function addCourseTeacher(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const courseId = readText(formData, "courseId").trim();
  const email = normalizeEmail(readText(formData, "email"));
  const values = { email };

  if (!isUuid(courseId)) {
    return errorState(LABELS.messages.forbidden, undefined, values);
  }

  if (!email) {
    return errorState(
      TEACHER_LABELS.errors.emailRequired,
      { email: TEACHER_LABELS.errors.emailRequired },
      values,
    );
  }

  if (!EMAIL_PATTERN.test(email)) {
    return errorState(
      TEACHER_LABELS.errors.emailInvalid,
      { email: TEACHER_LABELS.errors.emailInvalid },
      values,
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return errorState(LABELS.messages.sessionExpired, undefined, values);
  }

  const { data: found, error: findError } = await supabase.rpc(
    "find_teacher_by_email",
    { p_email: email },
  );

  if (findError) {
    return errorState(mapError(findError), undefined, values);
  }

  const match = ((found ?? []) as FoundTeacherRow[])[0];

  if (!match) {
    return errorState(
      TEACHER_LABELS.messages.notFound,
      { email: TEACHER_LABELS.messages.notFound },
      values,
    );
  }

  const { error: insertError } = await supabase
    .from("course_teachers")
    .insert({ course_id: courseId, user_id: match.user_id });

  if (insertError) {
    return errorState(
      isUniqueViolation(insertError)
        ? TEACHER_LABELS.messages.alreadyAssigned
        : mapError(insertError),
      undefined,
      values,
    );
  }

  revalidatePath(MANAGEMENT_PATH);
  revalidatePath(COURSES_PATH);

  return successState(TEACHER_LABELS.messages.added);
}

export async function removeCourseTeacher(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const courseId = readText(formData, "courseId").trim();
  const userId = readText(formData, "userId").trim();

  if (!isUuid(courseId) || !isUuid(userId)) {
    return errorState(LABELS.messages.generic);
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return errorState(LABELS.messages.sessionExpired);
  }

  const { error } = await supabase
    .from("course_teachers")
    .delete()
    .eq("course_id", courseId)
    .eq("user_id", userId);

  if (error) {
    return errorState(mapError(error));
  }

  revalidatePath(MANAGEMENT_PATH);
  revalidatePath(COURSES_PATH);

  return successState(TEACHER_LABELS.messages.removed);
}
