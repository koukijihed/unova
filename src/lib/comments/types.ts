export const COMMENT_KINDS = ["comment", "question"] as const;

export type CommentKind = (typeof COMMENT_KINDS)[number];

export const COMMENT_BADGES = [
  "student",
  "teacher",
  "director",
  "admin",
] as const;

export type CommentBadge = (typeof COMMENT_BADGES)[number];

export const COMMENT_BODY_MIN = 1;
export const COMMENT_BODY_MAX = 2000;

export type CommentContextType = "document" | "video" | "drive";

export type CourseComment = {
  id: string;
  courseId: string;
  parentId: string | null;
  documentId: string | null;
  videoId: string | null;
  driveLinkId: string | null;
  kind: CommentKind;
  body: string;
  authorId: string;
  authorBadge: CommentBadge;
  isResolved: boolean;
  hidden: boolean;
  createdAt: string;
  editedAt: string | null;
  contextType: CommentContextType | null;
  contextTitle: string | null;
};

export type CommentThread = {
  comment: CourseComment;
  replies: CourseComment[];
};

export type CommentAuthor = {
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatarPath: string | null;
  avatarUrl: string | null;
  initials: string;
};

export type CommentAuthorMap = Record<string, CommentAuthor>;

export type CommentContextOption = {
  type: CommentContextType;
  id: string;
  title: string;
};

export type RecentQuestion = {
  id: string;
  courseId: string;
  courseName: string;
  body: string;
  createdAt: string;
  isResolved: boolean;
  hidden: boolean;
  authorId: string;
  authorBadge: CommentBadge;
  replyCount: number;
};

export function isCommentKind(value: string): value is CommentKind {
  return (COMMENT_KINDS as readonly string[]).includes(value);
}

export function isCommentBadge(value: string): value is CommentBadge {
  return (COMMENT_BADGES as readonly string[]).includes(value);
}
