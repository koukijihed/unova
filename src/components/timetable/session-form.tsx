"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import { FormField } from "@/components/form-field";
import { useFeedback } from "@/components/management/feedback";
import { FormError } from "@/components/management/form-error";
import { SelectField } from "@/components/management/form-fields";
import { fr } from "@/content/fr";
import {
  createTimetableEntry,
  updateTimetableEntry,
  type SessionInput,
} from "@/lib/timetable/actions";
import type {
  Room,
  SessionType,
  TimetableCourse,
  TimetableSession,
} from "@/lib/timetable/types";

const DAY_START_MINUTES = 8 * 60;
const DAY_END_MINUTES = 19 * 60;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const WEEKDAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function toMinutes(value: string): number | null {
  const match = TIME_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
}

export function SessionFormDialog({
  classId,
  semester,
  courses,
  rooms,
  session,
  onClose,
  onSaved,
  onRequestDelete,
}: {
  classId: string;
  semester: number;
  courses: TimetableCourse[];
  rooms: Room[];
  session: TimetableSession | null;
  onClose: () => void;
  onSaved: () => void;
  onRequestDelete?: () => void;
}) {
  const labels = fr.app.timetable.management;
  const formLabels = labels.form;
  const { showMessage } = useFeedback();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const fieldId = useId();
  const [courseId, setCourseId] = useState(
    session?.courseId ?? courses[0]?.id ?? "",
  );
  const [sessionType, setSessionType] = useState<SessionType>(
    session?.sessionType ?? "cours",
  );
  const [groupLabel, setGroupLabel] = useState(session?.groupLabel ?? "");
  const [weekday, setWeekday] = useState(String(session?.weekday ?? 1));
  const [startTime, setStartTime] = useState(session?.startTime ?? "08:00");
  const [endTime, setEndTime] = useState(session?.endTime ?? "09:00");
  const [roomId, setRoomId] = useState(session?.roomId ?? "");
  const [teacherId, setTeacherId] = useState(session?.teacherId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  const selectedCourse = courses.find((course) => course.id === courseId);
  const teachers = selectedCourse?.teachers ?? [];
  const roomOptions = rooms.filter(
    (room) => room.isActive || room.id === session?.roomId,
  );
  const title = session ? labels.editTitle : labels.addTitle;

  function handleCourseChange(nextCourseId: string) {
    setCourseId(nextCourseId);
    const nextCourse = courses.find((course) => course.id === nextCourseId);

    if (
      teacherId &&
      !nextCourse?.teachers.some((teacher) => teacher.userId === teacherId)
    ) {
      setTeacherId("");
    }
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleDialogClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      closeDialog();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!courseId) {
      setError(formLabels.errors.courseRequired);
      return;
    }

    const weekdayNumber = Number(weekday);

    if (!Number.isInteger(weekdayNumber) || weekdayNumber < 1 || weekdayNumber > 6) {
      setError(formLabels.errors.weekdayRequired);
      return;
    }

    const startMinutes = toMinutes(startTime);
    const endMinutes = toMinutes(endTime);

    if (startMinutes === null || endMinutes === null) {
      setError(formLabels.errors.timeRequired);
      return;
    }

    if (endMinutes <= startMinutes) {
      setError(formLabels.errors.endAfterStart);
      return;
    }

    if (startMinutes < DAY_START_MINUTES || endMinutes > DAY_END_MINUTES) {
      setError(formLabels.errors.timeRange);
      return;
    }

    const input: SessionInput = {
      classId,
      courseId,
      semester,
      sessionType,
      groupLabel: groupLabel.trim(),
      weekday: weekdayNumber,
      startTime,
      endTime,
      roomId,
      teacherId,
    };

    setPending(true);
    const result = session
      ? await updateTimetableEntry({ ...input, id: session.id })
      : await createTimetableEntry(input);
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    showMessage(session ? labels.updated : labels.created);
    onSaved();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onClose}
      onClick={handleDialogClick}
      className="fixed inset-0 m-auto max-h-[92vh] w-[min(44rem,94vw)] max-w-none overflow-y-auto rounded-2xl border border-primary/10 bg-white p-0 text-foreground shadow-2xl backdrop:bg-slate-950/60"
    >
      <div className="p-6">
        <h2
          id={titleId}
          className="text-xl font-bold tracking-tight text-primary"
        >
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm leading-6 text-slate-600">
          {labels.formDescription}
        </p>

        <form
          onSubmit={handleSubmit}
          aria-busy={pending}
          noValidate
          className="mt-5 space-y-4"
        >
          <FormError message={error ?? undefined} />

          <SelectField
            id={`${fieldId}-course`}
            label={formLabels.courseLabel}
            value={courseId}
            onChange={(event) => handleCourseChange(event.target.value)}
            disabled={pending || courses.length === 0}
            required
          >
            <option value="">{formLabels.coursePlaceholder}</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </SelectField>

          {courses.length === 0 ? (
            <p className="text-sm leading-6 text-amber-800">
              {formLabels.noCourses}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id={`${fieldId}-type`}
              label={formLabels.typeLabel}
              value={sessionType}
              onChange={(event) =>
                setSessionType(event.target.value as SessionType)
              }
              disabled={pending}
              required
            >
              {(
                Object.keys(
                  fr.app.timetable.sessionTypes,
                ) as SessionType[]
              ).map((type) => (
                <option key={type} value={type}>
                  {fr.app.timetable.sessionTypes[type]}
                </option>
              ))}
            </SelectField>

            <FormField
              id={`${fieldId}-group`}
              label={formLabels.groupLabel}
              placeholder={formLabels.groupPlaceholder}
              hint={formLabels.groupHint}
              value={groupLabel}
              onChange={(event) => setGroupLabel(event.target.value)}
              maxLength={20}
              disabled={pending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField
              id={`${fieldId}-weekday`}
              label={formLabels.weekdayLabel}
              value={weekday}
              onChange={(event) => setWeekday(event.target.value)}
              disabled={pending}
              required
            >
              <option value="">{formLabels.weekdayPlaceholder}</option>
              {WEEKDAY_KEYS.map((key, index) => (
                <option key={key} value={index + 1}>
                  {fr.app.timetable.weekdays[key]}
                </option>
              ))}
            </SelectField>

            <FormField
              id={`${fieldId}-start`}
              type="time"
              label={formLabels.startLabel}
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              min="08:00"
              max="19:00"
              step={300}
              disabled={pending}
              required
            />

            <FormField
              id={`${fieldId}-end`}
              type="time"
              label={formLabels.endLabel}
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              min="08:00"
              max="19:00"
              step={300}
              disabled={pending}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id={`${fieldId}-room`}
              label={formLabels.roomLabel}
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
              disabled={pending}
            >
              <option value="">{formLabels.roomPlaceholder}</option>
              {roomOptions.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                  {room.isActive ? "" : formLabels.inactiveRoomSuffix}
                </option>
              ))}
            </SelectField>

            <SelectField
              id={`${fieldId}-teacher`}
              label={formLabels.teacherLabel}
              hint={formLabels.teacherHint}
              value={teacherId}
              onChange={(event) => setTeacherId(event.target.value)}
              disabled={pending || teachers.length === 0}
            >
              <option value="">{formLabels.teacherPlaceholder}</option>
              {teachers.map((teacher) => (
                <option key={teacher.userId} value={teacher.userId}>
                  {teacher.fullName}
                </option>
              ))}
            </SelectField>
          </div>

          {courseId && teachers.length === 0 ? (
            <p className="text-sm leading-6 text-amber-800">
              {formLabels.noTeachers}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-primary/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {session && onRequestDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    dialogRef.current?.close();
                    onRequestDelete();
                  }}
                  disabled={pending}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
                >
                  {formLabels.delete}
                </button>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={closeDialog}
                disabled={pending}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
              >
                {formLabels.cancel}
              </button>

              <button
                type="submit"
                disabled={pending || courses.length === 0}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
              >
                {pending
                  ? formLabels.submitting
                  : session
                    ? formLabels.submitUpdate
                    : formLabels.submitCreate}
              </button>
            </div>
          </div>
        </form>
      </div>
    </dialog>
  );
}
