"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthAlert } from "@/components/auth/auth-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { FormField } from "@/components/form-field";
import { fr } from "@/content/fr";
import { initialAuthState } from "@/lib/auth/action-state";
import { signIn } from "@/lib/auth/actions";

type LoginFormProps = {
  redirectTo: string;
  initialError?: string;
};

export function LoginForm({ redirectTo, initialError }: LoginFormProps) {
  const [state, formAction] = useActionState(signIn, initialAuthState);
  const showInitialError = Boolean(initialError) && state.status === "idle";

  return (
    <form action={formAction} noValidate className="space-y-5">
      <input type="hidden" name="redirection" value={redirectTo} />

      {showInitialError && initialError ? (
        <AuthAlert tone="error">{initialError}</AuthAlert>
      ) : null}

      {state.status !== "idle" && state.message ? (
        <AuthAlert tone={state.status === "success" ? "success" : "error"}>
          {state.message}
        </AuthAlert>
      ) : null}

      <FormField
        id="login-email"
        name="email"
        label={fr.auth.login.emailLabel}
        type="email"
        autoComplete="email"
        placeholder={fr.auth.login.emailPlaceholder}
        defaultValue={state.values?.email ?? ""}
        error={state.fieldErrors?.email}
        required
      />

      <FormField
        id="login-password"
        name="password"
        label={fr.auth.login.passwordLabel}
        type="password"
        autoComplete="current-password"
        placeholder={fr.auth.login.passwordPlaceholder}
        error={state.fieldErrors?.password}
        required
      />

      <div className="flex justify-end">
        <Link
          href="/mot-de-passe-oublie"
          className="rounded text-sm font-medium text-primary underline underline-offset-4 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {fr.auth.login.forgotPassword}
        </Link>
      </div>

      <SubmitButton
        label={fr.auth.login.submit}
        pendingLabel={fr.auth.login.submitting}
      />
    </form>
  );
}
