"use server";

import { revalidatePath } from "next/cache";
import { fr } from "@/content/fr";
import { readText } from "@/lib/auth/validation";
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
import { parseYoutubeUrl } from "@/lib/youtube/links";
import { VIDEO_POSITION_MAX, VIDEO_POSITION_MIN } from "./types";

const LABELS = fr.app.videos;
const ADD_ERRORS = LABELS.add.errors;
const MANAGEMENT = LABELS.management;

type SupabaseErrorLike = PostgrestErrorLike & {
  details?: string | null;
  hint?: string | null;
};

export type VideoActionResult = { ok: true } | { ok: false; error: string };

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

function mapVideoError(error: PostgrestErrorLike | null): string {
  if (isUniqueViolation(error)) {
    return ADD_ERRORS.duplicate;
  }

  if (isForbiddenError(error)) {
    return ADD_ERRORS.forbidden;
  }

  return ADD_ERRORS.generic;
}

function validateTitleAndDescription(
  title: string,
  description: string,
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

  return null;
}

function parsePosition(value: string): number | null {
  if (!/^\d{1,5}$/.test(value)) {
    return null;
  }

  const position = Number.parseInt(value, 10);

  if (position < VIDEO_POSITION_MIN || position > VIDEO_POSITION_MAX) {
    return null;
  }

  return position;
}

export type AddVideoInput = {
  courseId: string;
  url: string;
  title: string;
  description: string;
};

export async function addVideo(
  input: AddVideoInput,
): Promise<VideoActionResult> {
  const courseId =
    typeof input.courseId === "string" ? input.courseId.trim() : "";
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  const url = typeof input.url === "string" ? input.url : "";

  if (!isUuid(courseId)) {
    return { ok: false, error: ADD_ERRORS.forbidden };
  }

  const parsed = parseYoutubeUrl(url);

  if (!parsed.ok) {
    return { ok: false, error: ADD_ERRORS.invalidUrl };
  }

  const validationError = validateTitleAndDescription(title, description);

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
    logSupabaseError("addVideo.can_upload_to_course", permissionError);
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
    .from("course_videos")
    .insert({
      course_id: courseId,
      kind: parsed.link.kind,
      youtube_id: parsed.link.youtubeId,
      title,
      description: description || null,
      position: 0,
      status: "approved",
      added_by: auth.user.id,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    logSupabaseError("addVideo.insert", error);
    return { ok: false, error: mapVideoError(error) };
  }

  if (!data) {
    return { ok: false, error: ADD_ERRORS.forbidden };
  }

  revalidatePath(`/cours/${courseId}`);
  revalidatePath(`/videos/${data.id}`);
  revalidatePath("/videos");

  return { ok: true };
}

export type UpdateVideoInput = {
  id: string;
  title: string;
  description: string;
  position: string;
};

export async function updateVideo(
  input: UpdateVideoInput,
): Promise<VideoActionResult> {
  const id = typeof input.id === "string" ? input.id.trim() : "";
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  const position = parsePosition(
    typeof input.position === "string" ? input.position.trim() : "",
  );

  if (!isUuid(id)) {
    return { ok: false, error: MANAGEMENT.errors.forbidden };
  }

  const validationError = validateTitleAndDescription(title, description);

  if (validationError) {
    return { ok: false, error: validationError };
  }

  if (position === null) {
    return { ok: false, error: ADD_ERRORS.invalidPosition };
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return { ok: false, error: MANAGEMENT.errors.sessionExpired };
  }

  const { data, error } = await auth.supabase
    .from("course_videos")
    .update({ title, description: description || null, position })
    .eq("id", id)
    .select("id, course_id")
    .maybeSingle();

  if (error) {
    logSupabaseError("updateVideo", error);
    return { ok: false, error: mapVideoError(error) };
  }

  if (!data) {
    return { ok: false, error: MANAGEMENT.errors.forbidden };
  }

  revalidatePath(`/cours/${data.course_id}`);
  revalidatePath(`/videos/${id}`);
  revalidatePath("/videos");

  return { ok: true };
}

export type SetVideoStatusInput = {
  id: string;
  status: string;
};

export async function setVideoStatus(
  input: SetVideoStatusInput,
): Promise<VideoActionResult> {
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
    .from("course_videos")
    .update({ status })
    .eq("id", id)
    .select("id, course_id")
    .maybeSingle();

  if (error) {
    logSupabaseError("setVideoStatus", error);
    return { ok: false, error: mapVideoError(error) };
  }

  if (!data) {
    return { ok: false, error: MANAGEMENT.errors.forbidden };
  }

  revalidatePath(`/cours/${data.course_id}`);
  revalidatePath(`/videos/${id}`);
  revalidatePath("/videos");

  return { ok: true };
}

export type DeleteVideoInput = { id: string };

export async function deleteVideo(
  input: DeleteVideoInput,
): Promise<VideoActionResult> {
  const id = typeof input.id === "string" ? input.id.trim() : "";

  if (!isUuid(id)) {
    return { ok: false, error: MANAGEMENT.errors.forbidden };
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return { ok: false, error: MANAGEMENT.errors.sessionExpired };
  }

  const { data, error } = await auth.supabase
    .from("course_videos")
    .delete()
    .eq("id", id)
    .select("id, course_id")
    .maybeSingle();

  if (error) {
    logSupabaseError("deleteVideo", error);
    return { ok: false, error: mapVideoError(error) };
  }

  if (!data) {
    return { ok: false, error: MANAGEMENT.errors.forbidden };
  }

  revalidatePath(`/cours/${data.course_id}`);
  revalidatePath(`/videos/${id}`);
  revalidatePath("/videos");

  return { ok: true };
}

export async function updateVideoFormAction(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const result = await updateVideo({
    id: readText(formData, "videoId").trim(),
    title: readText(formData, "title").trim(),
    description: readText(formData, "description").trim(),
    position: readText(formData, "position").trim(),
  });

  return result.ok
    ? successState(MANAGEMENT.updated)
    : errorState(result.error);
}

export async function setVideoStatusFormAction(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const result = await setVideoStatus({
    id: readText(formData, "videoId").trim(),
    status: readText(formData, "status").trim(),
  });

  return result.ok
    ? successState(MANAGEMENT.statusUpdated)
    : errorState(result.error);
}

export async function deleteVideoFormAction(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const result = await deleteVideo({
    id: readText(formData, "videoId").trim(),
  });

  return result.ok
    ? successState(MANAGEMENT.deleted)
    : errorState(result.error);
}
