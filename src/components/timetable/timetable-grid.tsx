import type { CSSProperties } from "react";
import { fr } from "@/content/fr";
import {
  TIMETABLE_DAY_END_MINUTES,
  TIMETABLE_DAY_START_MINUTES,
  layoutDay,
  minutesToTime,
  timeToMinutes,
} from "@/lib/timetable/layout";
import {
  formatTimeRange,
  sessionTypeLabel,
  timetableStatusLabel,
  weekdayLabel,
} from "@/lib/timetable/format";
import type { SessionType, TimetableSession } from "@/lib/timetable/types";

const TYPE_CLASSES: Record<SessionType, string> = {
  cours: "border-sky-600 bg-sky-50 text-sky-950",
  td: "border-emerald-600 bg-emerald-50 text-emerald-950",
  tp: "border-violet-600 bg-violet-50 text-violet-950",
};

const DRAFT_BADGE_CLASSES =
  "shrink-0 rounded bg-amber-200 px-1 py-px text-[9px] font-semibold leading-3 text-amber-950";
const PUBLISHED_BADGE_CLASSES =
  "shrink-0 rounded bg-emerald-200 px-1 py-px text-[9px] font-semibold leading-3 text-emerald-950";

const WEEKDAYS = [1, 2, 3, 4, 5, 6] as const;
const GRID_HEIGHT_CLASSES = "h-[660px] print:h-[145mm]";

function sessionLabel(session: TimetableSession): string {
  const details = [
    session.courseName,
    sessionTypeLabel(session.sessionType),
    weekdayLabel(session.weekday),
    formatTimeRange(session.startTime, session.endTime),
    session.groupLabel
      ? `${fr.app.timetable.common.group} ${session.groupLabel}`
      : null,
    session.roomName
      ? `${fr.app.timetable.common.room} ${session.roomName}`
      : null,
    session.teacherName
      ? `${fr.app.timetable.common.teacher} ${session.teacherName}`
      : null,
    timetableStatusLabel(session.status),
  ].filter(Boolean);

  return details.join(", ");
}

function SessionContent({
  session,
  compact = false,
}: {
  session: TimetableSession;
  compact?: boolean;
}) {
  return (
    <>
      <span className="flex items-start justify-between gap-1">
        <span
          className={`min-w-0 truncate font-bold ${
            compact ? "text-[11px] leading-4" : "text-sm leading-5"
          }`}
        >
          {session.courseName}
        </span>
        <span
          className={
            session.status === "draft"
              ? DRAFT_BADGE_CLASSES
              : PUBLISHED_BADGE_CLASSES
          }
        >
          {timetableStatusLabel(session.status)}
        </span>
      </span>

      <span
        className={`truncate font-semibold ${
          compact ? "text-[10px] leading-3" : "text-xs leading-4"
        }`}
      >
        {sessionTypeLabel(session.sessionType)}
        {session.groupLabel ? ` · ${session.groupLabel}` : ""}
      </span>

      <span
        className={`truncate tabular-nums ${
          compact ? "text-[10px] leading-3" : "text-xs leading-4"
        }`}
      >
        {formatTimeRange(session.startTime, session.endTime)}
      </span>

      {session.roomName ? (
        <span
          className={`truncate ${
            compact ? "text-[10px] leading-3" : "text-xs leading-4"
          }`}
        >
          {session.roomName}
        </span>
      ) : null}

      {session.teacherName ? (
        <span
          className={`truncate ${
            compact ? "text-[10px] leading-3" : "text-xs leading-4"
          }`}
        >
          {session.teacherName}
        </span>
      ) : null}
    </>
  );
}

function sessionClasses(session: TimetableSession, interactive: boolean): string {
  return [
    "timetable-session flex h-full w-full flex-col gap-0.5 overflow-hidden rounded-md border border-l-4 px-1.5 py-1 text-left",
    TYPE_CLASSES[session.sessionType],
    session.status === "draft" ? "border-dashed" : "",
    interactive
      ? "cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function SessionBlock({
  session,
  onSelect,
  className = "",
  style,
}: {
  session: TimetableSession;
  onSelect?: (session: TimetableSession) => void;
  className?: string;
  style?: CSSProperties;
}) {
  const label = sessionLabel(session);
  const classes = `${sessionClasses(session, Boolean(onSelect))} ${className}`;

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(session)}
        aria-label={label}
        title={label}
        className={classes}
        style={style}
      >
        <SessionContent session={session} compact />
      </button>
    );
  }

  return (
    <div title={label} className={classes} style={style}>
      <SessionContent session={session} compact />
    </div>
  );
}

function MobileSession({
  session,
  onSelect,
}: {
  session: TimetableSession;
  onSelect?: (session: TimetableSession) => void;
}) {
  const label = sessionLabel(session);
  const classes = `${sessionClasses(session, Boolean(onSelect))} min-h-20`;

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(session)}
        aria-label={label}
        className={classes}
      >
        <SessionContent session={session} />
      </button>
    );
  }

  return (
    <div className={classes}>
      <SessionContent session={session} />
    </div>
  );
}

function sortByStartTime(sessions: TimetableSession[]): TimetableSession[] {
  return [...sessions].sort(
    (a, b) =>
      (timeToMinutes(a.startTime) ?? 0) -
        (timeToMinutes(b.startTime) ?? 0) ||
      a.courseName.localeCompare(b.courseName, "fr", { sensitivity: "base" }),
  );
}

export function TimetableGrid({
  sessions,
  onSelect,
  caption,
}: {
  sessions: TimetableSession[];
  onSelect?: (session: TimetableSession) => void;
  caption?: string;
}) {
  const labels = fr.app.timetable.view;
  const totalMinutes =
    TIMETABLE_DAY_END_MINUTES - TIMETABLE_DAY_START_MINUTES;
  const hourMarks: number[] = [];

  for (
    let minutes = TIMETABLE_DAY_START_MINUTES;
    minutes <= TIMETABLE_DAY_END_MINUTES;
    minutes += 60
  ) {
    hourMarks.push(minutes);
  }

  const labelMarks = hourMarks.slice(0, -1);
  const sessionsByDay = new Map<number, TimetableSession[]>();

  for (const session of sessions) {
    const current = sessionsByDay.get(session.weekday) ?? [];
    current.push(session);
    sessionsByDay.set(session.weekday, current);
  }

  return (
    <div>
      <div className="hidden md:block print:block">
        <div
          role="table"
          aria-label={caption ?? labels.gridCaption}
          className="overflow-hidden rounded-2xl border border-primary/15 bg-white"
        >
          <div
            role="row"
            className="grid grid-cols-[4rem_repeat(6,minmax(0,1fr))] border-b border-primary/15 bg-slate-50"
          >
            <div
              role="columnheader"
              aria-hidden="true"
              className="px-2 py-2 text-xs font-semibold text-slate-600"
            />
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                role="columnheader"
                className="border-l border-primary/10 px-2 py-2 text-center text-xs font-semibold text-primary"
              >
                {weekdayLabel(weekday)}
              </div>
            ))}
          </div>

          <div
            role="row"
            className="grid grid-cols-[4rem_repeat(6,minmax(0,1fr))]"
          >
            <div
              role="rowheader"
              aria-hidden="true"
              className={`relative bg-slate-50 ${GRID_HEIGHT_CLASSES}`}
            >
              {labelMarks.map((minutes) => (
                <span
                  key={minutes}
                  className={`absolute right-1 text-[10px] tabular-nums text-slate-600 ${
                    minutes === TIMETABLE_DAY_START_MINUTES
                      ? ""
                      : "-translate-y-1/2"
                  }`}
                  style={{
                    top: `${((minutes - TIMETABLE_DAY_START_MINUTES) / totalMinutes) * 100}%`,
                  }}
                >
                  {minutesToTime(minutes)}
                </span>
              ))}
            </div>

            {WEEKDAYS.map((weekday) => {
              const daySessions = sessionsByDay.get(weekday) ?? [];
              const blocks = layoutDay(daySessions);
              const byId = new Map(
                daySessions.map((session) => [session.id, session]),
              );

              return (
                <div
                  key={weekday}
                  role="cell"
                  className={`relative border-l border-primary/10 ${GRID_HEIGHT_CLASSES}`}
                >
                  {hourMarks.map((minutes) => (
                    <div
                      key={minutes}
                      aria-hidden="true"
                      className="absolute inset-x-0 border-t border-slate-200"
                      style={{
                        top: `${((minutes - TIMETABLE_DAY_START_MINUTES) / totalMinutes) * 100}%`,
                      }}
                    />
                  ))}

                  {blocks.map((block) => {
                    const session = byId.get(block.id);

                    if (!session) {
                      return null;
                    }

                    return (
                      <div
                        key={block.id}
                        className="absolute px-0.5"
                        style={{
                          top: `${block.top}%`,
                          height: `${block.height}%`,
                          left: `${(block.column / block.columnCount) * 100}%`,
                          width: `${100 / block.columnCount}%`,
                        }}
                      >
                        <SessionBlock
                          session={session}
                          onSelect={onSelect}
                          className="h-full"
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="md:hidden print:hidden">
        <h2 className="sr-only">{labels.mobileTitle}</h2>

        {WEEKDAYS.map((weekday) => {
          const daySessions = sortByStartTime(
            sessionsByDay.get(weekday) ?? [],
          );

          if (daySessions.length === 0) {
            return null;
          }

          return (
            <section
              key={weekday}
              aria-labelledby={`timetable-day-${weekday}`}
              className="mt-6 first:mt-0"
            >
              <h3
                id={`timetable-day-${weekday}`}
                className="text-sm font-semibold tracking-wide text-primary uppercase"
              >
                {weekdayLabel(weekday)}
              </h3>

              <ul className="mt-2 space-y-2">
                {daySessions.map((session) => (
                  <li key={session.id}>
                    <MobileSession session={session} onSelect={onSelect} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
