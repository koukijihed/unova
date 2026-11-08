import { fr } from "@/content/fr";
import type { YoutubeKind } from "@/lib/youtube/links";

export function videoKindLabel(kind: YoutubeKind): string {
  return fr.app.videos.kinds[kind];
}
