import { fr } from "@/content/fr";
import type { DocumentCategory } from "./types";

const FILE_TYPE_KEYS: Record<string, keyof typeof fr.app.documents.fileTypes> =
  {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      "pptx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "image/png": "png",
    "image/jpeg": "jpeg",
    "image/webp": "webp",
  };

export function categoryLabel(category: DocumentCategory): string {
  return fr.app.documents.categories[category];
}

export function fileTypeLabel(mimeType: string): string {
  const key = FILE_TYPE_KEYS[mimeType];

  return key
    ? fr.app.documents.fileTypes[key]
    : fr.app.documents.fileTypes.other;
}

export function formatBytes(bytes: number): string {
  const formatter = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  });

  if (bytes >= 1024 * 1024) {
    return `${formatter.format(bytes / (1024 * 1024))} Mo`;
  }

  return `${formatter.format(Math.max(1, Math.round(bytes / 1024)))} Ko`;
}

export function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fr.common.notAvailable;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
