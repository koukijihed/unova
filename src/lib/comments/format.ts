import { fr } from "@/content/fr";
import type { CommentBadge, CommentKind } from "./types";

export function commentKindLabel(kind: CommentKind): string {
  return fr.app.comments.kinds[kind];
}

export function commentBadgeLabel(badge: CommentBadge): string | null {
  if (badge === "student") {
    return null;
  }

  return fr.app.comments.badges[badge];
}

export function formatCommentDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fr.common.notAvailable;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
