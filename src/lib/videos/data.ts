import type { DocumentStatus } from "@/lib/documents/types";
import { normalizeForSearch } from "@/lib/documents/validation";
import { isUuid } from "@/lib/management/admin-validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { YoutubeKind } from "@/lib/youtube/links";
import type { CourseVideo } from "./types";

type Relation<T> = T | T[] | null;

type VideoRow = {
  id: string;
  course_id: string;
  kind: YoutubeKind;
  youtube_id: string;
  title: string;
  description: string | null;
  position: number;
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

const VIDEO_COLUMNS = `id, course_id, kind, youtube_id, title, description,
  position, status, added_by, created_at, courses(name)`;

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

function parseVideo(row: VideoRow): CourseVideo {
  return {
    id: row.id,
    courseId: row.course_id,
    courseName: firstRelation(row.courses)?.name?.trim() ?? "",
    kind: row.kind,
    youtubeId: row.youtube_id,
    title: row.title,
    description: row.description,
    position: Number(row.position),
    status: row.status,
    addedBy: row.added_by,
    createdAt: row.created_at,
  };
}

export type CourseVideosResult = {
  videos: CourseVideo[];
  error: boolean;
};

export async function getCourseVideos(
  courseId: string,
): Promise<CourseVideosResult> {
  if (!isUuid(courseId)) {
    return { videos: [], error: false };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("course_videos")
    .select(VIDEO_COLUMNS)
    .eq("course_id", courseId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    logSupabaseError("getCourseVideos", error);
    return { videos: [], error: true };
  }

  return {
    videos: ((data ?? []) as unknown as VideoRow[]).map(parseVideo),
    error: false,
  };
}

export type VisibleVideosOptions = {
  courseId: string | null;
  query: string;
  page: number;
  pageSize: number;
};

export type VisibleVideosResult = {
  videos: CourseVideo[];
  total: number;
  error: boolean;
};

export async function getVisibleVideos(
  options: VisibleVideosOptions,
): Promise<VisibleVideosResult> {
  const supabase = await createServerSupabaseClient();
  const from = (options.page - 1) * options.pageSize;
  let request = supabase
    .from("course_videos")
    .select(VIDEO_COLUMNS, { count: "exact" });

  if (options.courseId && isUuid(options.courseId)) {
    request = request.eq("course_id", options.courseId);
  }

  if (options.query) {
    // Filtre insensible aux accents appliqué en mémoire : Postgres `ilike`
    // ne compare pas « vidéo » et « video ».
    const { data, error } = await request
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      logSupabaseError("getVisibleVideos", error);
      return { videos: [], total: 0, error: true };
    }

    const normalizedQuery = normalizeForSearch(options.query);
    const filtered = ((data ?? []) as unknown as VideoRow[]).filter((row) =>
      normalizeForSearch(row.title).includes(normalizedQuery),
    );
    const start = (options.page - 1) * options.pageSize;

    return {
      videos: filtered.slice(start, start + options.pageSize).map(parseVideo),
      total: filtered.length,
      error: false,
    };
  }

  const { data, error, count } = await request
    .order("created_at", { ascending: false })
    .range(from, from + options.pageSize - 1);

  if (error) {
    logSupabaseError("getVisibleVideos", error);
    return { videos: [], total: 0, error: true };
  }

  return {
    videos: ((data ?? []) as unknown as VideoRow[]).map(parseVideo),
    total: count ?? 0,
    error: false,
  };
}

export type VisibleVideoResult = {
  video: CourseVideo | null;
  error: boolean;
};

export async function getVisibleVideo(
  videoId: string,
): Promise<VisibleVideoResult> {
  if (!isUuid(videoId)) {
    return { video: null, error: false };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("course_videos")
    .select(VIDEO_COLUMNS)
    .eq("id", videoId)
    .maybeSingle();

  if (error) {
    logSupabaseError("getVisibleVideo", error);
    return { video: null, error: true };
  }

  return {
    video: data ? parseVideo(data as unknown as VideoRow) : null,
    error: false,
  };
}
