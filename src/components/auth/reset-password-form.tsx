"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthAlert } from "@/components/auth/auth-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { FormField } from "@/components/form-field";
import { fr } from "@/content/fr";
import { initialAuthState } from "@/lib/auth/action-state";
import { updatePassword } from "@/lib/auth/actions";

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(updatePassword, initialAuthState);

  if (state.status === "success" && state.message) {
    return (
      <div className="space-y-5">
        <AuthAlert tone="success">{state.message}</AuthAlert>
        <Link
          href="/tableau-de-bord"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {fr.auth.reset.goToDashboard}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-5">
      {state.status === "error" && state.message ? (
        <AuthAlert tone="error">{state.message}</AuthAlert>
      ) : null}

      <FormField
        id="reset-password"
        name="password"
        label={fr.auth.reset.passwordLabel}
        type="password"
        autoComplete="new-password"
        placeholder={fr.auth.reset.passwordPlaceholder}
        hint={fr.auth.reset.passwordHint}
        error={state.fieldErrors?.password}
        minLength={10}
        required
      />

      <FormField
        id="reset-confirmation"
        name="confirmation"
        label={fr.auth.reset.confirmationLabel}
        type="password"
        autoComplete="new-password"
        placeholder={fr.auth.reset.confirmationPlaceholder}
        error={state.fieldErrors?.confirmation}
        minLength={10}
        required
      />

      <SubmitButton
        label={fr.auth.reset.submit}
        pendingLabel={fr.auth.reset.submitting}
      />
    </form>
  );
}
