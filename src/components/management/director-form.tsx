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
import { addDirector } from "@/lib/management/program-actions";

export function DirectorForm({ programId }: { programId: string }) {
  const [state, formAction] = useActionState(
    addDirector,
    initialManagementActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const labels = fr.app.management.admin.programDetail;
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
        id="director-email"
        name="email"
        type="email"
        label={labels.directorEmail}
        placeholder={labels.directorEmailPlaceholder}
        defaultValue={readFormString(state.values?.email)}
        error={state.fieldErrors?.email}
        autoComplete="email"
        spellCheck={false}
        required
      />

      <ManagementSubmitButton
        label={labels.addDirector}
        pendingLabel={fr.app.management.admin.common.adding}
      />
    </form>
  );
}
