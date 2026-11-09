"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { FormField } from "@/components/form-field";
import { ConfirmAction } from "@/components/management/confirm-action";
import { useFormFeedback } from "@/components/management/feedback";
import { FormError } from "@/components/management/form-error";
import { SelectField } from "@/components/management/form-fields";
import { ManagementSubmitButton } from "@/components/management/submit-button";
import { fr } from "@/content/fr";
import {
  initialManagementActionState,
  readFormString,
} from "@/lib/management/action-state";
import {
  createUnavailability,
  deleteUnavailabilityFormAction,
  updateUnavailability,
} from "@/lib/timetable/actions";
import {
  formatTimeRange,
  weekdayLabel,
} from "@/lib/timetable/format";
import { layoutDay } from "@/lib/timetable/layout";
import type { TeacherUnavailability } from "@/lib/timetable/types";

const GRID_START_MINUTES = 7 * 60;
const GRID_END_MINUTES = 21 * 60;
const GRID_HEIGHT = "h-[360px]";
const WEEKDAYS = [1, 2, 3, 4, 5, 6] as const;
const WEEKDAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function UnavailabilityForm({
  mode,
  block,
  onSuccess,
  onCancel,
}: {
  mode: "create" | "edit";
  block?: TeacherUnavailability;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [state, formAction] = useActionState(
    mode === "create" ? createUnavailability : updateUnavailability,
    initialManagementActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const labels = fr.app.timetable.availability;
  const fieldErrors = state.fieldErrors ?? {};
  useFormFeedback(state);

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    if (mode === "create") {
      formRef.current?.reset();
    }

    onSuccess?.();
  }, [state, mode, onSuccess]);

  const fieldId = `unavailability-${mode}-${block?.id ?? "new"}`;
  const weekdayValue = state.values
    ? readFormString(state.values.weekday, String(block?.weekday ?? 1))
    : String(block?.weekday ?? 1);
  const startValue = state.values
    ? readFormString(state.values.startTime, block?.startTime ?? "08:00")
    : (block?.startTime ?? "08:00");
  const endValue = state.values
    ? readFormString(state.values.endTime, block?.endTime ?? "09:00")
    : (block?.endTime ?? "09:00");
  const noteValue = state.values
    ? readFormString(state.values.note, block?.note ?? "")
    : (block?.note ?? "");

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-4">
      {mode === "edit" && block ? (
        <input type="hidden" name="unavailabilityId" value={block.id} />
      ) : null}

      <FormError
        message={state.status === "error" ? state.message : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          id={`${fieldId}-weekday`}
          name="weekday"
          label={labels.weekdayLabel}
          defaultValue={weekdayValue}
          error={fieldErrors.weekday}
          required
        >
          <option value="">{labels.weekdayPlaceholder}</option>
          {WEEKDAY_KEYS.map((key, index) => (
            <option key={key} value={index + 1}>
              {fr.app.timetable.weekdays[key]}
            </option>
          ))}
        </SelectField>

        <FormField
          id={`${fieldId}-start`}
          name="startTime"
          type="time"
          label={labels.startLabel}
          defaultValue={startValue}
          step={900}
          min="00:00"
          max="23:45"
          error={fieldErrors.startTime}
          required
        />

        <FormField
          id={`${fieldId}-end`}
          name="endTime"
          type="time"
          label={labels.endLabel}
          defaultValue={endValue}
          step={900}
          min="00:00"
          max="23:45"
          error={fieldErrors.endTime}
          required
        />
      </div>

      <FormField
        id={`${fieldId}-note`}
        name="note"
        label={labels.noteLabel}
        placeholder={labels.notePlaceholder}
        hint={labels.noteHint}
        defaultValue={noteValue}
        maxLength={200}
        error={fieldErrors.note}
      />

      <div className="flex flex-wrap items-center gap-3">
        <ManagementSubmitButton
          label={mode === "create" ? labels.addSubmit : labels.save}
          pendingLabel={mode === "create" ? labels.adding : labels.saving}
        />

        {mode === "edit" && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {labels.cancel}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function UnavailabilityGrid({
  blocks,
}: {
  blocks: TeacherUnavailability[];
}) {
  const labels = fr.app.timetable.availability;
  const totalMinutes = GRID_END_MINUTES - GRID_START_MINUTES;
  const hourMarks: number[] = [];

  for (
    let minutes = GRID_START_MINUTES;
    minutes <= GRID_END_MINUTES;
    minutes += 60
  ) {
    hourMarks.push(minutes);
  }

  const blocksByDay = new Map<number, TeacherUnavailability[]>();

  for (const block of blocks) {
    const current = blocksByDay.get(block.weekday) ?? [];
    current.push(block);
    blocksByDay.set(block.weekday, current);
  }

  function hourStyle(minutes: number): CSSProperties {
    return {
      top: `${((minutes - GRID_START_MINUTES) / totalMinutes) * 100}%`,
    };
  }

  return (
    <div className="overflow-x-auto">
      <div
        role="table"
        aria-label={labels.gridCaption}
        className="min-w-[42rem] overflow-hidden rounded-2xl border border-primary/15 bg-white"
      >
        <div
          role="row"
          className="grid grid-cols-[4rem_repeat(6,minmax(0,1fr))] border-b border-primary/15 bg-slate-50"
        >
          <div role="columnheader" aria-hidden="true" className="px-2 py-2" />
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
            className={`relative bg-slate-50 ${GRID_HEIGHT}`}
          >
            {hourMarks.slice(0, -1).map((minutes) => (
              <span
                key={minutes}
                className="absolute right-1 -translate-y-1/2 text-[10px] tabular-nums text-slate-600"
                style={hourStyle(minutes)}
              >
                {String(Math.floor(minutes / 60)).padStart(2, "0")}:00
              </span>
            ))}
          </div>

          {WEEKDAYS.map((weekday) => {
            const dayBlocks = blocksByDay.get(weekday) ?? [];
            const layout = layoutDay(
              dayBlocks.map((block) => ({
                id: block.id,
                startTime: block.startTime,
                endTime: block.endTime,
              })),
              GRID_START_MINUTES,
              GRID_END_MINUTES,
            );
            const byId = new Map(dayBlocks.map((block) => [block.id, block]));

            return (
              <div
                key={weekday}
                role="cell"
                className={`relative border-l border-primary/10 ${GRID_HEIGHT}`}
              >
                {hourMarks.map((minutes) => (
                  <div
                    key={minutes}
                    aria-hidden="true"
                    className="absolute inset-x-0 border-t border-slate-200"
                    style={hourStyle(minutes)}
                  />
                ))}

                {layout.map((item) => {
                  const block = byId.get(item.id);

                  if (!block) {
                    return null;
                  }

                  return (
                    <div
                      key={item.id}
                      className="absolute px-0.5"
                      style={{
                        top: `${item.top}%`,
                        height: `${item.height}%`,
                        left: `${(item.column / item.columnCount) * 100}%`,
                        width: `${100 / item.columnCount}%`,
                      }}
                    >
                      <div
                        title={`${weekdayLabel(block.weekday)}, ${formatTimeRange(block.startTime, block.endTime)}${block.note ? `, ${block.note}` : ""}`}
                        className="flex h-full w-full flex-col overflow-hidden rounded-md border border-l-4 border-rose-600 bg-rose-50 px-1.5 py-1 text-rose-950"
                      >
                        <span className="truncate text-[10px] font-bold tabular-nums">
                          {formatTimeRange(block.startTime, block.endTime)}
                        </span>
                        {block.note ? (
                          <span className="truncate text-[9px] leading-3">
                            {block.note}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {blocks.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {labels.gridEmpty}
        </p>
      ) : null}
    </div>
  );
}

function UnavailabilityItem({ block }: { block: TeacherUnavailability }) {
  const labels = fr.app.timetable.availability;
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-primary">
          {labels.editTitle}
        </h3>
        <div className="mt-4">
          <UnavailabilityForm
            mode="edit"
            block={block}
            onSuccess={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-primary">
            {weekdayLabel(block.weekday)}
          </h3>
          <p className="mt-1 text-sm tabular-nums text-slate-700">
            {formatTimeRange(block.startTime, block.endTime)}
          </p>
          {block.note ? (
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {block.note}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-primary/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {labels.edit}
          </button>

          <ConfirmAction
            action={deleteUnavailabilityFormAction}
            fields={{ unavailabilityId: block.id }}
            triggerLabel={labels.delete}
            title={labels.deleteTitle}
            description={labels.deleteDescription
              .replace("{day}", weekdayLabel(block.weekday))
              .replace(
                "{time}",
                formatTimeRange(block.startTime, block.endTime),
              )}
            confirmLabel={labels.deleteConfirm}
            pendingLabel={labels.deleting}
            tone="danger"
          />
        </div>
      </div>
    </li>
  );
}

export function UnavailabilityManager({
  blocks,
}: {
  blocks: TeacherUnavailability[];
}) {
  const labels = fr.app.timetable.availability;

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">
          {labels.addTitle}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {labels.addDescription}
        </p>
        <div className="mt-4">
          <UnavailabilityForm mode="create" />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-primary">
          {labels.listTitle}
        </h2>

        <div className="mt-4">
          <UnavailabilityGrid blocks={blocks} />
        </div>

        {blocks.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-primary/10 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
            {labels.empty}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {blocks.map((block) => (
              <UnavailabilityItem key={block.id} block={block} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
