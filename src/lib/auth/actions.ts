"use server";

import { redirect } from "next/navigation";
import { fr } from "@/content/fr";
import type {
  AuthActionState,
  AuthFieldErrors,
} from "@/lib/auth/action-state";
import { safeRedirectPath } from "@/lib/auth/redirects";
import { getRequestOrigin } from "@/lib/auth/request-origin";
import {
  EMAIL_PATTERN,
  NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  normalizeEmail,
  readText,
} from "@/lib/auth/validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function errorState(
  message: string,
  fieldErrors?: AuthFieldErrors,
  values?: AuthActionState["values"],
): AuthActionState {
  return { status: "error", message, fieldErrors, values };
}

function isRateLimited(error: { status?: number; code?: string }): boolean {
  return (
    error.status === 429 ||
    error.code === "over_email_send_rate_limit" ||
    error.code === "over_request_rate_limit"
  );
}

export async function signUp(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const firstName = readText(formData, "firstName").trim();
  const lastName = readText(formData, "lastName").trim();
  const email = normalizeEmail(readText(formData, "email"));
  const password = readText(formData, "password");
  const confirmation = readText(formData, "confirmation");

  const fieldErrors: AuthFieldErrors = {};

  if (!firstName) {
    fieldErrors.firstName = fr.auth.errors.firstNameRequired;
  } else if (firstName.length > NAME_MAX_LENGTH) {
    fieldErrors.firstName = fr.auth.errors.firstNameTooLong;
  }

  if (!lastName) {
    fieldErrors.lastName = fr.auth.errors.lastNameRequired;
  } else if (lastName.length > NAME_MAX_LENGTH) {
    fieldErrors.lastName = fr.auth.errors.lastNameTooLong;
  }

  if (!email) {
    fieldErrors.email = fr.auth.errors.emailRequired;
  } else if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = fr.auth.errors.emailInvalid;
  }

  if (!password) {
    fieldErrors.password = fr.auth.errors.passwordRequired;
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    fieldErrors.password = fr.auth.errors.passwordTooShort;
  }

  if (!confirmation) {
    fieldErrors.confirmation = fr.auth.errors.confirmationRequired;
  } else if (password !== confirmation) {
    fieldErrors.confirmation = fr.auth.errors.confirmationMismatch;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      fieldErrors,
      values: { firstName, lastName, email },
    };
  }

  const origin = await getRequestOrigin();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    const values = { firstName, lastName, email };

    if (isRateLimited(error)) {
      return errorState(fr.auth.errors.tooManyAttempts, undefined, values);
    }

    if (error.code === "user_already_exists") {
      return errorState(fr.auth.errors.accountExists, undefined, values);
    }

    return errorState(fr.auth.errors.signUpFailed, undefined, values);
  }

  if (data.session) {
    redirect("/tableau-de-bord");
  }

  return {
    status: "success",
    message: fr.auth.register.success,
    values: { email },
  };
}

export async function signIn(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = normalizeEmail(readText(formData, "email"));
  const password = readText(formData, "password");
  const fieldErrors: AuthFieldErrors = {};

  if (!email) {
    fieldErrors.email = fr.auth.errors.emailRequired;
  } else if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = fr.auth.errors.emailInvalid;
  }

  if (!password) {
    fieldErrors.password = fr.auth.errors.passwordRequired;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, values: { email } };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return errorState(fr.auth.errors.emailNotConfirmed, undefined, { email });
    }

    if (isRateLimited(error)) {
      return errorState(fr.auth.errors.tooManyAttempts, undefined, { email });
    }

    return errorState(fr.auth.errors.invalidCredentials, undefined, {
      email,
    });
  }

  redirect(safeRedirectPath(readText(formData, "redirection")));
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}

export async function requestPasswordReset(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = normalizeEmail(readText(formData, "email"));

  if (!email) {
    return {
      status: "error",
      fieldErrors: { email: fr.auth.errors.emailRequired },
    };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return {
      status: "error",
      fieldErrors: { email: fr.auth.errors.emailInvalid },
    };
  }

  const origin = await getRequestOrigin();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(
      "/reinitialiser-mot-de-passe",
    )}`,
  });

  if (error && isRateLimited(error)) {
    return errorState(fr.auth.errors.tooManyAttempts, undefined, { email });
  }

  // Même réponse que le compte existe ou non : pas d'énumération d'adresses.
  return {
    status: "success",
    message: fr.auth.forgot.success,
    values: { email },
  };
}

export async function updatePassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = readText(formData, "password");
  const confirmation = readText(formData, "confirmation");
  const fieldErrors: AuthFieldErrors = {};

  if (!password) {
    fieldErrors.password = fr.auth.errors.passwordRequired;
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    fieldErrors.password = fr.auth.errors.passwordTooShort;
  }

  if (!confirmation) {
    fieldErrors.confirmation = fr.auth.errors.confirmationRequired;
  } else if (password !== confirmation) {
    fieldErrors.confirmation = fr.auth.errors.confirmationMismatch;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return errorState(fr.auth.errors.sessionExpired);
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (isRateLimited(error)) {
      return errorState(fr.auth.errors.tooManyAttempts);
    }

    return errorState(fr.auth.errors.updatePasswordFailed);
  }

  return {
    status: "success",
    message: fr.auth.reset.success,
  };
}
