import { normalizeForSearch } from "@/lib/documents/validation";
import { isUuid } from "@/lib/management/admin-validation";
import { getSignedAvatarUrl } from "@/lib/profile/avatar";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  CommentAuthor,
  CommentAuthorMap,
  CommentBadge,
  CommentContextOption,
  CommentContextType,
  CommentKind,
  CommentThread,
  CourseComment,
  RecentQuestion,
} from "./types";

type Relation<T> = T | T[] | null;

type CommentRow = {
  id: string;
  course_id: string;
  parent_id: string | null;
  document_id: string | null;
  video_id: string | null;
  drive_link_id: string | null;
  kind: CommentKind;
  body: string;
  author_id: string;
  author_badge: CommentBadge;
  is_resolved: boolean;
  hidden: boolean;
  created_at: string;
  edited_at: string | null;
};

type QuestionRow = CommentRow & {
  courses: Relation<{ name: string | null }>;
};

type AuthorRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_path: string | null;
};

type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

const COMMENT_COLUMNS = `id, course_id, parent_id, document_id, video_id,
  drive_link_id, kind, body, author_id, author_badge, is_resolved, hidden,
  created_at, edited_at`;

const QUESTION_COLUMNS = `${COMMENT_COLUMNS}, courses(name)`;

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

function parseComment(row: CommentRow): CourseComment {
  return {
    id: row.id,
    courseId: row.course_id,
    parentId: row.parent_id,
    documentId: row.document_id,
    videoId: row.video_id,
    driveLinkId: row.drive_link_id,
    kind: row.kind,
    body: row.body,
    authorId: row.author_id,
    authorBadge: row.author_badge,
    isResolved: row.is_resolved,
    hidden: row.hidden,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    contextType: null,
    contextTitle: null,
  };
}

function contextOf(comment: CourseComment): {
  type: CommentContextType;
  id: string;
} | null {
  if (comment.documentId) {
    return { type: "document", id: comment.documentId };
  }

  if (comment.videoId) {
    return { type: "video", id: comment.videoId };
  }

  if (comment.driveLinkId) {
    return { type: "drive", id: comment.driveLinkId };
  }

  return null;
}

async function resolveContextTitles(comments: CourseComment[]) {
  const ids: Record<CommentContextType, Set<string>> = {
    document: new Set(),
    video: new Set(),
    drive: new Set(),
  };

  for (const comment of comments) {
    const context = contextOf(comment);

    if (context) {
      ids[context.type].add(context.id);
    }
  }

  const supabase = await createServerSupabaseClient();
  const titles: Record<CommentContextType, Map<string, string>> = {
    document: new Map(),
    video: new Map(),
    drive: new Map(),
  };

  const queries: Promise<void>[] = [];

  if (ids.document.size > 0) {
    queries.push(
      (async () => {
        const { data, error } = await supabase
          .from("documents")
          .select("id, title")
          .in("id", Array.from(ids.document));

        if (error) {
          logSupabaseError("resolveContextTitles.documents", error);
          return;
        }

        for (const row of (data ?? []) as Array<{
          id: string;
          title: string;
        }>) {
          titles.document.set(row.id, row.title);
        }
      })(),
    );
  }

  if (ids.video.size > 0) {
    queries.push(
      (async () => {
        const { data, error } = await supabase
          .from("course_videos")
          .select("id, title")
          .in("id", Array.from(ids.video));

        if (error) {
          logSupabaseError("resolveContextTitles.videos", error);
          return;
        }

        for (const row of (data ?? []) as Array<{
          id: string;
          title: string;
        }>) {
          titles.video.set(row.id, row.title);
        }
      })(),
    );
  }

  if (ids.drive.size > 0) {
    queries.push(
      (async () => {
        const { data, error } = await supabase
          .from("course_drive_links")
          .select("id, title")
          .in("id", Array.from(ids.drive));

        if (error) {
          logSupabaseError("resolveContextTitles.driveLinks", error);
          return;
        }

        for (const row of (data ?? []) as Array<{
          id: string;
          title: string;
        }>) {
          titles.drive.set(row.id, row.title);
        }
      })(),
    );
  }

  await Promise.all(queries);

  for (const comment of comments) {
    const context = contextOf(comment);

    if (!context) {
      continue;
    }

    comment.contextType = context.type;
    comment.contextTitle = titles[context.type].get(context.id) ?? null;
  }
}

function buildInitials(firstName: string, lastName: string): string {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  const initials = `${first}${last}`.toUpperCase();

  return initials || "?";
}

export async function getCommentAuthorsForCourses(
  courseIds: string[],
): Promise<CommentAuthorMap> {
  const unique = Array.from(
    new Set(courseIds.filter((courseId) => isUuid(courseId))),
  );
  const authors: CommentAuthorMap = {};

  if (unique.length === 0) {
    return authors;
  }

  const supabase = await createServerSupabaseClient();

  await Promise.all(
    unique.map(async (courseId) => {
      const { data, error } = await supabase.rpc("course_comment_authors", {
        p_course: courseId,
      });

      if (error) {
        logSupabaseError("course_comment_authors", error);
        return;
      }

      await Promise.all(
        ((data ?? []) as AuthorRow[]).map(async (row) => {
          if (authors[row.user_id]) {
            return;
          }

          const firstName = row.first_name?.trim() ?? "";
          const lastName = row.last_name?.trim() ?? "";
          const avatarUrl = await getSignedAvatarUrl(row.avatar_path);
          const author: CommentAuthor = {
            userId: row.user_id,
            firstName,
            lastName,
            fullName:
              `${firstName} ${lastName}`.trim() ||
              row.first_name?.trim() ||
              "",
            avatarPath: row.avatar_path,
            avatarUrl,
            initials: buildInitials(firstName, lastName),
          };

          authors[row.user_id] = author;
        }),
      );
    }),
  );

  return authors;
}

export type CourseCommentsOptions = {
  courseId: string;
  page: number;
  pageSize: number;
  documentId?: string | null;
  videoId?: string | null;
  driveLinkId?: string | null;
};

export type CourseCommentsResult = {
  threads: CommentThread[];
  total: number;
  error: boolean;
};

export async function getCourseComments(
  options: CourseCommentsOptions,
): Promise<CourseCommentsResult> {
  if (!isUuid(options.courseId)) {
    return { threads: [], total: 0, error: false };
  }

  const supabase = await createServerSupabaseClient();
  const from = (options.page - 1) * options.pageSize;
  let request = supabase
    .from("course_comments")
    .select(COMMENT_COLUMNS, { count: "exact" })
    .eq("course_id", options.courseId)
    .is("parent_id", null);

  if (options.documentId) {
    request = request.eq("document_id", options.documentId);
  }

  if (options.videoId) {
    request = request.eq("video_id", options.videoId);
  }

  if (options.driveLinkId) {
    request = request.eq("drive_link_id", options.driveLinkId);
  }

  const { data, error, count } = await request
    .order("created_at", { ascending: false })
    .range(from, from + options.pageSize - 1);

  if (error) {
    logSupabaseError("getCourseComments", error);
    return { threads: [], total: 0, error: true };
  }

  const topRows = (data ?? []) as unknown as CommentRow[];
  const topIds = topRows.map((row) => row.id);
  let replyRows: CommentRow[] = [];

  if (topIds.length > 0) {
    const { data: replies, error: repliesError } = await supabase
      .from("course_comments")
      .select(COMMENT_COLUMNS)
      .in("parent_id", topIds)
      .order("created_at", { ascending: true });

    if (repliesError) {
      logSupabaseError("getCourseComments.replies", repliesError);
      return { threads: [], total: 0, error: true };
    }

    replyRows = (replies ?? []) as unknown as CommentRow[];
  }

  const topComments = topRows.map(parseComment);
  const replyComments = replyRows.map(parseComment);
  await resolveContextTitles([...topComments, ...replyComments]);

  const repliesByParent = new Map<string, CourseComment[]>();

  for (const reply of replyComments) {
    const key = reply.parentId ?? "";
    const list = repliesByParent.get(key) ?? [];
    list.push(reply);
    repliesByParent.set(key, list);
  }

  const threads: CommentThread[] = topComments.map((comment) => ({
    comment,
    replies: repliesByParent.get(comment.id) ?? [],
  }));

  return { threads, total: count ?? 0, error: false };
}

export type RecentQuestionsOptions = {
  courseId: string | null;
  resolved: boolean | null;
  query: string;
  page: number;
  pageSize: number;
};

export type RecentQuestionsResult = {
  questions: RecentQuestion[];
  total: number;
  error: boolean;
};

function parseQuestion(
  row: QuestionRow,
  replyCount: number,
): RecentQuestion {
  return {
    id: row.id,
    courseId: row.course_id,
    courseName: firstRelation(row.courses)?.name?.trim() ?? "",
    body: row.body,
    createdAt: row.created_at,
    isResolved: row.is_resolved,
    hidden: row.hidden,
    authorId: row.author_id,
    authorBadge: row.author_badge,
    replyCount,
  };
}

async function countReplies(
  questionIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  if (questionIds.length === 0) {
    return counts;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("course_comments")
    .select("parent_id")
    .in("parent_id", questionIds);

  if (error) {
    logSupabaseError("countReplies", error);
    return counts;
  }

  for (const row of (data ?? []) as Array<{ parent_id: string | null }>) {
    const parentId = row.parent_id;

    if (parentId) {
      counts.set(parentId, (counts.get(parentId) ?? 0) + 1);
    }
  }

  return counts;
}

export async function getRecentQuestions(
  options: RecentQuestionsOptions,
): Promise<RecentQuestionsResult> {
  const supabase = await createServerSupabaseClient();
  const from = (options.page - 1) * options.pageSize;
  let request = supabase
    .from("course_comments")
    .select(QUESTION_COLUMNS, { count: "exact" })
    .eq("kind", "question")
    .is("parent_id", null);

  if (options.courseId && isUuid(options.courseId)) {
    request = request.eq("course_id", options.courseId);
  }

  if (options.resolved !== null) {
    request = request.eq("is_resolved", options.resolved);
  }

  if (options.query) {
    // Filtre insensible aux accents appliqué en mémoire.
    const { data, error } = await request
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      logSupabaseError("getRecentQuestions", error);
      return { questions: [], total: 0, error: true };
    }

    const normalizedQuery = normalizeForSearch(options.query);
    const filtered = ((data ?? []) as unknown as QuestionRow[]).filter((row) =>
      normalizeForSearch(row.body).includes(normalizedQuery),
    );
    const start = (options.page - 1) * options.pageSize;
    const pageRows = filtered.slice(start, start + options.pageSize);
    const counts = await countReplies(pageRows.map((row) => row.id));

    return {
      questions: pageRows.map((row) =>
        parseQuestion(row, counts.get(row.id) ?? 0),
      ),
      total: filtered.length,
      error: false,
    };
  }

  const { data, error, count } = await request
    .order("created_at", { ascending: false })
    .range(from, from + options.pageSize - 1);

  if (error) {
    logSupabaseError("getRecentQuestions", error);
    return { questions: [], total: 0, error: true };
  }

  const rows = (data ?? []) as unknown as QuestionRow[];
  const counts = await countReplies(rows.map((row) => row.id));

  return {
    questions: rows.map((row) => parseQuestion(row, counts.get(row.id) ?? 0)),
    total: count ?? 0,
    error: false,
  };
}

export async function getCommentContextOptions(
  courseId: string,
): Promise<CommentContextOption[]> {
  if (!isUuid(courseId)) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const [documents, videos, driveLinks] = await Promise.all([
    supabase
      .from("documents")
      .select("id, title")
      .eq("course_id", courseId)
      .order("title", { ascending: true }),
    supabase
      .from("course_videos")
      .select("id, title")
      .eq("course_id", courseId)
      .order("title", { ascending: true }),
    supabase
      .from("course_drive_links")
      .select("id, title")
      .eq("course_id", courseId)
      .order("title", { ascending: true }),
  ]);

  if (documents.error) {
    logSupabaseError("getCommentContextOptions.documents", documents.error);
  }

  if (videos.error) {
    logSupabaseError("getCommentContextOptions.videos", videos.error);
  }

  if (driveLinks.error) {
    logSupabaseError("getCommentContextOptions.driveLinks", driveLinks.error);
  }

  const options: CommentContextOption[] = [];

  for (const row of (documents.data ?? []) as Array<{
    id: string;
    title: string;
  }>) {
    options.push({ type: "document", id: row.id, title: row.title });
  }

  for (const row of (videos.data ?? []) as Array<{
    id: string;
    title: string;
  }>) {
    options.push({ type: "video", id: row.id, title: row.title });
  }

  for (const row of (driveLinks.data ?? []) as Array<{
    id: string;
    title: string;
  }>) {
    options.push({ type: "drive", id: row.id, title: row.title });
  }

  return options;
}
