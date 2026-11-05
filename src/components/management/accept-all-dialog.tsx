"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { fr } from "@/content/fr";
import { initialManagementActionState } from "@/lib/management/action-state";
import { acceptAllEnrollments } from "@/lib/management/actions";

export function AcceptAllDialog({
  classId,
  classLabel,
  pendingCount,
}: {
  classId: string;
  classLabel: string;
  pendingCount: number;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    acceptAllEnrollments,
    initialManagementActionState,
  );
  const labels = fr.app.management.students.actions;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      cancelButtonRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (state.status === "success") {
      const dialog = dialogRef.current;

      if (dialog?.open) {
        dialog.close();
      }
    }
  }, [state]);

  const description =
    pendingCount === 1
      ? labels.acceptAllDescriptionOne
      : labels.acceptAllDescriptionMany.replace(
          "{count}",
          String(pendingCount),
        );

  function closeDialog() {
    setOpen(false);
  }

  function handleDialogClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      closeDialog();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pendingCount === 0}
        title={pendingCount === 0 ? labels.acceptAllDisabled : undefined}
        className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
      >
        {labels.acceptAll}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="accept-all-title"
        aria-describedby="accept-all-description"
        onClose={() => setOpen(false)}
        onClick={handleDialogClick}
        className="fixed inset-0 m-auto w-[min(32rem,92vw)] max-w-none rounded-2xl border border-primary/10 bg-white p-0 text-foreground shadow-2xl backdrop:bg-slate-950/60"
      >
        <div className="p-6">
          <h2
            id="accept-all-title"
            className="text-xl font-bold tracking-tight text-primary"
          >
            {labels.acceptAllTitle}
          </h2>

          <p
            id="accept-all-description"
            className="mt-3 text-sm leading-6 text-slate-700"
          >
            {description}
          </p>

          <p className="mt-2 text-sm font-medium text-slate-900">
            {classLabel}
          </p>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            {labels.acceptAllHint}
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
            <input type="hidden" name="classId" value={classId} />
            <button
              ref={cancelButtonRef}
              type="button"
              onClick={closeDialog}
              disabled={pending}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
            >
              {labels.acceptAllCancel}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
            >
              {pending ? labels.processing : labels.acceptAllConfirm}
            </button>
          </form>
        </div>
      </dialog>

      {state.status === "success" && state.message ? (
        <p role="status" className="text-sm leading-6 text-emerald-800">
          {state.message}
        </p>
      ) : null}
    </>
  );
}
