import type { DocumentStatus } from "@/lib/documents/types";
import type { YoutubeKind } from "@/lib/youtube/links";

export const VIDEO_POSITION_MIN = 0;
export const VIDEO_POSITION_MAX = 10000;

export type CourseVideo = {
  id: string;
  courseId: string;
  courseName: string;
  kind: YoutubeKind;
  youtubeId: string;
  title: string;
  description: string | null;
  position: number;
  status: DocumentStatus;
  addedBy: string;
  createdAt: string;
};

export type VideoCourseOption = {
  id: string;
  name: string;
};
