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
const LOCKED_BADGE_CLASSES =
  "inline-flex shrink-0 items-center gap-0.5 rounded bg-slate-200 px-1 py-px text-[9px] font-semibold leading-3 text-slate-900";
const GENERATED_BADGE_CLASSES =
  "shrink-0 rounded bg-sky-200 px-1 py-px text-[9px] font-semibold leading-3 text-sky-950";

const WEEKDAYS = [1, 2, 3, 4, 5, 6] as const;
const GRID_HEIGHT_CLASSES = "h-[660px] print:h-[145mm]";

function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="size-3"
    >
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      {locked ? (
        <path
          d="M8 10V7a4 4 0 0 1 8 0v3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M8 10V7a4 4 0 0 1 7.5-1.8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function sessionLabel(
  session: TimetableSession,
  showManagementBadges: boolean,
): string {
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
    showManagementBadges && session.isLocked
      ? fr.app.timetable.common.locked
      : null,
    showManagementBadges && session.generationId
      ? fr.app.timetable.common.generated
      : null,
  ].filter(Boolean);

  return details.join(", ");
}

function SessionContent({
  session,
  compact = false,
  showManagementBadges = false,
}: {
  session: TimetableSession;
  compact?: boolean;
  showManagementBadges?: boolean;
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

      {showManagementBadges && (session.isLocked || session.generationId) ? (
        <span className="flex flex-wrap gap-1">
          {session.isLocked ? (
            <span className={LOCKED_BADGE_CLASSES}>
              <LockIcon locked />
              {fr.app.timetable.common.locked}
            </span>
          ) : null}
          {session.generationId ? (
            <span className={GENERATED_BADGE_CLASSES}>
              {fr.app.timetable.common.generated}
            </span>
          ) : null}
        </span>
      ) : null}

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

function sessionClasses(session: TimetableSession): string {
  return [
    "timetable-session relative flex h-full w-full flex-col overflow-hidden rounded-md border border-l-4 text-left",
    TYPE_CLASSES[session.sessionType],
    session.status === "draft" ? "border-dashed" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function SessionBlock({
  session,
  onSelect,
  onToggleLock,
  lockPending = false,
  showManagementBadges = false,
  className = "",
  style,
}: {
  session: TimetableSession;
  onSelect?: (session: TimetableSession) => void;
  onToggleLock?: (session: TimetableSession) => void;
  lockPending?: boolean;
  showManagementBadges?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const label = sessionLabel(session, showManagementBadges);
  const classes = `${sessionClasses(session)} ${className}`;
  const lockLabel = session.isLocked
    ? fr.app.timetable.common.unlock
    : fr.app.timetable.common.lock;
  const contentClasses = `flex min-h-0 flex-1 flex-col gap-0.5 px-1.5 py-1 text-left ${
    onToggleLock ? "pr-6" : ""
  }`;

  return (
    <div title={label} className={classes} style={style}>
      {onSelect ? (
        <button
          type="button"
          onClick={() => onSelect(session)}
          aria-label={label}
          className={`${contentClasses} transition-colors hover:bg-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
        >
          <SessionContent
            session={session}
            compact
            showManagementBadges={showManagementBadges}
          />
        </button>
      ) : (
        <div className={contentClasses}>
          <SessionContent
            session={session}
            compact
            showManagementBadges={showManagementBadges}
          />
        </div>
      )}

      {onToggleLock ? (
        <button
          type="button"
          onClick={() => onToggleLock(session)}
          disabled={lockPending}
          aria-pressed={session.isLocked}
          aria-label={`${lockLabel} — ${label}`}
          title={lockLabel}
          className="absolute right-1 bottom-1 inline-flex size-5 items-center justify-center rounded border border-current/30 bg-white/80 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
        >
          <LockIcon locked={session.isLocked} />
        </button>
      ) : null}
    </div>
  );
}

function MobileSession({
  session,
  onSelect,
  onToggleLock,
  lockPending = false,
  showManagementBadges = false,
}: {
  session: TimetableSession;
  onSelect?: (session: TimetableSession) => void;
  onToggleLock?: (session: TimetableSession) => void;
  lockPending?: boolean;
  showManagementBadges?: boolean;
}) {
  const label = sessionLabel(session, showManagementBadges);
  const classes = `${sessionClasses(session)} min-h-20`;
  const lockLabel = session.isLocked
    ? fr.app.timetable.common.unlock
    : fr.app.timetable.common.lock;
  const contentClasses =
    "flex min-h-0 flex-1 flex-col gap-0.5 px-1.5 py-1 text-left";

  return (
    <div className={classes}>
      {onSelect ? (
        <button
          type="button"
          onClick={() => onSelect(session)}
          aria-label={label}
          className={`${contentClasses} transition-colors hover:bg-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
        >
          <SessionContent
            session={session}
            showManagementBadges={showManagementBadges}
          />
        </button>
      ) : (
        <div className={contentClasses}>
          <SessionContent
            session={session}
            showManagementBadges={showManagementBadges}
          />
        </div>
      )}

      {onToggleLock ? (
        <button
          type="button"
          onClick={() => onToggleLock(session)}
          disabled={lockPending}
          aria-pressed={session.isLocked}
          aria-label={`${lockLabel} — ${label}`}
          className="mx-1.5 mb-1.5 inline-flex min-h-8 items-center gap-1 self-start rounded border border-current/30 bg-white/80 px-2 text-[11px] font-semibold transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
        >
          <LockIcon locked={session.isLocked} />
          {lockLabel}
        </button>
      ) : null}
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
  onToggleLock,
  lockPendingId = null,
  showManagementBadges = false,
  caption,
}: {
  sessions: TimetableSession[];
  onSelect?: (session: TimetableSession) => void;
  onToggleLock?: (session: TimetableSession) => void;
  lockPendingId?: string | null;
  showManagementBadges?: boolean;
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
                          onToggleLock={onToggleLock}
                          lockPending={lockPendingId === session.id}
                          showManagementBadges={showManagementBadges}
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
                    <MobileSession
                      session={session}
                      onSelect={onSelect}
                      onToggleLock={onToggleLock}
                      lockPending={lockPendingId === session.id}
                      showManagementBadges={showManagementBadges}
                    />
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
