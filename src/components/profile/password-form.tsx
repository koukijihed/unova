"use client";

import { useActionState } from "react";
import { AuthAlert } from "@/components/auth/auth-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { FormField } from "@/components/form-field";
import { fr } from "@/content/fr";
import { initialProfileActionState } from "@/lib/profile/action-state";
import { updateProfilePassword } from "@/lib/profile/actions";

export function PasswordForm() {
  const [state, formAction] = useActionState(
    updateProfilePassword,
    initialProfileActionState,
  );
  const fieldErrors = state.fieldErrors ?? {};
  const labels = fr.profile.password;

  return (
    <form action={formAction} noValidate className="space-y-5">
      {state.status === "success" && state.message ? (
        <AuthAlert tone="success">{state.message}</AuthAlert>
      ) : null}

      {state.status === "error" && state.message ? (
        <AuthAlert tone="error">{state.message}</AuthAlert>
      ) : null}

      <FormField
        id="profile-password"
        name="password"
        label={labels.newPasswordLabel}
        type="password"
        autoComplete="new-password"
        placeholder={labels.newPasswordPlaceholder}
        error={fieldErrors.password}
        minLength={10}
        required
      />

      <FormField
        id="profile-confirmation"
        name="confirmation"
        label={labels.confirmationLabel}
        type="password"
        autoComplete="new-password"
        placeholder={labels.confirmationPlaceholder}
        error={fieldErrors.confirmation}
        minLength={10}
        required
      />

      <SubmitButton
        label={labels.submit}
        pendingLabel={labels.submitting}
      />
    </form>
  );
}
