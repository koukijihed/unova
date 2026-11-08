import { fr } from "@/content/fr";
import type { DriveKind } from "./links";

export function driveKindLabel(kind: DriveKind): string {
  return fr.app.driveLinks.kinds[kind];
}
