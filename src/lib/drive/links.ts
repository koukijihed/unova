export const DRIVE_KINDS = [
  "file",
  "document",
  "presentation",
  "spreadsheet",
  "folder",
] as const;

export type DriveKind = (typeof DRIVE_KINDS)[number];

export type ParsedDriveLink = {
  kind: DriveKind;
  driveId: string;
};

export type DriveParseResult =
  | { ok: true; link: ParsedDriveLink }
  | { ok: false; error: string };

export const DRIVE_URL_ERROR =
  "Ce lien n'est pas un lien Google Drive valide. Utilisez le lien de partage complet (Partager, puis Copier le lien).";

export const DRIVE_KIND_LABELS: Record<DriveKind, string> = {
  file: "Fichier",
  document: "Document",
  presentation: "Présentation",
  spreadsheet: "Feuille de calcul",
  folder: "Dossier",
};

const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]{10,100}$/;

const DOCS_KIND_BY_PATH: Record<string, DriveKind> = {
  document: "document",
  presentation: "presentation",
  spreadsheets: "spreadsheet",
};

export function isDriveKind(value: string): value is DriveKind {
  return (DRIVE_KINDS as readonly string[]).includes(value);
}

function rejected(): DriveParseResult {
  return { ok: false, error: DRIVE_URL_ERROR };
}

function accepted(kind: DriveKind, driveId: string): DriveParseResult {
  if (!DRIVE_ID_PATTERN.test(driveId)) {
    return rejected();
  }

  return { ok: true, link: { kind, driveId } };
}

function pathSegments(pathname: string): string[] {
  return pathname.split("/").filter((segment) => segment.length > 0);
}

export function parseDriveUrl(input: string): DriveParseResult {
  if (typeof input !== "string") {
    return rejected();
  }

  const value = input.trim();

  if (!value) {
    return rejected();
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return rejected();
  }

  if (url.protocol !== "https:") {
    return rejected();
  }

  if (url.username || url.password || url.port) {
    return rejected();
  }

  const hostname = url.hostname.toLowerCase();

  if (hostname !== "drive.google.com" && hostname !== "docs.google.com") {
    return rejected();
  }

  const segments = pathSegments(url.pathname);

  if (hostname === "drive.google.com") {
    if (
      segments.length >= 3 &&
      segments[0] === "file" &&
      segments[1] === "d"
    ) {
      return accepted("file", segments[2]);
    }

    if (
      segments.length === 3 &&
      segments[0] === "drive" &&
      segments[1] === "folders"
    ) {
      return accepted("folder", segments[2]);
    }

    if (
      segments.length === 5 &&
      segments[0] === "drive" &&
      segments[1] === "u" &&
      /^\d+$/.test(segments[2]) &&
      segments[3] === "folders"
    ) {
      return accepted("folder", segments[4]);
    }

    return rejected();
  }

  if (segments.length >= 3 && segments[1] === "d") {
    const kind = DOCS_KIND_BY_PATH[segments[0]];

    if (kind) {
      return accepted(kind, segments[2]);
    }
  }

  return rejected();
}

export function embedUrl(kind: DriveKind, id: string): string {
  const safeId = encodeURIComponent(id);

  switch (kind) {
    case "file":
      return `https://drive.google.com/file/d/${safeId}/preview`;
    case "document":
      return `https://docs.google.com/document/d/${safeId}/preview`;
    case "spreadsheet":
      return `https://docs.google.com/spreadsheets/d/${safeId}/preview`;
    case "presentation":
      return `https://docs.google.com/presentation/d/${safeId}/embed`;
    case "folder":
      return `https://drive.google.com/embeddedfolderview?id=${safeId}#list`;
  }
}

export function openUrl(kind: DriveKind, id: string): string {
  const safeId = encodeURIComponent(id);

  switch (kind) {
    case "file":
      return `https://drive.google.com/file/d/${safeId}/view`;
    case "folder":
      return `https://drive.google.com/drive/folders/${safeId}`;
    case "document":
      return `https://docs.google.com/document/d/${safeId}/view`;
    case "presentation":
      return `https://docs.google.com/presentation/d/${safeId}/view`;
    case "spreadsheet":
      return `https://docs.google.com/spreadsheets/d/${safeId}/view`;
  }
}
