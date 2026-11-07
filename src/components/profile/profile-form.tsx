"use client";

import { useActionState } from "react";
import { AuthAlert } from "@/components/auth/auth-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { FormField } from "@/components/form-field";
import { fr } from "@/content/fr";
import { initialProfileActionState } from "@/lib/profile/action-state";
import { updateProfile } from "@/lib/profile/actions";

type ProfileFormProps = {
  firstName: string;
  lastName: string;
  phone: string;
};

export function ProfileForm({
  firstName,
  lastName,
  phone,
}: ProfileFormProps) {
  const [state, formAction] = useActionState(
    updateProfile,
    initialProfileActionState,
  );
  const fieldErrors = state.fieldErrors ?? {};
  const values = state.values;
  const labels = fr.profile.personal;

  return (
    <form action={formAction} noValidate className="space-y-5">
      {state.status === "success" && state.message ? (
        <AuthAlert tone="success">{state.message}</AuthAlert>
      ) : null}

      {state.status === "error" && state.message ? (
        <AuthAlert tone="error">{state.message}</AuthAlert>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="profile-first-name"
          name="firstName"
          label={labels.firstNameLabel}
          defaultValue={values?.firstName ?? firstName}
          error={fieldErrors.firstName}
          maxLength={80}
          autoComplete="given-name"
          required
        />

        <FormField
          id="profile-last-name"
          name="lastName"
          label={labels.lastNameLabel}
          defaultValue={values?.lastName ?? lastName}
          error={fieldErrors.lastName}
          maxLength={80}
          autoComplete="family-name"
          required
        />
      </div>

      <FormField
        id="profile-phone"
        name="phone"
        label={labels.phoneLabel}
        type="tel"
        inputMode="tel"
        placeholder={labels.phonePlaceholder}
        hint={labels.phoneHint}
        defaultValue={values?.phone ?? phone}
        error={fieldErrors.phone}
        maxLength={20}
        autoComplete="tel"
      />

      <SubmitButton
        label={labels.submit}
        pendingLabel={labels.submitting}
      />
    </form>
  );
}
