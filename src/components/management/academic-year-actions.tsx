"use client";

import { useActionState } from "react";
import { ConfirmAction } from "@/components/management/confirm-action";
import { useFormFeedback } from "@/components/management/feedback";
import { fr } from "@/content/fr";
import { initialManagementActionState } from "@/lib/management/action-state";
import {
  setCurrentAcademicYear,
  toggleEnrollmentOpen,
} from "@/lib/management/academic-year-actions";

export function AcademicYearActions({
  yearId,
  isCurrent,
  enrollmentOpen,
}: {
  yearId: string;
  isCurrent: boolean;
  enrollmentOpen: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    toggleEnrollmentOpen,
    initialManagementActionState,
  );
  const labels = fr.app.management.admin.years;
  const common = fr.app.management.admin.common;
  useFormFeedback(state);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!isCurrent ? (
        <ConfirmAction
          action={setCurrentAcademicYear}
          fields={{ yearId }}
          triggerLabel={labels.setCurrent}
          title={labels.setCurrentTitle}
          description={labels.setCurrentDescription}
          confirmLabel={labels.setCurrentConfirm}
        />
      ) : null}

      <form action={formAction} aria-busy={pending}>
        <input type="hidden" name="yearId" value={yearId} />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-primary/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
        >
          {pending
            ? common.saving
            : enrollmentOpen
              ? labels.closeEnrollments
              : labels.openEnrollments}
        </button>
      </form>
    </div>
  );
}
