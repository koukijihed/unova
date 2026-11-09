import { fr } from "@/content/fr";
import type { SessionType, TimetableStatus } from "./types";

const DAY_KEYS: Record<number, keyof typeof fr.app.timetable.weekdays> = {
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

export function weekdayLabel(weekday: number): string {
  const key = DAY_KEYS[weekday];

  return key ? fr.app.timetable.weekdays[key] : "";
}

export function sessionTypeLabel(sessionType: SessionType): string {
  return fr.app.timetable.sessionTypes[sessionType];
}

export function timetableStatusLabel(status: TimetableStatus): string {
  return fr.app.timetable.status[status];
}

export function formatTime(value: string): string {
  const trimmed = value.trim();
  const match = /^(\d{1,2}):(\d{2})/.exec(trimmed);

  if (!match) {
    return trimmed;
  }

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)}-${formatTime(endTime)}`;
}

export function semesterLabel(semester: number): string {
  return semester === 2
    ? fr.app.timetable.semesters.second
    : fr.app.timetable.semesters.first;
}

export function formatWeeklyHours(minutes: number): string {
  const hours = Number.isFinite(minutes) ? minutes / 60 : 0;

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(hours);
}
