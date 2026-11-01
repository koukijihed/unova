"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthAlert } from "@/components/auth/auth-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { FormField } from "@/components/form-field";
import { fr } from "@/content/fr";
import { initialAuthState } from "@/lib/auth/action-state";
import { signUp } from "@/lib/auth/actions";

export function RegisterForm() {
  const [state, formAction] = useActionState(signUp, initialAuthState);

  if (state.status === "success" && state.message) {
    return (
      <div className="space-y-5">
        <AuthAlert tone="success">{state.message}</AuthAlert>
        <Link
          href="/connexion"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {fr.auth.register.signIn}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-5">
      {state.status === "error" && state.message ? (
        <AuthAlert tone="error">{state.message}</AuthAlert>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="register-first-name"
          name="firstName"
          label={fr.auth.register.firstNameLabel}
          type="text"
          autoComplete="given-name"
          placeholder={fr.auth.register.firstNamePlaceholder}
          defaultValue={state.values?.firstName ?? ""}
          error={state.fieldErrors?.firstName}
          maxLength={80}
          required
        />

        <FormField
          id="register-last-name"
          name="lastName"
          label={fr.auth.register.lastNameLabel}
          type="text"
          autoComplete="family-name"
          placeholder={fr.auth.register.lastNamePlaceholder}
          defaultValue={state.values?.lastName ?? ""}
          error={state.fieldErrors?.lastName}
          maxLength={80}
          required
        />
      </div>

      <FormField
        id="register-email"
        name="email"
        label={fr.auth.register.emailLabel}
        type="email"
        autoComplete="email"
        placeholder={fr.auth.register.emailPlaceholder}
        defaultValue={state.values?.email ?? ""}
        error={state.fieldErrors?.email}
        required
      />

      <FormField
        id="register-password"
        name="password"
        label={fr.auth.register.passwordLabel}
        type="password"
        autoComplete="new-password"
        placeholder={fr.auth.register.passwordPlaceholder}
        hint={fr.auth.register.passwordHint}
        error={state.fieldErrors?.password}
        minLength={10}
        required
      />

      <FormField
        id="register-confirmation"
        name="confirmation"
        label={fr.auth.register.confirmationLabel}
        type="password"
        autoComplete="new-password"
        placeholder={fr.auth.register.confirmationPlaceholder}
        error={state.fieldErrors?.confirmation}
        minLength={10}
        required
      />

      <SubmitButton
        label={fr.auth.register.submit}
        pendingLabel={fr.auth.register.submitting}
      />
    </form>
  );
}
