"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { fr } from "@/content/fr";
import { useFormFeedback } from "@/components/management/feedback";
import {
  initialManagementActionState,
  type ManagementAction,
} from "@/lib/management/action-state";

export function ConfirmAction({
  action,
  fields,
  triggerLabel,
  title,
  description,
  confirmLabel,
  pendingLabel,
  tone = "primary",
}: {
  action: ManagementAction;
  fields: Record<string, string>;
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel?: string;
  tone?: "primary" | "danger";
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialManagementActionState,
  );
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const labels = fr.app.management.admin.common;
  useFormFeedback(state);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (state.status === "success" && dialogRef.current?.open) {
      dialogRef.current.close();
    }
  }, [state]);

  function closeDialog() {
    setOpen(false);
  }

  function handleDialogClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      closeDialog();
    }
  }

  const triggerClasses =
    tone === "danger"
      ? "inline-flex min-h-9 items-center justify-center rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
      : "inline-flex min-h-9 items-center justify-center rounded-lg border border-primary/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60";
  const confirmClasses =
    tone === "danger"
      ? "inline-flex min-h-10 items-center justify-center rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
      : "inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClasses}
      >
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClose={closeDialog}
        onClick={handleDialogClick}
        className="fixed inset-0 m-auto w-[min(32rem,92vw)] max-w-none rounded-2xl border border-primary/10 bg-white p-0 text-foreground shadow-2xl backdrop:bg-slate-950/60"
      >
        <div className="p-6">
          <h2
            id={titleId}
            className="text-xl font-bold tracking-tight text-primary"
          >
            {title}
          </h2>

          <p
            id={descriptionId}
            className="mt-3 text-sm leading-6 text-slate-700"
          >
            {description}
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
            {Object.entries(fields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <button
              ref={cancelRef}
              type="button"
              onClick={closeDialog}
              disabled={pending}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
            >
              {labels.cancel}
            </button>
            <button
              type="submit"
              disabled={pending}
              className={confirmClasses}
            >
              {pending ? (pendingLabel ?? labels.saving) : confirmLabel}
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
