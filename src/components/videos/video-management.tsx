"use client";

import { useActionState, useState } from "react";
import { FormField } from "@/components/form-field";
import { ConfirmAction } from "@/components/management/confirm-action";
import { useFormFeedback } from "@/components/management/feedback";
import { FormError } from "@/components/management/form-error";
import { TextAreaField } from "@/components/management/form-fields";
import { ManagementSubmitButton } from "@/components/management/submit-button";
import { fr } from "@/content/fr";
import {
  DOCUMENT_DESCRIPTION_MAX,
  DOCUMENT_TITLE_MAX,
} from "@/lib/documents/validation";
import { initialManagementActionState } from "@/lib/management/action-state";
import {
  deleteVideoFormAction,
  setVideoStatusFormAction,
  updateVideoFormAction,
} from "@/lib/videos/actions";
import type { DocumentStatus } from "@/lib/documents/types";
import { VIDEO_POSITION_MAX } from "@/lib/videos/types";

type VideoManagementProps = {
  videoId: string;
  title: string;
  description: string | null;
  position: number;
  status: DocumentStatus;
};

export function VideoManagement({
  videoId,
  title,
  description,
  position,
  status,
}: VideoManagementProps) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState(
    async (
      previousState: Parameters<typeof updateVideoFormAction>[0],
      formData: FormData,
    ) => {
      const nextState = await updateVideoFormAction(
        previousState,
        formData,
      );

      if (nextState.status === "success") {
        setEditing(false);
      }

      return nextState;
    },
    initialManagementActionState,
  );
  const labels = fr.app.videos.management;
  useFormFeedback(state);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-primary/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {editing ? labels.cancel : labels.edit}
        </button>

        {status === "approved" ? (
          <ConfirmAction
            action={setVideoStatusFormAction}
            fields={{ videoId, status: "rejected" }}
            triggerLabel={labels.hide}
            title={labels.hideTitle}
            description={labels.hideDescription.replace("{title}", title)}
            confirmLabel={labels.hideConfirm}
            pendingLabel={labels.processing}
            tone="danger"
          />
        ) : (
          <ConfirmAction
            action={setVideoStatusFormAction}
            fields={{ videoId, status: "approved" }}
            triggerLabel={labels.show}
            title={labels.showTitle}
            description={labels.showDescription.replace("{title}", title)}
            confirmLabel={labels.showConfirm}
            pendingLabel={labels.processing}
            tone="primary"
          />
        )}

        <ConfirmAction
          action={deleteVideoFormAction}
          fields={{ videoId }}
          triggerLabel={labels.delete}
          title={labels.deleteTitle}
          description={labels.deleteDescription.replace("{title}", title)}
          confirmLabel={labels.deleteConfirm}
          pendingLabel={labels.deleting}
          tone="danger"
        />
      </div>

      {editing ? (
        <form
          action={formAction}
          noValidate
          className="mt-4 space-y-3 rounded-xl border border-primary/10 bg-background p-4"
        >
          <input type="hidden" name="videoId" value={videoId} />

          <FormError
            message={state.status === "error" ? state.message : undefined}
          />

          <FormField
            id={`video-edit-title-${videoId}`}
            name="title"
            label={fr.app.videos.add.fields.title}
            defaultValue={title}
            maxLength={DOCUMENT_TITLE_MAX}
            required
          />

          <TextAreaField
            id={`video-edit-description-${videoId}`}
            name="description"
            label={fr.app.videos.add.fields.description}
            defaultValue={description ?? ""}
            maxLength={DOCUMENT_DESCRIPTION_MAX}
          />

          <FormField
            id={`video-edit-position-${videoId}`}
            name="position"
            type="number"
            label={labels.positionLabel}
            hint={labels.positionHint}
            defaultValue={String(position)}
            min={0}
            max={VIDEO_POSITION_MAX}
            step={1}
            required
          />

          <ManagementSubmitButton
            label={labels.save}
            pendingLabel={labels.saving}
          />
        </form>
      ) : null}
    </div>
  );
}
