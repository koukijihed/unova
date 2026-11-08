import { isUuid } from "@/lib/management/admin-validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  escapeLikePattern,
} from "./validation";
import type {
  CourseDocument,
  DocumentCategory,
  DocumentCourseOption,
  DocumentFile,
  DocumentStatus,
} from "./types";

type Relation<T> = T | T[] | null;

type DocumentRow = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  status: DocumentStatus;
  uploaded_by: string;
  created_at: string;
  courses: Relation<{ name: string | null }>;
};

type DocumentFileRow = {
  id: string;
  course_id: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
};

type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

const DOCUMENT_COLUMNS = `id, course_id, title, description, category,
  original_name, mime_type, size_bytes, status, uploaded_by, created_at,
  courses(name)`;

function firstRelation<T>(value: Relation<T>): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function logSupabaseError(queryName: string, error: SupabaseErrorLike) {
  console.error(`${queryName} failed`, {
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  });
}

function parseDocument(row: DocumentRow): CourseDocument {
  return {
    id: row.id,
    courseId: row.course_id,
    courseName: firstRelation(row.courses)?.name?.trim() ?? "",
    title: row.title,
    description: row.description,
    category: row.category,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    status: row.status,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

export type CourseDocumentsResult = {
  documents: CourseDocument[];
  error: boolean;
};

export async function getCourseDocuments(
  courseId: string,
): Promise<CourseDocumentsResult> {
  if (!isUuid(courseId)) {
    return { documents: [], error: false };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("documents")
    .select(DOCUMENT_COLUMNS)
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  if (error) {
    logSupabaseError("getCourseDocuments", error);
    return { documents: [], error: true };
  }

  return {
    documents: ((data ?? []) as unknown as DocumentRow[]).map(parseDocument),
    error: false,
  };
}

export type VisibleDocumentsOptions = {
  courseId: string | null;
  category: DocumentCategory | null;
  query: string;
  page: number;
  pageSize: number;
};

export type VisibleDocumentsResult = {
  documents: CourseDocument[];
  total: number;
  error: boolean;
};

export async function getVisibleDocuments(
  options: VisibleDocumentsOptions,
): Promise<VisibleDocumentsResult> {
  const supabase = await createServerSupabaseClient();
  const from = (options.page - 1) * options.pageSize;
  let request = supabase
    .from("documents")
    .select(DOCUMENT_COLUMNS, { count: "exact" });

  if (options.courseId && isUuid(options.courseId)) {
    request = request.eq("course_id", options.courseId);
  }

  if (options.category) {
    request = request.eq("category", options.category);
  }

  if (options.query) {
    request = request.ilike(
      "title",
      `%${escapeLikePattern(options.query)}%`,
    );
  }

  const { data, error, count } = await request
    .order("created_at", { ascending: false })
    .range(from, from + options.pageSize - 1);

  if (error) {
    logSupabaseError("getVisibleDocuments", error);
    return { documents: [], total: 0, error: true };
  }

  return {
    documents: ((data ?? []) as unknown as DocumentRow[]).map(parseDocument),
    total: count ?? 0,
    error: false,
  };
}

export type VisibleDocumentResult = {
  document: CourseDocument | null;
  error: boolean;
};

export async function getVisibleDocument(
  documentId: string,
): Promise<VisibleDocumentResult> {
  if (!isUuid(documentId)) {
    return { document: null, error: false };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("documents")
    .select(DOCUMENT_COLUMNS)
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    logSupabaseError("getVisibleDocument", error);
    return { document: null, error: true };
  }

  return {
    document: data ? parseDocument(data as unknown as DocumentRow) : null,
    error: false,
  };
}

export type DocumentFileResult = {
  document: DocumentFile | null;
  error: boolean;
};

export async function getDocumentFile(
  documentId: string,
): Promise<DocumentFileResult> {
  if (!isUuid(documentId)) {
    return { document: null, error: false };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id, course_id, storage_path, original_name, mime_type")
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    logSupabaseError("getDocumentFile", error);
    return { document: null, error: true };
  }

  if (!data) {
    return { document: null, error: false };
  }

  const row = data as unknown as DocumentFileRow;

  return {
    document: {
      id: row.id,
      courseId: row.course_id,
      storagePath: row.storage_path,
      originalName: row.original_name,
      mimeType: row.mime_type,
    },
    error: false,
  };
}

export type DocumentCourseOptionsResult = {
  courses: DocumentCourseOption[];
  error: boolean;
};

export async function getDocumentCourseOptions(): Promise<DocumentCourseOptionsResult> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    logSupabaseError("getDocumentCourseOptions", error);
    return { courses: [], error: true };
  }

  return {
    courses: ((data ?? []) as Array<{ id: string; name: string }>).map(
      (row) => ({ id: row.id, name: row.name }),
    ),
    error: false,
  };
}

export async function canUploadToCourse(courseId: string): Promise<boolean> {
  if (!isUuid(courseId)) {
    return false;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("can_upload_to_course", {
    p_course: courseId,
  });

  if (error) {
    logSupabaseError("canUploadToCourse", error);
    return false;
  }

  return data === true;
}
