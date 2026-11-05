"use client";

import { useActionState } from "react";
import { fr } from "@/content/fr";
import { initialManagementActionState } from "@/lib/management/action-state";
import { setEnrollmentStatus } from "@/lib/management/actions";
import type { EnrollmentStatus } from "@/lib/types";

const BUTTON_BASE =
  "inline-flex min-h-9 items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60";

const PRIMARY_BUTTON = `${BUTTON_BASE} bg-primary text-white hover:bg-primary/90`;
const REJECT_BUTTON = `${BUTTON_BASE} border border-red-300 bg-white text-red-700 hover:bg-red-50`;
const SECONDARY_BUTTON = `${BUTTON_BASE} border border-primary/20 bg-white text-primary hover:bg-primary/5`;

export function EnrollmentActions({
  enrollmentId,
  status,
  studentName,
}: {
  enrollmentId: string;
  status: EnrollmentStatus | null;
  studentName: string;
}) {
  const [state, formAction, pending] = useActionState(
    setEnrollmentStatus,
    initialManagementActionState,
  );
  const labels = fr.app.management.students.actions;
  const labelFor = (action: string) =>
    labels.actionFor
      .replace("{action}", action)
      .replace("{name}", studentName);
  const canAct = status === "pending" || status === "rejected";

  return (
    <div className="space-y-2">
      {canAct ? (
        <form
          action={formAction}
          aria-busy={pending}
          className="flex flex-wrap gap-2"
        >
          <input type="hidden" name="enrollmentId" value={enrollmentId} />

          {status === "pending" ? (
            <>
              <button
                type="submit"
                name="status"
                value="accepted"
                disabled={pending}
                aria-label={labelFor(labels.accept)}
                className={PRIMARY_BUTTON}
              >
                {labels.accept}
              </button>
              <button
                type="submit"
                name="status"
                value="rejected"
                disabled={pending}
                aria-label={labelFor(labels.reject)}
                className={REJECT_BUTTON}
              >
                {labels.reject}
              </button>
            </>
          ) : (
            <>
              <button
                type="submit"
                name="status"
                value="pending"
                disabled={pending}
                aria-label={labelFor(labels.reset)}
                className={SECONDARY_BUTTON}
              >
                {labels.reset}
              </button>
              <button
                type="submit"
                name="status"
                value="accepted"
                disabled={pending}
                aria-label={labelFor(labels.accept)}
                className={PRIMARY_BUTTON}
              >
                {labels.accept}
              </button>
            </>
          )}
        </form>
      ) : state.status === "idle" ? (
        <span className="text-xs text-slate-500">
          <span aria-hidden="true">—</span>
          <span className="sr-only">{labels.noActions}</span>
        </span>
      ) : null}

      {state.status !== "idle" && state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`text-xs leading-5 ${
            state.status === "error" ? "text-red-700" : "text-emerald-800"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
