import type {
  DocumentCategory,
  DocumentStatus,
} from "@/lib/documents/types";
import type { DriveKind } from "./links";

export type CourseDriveLink = {
  id: string;
  courseId: string;
  courseName: string;
  kind: DriveKind;
  driveId: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  status: DocumentStatus;
  addedBy: string;
  createdAt: string;
};
