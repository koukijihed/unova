"use server";

import { revalidatePath } from "next/cache";
import { fr } from "@/content/fr";
import { readText } from "@/lib/auth/validation";
import type { ManagementActionState } from "@/lib/management/action-state";
import { isUuid } from "@/lib/management/admin-validation";
import {
  isForbiddenError,
  type PostgrestErrorLike,
} from "@/lib/management/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  COMMENT_BODY_MAX,
  COMMENT_BODY_MIN,
  isCommentKind,
  type CommentContextType,
} from "./types";

const LABELS = fr.app.comments;
const ERRORS = LABELS.errors;
const MESSAGES = LABELS.messages;

type SupabaseErrorLike = PostgrestErrorLike & {
  details?: string | null;
  hint?: string | null;
};

type CommentPaths = {
  courseId: string;
  videoId?: string | null;
  documentId?: string | null;
  driveLinkId?: string | null;
};

type ContextIds = {
  documentId: string | null;
  videoId: string | null;
  driveLinkId: string | null;
};

export type CommentActionResult =
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

function mapCommentError(error: PostgrestErrorLike | null): string {
  if (error?.code === "54000") {
    return ERRORS.tooMany;
  }

  if (isForbiddenError(error)) {
    return ERRORS.forbidden;
  }

  const message = error?.message?.toLowerCase() ?? "";

  if (
    message.includes("only ") ||
    message.includes("invalid parent") ||
    message.includes("not in this course") ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  ) {
    return ERRORS.forbidden;
  }

  return ERRORS.generic;
}

function emptyContext(): ContextIds {
  return { documentId: null, videoId: null, driveLinkId: null };
}

function parseContextValue(value: string): ContextIds | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return emptyContext();
  }

  const separator = trimmed.indexOf(":");

  if (separator < 0) {
    return null;
  }

  const type = trimmed.slice(0, separator) as CommentContextType;
  const id = trimmed.slice(separator + 1);

  if (!isUuid(id)) {
    return null;
  }

  if (type === "document") {
    return { ...emptyContext(), documentId: id };
  }

  if (type === "video") {
    return { ...emptyContext(), videoId: id };
  }

  if (type === "drive") {
    return { ...emptyContext(), driveLinkId: id };
  }

  return null;
}

function validateBody(body: string): string | null {
  if (body.length < COMMENT_BODY_MIN) {
    return ERRORS.bodyRequired;
  }

  if (body.length > COMMENT_BODY_MAX) {
    return ERRORS.bodyTooLong;
  }

  return null;
}

function revalidateCommentPaths(paths: CommentPaths) {
  revalidatePath(`/cours/${paths.courseId}`);
  revalidatePath("/questions-reponses");

  if (paths.videoId) {
    revalidatePath(`/videos/${paths.videoId}`);
    revalidatePath("/videos");
  }

  if (paths.documentId) {
    revalidatePath(`/documents/${paths.documentId}`);
  }

  if (paths.driveLinkId) {
    revalidatePath(`/liens/${paths.driveLinkId}`);
  }
}

type CommentRowPaths = {
  course_id: string;
  parent_id: string | null;
  video_id: string | null;
  document_id: string | null;
  drive_link_id: string | null;
};

async function resolvePaths(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  row: CommentRowPaths,
): Promise<CommentPaths> {
  const paths: CommentPaths = {
    courseId: row.course_id,
    videoId: row.video_id,
    documentId: row.document_id,
    driveLinkId: row.drive_link_id,
  };

  if (row.parent_id) {
    const { data: parent } = await supabase
      .from("course_comments")
      .select("video_id, document_id, drive_link_id")
      .eq("id", row.parent_id)
      .maybeSingle();

    if (parent) {
      paths.videoId = parent.video_id;
      paths.documentId = parent.document_id;
      paths.driveLinkId = parent.drive_link_id;
    }
  }

  return paths;
}

export type PostCommentInput = {
  courseId: string;
  kind: string;
  body: string;
  parentId?: string | null;
  context?: string | null;
};

export async function postComment(
  input: PostCommentInput,
): Promise<CommentActionResult> {
  const courseId =
    typeof input.courseId === "string" ? input.courseId.trim() : "";
  const kind = typeof input.kind === "string" ? input.kind.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  const parentId =
    typeof input.parentId === "string" && input.parentId.trim()
      ? input.parentId.trim()
      : null;

  if (!isUuid(courseId) || (parentId !== null && !isUuid(parentId))) {
    return { ok: false, error: ERRORS.forbidden };
  }

  if (!isCommentKind(kind)) {
    return { ok: false, error: ERRORS.invalidKind };
  }

  if (parentId !== null && kind !== "comment") {
    return { ok: false, error: ERRORS.invalidKind };
  }

  const bodyError = validateBody(body);

  if (bodyError) {
    return { ok: false, error: bodyError };
  }

  const context = parseContextValue(
    typeof input.context === "string" ? input.context : "",
  );

  if (!context) {
    return { ok: false, error: ERRORS.invalidContext };
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return { ok: false, error: ERRORS.sessionExpired };
  }

  const { data, error } = await auth.supabase
    .from("course_comments")
    .insert({
      course_id: courseId,
      parent_id: parentId,
      document_id: context.documentId,
      video_id: context.videoId,
      drive_link_id: context.driveLinkId,
      kind: parentId ? "comment" : kind,
      body,
      author_id: auth.user.id,
    })
    .select(
      "id, course_id, parent_id, video_id, document_id, drive_link_id",
    )
    .maybeSingle();

  if (error) {
    logSupabaseError("postComment.insert", error);
    return { ok: false, error: mapCommentError(error) };
  }

  if (!data) {
    return { ok: false, error: ERRORS.forbidden };
  }

  revalidateCommentPaths(await resolvePaths(auth.supabase, data));

  return { ok: true };
}

export type EditCommentInput = {
  id: string;
  body: string;
};

export async function editComment(
  input: EditCommentInput,
): Promise<CommentActionResult> {
  const id = typeof input.id === "string" ? input.id.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";

  if (!isUuid(id)) {
    return { ok: false, error: ERRORS.forbidden };
  }

  const bodyError = validateBody(body);

  if (bodyError) {
    return { ok: false, error: bodyError };
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return { ok: false, error: ERRORS.sessionExpired };
  }

  const { data, error } = await auth.supabase
    .from("course_comments")
    .update({ body })
    .eq("id", id)
    .select("course_id, parent_id, video_id, document_id, drive_link_id")
    .maybeSingle();

  if (error) {
    logSupabaseError("editComment", error);
    return { ok: false, error: mapCommentError(error) };
  }

  if (!data) {
    return { ok: false, error: ERRORS.forbidden };
  }

  revalidateCommentPaths(await resolvePaths(auth.supabase, data));

  return { ok: true };
}

export type SetCommentResolvedInput = {
  id: string;
  resolved: boolean;
};

export async function setCommentResolved(
  input: SetCommentResolvedInput,
): Promise<CommentActionResult> {
  const id = typeof input.id === "string" ? input.id.trim() : "";

  if (!isUuid(id)) {
    return { ok: false, error: ERRORS.forbidden };
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return { ok: false, error: ERRORS.sessionExpired };
  }

  const { data, error } = await auth.supabase
    .from("course_comments")
    .update({ is_resolved: input.resolved === true })
    .eq("id", id)
    .select("course_id, parent_id, video_id, document_id, drive_link_id")
    .maybeSingle();

  if (error) {
    logSupabaseError("setCommentResolved", error);
    return { ok: false, error: mapCommentError(error) };
  }

  if (!data) {
    return { ok: false, error: ERRORS.forbidden };
  }

  revalidateCommentPaths(await resolvePaths(auth.supabase, data));

  return { ok: true };
}

export type SetCommentHiddenInput = {
  id: string;
  hidden: boolean;
};

export async function setCommentHidden(
  input: SetCommentHiddenInput,
): Promise<CommentActionResult> {
  const id = typeof input.id === "string" ? input.id.trim() : "";

  if (!isUuid(id)) {
    return { ok: false, error: ERRORS.forbidden };
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return { ok: false, error: ERRORS.sessionExpired };
  }

  const { data, error } = await auth.supabase
    .from("course_comments")
    .update({ hidden: input.hidden === true })
    .eq("id", id)
    .select("course_id, parent_id, video_id, document_id, drive_link_id")
    .maybeSingle();

  if (error) {
    logSupabaseError("setCommentHidden", error);
    return { ok: false, error: mapCommentError(error) };
  }

  if (!data) {
    return { ok: false, error: ERRORS.forbidden };
  }

  revalidateCommentPaths(await resolvePaths(auth.supabase, data));

  return { ok: true };
}

export type DeleteCommentInput = {
  id: string;
};

export async function deleteComment(
  input: DeleteCommentInput,
): Promise<CommentActionResult> {
  const id = typeof input.id === "string" ? input.id.trim() : "";

  if (!isUuid(id)) {
    return { ok: false, error: ERRORS.forbidden };
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return { ok: false, error: ERRORS.sessionExpired };
  }

  const { data, error } = await auth.supabase
    .from("course_comments")
    .delete()
    .eq("id", id)
    .select("course_id, parent_id, video_id, document_id, drive_link_id")
    .maybeSingle();

  if (error) {
    logSupabaseError("deleteComment", error);
    return { ok: false, error: mapCommentError(error) };
  }

  if (!data) {
    return { ok: false, error: ERRORS.forbidden };
  }

  revalidateCommentPaths(await resolvePaths(auth.supabase, data));

  return { ok: true };
}

export async function postCommentFormAction(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const parentId = readText(formData, "parentId").trim();
  const result = await postComment({
    courseId: readText(formData, "courseId").trim(),
    kind: readText(formData, "kind").trim() || "comment",
    body: readText(formData, "body"),
    parentId: parentId || null,
    context: readText(formData, "context"),
  });

  if (!result.ok) {
    return errorState(result.error);
  }

  return successState(parentId ? MESSAGES.replied : MESSAGES.posted);
}

export async function editCommentFormAction(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const result = await editComment({
    id: readText(formData, "commentId").trim(),
    body: readText(formData, "body"),
  });

  return result.ok
    ? successState(MESSAGES.edited)
    : errorState(result.error);
}

export async function setCommentResolvedFormAction(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const result = await setCommentResolved({
    id: readText(formData, "commentId").trim(),
    resolved: readText(formData, "resolved").trim() === "true",
  });

  return result.ok
    ? successState(MESSAGES.resolved)
    : errorState(result.error);
}

export async function setCommentHiddenFormAction(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const result = await setCommentHidden({
    id: readText(formData, "commentId").trim(),
    hidden: readText(formData, "hidden").trim() === "true",
  });

  return result.ok
    ? successState(MESSAGES.hidden)
    : errorState(result.error);
}

export async function deleteCommentFormAction(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const result = await deleteComment({
    id: readText(formData, "commentId").trim(),
  });

  return result.ok
    ? successState(MESSAGES.deleted)
    : errorState(result.error);
}
