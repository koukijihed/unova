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
import { isDocumentCategory } from "./types";
import {
  DOCUMENT_BUCKET,
  DOCUMENT_DESCRIPTION_MAX,
  DOCUMENT_TITLE_MAX,
  DOCUMENT_TITLE_MIN,
  MAX_DOCUMENT_BYTES,
  extensionMatchesMime,
  getExtension,
  isAllowedMimeType,
  isValidDocumentPath,
  preferredExtension,
  sanitizeOriginalName,
} from "./validation";

const LABELS = fr.app.documents;
const UPLOAD_ERRORS = LABELS.upload.errors;
const MANAGEMENT = LABELS.management;

type SupabaseErrorLike = PostgrestErrorLike & {
  details?: string | null;
  hint?: string | null;
};

type StorageErrorLike = {
  message?: string | null;
  statusCode?: string | number | null;
};

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

function logStorageError(queryName: string, error: StorageErrorLike | null) {
  console.error(`${queryName} failed`, {
    statusCode: error?.statusCode ?? null,
    message: error?.message ?? null,
  });
}

function normalizeContentType(value: string | undefined): string {
  return (value ?? "").split(";")[0].trim().toLowerCase();
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

function mapDataError(error: PostgrestErrorLike | null): string {
  return isForbiddenError(error) ? UPLOAD_ERRORS.forbidden : UPLOAD_ERRORS.generic;
}

export type PrepareUploadInput = {
  courseId: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export type PrepareUploadResult =
  | { ok: true; path: string; token: string }
  | { ok: false; error: string };

export async function prepareDocumentUpload(
  input: PrepareUploadInput,
): Promise<PrepareUploadResult> {
  const courseId = typeof input.courseId === "string" ? input.courseId.trim() : "";
  const fileName = sanitizeOriginalName(
    typeof input.fileName === "string" ? input.fileName : "",
  );
  const mimeType =
    typeof input.mimeType === "string" ? input.mimeType.trim().toLowerCase() : "";
  const size = typeof input.size === "number" ? input.size : Number.NaN;

  if (!isUuid(courseId)) {
    return { ok: false, error: UPLOAD_ERRORS.forbidden };
  }

  if (!isAllowedMimeType(mimeType)) {
    return { ok: false, error: UPLOAD_ERRORS.typeRefused };
  }

  const extension = getExtension(fileName);

  if (!extension || !extensionMatchesMime(extension, mimeType)) {
    return { ok: false, error: UPLOAD_ERRORS.typeRefused };
  }

  if (!Number.isInteger(size) || size <= 0) {
    return { ok: false, error: UPLOAD_ERRORS.typeRefused };
  }

  if (size > MAX_DOCUMENT_BYTES) {
    return { ok: false, error: UPLOAD_ERRORS.tooLarge };
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return { ok: false, error: UPLOAD_ERRORS.sessionExpired };
  }

  const { data: canUpload, error: permissionError } = await auth.supabase.rpc(
    "can_upload_to_course",
    { p_course: courseId },
  );

  if (permissionError) {
    logSupabaseError("prepareDocumentUpload.can_upload_to_course", permissionError);
    return {
      ok: false,
      error: isForbiddenError(permissionError)
        ? UPLOAD_ERRORS.forbidden
        : UPLOAD_ERRORS.generic,
    };
  }

  if (canUpload !== true) {
    return { ok: false, error: UPLOAD_ERRORS.forbidden };
  }

  const path = `${courseId}/${crypto.randomUUID()}.${preferredExtension(mimeType)}`;
  const { data, error } = await auth.supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    logStorageError("prepareDocumentUpload.createSignedUploadUrl", error);
    return { ok: false, error: UPLOAD_ERRORS.uploadFailed };
  }

  return { ok: true, path: data.path, token: data.token };
}

export type FinalizeDocumentInput = {
  courseId: string;
  path: string;
  title: string;
  description: string;
  category: string;
  originalName: string;
  mimeType: string;
  size: number;
};

export type FinalizeDocumentResult =
  | { ok: true }
  | { ok: false; error: string };

export async function finalizeDocument(
  input: FinalizeDocumentInput,
): Promise<FinalizeDocumentResult> {
  const courseId = typeof input.courseId === "string" ? input.courseId.trim() : "";
  const path = typeof input.path === "string" ? input.path.trim() : "";
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  const category =
    typeof input.category === "string" ? input.category.trim() : "";
  const originalName = sanitizeOriginalName(
    typeof input.originalName === "string" ? input.originalName : "",
  );
  const mimeType =
    typeof input.mimeType === "string" ? input.mimeType.trim().toLowerCase() : "";
  const size = typeof input.size === "number" ? input.size : Number.NaN;

  if (!isUuid(courseId)) {
    return { ok: false, error: UPLOAD_ERRORS.forbidden };
  }

  if (title.length < DOCUMENT_TITLE_MIN) {
    return { ok: false, error: UPLOAD_ERRORS.titleTooShort };
  }

  if (title.length > DOCUMENT_TITLE_MAX) {
    return { ok: false, error: UPLOAD_ERRORS.titleTooLong };
  }

  if (description.length > DOCUMENT_DESCRIPTION_MAX) {
    return { ok: false, error: UPLOAD_ERRORS.descriptionTooLong };
  }

  if (!isDocumentCategory(category)) {
    return { ok: false, error: UPLOAD_ERRORS.typeRefused };
  }

  if (!isAllowedMimeType(mimeType)) {
    return { ok: false, error: UPLOAD_ERRORS.typeRefused };
  }

  if (!originalName) {
    return { ok: false, error: UPLOAD_ERRORS.typeRefused };
  }

  const extension = getExtension(originalName);

  if (!extension || !extensionMatchesMime(extension, mimeType)) {
    return { ok: false, error: UPLOAD_ERRORS.typeRefused };
  }

  if (!Number.isInteger(size) || size <= 0) {
    return { ok: false, error: UPLOAD_ERRORS.typeRefused };
  }

  if (size > MAX_DOCUMENT_BYTES) {
    return { ok: false, error: UPLOAD_ERRORS.tooLarge };
  }

  if (!isValidDocumentPath(courseId, path, mimeType)) {
    return { ok: false, error: UPLOAD_ERRORS.forbidden };
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return { ok: false, error: UPLOAD_ERRORS.sessionExpired };
  }

  const { data: canUpload, error: permissionError } = await auth.supabase.rpc(
    "can_upload_to_course",
    { p_course: courseId },
  );

  if (permissionError) {
    logSupabaseError("finalizeDocument.can_upload_to_course", permissionError);
    return {
      ok: false,
      error: isForbiddenError(permissionError)
        ? UPLOAD_ERRORS.forbidden
        : UPLOAD_ERRORS.generic,
    };
  }

  if (canUpload !== true) {
    return { ok: false, error: UPLOAD_ERRORS.forbidden };
  }

  const { data: inserted, error: insertError } = await auth.supabase
    .from("documents")
    .insert({
      course_id: courseId,
      title,
      description: description || null,
      category,
      storage_path: path,
      original_name: originalName,
      mime_type: mimeType,
      size_bytes: size,
      status: "approved",
      uploaded_by: auth.user.id,
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    logSupabaseError("finalizeDocument.insert", insertError);
    return { ok: false, error: mapDataError(insertError) };
  }

  if (!inserted) {
    return { ok: false, error: UPLOAD_ERRORS.generic };
  }

  const { data: info, error: infoError } = await auth.supabase.storage
    .from(DOCUMENT_BUCKET)
    .info(path);

  const storedSize = info ? Number(info.size) : Number.NaN;
  const storedType = normalizeContentType(info?.contentType);
  const matches =
    !infoError &&
    info !== null &&
    storedSize === size &&
    storedType === mimeType;

  if (!matches) {
    logStorageError("finalizeDocument.info", infoError);

    if (!infoError && info) {
      const { error: removeError } = await auth.supabase.storage
        .from(DOCUMENT_BUCKET)
        .remove([path]);

      if (removeError) {
        logStorageError("finalizeDocument.cleanup.remove", removeError);
      }
    }

    const { error: deleteError } = await auth.supabase
      .from("documents")
      .delete()
      .eq("id", inserted.id);

    if (deleteError) {
      logSupabaseError("finalizeDocument.cleanup.delete", deleteError);
    }

    return { ok: false, error: UPLOAD_ERRORS.finalizeFailed };
  }

  revalidatePath(`/cours/${courseId}`);
  revalidatePath("/documents");
  revalidatePath(`/documents/${inserted.id}`);

  return { ok: true };
}

export async function updateDocument(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const documentId = readText(formData, "documentId").trim();
  const title = readText(formData, "title").trim();
  const description = readText(formData, "description").trim();
  const category = readText(formData, "category").trim();

  if (!isUuid(documentId)) {
    return errorState(MANAGEMENT.errors.forbidden);
  }

  if (title.length < DOCUMENT_TITLE_MIN) {
    return errorState(UPLOAD_ERRORS.titleTooShort);
  }

  if (title.length > DOCUMENT_TITLE_MAX) {
    return errorState(UPLOAD_ERRORS.titleTooLong);
  }

  if (description.length > DOCUMENT_DESCRIPTION_MAX) {
    return errorState(UPLOAD_ERRORS.descriptionTooLong);
  }

  if (!isDocumentCategory(category)) {
    return errorState(UPLOAD_ERRORS.typeRefused);
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return errorState(MANAGEMENT.errors.sessionExpired);
  }

  const { data, error } = await auth.supabase
    .from("documents")
    .update({
      title,
      description: description || null,
      category,
    })
    .eq("id", documentId)
    .select("id, course_id")
    .maybeSingle();

  if (error) {
    logSupabaseError("updateDocument", error);
    return errorState(mapDataError(error));
  }

  if (!data) {
    return errorState(MANAGEMENT.errors.forbidden);
  }

  revalidatePath(`/cours/${data.course_id}`);
  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);

  return successState(MANAGEMENT.updated);
}

export async function setDocumentStatus(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const documentId = readText(formData, "documentId").trim();
  const status = readText(formData, "status").trim();

  if (!isUuid(documentId) || (status !== "approved" && status !== "rejected")) {
    return errorState(MANAGEMENT.errors.forbidden);
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return errorState(MANAGEMENT.errors.sessionExpired);
  }

  const { data, error } = await auth.supabase
    .from("documents")
    .update({ status })
    .eq("id", documentId)
    .select("id, course_id")
    .maybeSingle();

  if (error) {
    logSupabaseError("setDocumentStatus", error);
    return errorState(mapDataError(error));
  }

  if (!data) {
    return errorState(MANAGEMENT.errors.forbidden);
  }

  revalidatePath(`/cours/${data.course_id}`);
  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);

  return successState(MANAGEMENT.statusUpdated);
}

export async function deleteDocument(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const documentId = readText(formData, "documentId").trim();

  if (!isUuid(documentId)) {
    return errorState(MANAGEMENT.errors.forbidden);
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return errorState(MANAGEMENT.errors.sessionExpired);
  }

  const { data, error } = await auth.supabase
    .from("documents")
    .select("id, course_id, storage_path")
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    logSupabaseError("deleteDocument.select", error);
    return errorState(mapDataError(error));
  }

  if (!data) {
    return errorState(MANAGEMENT.errors.forbidden);
  }

  const row = data as unknown as {
    id: string;
    course_id: string;
    storage_path: string;
  };

  // The Storage DELETE policy checks that the documents row still exists, so
  // the object must be removed before the row.
  const { error: removeError } = await auth.supabase.storage
    .from(DOCUMENT_BUCKET)
    .remove([row.storage_path]);

  if (removeError) {
    logStorageError("deleteDocument.remove", removeError);
    return errorState(MANAGEMENT.storageDeleteFailed);
  }

  const { error: deleteError } = await auth.supabase
    .from("documents")
    .delete()
    .eq("id", documentId);

  if (deleteError) {
    logSupabaseError("deleteDocument.delete", deleteError);
    return errorState(MANAGEMENT.errors.generic);
  }

  revalidatePath(`/cours/${row.course_id}`);
  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);

  return successState(MANAGEMENT.deleted);
}
