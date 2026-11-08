"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { FormField } from "@/components/form-field";
import { ConfirmAction } from "@/components/management/confirm-action";
import { useFormFeedback } from "@/components/management/feedback";
import { FormError } from "@/components/management/form-error";
import {
  SelectField,
  TextAreaField,
} from "@/components/management/form-fields";
import { ManagementSubmitButton } from "@/components/management/submit-button";
import { fr } from "@/content/fr";
import {
  initialManagementActionState,
  readFormString,
} from "@/lib/management/action-state";
import type { ManagementCourse } from "@/lib/management/course-data";
import {
  addCourseTeacher,
  createCourse,
  removeCourseTeacher,
  setCourseActive,
  updateCourse,
} from "@/lib/management/course-actions";

const SEMESTERS = Array.from({ length: 10 }, (_, index) => index + 1);

function CourseForm({
  mode,
  classId,
  course,
  onSuccess,
  onCancel,
}: {
  mode: "create" | "edit";
  classId: string;
  course?: ManagementCourse;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [state, formAction] = useActionState(
    mode === "create" ? createCourse : updateCourse,
    initialManagementActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const labels = fr.app.management.courses;
  const common = fr.app.management.admin.common;
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

  const nameValue =
    readFormString(state.values?.name) || course?.name || "";
  const semesterValue = state.values
    ? readFormString(state.values.semester)
    : course?.semester
      ? String(course.semester)
      : "";
  const descriptionValue = state.values
    ? readFormString(state.values.description)
    : (course?.description ?? "");
  const fieldId = `course-${mode}-${course?.id ?? "new"}`;

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-4">
      {mode === "edit" && course ? (
        <input type="hidden" name="courseId" value={course.id} />
      ) : (
        <input type="hidden" name="classId" value={classId} />
      )}

      <FormError
        message={state.status === "error" ? state.message : undefined}
      />

      <FormField
        id={`${fieldId}-name`}
        name="name"
        label={labels.fields.name}
        placeholder={labels.fields.namePlaceholder}
        defaultValue={nameValue}
        error={fieldErrors.name}
        maxLength={200}
        required
      />

      <SelectField
        id={`${fieldId}-semester`}
        name="semester"
        label={labels.fields.semester}
        defaultValue={semesterValue}
        error={fieldErrors.semester}
      >
        <option value="">{labels.fields.semesterPlaceholder}</option>
        {SEMESTERS.map((semester) => (
          <option key={semester} value={semester}>
            {semester}
          </option>
        ))}
      </SelectField>

      <TextAreaField
        id={`${fieldId}-description`}
        name="description"
        label={labels.fields.description}
        placeholder={labels.fields.descriptionPlaceholder}
        defaultValue={descriptionValue}
        error={fieldErrors.description}
        maxLength={2000}
      />

      <div className="flex flex-wrap items-center gap-3">
        <ManagementSubmitButton
          label={mode === "create" ? common.add : common.save}
          pendingLabel={mode === "create" ? common.adding : common.saving}
        />

        {mode === "edit" && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {labels.actions.cancelEdit}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function CourseTeacherForm({ course }: { course: ManagementCourse }) {
  const [state, formAction] = useActionState(
    addCourseTeacher,
    initialManagementActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const labels = fr.app.management.courses.teachers;
  const fieldErrors = state.fieldErrors ?? {};
  useFormFeedback(state);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      className="mt-4 space-y-3"
    >
      <input type="hidden" name="courseId" value={course.id} />

      <FormError
        message={state.status === "error" ? state.message : undefined}
      />

      <FormField
        id={`course-teacher-email-${course.id}`}
        name="email"
        type="email"
        label={labels.addLabel}
        placeholder={labels.addPlaceholder}
        error={fieldErrors.email}
        autoComplete="off"
        required
      />

      <ManagementSubmitButton
        label={labels.addSubmit}
        pendingLabel={labels.adding}
      />
    </form>
  );
}

function CourseItem({ course }: { course: ManagementCourse }) {
  const [editing, setEditing] = useState(false);
  const labels = fr.app.management.courses;
  const teacherLabels = labels.teachers;

  if (editing) {
    return (
      <li className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-primary">
          {labels.editTitle}
        </h3>
        <div className="mt-4">
          <CourseForm
            mode="edit"
            classId=""
            course={course}
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
          <h3 className="text-lg font-semibold text-primary">
            {course.name}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                course.isActive
                  ? "border border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border border-amber-300 bg-amber-50 text-amber-900"
              }`}
            >
              {course.isActive ? labels.badges.active : labels.badges.inactive}
            </span>

            {course.semester ? (
              <span className="inline-flex items-center rounded-full border border-primary/10 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {fr.app.courses.semesterValue.replace(
                  "{semester}",
                  String(course.semester),
                )}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-primary/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {labels.actions.edit}
          </button>

          <ConfirmAction
            action={setCourseActive}
            fields={{
              courseId: course.id,
              active: course.isActive ? "false" : "true",
            }}
            triggerLabel={
              course.isActive
                ? labels.actions.deactivate
                : labels.actions.activate
            }
            title={
              course.isActive
                ? labels.actions.deactivateTitle
                : labels.actions.activateTitle
            }
            description={(
              course.isActive
                ? labels.actions.deactivateDescription
                : labels.actions.activateDescription
            ).replace("{name}", course.name)}
            confirmLabel={
              course.isActive
                ? labels.actions.deactivateConfirm
                : labels.actions.activateConfirm
            }
            pendingLabel={labels.actions.processing}
            tone={course.isActive ? "danger" : "primary"}
          />
        </div>
      </div>

      {course.description ? (
        <p className="mt-3 text-sm leading-6 whitespace-pre-line text-slate-600">
          {course.description}
        </p>
      ) : null}

      <div className="mt-5 border-t border-primary/10 pt-4">
        <h4 className="text-sm font-semibold tracking-wide text-slate-700 uppercase">
          {teacherLabels.title}
        </h4>

        {course.teachers.length === 0 ? (
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {teacherLabels.empty}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {course.teachers.map((teacher) => {
              const displayName =
                teacher.fullName || fr.app.management.admin.common.none;

              return (
                <li
                  key={teacher.userId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/10 bg-background px-3 py-2"
                >
                  <span className="text-sm font-medium text-slate-800">
                    {displayName}
                  </span>

                  <ConfirmAction
                    action={removeCourseTeacher}
                    fields={{
                      courseId: course.id,
                      userId: teacher.userId,
                    }}
                    triggerLabel={teacherLabels.remove}
                    title={teacherLabels.removeTitle}
                    description={teacherLabels.removeDescription
                      .replace("{name}", displayName)
                      .replace("{course}", course.name)}
                    confirmLabel={teacherLabels.removeConfirm}
                    pendingLabel={teacherLabels.removing}
                    tone="danger"
                  />
                </li>
              );
            })}
          </ul>
        )}

        <CourseTeacherForm course={course} />
      </div>
    </li>
  );
}

export function CourseManager({
  classId,
  courses,
}: {
  classId: string;
  courses: ManagementCourse[];
}) {
  const labels = fr.app.management.courses;

  return (
    <div className="mt-6 space-y-8">
      <section className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight text-primary">
          {labels.createTitle}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {labels.createDescription}
        </p>

        <div className="mt-5">
          <CourseForm mode="create" classId={classId} />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight text-primary">
          {labels.listTitle}
        </h2>

        {courses.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-primary/20 bg-white px-5 py-8 text-center text-sm leading-6 text-slate-600">
            {labels.noCourses}
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {courses.map((course) => (
              <CourseItem key={course.id} course={course} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
