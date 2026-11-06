"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormField } from "@/components/form-field";
import { useFormFeedback } from "@/components/management/feedback";
import { FormError } from "@/components/management/form-error";
import { ManagementSubmitButton } from "@/components/management/submit-button";
import { fr } from "@/content/fr";
import {
  initialManagementActionState,
  readFormString,
} from "@/lib/management/action-state";
import { addTrack } from "@/lib/management/program-actions";

export function TrackForm({ programId }: { programId: string }) {
  const [state, formAction] = useActionState(
    addTrack,
    initialManagementActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const labels = fr.app.management.admin.programDetail;
  const common = fr.app.management.admin.common;
  useFormFeedback(state);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="programId" value={programId} />

      <FormError
        message={state.status === "error" ? state.message : undefined}
      />

      <FormField
        id="track-name"
        name="name"
        label={labels.trackName}
        placeholder={labels.trackNamePlaceholder}
        defaultValue={readFormString(state.values?.name)}
        error={state.fieldErrors?.name}
        maxLength={200}
        required
      />

      <ManagementSubmitButton label={common.add} pendingLabel={common.adding} />
    </form>
  );
}
