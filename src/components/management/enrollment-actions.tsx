"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
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
  const [rejectOpen, setRejectOpen] = useState(false);
  const rejectDialogRef = useRef<HTMLDialogElement>(null);
  const rejectCancelRef = useRef<HTMLButtonElement>(null);
  const rejectTitleId = useId();
  const rejectDescriptionId = useId();
  const labels = fr.app.management.students.actions;
  const labelFor = (action: string) =>
    labels.actionFor
      .replace("{action}", action)
      .replace("{name}", studentName);
  const canAct =
    status === "pending" || status === "accepted" || status === "rejected";

  useEffect(() => {
    const dialog = rejectDialogRef.current;

    if (!dialog) {
      return;
    }

    if (rejectOpen && !dialog.open) {
      dialog.showModal();
      rejectCancelRef.current?.focus();
    } else if (!rejectOpen && dialog.open) {
      dialog.close();
    }
  }, [rejectOpen]);

  useEffect(() => {
    if (state.status === "success") {
      const dialog = rejectDialogRef.current;

      if (dialog?.open) {
        dialog.close();
      }
    }
  }, [state]);

  function closeRejectDialog() {
    setRejectOpen(false);
  }

  function handleRejectDialogClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === rejectDialogRef.current) {
      closeRejectDialog();
    }
  }

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
          ) : status === "accepted" ? (
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
                type="button"
                onClick={() => setRejectOpen(true)}
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

      {status === "accepted" ? (
        <dialog
          ref={rejectDialogRef}
          aria-labelledby={rejectTitleId}
          aria-describedby={rejectDescriptionId}
          onClose={closeRejectDialog}
          onClick={handleRejectDialogClick}
          className="fixed inset-0 m-auto w-[min(32rem,92vw)] max-w-none rounded-2xl border border-primary/10 bg-white p-0 text-foreground shadow-2xl backdrop:bg-slate-950/60"
        >
          <div className="p-6">
            <h2
              id={rejectTitleId}
              className="text-xl font-bold tracking-tight text-primary"
            >
              {labels.rejectTitle}
            </h2>

            <p
              id={rejectDescriptionId}
              className="mt-3 text-sm leading-6 text-slate-700"
            >
              {labels.rejectDescription.replace("{name}", studentName)}
            </p>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              {labels.rejectHint}
            </p>

            {state.status === "error" && state.message ? (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {state.message}
              </p>
            ) : null}

            <form
              action={formAction}
              aria-busy={pending}
              className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
            >
              <input type="hidden" name="enrollmentId" value={enrollmentId} />
              <input type="hidden" name="status" value="rejected" />
              <button
                ref={rejectCancelRef}
                type="button"
                onClick={closeRejectDialog}
                disabled={pending}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
              >
                {labels.rejectCancel}
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
              >
                {pending ? labels.processing : labels.rejectConfirm}
              </button>
            </form>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
