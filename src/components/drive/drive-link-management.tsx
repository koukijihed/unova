"use client";

import { useActionState, useState } from "react";
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
  deleteDriveLinkFormAction,
  setDriveLinkStatusFormAction,
  updateDriveLinkFormAction,
} from "@/lib/drive/actions";
import {
  DOCUMENT_CATEGORIES,
  type DocumentCategory,
  type DocumentStatus,
} from "@/lib/documents/types";
import {
  DOCUMENT_DESCRIPTION_MAX,
  DOCUMENT_TITLE_MAX,
} from "@/lib/documents/validation";
import { initialManagementActionState } from "@/lib/management/action-state";

type DriveLinkManagementProps = {
  linkId: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  status: DocumentStatus;
};

export function DriveLinkManagement({
  linkId,
  title,
  description,
  category,
  status,
}: DriveLinkManagementProps) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState(
    async (
      previousState: Parameters<typeof updateDriveLinkFormAction>[0],
      formData: FormData,
    ) => {
      const nextState = await updateDriveLinkFormAction(
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
  const labels = fr.app.driveLinks.management;
  const categories = fr.app.documents.categories;
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
            action={setDriveLinkStatusFormAction}
            fields={{ driveLinkId: linkId, status: "rejected" }}
            triggerLabel={labels.hide}
            title={labels.hideTitle}
            description={labels.hideDescription.replace("{title}", title)}
            confirmLabel={labels.hideConfirm}
            pendingLabel={labels.processing}
            tone="danger"
          />
        ) : (
          <ConfirmAction
            action={setDriveLinkStatusFormAction}
            fields={{ driveLinkId: linkId, status: "approved" }}
            triggerLabel={labels.show}
            title={labels.showTitle}
            description={labels.showDescription.replace("{title}", title)}
            confirmLabel={labels.showConfirm}
            pendingLabel={labels.processing}
            tone="primary"
          />
        )}

        <ConfirmAction
          action={deleteDriveLinkFormAction}
          fields={{ driveLinkId: linkId }}
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
          <input type="hidden" name="driveLinkId" value={linkId} />

          <FormError
            message={state.status === "error" ? state.message : undefined}
          />

          <FormField
            id={`drive-link-edit-title-${linkId}`}
            name="title"
            label={fr.app.driveLinks.add.fields.title}
            defaultValue={title}
            maxLength={DOCUMENT_TITLE_MAX}
            required
          />

          <TextAreaField
            id={`drive-link-edit-description-${linkId}`}
            name="description"
            label={fr.app.driveLinks.add.fields.description}
            defaultValue={description ?? ""}
            maxLength={DOCUMENT_DESCRIPTION_MAX}
          />

          <SelectField
            id={`drive-link-edit-category-${linkId}`}
            name="category"
            label={fr.app.driveLinks.add.fields.category}
            defaultValue={category}
          >
            {DOCUMENT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {categories[value]}
              </option>
            ))}
          </SelectField>

          <ManagementSubmitButton
            label={labels.save}
            pendingLabel={labels.saving}
          />
        </form>
      ) : null}
    </div>
  );
}
