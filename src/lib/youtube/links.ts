export const YOUTUBE_KINDS = ["video", "playlist"] as const;

export type YoutubeKind = (typeof YOUTUBE_KINDS)[number];

export type ParsedYoutubeLink = {
  kind: YoutubeKind;
  youtubeId: string;
};

export type YoutubeParseResult =
  | { ok: true; link: ParsedYoutubeLink }
  | { ok: false; error: string };

export const YOUTUBE_URL_ERROR =
  "Ce lien n'est pas un lien YouTube valide. Collez l'adresse d'une vidéo ou d'une playlist.";

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const PLAYLIST_ID_PATTERN = /^[A-Za-z0-9_-]{10,64}$/;

const ALLOWED_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtube-nocookie.com",
]);

const VIDEO_PATH_PREFIXES = new Set(["shorts", "embed", "live"]);

export function isYoutubeKind(value: string): value is YoutubeKind {
  return (YOUTUBE_KINDS as readonly string[]).includes(value);
}

function rejected(): YoutubeParseResult {
  return { ok: false, error: YOUTUBE_URL_ERROR };
}

function acceptedVideo(id: string): YoutubeParseResult {
  if (!VIDEO_ID_PATTERN.test(id)) {
    return rejected();
  }

  return { ok: true, link: { kind: "video", youtubeId: id } };
}

function acceptedPlaylist(id: string): YoutubeParseResult {
  if (!PLAYLIST_ID_PATTERN.test(id)) {
    return rejected();
  }

  return { ok: true, link: { kind: "playlist", youtubeId: id } };
}

function pathSegments(pathname: string): string[] {
  return pathname.split("/").filter((segment) => segment.length > 0);
}

export function parseYoutubeUrl(input: string): YoutubeParseResult {
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

  if (!ALLOWED_HOSTS.has(hostname)) {
    return rejected();
  }

  const segments = pathSegments(url.pathname);

  // youtu.be/<ID> uniquement.
  if (hostname === "youtu.be") {
    if (segments.length !== 1) {
      return rejected();
    }

    return acceptedVideo(segments[0]);
  }

  if (segments.length === 0) {
    return rejected();
  }

  const first = segments[0];

  if (first === "watch") {
    const videoId = url.searchParams.get("v");

    return videoId ? acceptedVideo(videoId) : rejected();
  }

  if (VIDEO_PATH_PREFIXES.has(first)) {
    if (segments.length < 2) {
      return rejected();
    }

    return acceptedVideo(segments[1]);
  }

  if (first === "playlist") {
    const playlistId = url.searchParams.get("list");

    return playlistId ? acceptedPlaylist(playlistId) : rejected();
  }

  return rejected();
}

export function embedUrl(kind: YoutubeKind, id: string): string {
  const safeId = encodeURIComponent(id);

  if (kind === "playlist") {
    return `https://www.youtube-nocookie.com/embed/videoseries?list=${safeId}`;
  }

  return `https://www.youtube-nocookie.com/embed/${safeId}`;
}

export function openUrl(kind: YoutubeKind, id: string): string {
  const safeId = encodeURIComponent(id);

  if (kind === "playlist") {
    return `https://www.youtube.com/playlist?list=${safeId}`;
  }

  return `https://www.youtube.com/watch?v=${safeId}`;
}
