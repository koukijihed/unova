// Calcul pur de la disposition d'une journée d'emploi du temps.
// Aucune dépendance : ce module est testé par scripts/test-timetable-layout.mjs.

export const TIMETABLE_DAY_START_MINUTES = 8 * 60;
export const TIMETABLE_DAY_END_MINUTES = 19 * 60;

export type TimetableLayoutSession = {
  id: string;
  startTime: string;
  endTime: string;
};

export type TimetableLayoutBlock = {
  id: string;
  startMinutes: number;
  endMinutes: number;
  top: number;
  height: number;
  column: number;
  columnCount: number;
};

/**
 * Convertit « HH:MM » ou « HH:MM:SS » en minutes depuis minuit.
 * Retourne null si l'horaire est invalide.
 */
export function timeToMinutes(value: string): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

export function minutesToTime(value: number): string {
  const safe = Math.max(0, Math.min(23 * 60 + 59, Math.trunc(value)));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

type PreparedSession = TimetableLayoutSession & {
  startMinutes: number;
  endMinutes: number;
};

/**
 * Positionne les séances d'une journée sur une grille horaire et répartit
 * les séances qui se chevauchent en colonnes, afin qu'elles s'affichent
 * côte à côte. Les séances invalides ou hors de la plage horaire sont ignorées.
 */
export function layoutDay(
  sessions: TimetableLayoutSession[],
  dayStart: number = TIMETABLE_DAY_START_MINUTES,
  dayEnd: number = TIMETABLE_DAY_END_MINUTES,
): TimetableLayoutBlock[] {
  const total = dayEnd - dayStart;

  if (!Number.isFinite(total) || total <= 0) {
    return [];
  }

  const prepared: PreparedSession[] = [];

  for (const session of sessions) {
    const start = timeToMinutes(session.startTime);
    const end = timeToMinutes(session.endTime);

    if (start === null || end === null || end <= start) {
      continue;
    }

    const clampedStart = Math.max(start, dayStart);
    const clampedEnd = Math.min(end, dayEnd);

    if (clampedEnd <= clampedStart) {
      continue;
    }

    prepared.push({
      id: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      startMinutes: clampedStart,
      endMinutes: clampedEnd,
    });
  }

  prepared.sort(
    (a, b) =>
      a.startMinutes - b.startMinutes ||
      a.endMinutes - b.endMinutes ||
      a.id.localeCompare(b.id),
  );

  const blocks: TimetableLayoutBlock[] = [];
  let cluster: PreparedSession[] = [];
  let clusterEnd = -1;

  function flushCluster() {
    if (cluster.length === 0) {
      return;
    }

    const columnEnds: number[] = [];
    const columns = new Map<PreparedSession, number>();

    for (const item of cluster) {
      let column = columnEnds.findIndex(
        (columnEnd) => columnEnd <= item.startMinutes,
      );

      if (column === -1) {
        column = columnEnds.length;
        columnEnds.push(item.endMinutes);
      } else {
        columnEnds[column] = item.endMinutes;
      }

      columns.set(item, column);
    }

    const columnCount = columnEnds.length;

    for (const item of cluster) {
      blocks.push({
        id: item.id,
        startMinutes: item.startMinutes,
        endMinutes: item.endMinutes,
        top: ((item.startMinutes - dayStart) / total) * 100,
        height: ((item.endMinutes - item.startMinutes) / total) * 100,
        column: columns.get(item) ?? 0,
        columnCount,
      });
    }

    cluster = [];
    clusterEnd = -1;
  }

  for (const item of prepared) {
    if (cluster.length > 0 && item.startMinutes >= clusterEnd) {
      flushCluster();
    }

    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.endMinutes);
  }

  flushCluster();

  return blocks;
}
