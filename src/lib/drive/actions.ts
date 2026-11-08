"use server";

import { revalidatePath } from "next/cache";
import { fr } from "@/content/fr";
import { readText } from "@/lib/auth/validation";
import { isDocumentCategory } from "@/lib/documents/types";
import {
  DOCUMENT_DESCRIPTION_MAX,
  DOCUMENT_TITLE_MAX,
  DOCUMENT_TITLE_MIN,
} from "@/lib/documents/validation";
import type { ManagementActionState } from "@/lib/management/action-state";
import { isUuid } from "@/lib/management/admin-validation";
import {
  isForbiddenError,
  isUniqueViolation,
  type PostgrestErrorLike,
} from "@/lib/management/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseDriveUrl } from "./links";

const LABELS = fr.app.driveLinks;
const ADD_ERRORS = LABELS.add.errors;
const MANAGEMENT = LABELS.management;

type SupabaseErrorLike = PostgrestErrorLike & {
  details?: string | null;
  hint?: string | null;
};

export type DriveLinkActionResult =
  | { ok: true }
  | { ok: false; error: string };

function errorState(message: string): ManagementActionState {
  return { status: "error", message };
}

function successState(message: string): ManagementActionState {
  return { status: "success", message };
}

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

function mapDriveError(error: PostgrestErrorLike | null): string {
  if (isUniqueViolation(error)) {
    return ADD_ERRORS.duplicate;
  }

  if (isForbiddenError(error)) {
    return ADD_ERRORS.forbidden;
  }

  return ADD_ERRORS.generic;
}

function validateTextFields(
  title: string,
  description: string,
  category: string,
): string | null {
  if (title.length < DOCUMENT_TITLE_MIN) {
    return ADD_ERRORS.titleTooShort;
  }

  if (title.length > DOCUMENT_TITLE_MAX) {
    return ADD_ERRORS.titleTooLong;
  }

  if (description.length > DOCUMENT_DESCRIPTION_MAX) {
    return ADD_ERRORS.descriptionTooLong;
  }

  if (!isDocumentCategory(category)) {
    return ADD_ERRORS.invalidCategory;
  }

  return null;
}

export type AddDriveLinkInput = {
  courseId: string;
  url: string;
  title: string;
  description: string;
  category: string;
};

export async function addDriveLink(
  input: AddDriveLinkInput,
): Promise<DriveLinkActionResult> {
  const courseId =
    typeof input.courseId === "string" ? input.courseId.trim() : "";
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  const category =
    typeof input.category === "string" ? input.category.trim() : "";
  const url = typeof input.url === "string" ? input.url : "";

  if (!isUuid(courseId)) {
    return { ok: false, error: ADD_ERRORS.forbidden };
  }

  const parsed = parseDriveUrl(url);

  if (!parsed.ok) {
    return { ok: false, error: ADD_ERRORS.invalidUrl };
  }

  const validationError = validateTextFields(title, description, category);

  if (validationError) {
    return { ok: false, error: validationError };
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return { ok: false, error: ADD_ERRORS.sessionExpired };
  }

  const { data: canUpload, error: permissionError } = await auth.supabase.rpc(
    "can_upload_to_course",
    { p_course: courseId },
  );

  if (permissionError) {
    logSupabaseError("addDriveLink.can_upload_to_course", permissionError);
    return {
      ok: false,
      error: isForbiddenError(permissionError)
        ? ADD_ERRORS.forbidden
        : ADD_ERRORS.generic,
    };
  }

  if (canUpload !== true) {
    return { ok: false, error: ADD_ERRORS.forbidden };
  }

  const { data, error } = await auth.supabase
    .from("course_drive_links")
    .insert({
      course_id: courseId,
      kind: parsed.link.kind,
      drive_id: parsed.link.driveId,
      title,
      description: description || null,
      category,
      status: "approved",
      added_by: auth.user.id,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    logSupabaseError("addDriveLink.insert", error);
    return { ok: false, error: mapDriveError(error) };
  }

  if (!data) {
    return { ok: false, error: ADD_ERRORS.forbidden };
  }

  revalidatePath(`/cours/${courseId}`);
  revalidatePath(`/liens/${data.id}`);

  return { ok: true };
}

export type UpdateDriveLinkInput = {
  id: string;
  title: string;
  description: string;
  category: string;
};

export async function updateDriveLink(
  input: UpdateDriveLinkInput,
): Promise<DriveLinkActionResult> {
  const id = typeof input.id === "string" ? input.id.trim() : "";
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  const category =
    typeof input.category === "string" ? input.category.trim() : "";

  if (!isUuid(id)) {
    return { ok: false, error: MANAGEMENT.errors.forbidden };
  }

  const validationError = validateTextFields(title, description, category);

  if (validationError) {
    return { ok: false, error: validationError };
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return { ok: false, error: MANAGEMENT.errors.sessionExpired };
  }

  const { data, error } = await auth.supabase
    .from("course_drive_links")
    .update({
      title,
      description: description || null,
      category,
    })
    .eq("id", id)
    .select("id, course_id")
    .maybeSingle();

  if (error) {
    logSupabaseError("updateDriveLink", error);
    return { ok: false, error: mapDriveError(error) };
  }

  if (!data) {
    return { ok: false, error: MANAGEMENT.errors.forbidden };
  }

  revalidatePath(`/cours/${data.course_id}`);
  revalidatePath(`/liens/${id}`);

  return { ok: true };
}

export type SetDriveLinkStatusInput = {
  id: string;
  status: string;
};

export async function setDriveLinkStatus(
  input: SetDriveLinkStatusInput,
): Promise<DriveLinkActionResult> {
  const id = typeof input.id === "string" ? input.id.trim() : "";
  const status = typeof input.status === "string" ? input.status.trim() : "";

  if (!isUuid(id) || (status !== "approved" && status !== "rejected")) {
    return { ok: false, error: MANAGEMENT.errors.forbidden };
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return { ok: false, error: MANAGEMENT.errors.sessionExpired };
  }

  const { data, error } = await auth.supabase
    .from("course_drive_links")
    .update({ status })
    .eq("id", id)
    .select("id, course_id")
    .maybeSingle();

  if (error) {
    logSupabaseError("setDriveLinkStatus", error);
    return { ok: false, error: mapDriveError(error) };
  }

  if (!data) {
    return { ok: false, error: MANAGEMENT.errors.forbidden };
  }

  revalidatePath(`/cours/${data.course_id}`);
  revalidatePath(`/liens/${id}`);

  return { ok: true };
}

export type DeleteDriveLinkInput = {
  id: string;
};

export async function deleteDriveLink(
  input: DeleteDriveLinkInput,
): Promise<DriveLinkActionResult> {
  const id = typeof input.id === "string" ? input.id.trim() : "";

  if (!isUuid(id)) {
    return { ok: false, error: MANAGEMENT.errors.forbidden };
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return { ok: false, error: MANAGEMENT.errors.sessionExpired };
  }

  const { data, error } = await auth.supabase
    .from("course_drive_links")
    .delete()
    .eq("id", id)
    .select("id, course_id")
    .maybeSingle();

  if (error) {
    logSupabaseError("deleteDriveLink", error);
    return { ok: false, error: mapDriveError(error) };
  }

  if (!data) {
    return { ok: false, error: MANAGEMENT.errors.forbidden };
  }

  revalidatePath(`/cours/${data.course_id}`);
  revalidatePath(`/liens/${id}`);

  return { ok: true };
}

export async function updateDriveLinkFormAction(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const result = await updateDriveLink({
    id: readText(formData, "driveLinkId").trim(),
    title: readText(formData, "title").trim(),
    description: readText(formData, "description").trim(),
    category: readText(formData, "category").trim(),
  });

  return result.ok
    ? successState(MANAGEMENT.updated)
    : errorState(result.error);
}

export async function setDriveLinkStatusFormAction(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const result = await setDriveLinkStatus({
    id: readText(formData, "driveLinkId").trim(),
    status: readText(formData, "status").trim(),
  });

  return result.ok
    ? successState(MANAGEMENT.statusUpdated)
    : errorState(result.error);
}

export async function deleteDriveLinkFormAction(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const result = await deleteDriveLink({
    id: readText(formData, "driveLinkId").trim(),
  });

  return result.ok
    ? successState(MANAGEMENT.deleted)
    : errorState(result.error);
}
