import type {
  DocumentCategory,
  DocumentStatus,
} from "@/lib/documents/types";
import { isUuid } from "@/lib/management/admin-validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DriveKind } from "./links";
import type { CourseDriveLink } from "./types";

type Relation<T> = T | T[] | null;

type DriveLinkRow = {
  id: string;
  course_id: string;
  kind: DriveKind;
  drive_id: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  status: DocumentStatus;
  added_by: string;
  created_at: string;
  courses: Relation<{ name: string | null }>;
};

type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

const DRIVE_LINK_COLUMNS = `id, course_id, kind, drive_id, title, description,
  category, status, added_by, created_at, courses(name)`;

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

function parseDriveLink(row: DriveLinkRow): CourseDriveLink {
  return {
    id: row.id,
    courseId: row.course_id,
    courseName: firstRelation(row.courses)?.name?.trim() ?? "",
    kind: row.kind,
    driveId: row.drive_id,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    addedBy: row.added_by,
    createdAt: row.created_at,
  };
}

export type CourseDriveLinksResult = {
  links: CourseDriveLink[];
  error: boolean;
};

export async function getCourseDriveLinks(
  courseId: string,
): Promise<CourseDriveLinksResult> {
  if (!isUuid(courseId)) {
    return { links: [], error: false };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("course_drive_links")
    .select(DRIVE_LINK_COLUMNS)
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  if (error) {
    logSupabaseError("getCourseDriveLinks", error);
    return { links: [], error: true };
  }

  return {
    links: ((data ?? []) as unknown as DriveLinkRow[]).map(parseDriveLink),
    error: false,
  };
}

export type VisibleDriveLinkResult = {
  link: CourseDriveLink | null;
  error: boolean;
};

export async function getVisibleDriveLink(
  linkId: string,
): Promise<VisibleDriveLinkResult> {
  if (!isUuid(linkId)) {
    return { link: null, error: false };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("course_drive_links")
    .select(DRIVE_LINK_COLUMNS)
    .eq("id", linkId)
    .maybeSingle();

  if (error) {
    logSupabaseError("getVisibleDriveLink", error);
    return { link: null, error: true };
  }

  return {
    link: data ? parseDriveLink(data as unknown as DriveLinkRow) : null,
    error: false,
  };
}
