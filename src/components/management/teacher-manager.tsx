"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormField } from "@/components/form-field";
import { ConfirmAction } from "@/components/management/confirm-action";
import { useFormFeedback } from "@/components/management/feedback";
import { FormError } from "@/components/management/form-error";
import { ManagementSubmitButton } from "@/components/management/submit-button";
import { fr } from "@/content/fr";
import { initialManagementActionState } from "@/lib/management/action-state";
import type { ManagementTeacher } from "@/lib/management/teacher-data";
import {
  addTeacherRole,
  removeTeacherRole,
} from "@/lib/management/teacher-actions";

export function TeacherManager({
  teachers,
}: {
  teachers: ManagementTeacher[];
}) {
  const [state, formAction] = useActionState(
    addTeacherRole,
    initialManagementActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const labels = fr.app.management.teachers;
  const fieldErrors = state.fieldErrors ?? {};
  useFormFeedback(state);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight text-primary">
          {labels.addTitle}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {labels.addDescription}
        </p>

        <form
          ref={formRef}
          action={formAction}
          noValidate
          className="mt-5 space-y-4"
        >
          <FormError
            message={state.status === "error" ? state.message : undefined}
          />

          <FormField
            id="teacher-email"
            name="email"
            type="email"
            label={labels.emailLabel}
            placeholder={labels.emailPlaceholder}
            error={fieldErrors.email}
            autoComplete="email"
            required
          />

          <ManagementSubmitButton
            label={labels.addSubmit}
            pendingLabel={labels.adding}
          />
        </form>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight text-primary">
          {labels.listTitle}
        </h2>

        {teachers.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-primary/20 bg-white px-5 py-8 text-center text-sm leading-6 text-slate-600">
            {labels.empty}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {teachers.map((teacher) => {
              const displayName =
                teacher.fullName || fr.app.management.admin.common.none;

              return (
                <li
                  key={teacher.userId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-white p-4 shadow-sm"
                >
                  <p className="font-medium text-slate-900">{displayName}</p>

                  <ConfirmAction
                    action={removeTeacherRole}
                    fields={{ userId: teacher.userId }}
                    triggerLabel={labels.remove}
                    title={labels.removeTitle}
                    description={labels.removeDescription.replace(
                      "{name}",
                      displayName,
                    )}
                    confirmLabel={labels.removeConfirm}
                    pendingLabel={labels.removing}
                    tone="danger"
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
