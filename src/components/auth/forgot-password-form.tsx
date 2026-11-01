"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthAlert } from "@/components/auth/auth-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { FormField } from "@/components/form-field";
import { fr } from "@/content/fr";
import { initialAuthState } from "@/lib/auth/action-state";
import { requestPasswordReset } from "@/lib/auth/actions";

type ForgotPasswordFormProps = {
  initialError?: string;
};

export function ForgotPasswordForm({
  initialError,
}: ForgotPasswordFormProps) {
  const [state, formAction] = useActionState(
    requestPasswordReset,
    initialAuthState,
  );
  const showInitialError = Boolean(initialError) && state.status === "idle";

  if (state.status === "success" && state.message) {
    return (
      <div className="space-y-5">
        <AuthAlert tone="success">{state.message}</AuthAlert>
        <Link
          href="/connexion"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {fr.auth.forgot.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-5">
      {showInitialError && initialError ? (
        <AuthAlert tone="error">{initialError}</AuthAlert>
      ) : null}

      {state.status === "error" && state.message ? (
        <AuthAlert tone="error">{state.message}</AuthAlert>
      ) : null}

      <FormField
        id="forgot-email"
        name="email"
        label={fr.auth.forgot.emailLabel}
        type="email"
        autoComplete="email"
        placeholder={fr.auth.forgot.emailPlaceholder}
        defaultValue={state.values?.email ?? ""}
        error={state.fieldErrors?.email}
        required
      />

      <SubmitButton
        label={fr.auth.forgot.submit}
        pendingLabel={fr.auth.forgot.submitting}
      />
    </form>
  );
}
