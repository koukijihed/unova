"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
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
import type { ManagementCourse } from "@/lib/management/course-data";
import {
  createRequirement,
  deleteRequirementFormAction,
  updateRequirement,
} from "@/lib/timetable/actions";
import {
  formatWeeklyHours,
  sessionTypeLabel,
} from "@/lib/timetable/format";
import {
  computeRequirementsProgress,
} from "@/lib/timetable/requirements";
import type {
  CourseRequirement,
  Room,
  SessionType,
} from "@/lib/timetable/types";

const SESSION_TYPES: SessionType[] = ["cours", "td", "tp"];
const SESSIONS_PER_WEEK = [1, 2, 3, 4, 5, 6];
const QUICK_DURATIONS = [60, 90, 120];

function RequirementForm({
  mode,
  course,
  requirement,
  rooms,
  onSuccess,
  onCancel,
}: {
  mode: "create" | "edit";
  course: ManagementCourse;
  requirement?: CourseRequirement;
  rooms: Room[];
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [state, formAction] = useActionState(
    mode === "create" ? createRequirement : updateRequirement,
    initialManagementActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const durationRef = useRef<HTMLInputElement>(null);
  const labels = fr.app.timetable.requirements;
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

  const fieldId = `requirement-${mode}-${requirement?.id ?? course.id}`;
  const typeValue = state.values
    ? readFormString(state.values.sessionType, requirement?.sessionType ?? "cours")
    : (requirement?.sessionType ?? "cours");
  const groupValue = state.values
    ? readFormString(state.values.groupLabel, requirement?.groupLabel ?? "")
    : (requirement?.groupLabel ?? "");
  const sessionsValue = state.values
    ? readFormString(
        state.values.sessionsPerWeek,
        String(requirement?.sessionsPerWeek ?? 1),
      )
    : String(requirement?.sessionsPerWeek ?? 1);
  const durationValue = state.values
    ? readFormString(
        state.values.durationMinutes,
        String(requirement?.durationMinutes ?? 60),
      )
    : String(requirement?.durationMinutes ?? 60);
  const teacherValue = state.values
    ? readFormString(state.values.teacherId, requirement?.teacherId ?? "")
    : (requirement?.teacherId ?? "");
  const roomValue = state.values
    ? readFormString(
        state.values.preferredRoomId,
        requirement?.preferredRoomId ?? "",
      )
    : (requirement?.preferredRoomId ?? "");
  const activeRooms = rooms.filter((room) => room.isActive);

  function applyQuickDuration(minutes: number) {
    if (durationRef.current) {
      durationRef.current.value = String(minutes);
    }
  }

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-4">
      <input type="hidden" name="courseId" value={course.id} />
      {mode === "edit" && requirement ? (
        <input type="hidden" name="requirementId" value={requirement.id} />
      ) : null}

      <FormError
        message={state.status === "error" ? state.message : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          id={`${fieldId}-type`}
          name="sessionType"
          label={labels.typeLabel}
          defaultValue={typeValue}
          error={fieldErrors.sessionType}
          required
        >
          {SESSION_TYPES.map((type) => (
            <option key={type} value={type}>
              {sessionTypeLabel(type)}
            </option>
          ))}
        </SelectField>

        <FormField
          id={`${fieldId}-group`}
          name="groupLabel"
          label={labels.groupLabel}
          placeholder={labels.groupPlaceholder}
          hint={labels.groupHint}
          defaultValue={groupValue}
          maxLength={20}
          error={fieldErrors.groupLabel}
        />

        <SelectField
          id={`${fieldId}-sessions`}
          name="sessionsPerWeek"
          label={labels.sessionsLabel}
          defaultValue={sessionsValue}
          error={fieldErrors.sessionsPerWeek}
          required
        >
          {SESSIONS_PER_WEEK.map((count) => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </SelectField>
      </div>

      <div>
        <FormField
          id={`${fieldId}-duration`}
          name="durationMinutes"
          type="number"
          label={labels.durationLabel}
          hint={labels.durationHint}
          defaultValue={durationValue}
          inputRef={durationRef}
          min={30}
          max={240}
          step={15}
          error={fieldErrors.durationMinutes}
          required
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-600">
            {labels.quickDurationsLabel} :
          </span>
          {QUICK_DURATIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => applyQuickDuration(minutes)}
              className="inline-flex min-h-8 items-center justify-center rounded-lg border border-primary/20 bg-white px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {labels.quickDuration.replace("{minutes}", String(minutes))}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id={`${fieldId}-teacher`}
          name="teacherId"
          label={labels.teacherLabel}
          hint={labels.teacherHint}
          defaultValue={teacherValue}
          error={fieldErrors.teacherId}
        >
          <option value="">{labels.teacherDefault}</option>
          {course.teachers.map((teacher) => (
            <option key={teacher.userId} value={teacher.userId}>
              {teacher.fullName}
            </option>
          ))}
        </SelectField>

        <SelectField
          id={`${fieldId}-room`}
          name="preferredRoomId"
          label={labels.roomLabel}
          defaultValue={roomValue}
          error={fieldErrors.preferredRoomId}
        >
          <option value="">{labels.roomDefault}</option>
          {activeRooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </SelectField>
      </div>

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

export function RequirementManager({
  course,
  requirements,
  rooms,
}: {
  course: ManagementCourse;
  requirements: CourseRequirement[];
  rooms: Room[];
}) {
  const labels = fr.app.timetable.requirements;
  const [editing, setEditing] = useState<CourseRequirement | null>(null);
  const summary = computeRequirementsProgress(requirements, []);

  return (
    <div className="mt-5 border-t border-primary/10 pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold tracking-wide text-slate-700 uppercase">
          {labels.sectionTitle}
        </h4>
        <p className="text-sm font-semibold text-primary">
          {labels.summary.replace(
            "{hours}",
            formatWeeklyHours(summary.totalWeeklyMinutes),
          )}
        </p>
      </div>

      {editing ? (
        <div className="mt-4 rounded-xl border border-primary/10 bg-background p-4">
          <h5 className="text-base font-semibold text-primary">
            {labels.editTitle}
          </h5>
          <div className="mt-3">
            <RequirementForm
              mode="edit"
              course={course}
              requirement={editing}
              rooms={rooms}
              onSuccess={() => setEditing(null)}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      ) : null}

      {requirements.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {labels.empty}
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse text-sm">
            <caption className="sr-only">{labels.table.caption}</caption>
            <thead>
              <tr className="border-b border-primary/10 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase">
                <th scope="col" className="px-2 py-2">
                  {labels.table.type}
                </th>
                <th scope="col" className="px-2 py-2">
                  {labels.table.group}
                </th>
                <th scope="col" className="px-2 py-2">
                  {labels.table.sessions}
                </th>
                <th scope="col" className="px-2 py-2">
                  {labels.table.duration}
                </th>
                <th scope="col" className="px-2 py-2">
                  {labels.table.teacher}
                </th>
                <th scope="col" className="px-2 py-2">
                  {labels.table.room}
                </th>
                <th scope="col" className="px-2 py-2">
                  {labels.table.actions}
                </th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((requirement) => (
                <tr
                  key={requirement.id}
                  className="border-b border-primary/5 align-top"
                >
                  <td className="px-2 py-2 font-medium text-slate-800">
                    {sessionTypeLabel(requirement.sessionType)}
                  </td>
                  <td className="px-2 py-2 text-slate-700">
                    {requirement.groupLabel || labels.none}
                  </td>
                  <td className="px-2 py-2 text-slate-700">
                    {requirement.sessionsPerWeek}
                  </td>
                  <td className="px-2 py-2 text-slate-700">
                    {requirement.durationMinutes} min
                  </td>
                  <td className="px-2 py-2 text-slate-700">
                    {requirement.teacherName || labels.teacherDefault}
                  </td>
                  <td className="px-2 py-2 text-slate-700">
                    {requirement.preferredRoomName || labels.none}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(requirement)}
                        className="inline-flex min-h-8 items-center justify-center rounded-lg border border-primary/20 bg-white px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        {labels.edit}
                      </button>

                      <ConfirmAction
                        action={deleteRequirementFormAction}
                        fields={{ requirementId: requirement.id }}
                        triggerLabel={labels.delete}
                        title={labels.deleteTitle}
                        description={labels.deleteDescription
                          .replace(
                            "{type}",
                            sessionTypeLabel(requirement.sessionType),
                          )
                          .replace("{course}", course.name)
                          .replace(
                            "{sessions}",
                            String(requirement.sessionsPerWeek),
                          )
                          .replace(
                            "{duration}",
                            String(requirement.durationMinutes),
                          )}
                        confirmLabel={labels.deleteConfirm}
                        pendingLabel={labels.deleting}
                        tone="danger"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-primary/10 bg-background p-4">
        <h5 className="text-base font-semibold text-primary">
          {labels.addTitle}
        </h5>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {labels.addDescription}
        </p>
        <div className="mt-3">
          <RequirementForm mode="create" course={course} rooms={rooms} />
        </div>
      </div>
    </div>
  );
}
