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
  deleteDocument,
  setDocumentStatus,
  updateDocument,
} from "@/lib/documents/actions";
import {
  DOCUMENT_CATEGORIES,
  type DocumentCategory,
  type DocumentStatus,
} from "@/lib/documents/types";
import { initialManagementActionState } from "@/lib/management/action-state";
import {
  DOCUMENT_DESCRIPTION_MAX,
  DOCUMENT_TITLE_MAX,
} from "@/lib/documents/validation";

type DocumentManagementProps = {
  documentId: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  status: DocumentStatus;
};

export function DocumentManagement({
  documentId,
  title,
  description,
  category,
  status,
}: DocumentManagementProps) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState(
    async (
      previousState: Parameters<typeof updateDocument>[0],
      formData: FormData,
    ) => {
      const nextState = await updateDocument(previousState, formData);

      if (nextState.status === "success") {
        setEditing(false);
      }

      return nextState;
    },
    initialManagementActionState,
  );
  const labels = fr.app.documents.management;
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
            action={setDocumentStatus}
            fields={{ documentId, status: "rejected" }}
            triggerLabel={labels.hide}
            title={labels.hideTitle}
            description={labels.hideDescription.replace("{title}", title)}
            confirmLabel={labels.hideConfirm}
            pendingLabel={labels.processing}
            tone="danger"
          />
        ) : (
          <ConfirmAction
            action={setDocumentStatus}
            fields={{ documentId, status: "approved" }}
            triggerLabel={labels.show}
            title={labels.showTitle}
            description={labels.showDescription.replace("{title}", title)}
            confirmLabel={labels.showConfirm}
            pendingLabel={labels.processing}
            tone="primary"
          />
        )}

        <ConfirmAction
          action={deleteDocument}
          fields={{ documentId }}
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
          <input type="hidden" name="documentId" value={documentId} />

          <FormError
            message={state.status === "error" ? state.message : undefined}
          />

          <FormField
            id={`document-edit-title-${documentId}`}
            name="title"
            label={fr.app.documents.upload.fields.title}
            defaultValue={title}
            maxLength={DOCUMENT_TITLE_MAX}
            required
          />

          <TextAreaField
            id={`document-edit-description-${documentId}`}
            name="description"
            label={fr.app.documents.upload.fields.description}
            defaultValue={description ?? ""}
            maxLength={DOCUMENT_DESCRIPTION_MAX}
          />

          <SelectField
            id={`document-edit-category-${documentId}`}
            name="category"
            label={fr.app.documents.upload.fields.category}
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
