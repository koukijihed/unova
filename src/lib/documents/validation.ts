export const DOCUMENT_BUCKET = "documents";
export const MAX_DOCUMENT_BYTES = 52428800;
export const DOCUMENT_TITLE_MIN = 2;
export const DOCUMENT_TITLE_MAX = 200;
export const DOCUMENT_DESCRIPTION_MAX = 2000;

const MIME_EXTENSIONS: Record<string, readonly string[]> = {
  "application/pdf": ["pdf"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    "docx",
  ],
  "application/vnd.ms-powerpoint": ["ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
    "pptx",
  ],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    "xlsx",
  ],
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
};

export const ALLOWED_MIME_TYPES = Object.keys(MIME_EXTENSIONS);

const ALLOWED_EXTENSIONS = Array.from(
  new Set(Object.values(MIME_EXTENSIONS).flat()),
);

export function isAllowedMimeType(value: string): boolean {
  return Object.prototype.hasOwnProperty.call(MIME_EXTENSIONS, value);
}

export function getExtension(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");

  if (dot < 0 || dot === base.length - 1) {
    return "";
  }

  return base.slice(dot + 1).toLowerCase();
}

export function getMimeTypeForExtension(extension: string): string | null {
  const normalized = extension.toLowerCase();

  for (const [mimeType, extensions] of Object.entries(MIME_EXTENSIONS)) {
    if (extensions.includes(normalized)) {
      return mimeType;
    }
  }

  return null;
}

export function extensionMatchesMime(
  extension: string,
  mimeType: string,
): boolean {
  return MIME_EXTENSIONS[mimeType]?.includes(extension.toLowerCase()) ?? false;
}

export function preferredExtension(mimeType: string): string {
  return MIME_EXTENSIONS[mimeType]?.[0] ?? "";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const EXTENSION_PATTERN = ALLOWED_EXTENSIONS.map(escapeRegExp).join("|");
const UUID_PATTERN =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export function isValidDocumentPath(
  courseId: string,
  path: string,
  mimeType: string,
): boolean {
  const pattern = new RegExp(
    `^${escapeRegExp(courseId)}/${UUID_PATTERN}\\.(${EXTENSION_PATTERN})$`,
  );

  if (!pattern.test(path)) {
    return false;
  }

  return extensionMatchesMime(getExtension(path), mimeType);
}

export function sanitizeOriginalName(value: string): string {
  const base = value.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/["\\]/g, "")
    .trim();

  return cleaned.slice(0, 255);
}

export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
