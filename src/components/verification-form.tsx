"use client";

import { useActionState, useEffect, useRef } from "react";
import { AuthAlert } from "@/components/auth/auth-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { FormField } from "@/components/form-field";
import { fr } from "@/content/fr";
import { initialCinState } from "@/lib/cin/action-state";
import type { CinActionState } from "@/lib/cin/action-state";
import { verifyStudent } from "@/lib/cin/actions";

async function verifyStudentAction(
  _previousState: CinActionState,
  formData: FormData,
): Promise<CinActionState> {
  return verifyStudent(formData);
}

export function VerificationForm() {
  const [state, formAction] = useActionState(
    verifyStudentAction,
    initialCinState,
  );
  const cinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.status === "error") {
      cinInputRef.current?.focus();
      if (cinInputRef.current) {
        cinInputRef.current.value = "";
      }
    }
  }, [state]);

  return (
    <form action={formAction} noValidate className="space-y-5">
      {state.status === "error" && state.message ? (
        <AuthAlert tone="error">{state.message}</AuthAlert>
      ) : null}

      <FormField
        id="verification-cin"
        name="cin"
        inputRef={cinInputRef}
        label={fr.app.verification.cinLabel}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        pattern="[0-9]{8}"
        maxLength={8}
        placeholder={fr.app.verification.cinPlaceholder}
        hint={fr.app.verification.cinHint}
        error={state.fieldErrors?.cin}
        required
      />

      <FormField
        id="verification-last-name"
        name="lastName"
        label={fr.app.verification.lastNameLabel}
        type="text"
        autoComplete="family-name"
        maxLength={80}
        placeholder={fr.app.verification.lastNamePlaceholder}
        defaultValue={state.lastName ?? ""}
        error={state.fieldErrors?.lastName}
        required
      />

      <SubmitButton
        label={fr.app.verification.submit}
        pendingLabel={fr.app.verification.submitting}
      />
    </form>
  );
}
