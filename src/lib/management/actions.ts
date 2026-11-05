"use server";

import { revalidatePath } from "next/cache";
import { fr } from "@/content/fr";
import { readText } from "@/lib/auth/validation";
import type { ManagementActionState } from "@/lib/management/action-state";
import { isForbiddenError, isNotFoundError } from "@/lib/management/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const STUDENTS_PATH = "/gestion/etudiants";
const MESSAGES = fr.app.management.students.messages;

function errorState(message: string): ManagementActionState {
  return { status: "error", message };
}

function formatCount(template: string, count: number): string {
  return template.replace("{count}", String(count));
}

export async function setEnrollmentStatus(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const enrollmentId = readText(formData, "enrollmentId").trim();
  const status = readText(formData, "status");

  if (
    !enrollmentId ||
    (status !== "pending" && status !== "accepted" && status !== "rejected")
  ) {
    return errorState(MESSAGES.generic);
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return errorState(MESSAGES.sessionExpired);
  }

  const { error } = await supabase.rpc("director_set_enrollment", {
    p_enrollment: enrollmentId,
    p_status: status,
  });

  if (error) {
    if (isForbiddenError(error)) {
      return errorState(MESSAGES.forbidden);
    }

    if (isNotFoundError(error)) {
      return errorState(MESSAGES.notFound);
    }

    return errorState(MESSAGES.generic);
  }

  revalidatePath(STUDENTS_PATH);

  const successMessages = {
    pending: MESSAGES.reset,
    accepted: MESSAGES.accepted,
    rejected: MESSAGES.rejected,
  };

  return { status: "success", message: successMessages[status] };
}

export async function acceptAllEnrollments(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const classId = readText(formData, "classId").trim();

  if (!classId) {
    return errorState(MESSAGES.generic);
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return errorState(MESSAGES.sessionExpired);
  }

  const { data, error } = await supabase.rpc("director_accept_all", {
    p_class: classId,
  });

  if (error) {
    if (isForbiddenError(error)) {
      return errorState(MESSAGES.forbidden);
    }

    return errorState(MESSAGES.generic);
  }

  revalidatePath(STUDENTS_PATH);

  const acceptedCount =
    typeof data === "number" && Number.isFinite(data) ? data : 0;

  if (acceptedCount === 0) {
    return { status: "success", message: MESSAGES.acceptAllNone };
  }

  return {
    status: "success",
    message:
      acceptedCount === 1
        ? MESSAGES.acceptAllCountOne
        : formatCount(MESSAGES.acceptAllCountMany, acceptedCount),
  };
}
