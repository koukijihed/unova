"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import { fr } from "@/content/fr";
import {
  generateTimetable,
  undoTimetableGeneration,
} from "@/lib/timetable/actions";
import {
  formatWeeklyHours,
  sessionTypeLabel,
  weekdayLabel,
} from "@/lib/timetable/format";
import { computeRequirementsProgress } from "@/lib/timetable/requirements";
import type {
  CourseRequirement,
  TimetableGeneration,
  TimetableGenerationResult,
  TimetableSession,
} from "@/lib/timetable/types";

const WEEKDAYS = [1, 2, 3, 4, 5, 6] as const;
const DEFAULT_DAYS = [1, 2, 3, 4, 5];

function formatGenerationDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function GenerateDialog({
  open,
  onClose,
  onConfirm,
  pending,
  error,
  days,
  dayStart,
  dayEnd,
  breakEnabled,
  breakStart,
  breakEnd,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  error: string | null;
  days: number[];
  dayStart: string;
  dayEnd: string;
  breakEnabled: boolean;
  breakStart: string;
  breakEnd: string;
}) {
  const labels = fr.app.timetable.generation;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleDialogClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      onClose();
    }
  }

  const dayLabels = days
    .slice()
    .sort((a, b) => a - b)
    .map((day) => weekdayLabel(day))
    .join(", ");

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onClose}
      onClick={handleDialogClick}
      className="fixed inset-0 m-auto w-[min(34rem,92vw)] max-w-none rounded-2xl border border-primary/10 bg-white p-0 text-foreground shadow-2xl backdrop:bg-slate-950/60"
    >
      <div className="p-6">
        <h2
          id={titleId}
          className="text-xl font-bold tracking-tight text-primary"
        >
          {labels.confirmTitle}
        </h2>
        <p id={descriptionId} className="mt-3 text-sm leading-6 text-slate-700">
          {labels.confirmDescription}
        </p>

        <dl className="mt-4 space-y-1 rounded-xl border border-primary/10 bg-background px-4 py-3 text-sm text-slate-700">
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium">{labels.daysLabel} :</dt>
            <dd>{dayLabels}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium">{labels.dayStartLabel} :</dt>
            <dd className="tabular-nums">
              {dayStart} – {dayEnd}
            </dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium">{labels.breakToggle} :</dt>
            <dd className="tabular-nums">
              {breakEnabled
                ? `${breakStart} – ${breakEnd}`
                : "—"}
            </dd>
          </div>
        </dl>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
          >
            {labels.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            aria-busy={pending}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? labels.generating : labels.confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

function UndoDialog({
  generation,
  onClose,
  onConfirm,
  pending,
  message,
  error,
}: {
  generation: TimetableGeneration | null;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  message: string | null;
  error: string | null;
}) {
  const labels = fr.app.timetable.generation;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const open = generation !== null;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleDialogClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onClose}
      onClick={handleDialogClick}
      className="fixed inset-0 m-auto w-[min(32rem,92vw)] max-w-none rounded-2xl border border-primary/10 bg-white p-0 text-foreground shadow-2xl backdrop:bg-slate-950/60"
    >
      <div className="p-6">
        <h2
          id={titleId}
          className="text-xl font-bold tracking-tight text-primary"
        >
          {labels.undoTitle}
        </h2>
        <p id={descriptionId} className="mt-3 text-sm leading-6 text-slate-700">
          {labels.undoDescription}
        </p>

        {message ? (
          <p
            role="status"
            aria-live="polite"
            className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900"
          >
            {message}
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
          >
            {labels.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            aria-busy={pending}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? labels.undoProcessing : labels.undoConfirm}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function GenerationPanel({
  classId,
  semester,
  published,
  requirements,
  sessions,
  generations,
  generationsError,
}: {
  classId: string;
  semester: number;
  published: number;
  requirements: CourseRequirement[];
  sessions: TimetableSession[];
  generations: TimetableGeneration[];
  generationsError: boolean;
}) {
  const labels = fr.app.timetable.generation;
  const router = useRouter();
  const [days, setDays] = useState<number[]>(DEFAULT_DAYS);
  const [dayStart, setDayStart] = useState("08:00");
  const [dayEnd, setDayEnd] = useState("18:00");
  const [breakEnabled, setBreakEnabled] = useState(false);
  const [breakStart, setBreakStart] = useState("12:00");
  const [breakEnd, setBreakEnd] = useState("13:00");
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TimetableGenerationResult | null>(null);
  const [undoTarget, setUndoTarget] = useState<TimetableGeneration | null>(
    null,
  );
  const [undoPending, setUndoPending] = useState(false);
  const [undoError, setUndoError] = useState<string | null>(null);
  const [undoMessage, setUndoMessage] = useState<string | null>(null);

  const isPublished = published > 0;
  const hasRequirements = requirements.length > 0;
  const progress = computeRequirementsProgress(requirements, sessions);
  const generationDisabled = isPublished || !hasRequirements || pending;

  function toggleDay(day: number) {
    setDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day],
    );
  }

  function openConfirmation() {
    setError(null);
    setConfirming(true);
  }

  function closeConfirmation() {
    setConfirming(false);
  }

  async function handleGenerate() {
    setPending(true);
    setError(null);

    try {
      const response = await generateTimetable({
        classId,
        semester,
        days,
        dayStart,
        dayEnd,
        breakStart: breakEnabled ? breakStart : "",
        breakEnd: breakEnabled ? breakEnd : "",
      });

      if (response.ok) {
        setResult(response.result);
        router.refresh();
      } else {
        setError(response.error);
      }
    } catch {
      setError(fr.app.timetable.generation.errors.generic);
    } finally {
      setPending(false);
      setConfirming(false);
    }
  }

  function openUndo(generation: TimetableGeneration) {
    setUndoError(null);
    setUndoMessage(null);
    setUndoTarget(generation);
  }

  function closeUndo() {
    setUndoTarget(null);
  }

  async function handleUndo() {
    if (!undoTarget) {
      return;
    }

    setUndoPending(true);
    setUndoError(null);

    try {
      const response = await undoTimetableGeneration(undoTarget.id);

      if (response.ok) {
        setUndoMessage(
          labels.undone.replace("{count}", String(response.count)),
        );
        setUndoTarget(null);
        router.refresh();
      } else {
        setUndoError(response.error);
      }
    } catch {
      setUndoError(fr.app.timetable.generation.errors.generic);
    } finally {
      setUndoPending(false);
    }
  }

  const unplacedTotal = result
    ? result.unplaced.reduce((total, item) => total + item.missing, 0)
    : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">{labels.title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {labels.description}
        </p>

        {isPublished ? (
          <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            {labels.publishedWarning}
          </p>
        ) : null}

        {!hasRequirements ? (
          <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            {labels.noRequirements}
          </p>
        ) : null}

        <div className="mt-5">
          <h3 className="text-sm font-semibold tracking-wide text-slate-700 uppercase">
            {labels.requirementsTitle}
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {labels.requirementsDescription}
          </p>

          {hasRequirements ? (
            <>
              <ul className="mt-3 space-y-2">
                {progress.items.map((item) => {
                  const requirement = requirements.find(
                    (entry) => entry.id === item.id,
                  );
                  const group = item.groupLabel
                    ? ` (${fr.app.timetable.common.group} ${item.groupLabel})`
                    : "";

                  return (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/10 bg-background px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 text-slate-800">
                        {labels.requirementRow
                          .replace(
                            "{course}",
                            requirement?.courseName ?? "",
                          )
                          .replace(
                            "{type}",
                            sessionTypeLabel(
                              item.sessionType as CourseRequirement["sessionType"],
                            ),
                          )
                          .replace("{group}", group)
                          .replace("{placed}", String(item.placed))
                          .replace("{required}", String(item.required))}
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-primary">
                        {item.remaining > 0
                          ? labels.requirementRemaining.replace(
                              "{count}",
                              String(item.remaining),
                            )
                          : labels.none}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-3 text-sm font-semibold text-primary">
                {fr.app.timetable.requirements.summary.replace(
                  "{hours}",
                  formatWeeklyHours(progress.totalWeeklyMinutes),
                )}
              </p>
            </>
          ) : null}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            openConfirmation();
          }}
          aria-busy={pending}
          className="mt-6 space-y-5 border-t border-primary/10 pt-5"
        >
          <fieldset disabled={generationDisabled}>
            <legend className="text-sm font-medium text-slate-800">
              {labels.daysLabel}
            </legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {WEEKDAYS.map((day) => (
                <label
                  key={day}
                  className="inline-flex items-center gap-2 rounded-xl border border-primary/15 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={days.includes(day)}
                    onChange={() => toggleDay(day)}
                    className="size-4 rounded border-slate-300 text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  />
                  {weekdayLabel(day)}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="generation-day-start"
                className="block text-sm font-medium text-slate-800"
              >
                {labels.dayStartLabel}
              </label>
              <input
                id="generation-day-start"
                type="time"
                value={dayStart}
                step={900}
                disabled={generationDisabled}
                onChange={(event) => setDayStart(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="generation-day-end"
                className="block text-sm font-medium text-slate-800"
              >
                {labels.dayEndLabel}
              </label>
              <input
                id="generation-day-end"
                type="time"
                value={dayEnd}
                step={900}
                disabled={generationDisabled}
                onChange={(event) => setDayEnd(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={breakEnabled}
                disabled={generationDisabled}
                onChange={(event) => setBreakEnabled(event.target.checked)}
                className="size-4 rounded border-slate-300 text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
              {labels.breakToggle}
            </label>

            {breakEnabled ? (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="generation-break-start"
                    className="block text-sm font-medium text-slate-800"
                  >
                    {labels.breakStartLabel}
                  </label>
                  <input
                    id="generation-break-start"
                    type="time"
                    value={breakStart}
                    step={900}
                    disabled={generationDisabled}
                    onChange={(event) => setBreakStart(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="generation-break-end"
                    className="block text-sm font-medium text-slate-800"
                  >
                    {labels.breakEndLabel}
                  </label>
                  <input
                    id="generation-break-end"
                    type="time"
                    value={breakEnd}
                    step={900}
                    disabled={generationDisabled}
                    onChange={(event) => setBreakEnd(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={generationDisabled}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? labels.generating : labels.generate}
            </button>

            {pending ? (
              <p
                role="status"
                aria-live="polite"
                className="text-sm font-medium text-slate-700"
              >
                {labels.generating}
              </p>
            ) : null}
          </div>

          {error && !confirming ? (
            <p
              role="alert"
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
            >
              {error}
            </p>
          ) : null}
        </form>
      </section>

      {result ? (
        <section className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-primary">
            {labels.resultTitle}
          </h2>

          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            <li className="rounded-xl border border-primary/10 bg-background px-3 py-2 text-sm text-slate-800">
              {labels.resultPlaced.replace("{count}", String(result.placed))}
            </li>
            <li className="rounded-xl border border-primary/10 bg-background px-3 py-2 text-sm text-slate-800">
              {labels.resultRemoved.replace(
                "{count}",
                String(result.removedDrafts),
              )}
            </li>
            <li className="rounded-xl border border-primary/10 bg-background px-3 py-2 text-sm text-slate-800">
              {labels.resultKept.replace("{count}", String(result.kept))}
            </li>
            <li className="rounded-xl border border-primary/10 bg-background px-3 py-2 text-sm text-slate-800">
              {labels.resultNoRoom.replace(
                "{count}",
                String(result.placedWithoutRoom),
              )}
            </li>
          </ul>

          {result.placedWithoutRoom > 0 ? (
            <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              {labels.resultNoRoomExplanation}
            </p>
          ) : null}

          {unplacedTotal > 0 ? (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-slate-800">
                {labels.unplacedTitle}
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {labels.unplacedHint}
              </p>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[32rem] border-collapse text-sm">
                  <caption className="sr-only">
                    {labels.unplacedTable.caption}
                  </caption>
                  <thead>
                    <tr className="border-b border-primary/10 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase">
                      <th scope="col" className="px-2 py-2">
                        {labels.unplacedTable.course}
                      </th>
                      <th scope="col" className="px-2 py-2">
                        {labels.unplacedTable.type}
                      </th>
                      <th scope="col" className="px-2 py-2">
                        {labels.unplacedTable.group}
                      </th>
                      <th scope="col" className="px-2 py-2">
                        {labels.unplacedTable.missing}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.unplaced.map((item, index) => (
                      <tr
                        key={`${item.courseId}-${item.sessionType}-${item.group ?? ""}-${index}`}
                        className="border-b border-primary/5"
                      >
                        <td className="px-2 py-2 text-slate-800">
                          {item.courseName}
                        </td>
                        <td className="px-2 py-2 text-slate-700">
                          {sessionTypeLabel(item.sessionType)}
                        </td>
                        <td className="px-2 py-2 text-slate-700">
                          {item.group || labels.none}
                        </td>
                        <td className="px-2 py-2 text-slate-700">
                          {item.missing}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">
          {labels.historyTitle}
        </h2>

        {undoMessage ? (
          <p
            role="status"
            aria-live="polite"
            className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900"
          >
            {undoMessage}
          </p>
        ) : null}

        {generationsError ? (
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {labels.loadFailed}
          </p>
        ) : generations.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {labels.historyEmpty}
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {generations.map((generation) => {
              const unplacedCount = generation.result.unplaced.reduce(
                (total, item) => total + item.missing,
                0,
              );
              const generationDays = generation.params.days
                .slice()
                .sort((a, b) => a - b)
                .map((day) => weekdayLabel(day))
                .join(", ");
              const paramsParts = [
                labels.historyDays.replace(
                  "{days}",
                  generationDays || labels.none,
                ),
                generation.params.dayStart && generation.params.dayEnd
                  ? labels.historyHours
                      .replace("{start}", generation.params.dayStart)
                      .replace("{end}", generation.params.dayEnd)
                  : null,
                generation.params.breakStart && generation.params.breakEnd
                  ? labels.historyBreak
                      .replace("{start}", generation.params.breakStart)
                      .replace("{end}", generation.params.breakEnd)
                  : labels.historyNoBreak,
              ].filter(Boolean);

              return (
                <li
                  key={generation.id}
                  className="rounded-xl border border-primary/10 bg-background p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1 text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">
                        {formatGenerationDate(generation.createdAt)}
                      </p>
                      <p>
                        {labels.historyPlaced} : {generation.result.placed} ·{" "}
                        {labels.historyUnplaced} : {unplacedCount}
                      </p>
                      <p className="text-xs leading-5 text-slate-600">
                        {paramsParts.join(" · ")}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openUndo(generation)}
                      className="inline-flex min-h-9 items-center justify-center rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {labels.undo}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <GenerateDialog
        open={confirming}
        onClose={closeConfirmation}
        onConfirm={handleGenerate}
        pending={pending}
        error={confirming ? error : null}
        days={days}
        dayStart={dayStart}
        dayEnd={dayEnd}
        breakEnabled={breakEnabled}
        breakStart={breakStart}
        breakEnd={breakEnd}
      />

      <UndoDialog
        generation={undoTarget}
        onClose={closeUndo}
        onConfirm={handleUndo}
        pending={undoPending}
        message={undoMessage}
        error={undoError}
      />
    </div>
  );
}
