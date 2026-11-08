"use server";

import { revalidatePath } from "next/cache";
import { fr } from "@/content/fr";
import {
  EMAIL_PATTERN,
  normalizeEmail,
  readText,
} from "@/lib/auth/validation";
import type { ManagementActionState } from "@/lib/management/action-state";
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

const TEACHERS_PATH = "/gestion/enseignants";
const LABELS = fr.app.management.teachers;

type FoundUserRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
};

function mapError(error: PostgrestErrorLike | null): string {
  if (isForbiddenError(error)) {
    return LABELS.messages.forbidden;
  }

  return LABELS.messages.generic;
}

export async function addTeacherRole(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const email = normalizeEmail(readText(formData, "email"));
  const values = { email };

  if (!email) {
    return errorState(
      LABELS.errors.emailRequired,
      { email: LABELS.errors.emailRequired },
      values,
    );
  }

  if (!EMAIL_PATTERN.test(email)) {
    return errorState(
      LABELS.errors.emailInvalid,
      { email: LABELS.errors.emailInvalid },
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
    "admin_find_user",
    { p_email: email },
  );

  if (findError) {
    return errorState(mapError(findError), undefined, values);
  }

  const match = ((found ?? []) as FoundUserRow[])[0];

  if (!match) {
    return errorState(
      LABELS.messages.notFound,
      { email: LABELS.messages.notFound },
      values,
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("user_id", match.user_id)
    .eq("role_code", "teacher")
    .maybeSingle();

  if (existingError) {
    return errorState(mapError(existingError), undefined, values);
  }

  if (existing) {
    return errorState(LABELS.messages.alreadyTeacher, undefined, values);
  }

  const { error: insertError } = await supabase.from("user_roles").insert({
    user_id: match.user_id,
    role_code: "teacher",
    granted_by: user.id,
  });

  if (insertError) {
    return errorState(
      isUniqueViolation(insertError)
        ? LABELS.messages.alreadyTeacher
        : mapError(insertError),
      undefined,
      values,
    );
  }

  revalidatePath(TEACHERS_PATH);

  return successState(LABELS.messages.added);
}

export async function removeTeacherRole(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const userId = readText(formData, "userId").trim();

  if (!isUuid(userId)) {
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

  const { count, error: countError } = await supabase
    .from("course_teachers")
    .select("course_id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) {
    return errorState(mapError(countError));
  }

  if ((count ?? 0) > 0) {
    return errorState(LABELS.messages.assignedToCourses);
  }

  const { error: deleteError } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role_code", "teacher");

  if (deleteError) {
    return errorState(mapError(deleteError));
  }

  revalidatePath(TEACHERS_PATH);

  return successState(LABELS.messages.removed);
}
