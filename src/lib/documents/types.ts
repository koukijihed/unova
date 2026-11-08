export const DOCUMENT_CATEGORIES = [
  "cours",
  "td",
  "tp",
  "examen",
  "resume",
  "autre",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export type DocumentStatus = "pending" | "approved" | "rejected";

export type CourseDocument = {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  uploadedBy: string;
  createdAt: string;
};

export type DocumentFile = {
  id: string;
  courseId: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
};

export type DocumentCourseOption = {
  id: string;
  name: string;
};

export function isDocumentCategory(
  value: string,
): value is DocumentCategory {
  return (DOCUMENT_CATEGORIES as readonly string[]).includes(value);
}

export function isDocumentStatus(value: string): value is DocumentStatus {
  return value === "pending" || value === "approved" || value === "rejected";
}
