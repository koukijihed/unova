"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormField } from "@/components/form-field";
import { FormError } from "@/components/management/form-error";
import { useFormFeedback } from "@/components/management/feedback";
import { ManagementSubmitButton } from "@/components/management/submit-button";
import { fr } from "@/content/fr";
import {
  initialManagementActionState,
  readFormString,
} from "@/lib/management/action-state";
import { createAcademicYear } from "@/lib/management/academic-year-actions";

export function AcademicYearForm() {
  const [state, formAction] = useActionState(
    createAcademicYear,
    initialManagementActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const labels = fr.app.management.admin.years;
  const common = fr.app.management.admin.common;
  useFormFeedback(state);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <FormError
        message={state.status === "error" ? state.message : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          id="year-label"
          name="label"
          label={labels.fields.label}
          placeholder={labels.fields.labelPlaceholder}
          defaultValue={readFormString(state.values?.label)}
          error={state.fieldErrors?.label}
          maxLength={9}
          required
        />

        <FormField
          id="year-starts-on"
          name="startsOn"
          type="date"
          label={labels.fields.startsOn}
          defaultValue={readFormString(state.values?.startsOn)}
          error={state.fieldErrors?.startsOn}
          required
        />

        <FormField
          id="year-ends-on"
          name="endsOn"
          type="date"
          label={labels.fields.endsOn}
          defaultValue={readFormString(state.values?.endsOn)}
          error={state.fieldErrors?.endsOn}
          required
        />
      </div>

      <ManagementSubmitButton label={common.add} pendingLabel={common.adding} />
    </form>
  );
}
