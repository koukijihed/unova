"use server";

import { redirect } from "next/navigation";
import { fr } from "@/content/fr";
import type { CinActionState, CinFieldErrors } from "@/lib/cin/action-state";
import {
  hashCin,
  isValidCin,
  normalizeCin,
  normalizeName,
} from "@/lib/cin/shared.mjs";
import { readText } from "@/lib/auth/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ClaimRosterResult = {
  ok?: boolean;
  error?: string;
};

function errorState(
  message: string,
  lastName: string,
  fieldErrors?: CinFieldErrors,
): CinActionState {
  return { status: "error", message, fieldErrors, lastName };
}

export async function verifyStudent(
  formData: FormData,
): Promise<CinActionState> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/connexion?redirection=%2Fverification");
  }

  const cin = normalizeCin(readText(formData, "cin"));
  const lastName = readText(formData, "lastName").trim();
  const lastNameNorm = normalizeName(lastName);
  const fieldErrors: CinFieldErrors = {};

  if (!isValidCin(cin)) {
    fieldErrors.cin = fr.app.verification.errors.cinInvalid;
  }

  if (!lastNameNorm) {
    fieldErrors.lastName = fr.app.verification.errors.lastNameRequired;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      fieldErrors,
      lastName,
    };
  }

  const pepper = process.env.CIN_PEPPER;

  if (!pepper) {
    return errorState(fr.app.verification.errors.unavailable, lastName);
  }

  let data: unknown;

  try {
    const admin = createAdminSupabaseClient();
    const response = await admin.rpc("claim_roster", {
      p_user: user.id,
      p_cin_hash: hashCin(cin, pepper),
      p_last_name_norm: lastNameNorm,
    });

    if (response.error) {
      return errorState(fr.app.verification.errors.unavailable, lastName);
    }

    data = response.data;
  } catch {
    return errorState(fr.app.verification.errors.unavailable, lastName);
  }

  const result = data as ClaimRosterResult | null;

  if (!result) {
    return errorState(fr.app.verification.errors.unavailable, lastName);
  }

  if (result.ok === true) {
    redirect("/tableau-de-bord");
  }

  switch (result.error) {
    case "not_found_or_claimed":
      return errorState(fr.app.verification.errors.notFoundOrClaimed, lastName);
    case "too_many_attempts":
      return errorState(fr.app.verification.errors.tooManyAttempts, lastName);
    case "email_not_confirmed":
      return errorState(fr.app.verification.errors.emailNotConfirmed, lastName);
    case "already_verified":
      return errorState(fr.app.verification.errors.alreadyVerified, lastName);
    default:
      return errorState(fr.app.verification.errors.unavailable, lastName);
  }
}
