"use client";

import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import { ConfirmAction } from "@/components/management/confirm-action";
import { useFormFeedback } from "@/components/management/feedback";
import { FormError } from "@/components/management/form-error";
import { fr } from "@/content/fr";
import { initialManagementActionState } from "@/lib/management/action-state";
import {
  deleteTimetableEntryFormAction,
  setTimetableStatusFormAction,
} from "@/lib/timetable/actions";
import { formatTimeRange, weekdayLabel } from "@/lib/timetable/format";
import type {
  Room,
  TimetableCourse,
  TimetableSession,
} from "@/lib/timetable/types";
import { SessionFormDialog } from "./session-form";
import { TimetableGrid } from "./timetable-grid";

function countLabel(one: string, many: string, count: number): string {
  return count === 1 ? one : many.replace("{count}", String(count));
}

function statusDescription(
  count: number,
  one: string,
  many: string,
  none: string,
): string {
  if (count === 0) {
    return none;
  }

  return count === 1 ? one : many.replace("{count}", String(count));
}

function DeleteSessionDialog({
  session,
  onClose,
  onDeleted,
}: {
  session: TimetableSession;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const labels = fr.app.timetable.management;
  const [state, formAction, pending] = useActionState(
    deleteTimetableEntryFormAction,
    initialManagementActionState,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const deletedRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  useFormFeedback(state);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  useEffect(() => {
    if (state.status === "success" && !deletedRef.current) {
      deletedRef.current = true;
      onDeleted();
    }
  }, [state, onDeleted]);

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleDialogClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      closeDialog();
    }
  }

  const description = labels.deleteDescription
    .replace("{course}", session.courseName)
    .replace("{day}", weekdayLabel(session.weekday))
    .replace(
      "{time}",
      formatTimeRange(session.startTime, session.endTime),
    );

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onClose}
      onClick={handleDialogClick}
      className="fixed inset-0 m-auto w-[min(32rem,92vw)] max-w-none rounded-2xl border border-primary/10 bg-white p-0 text-foreground shadow-2xl backdrop:bg-slate-950/60"
    >
      <div className="p-6">
        <h2
          id={titleId}
          className="text-xl font-bold tracking-tight text-primary"
        >
          {labels.deleteTitle}
        </h2>
        <p id={descriptionId} className="mt-3 text-sm leading-6 text-slate-700">
          {description}
        </p>

        <form
          action={formAction}
          aria-busy={pending}
          className="mt-5 space-y-4"
        >
          <input type="hidden" name="entryId" value={session.id} />

          <FormError
            message={state.status === "error" ? state.message : undefined}
          />

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeDialog}
              disabled={pending}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
            >
              {fr.app.management.admin.common.cancel}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
            >
              {pending ? labels.deleting : labels.deleteConfirm}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

export function TimetableBoard({
  classId,
  semester,
  sessions,
  courses,
  rooms,
  drafts,
  published,
}: {
  classId: string;
  semester: number;
  sessions: TimetableSession[];
  courses: TimetableCourse[];
  rooms: Room[];
  drafts: number;
  published: number;
}) {
  const labels = fr.app.timetable.management;
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TimetableSession | null>(null);
  const [deleting, setDeleting] = useState<TimetableSession | null>(null);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(session: TimetableSession) {
    setEditing(session);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
  }

  function handleSaved() {
    setFormOpen(false);
    router.refresh();
  }

  function handleDeleted() {
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="mt-8">
      <div className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-primary">
              {labels.countsTitle}
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                {countLabel(
                  labels.draftCountOne,
                  labels.draftCountMany,
                  drafts,
                )}
              </span>
              <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
                {countLabel(
                  labels.publishedCountOne,
                  labels.publishedCountMany,
                  published,
                )}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {labels.addSession}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-primary/10 pt-4">
          <ConfirmAction
            action={setTimetableStatusFormAction}
            fields={{
              classId,
              semester: String(semester),
              status: "published",
            }}
            triggerLabel={labels.publish}
            title={labels.publishTitle}
            description={statusDescription(
              drafts,
              labels.publishDescriptionOne,
              labels.publishDescriptionMany,
              labels.noChange,
            )}
            confirmLabel={labels.publishConfirm}
            pendingLabel={labels.processing}
          />

          <ConfirmAction
            action={setTimetableStatusFormAction}
            fields={{
              classId,
              semester: String(semester),
              status: "draft",
            }}
            triggerLabel={labels.unpublish}
            title={labels.unpublishTitle}
            description={statusDescription(
              published,
              labels.unpublishDescriptionOne,
              labels.unpublishDescriptionMany,
              labels.noChange,
            )}
            confirmLabel={labels.unpublishConfirm}
            pendingLabel={labels.processing}
          />
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-primary/10 bg-white p-6 text-sm leading-6 text-slate-600 shadow-sm">
          {labels.empty}
        </div>
      ) : (
        <div className="mt-6">
          <TimetableGrid
            sessions={sessions}
            onSelect={openEdit}
            caption={fr.app.timetable.view.gridCaption}
          />
        </div>
      )}

      {formOpen ? (
        <SessionFormDialog
          key={editing?.id ?? "new"}
          classId={classId}
          semester={semester}
          courses={courses}
          rooms={rooms}
          session={editing}
          onClose={closeForm}
          onSaved={handleSaved}
          onRequestDelete={
            editing
              ? () => {
                  setDeleting(editing);
                }
              : undefined
          }
        />
      ) : null}

      {deleting ? (
        <DeleteSessionDialog
          session={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={handleDeleted}
        />
      ) : null}
    </div>
  );
}
