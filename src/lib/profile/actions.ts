"use server";

import { revalidatePath } from "next/cache";
import { fr } from "@/content/fr";
import {
  NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  readText,
} from "@/lib/auth/validation";
import type {
  ProfileActionState,
  ProfileFieldErrors,
  ProfileFormValues,
} from "@/lib/profile/action-state";
import { detectImageType } from "@/lib/profile/image";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const PROFILE_PATH = "/profil";
const AVATAR_BUCKET = "avatars";
const AVATAR_MAX_SIZE = 2 * 1024 * 1024;
const PHONE_MAX_LENGTH = 20;
const PHONE_PATTERN = /^[0-9 +]+$/;

const PROFILE = fr.profile;

function errorState(
  message: string,
  fieldErrors?: ProfileFieldErrors,
  values?: ProfileFormValues,
): ProfileActionState {
  return { status: "error", message, fieldErrors, values };
}

function successState(
  message: string,
  values?: ProfileFormValues,
): ProfileActionState {
  return { status: "success", message, values };
}

async function getAuthenticatedClient() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return { supabase, user };
}

export async function updateProfile(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const firstName = readText(formData, "firstName").trim();
  const lastName = readText(formData, "lastName").trim();
  const phone = readText(formData, "phone").trim();
  const values = { firstName, lastName, phone };
  const fieldErrors: ProfileFieldErrors = {};

  if (!firstName) {
    fieldErrors.firstName = PROFILE.errors.firstNameRequired;
  } else if (firstName.length > NAME_MAX_LENGTH) {
    fieldErrors.firstName = PROFILE.errors.firstNameTooLong;
  }

  if (!lastName) {
    fieldErrors.lastName = PROFILE.errors.lastNameRequired;
  } else if (lastName.length > NAME_MAX_LENGTH) {
    fieldErrors.lastName = PROFILE.errors.lastNameTooLong;
  }

  if (phone.length > PHONE_MAX_LENGTH) {
    fieldErrors.phone = PROFILE.errors.phoneTooLong;
  } else if (phone && !PHONE_PATTERN.test(phone)) {
    fieldErrors.phone = PROFILE.errors.phoneInvalid;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return errorState(PROFILE.errors.fixErrors, fieldErrors, values);
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return errorState(PROFILE.errors.sessionExpired);
  }

  const { data, error } = await auth.supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
    })
    .eq("id", auth.user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return errorState(PROFILE.errors.updateFailed, undefined, values);
  }

  revalidatePath(PROFILE_PATH);

  return successState(PROFILE.personal.success, values);
}

export async function uploadAvatar(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const auth = await getAuthenticatedClient();

  if (!auth) {
    return errorState(PROFILE.errors.sessionExpired);
  }

  const file = formData.get("avatar");

  if (!file || typeof file === "string" || file.size === 0) {
    return errorState(PROFILE.avatar.errors.required, {
      avatar: PROFILE.avatar.errors.required,
    });
  }

  if (file.size > AVATAR_MAX_SIZE) {
    return errorState(PROFILE.avatar.errors.tooLarge, {
      avatar: PROFILE.avatar.errors.tooLarge,
    });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectImageType(bytes);

  if (!detected) {
    return errorState(PROFILE.avatar.errors.invalidType, {
      avatar: PROFILE.avatar.errors.invalidType,
    });
  }

  const { data: current, error: currentError } = await auth.supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (currentError) {
    return errorState(PROFILE.avatar.errors.uploadFailed);
  }

  const path = `${auth.user.id}/${crypto.randomUUID()}.${detected.ext}`;
  const { error: uploadError } = await auth.supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, bytes, {
      contentType: detected.mime,
      upsert: false,
    });

  if (uploadError) {
    return errorState(PROFILE.avatar.errors.uploadFailed);
  }

  const { data: updated, error: updateError } = await auth.supabase
    .from("profiles")
    .update({ avatar_path: path })
    .eq("id", auth.user.id)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    await auth.supabase.storage.from(AVATAR_BUCKET).remove([path]);

    return errorState(PROFILE.avatar.errors.uploadFailed);
  }

  const previousPath = (
    current as { avatar_path: string | null } | null
  )?.avatar_path;

  if (previousPath && previousPath !== path) {
    await auth.supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
  }

  revalidatePath(PROFILE_PATH);

  return successState(PROFILE.avatar.success);
}

export async function deleteAvatar(
  _previousState: ProfileActionState,
  _formData: FormData,
): Promise<ProfileActionState> {
  void _previousState;
  void _formData;

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return errorState(PROFILE.errors.sessionExpired);
  }

  const { data: current, error: currentError } = await auth.supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (currentError) {
    return errorState(PROFILE.avatar.errors.deleteFailed);
  }

  const path = (
    current as { avatar_path: string | null } | null
  )?.avatar_path;

  if (!path) {
    return successState(PROFILE.avatar.noPhoto);
  }

  const { data: updated, error: updateError } = await auth.supabase
    .from("profiles")
    .update({ avatar_path: null })
    .eq("id", auth.user.id)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    return errorState(PROFILE.avatar.errors.deleteFailed);
  }

  await auth.supabase.storage.from(AVATAR_BUCKET).remove([path]);
  revalidatePath(PROFILE_PATH);

  return successState(PROFILE.avatar.deleted);
}

export async function updateProfilePassword(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const password = readText(formData, "password");
  const confirmation = readText(formData, "confirmation");
  const fieldErrors: ProfileFieldErrors = {};

  if (!password) {
    fieldErrors.password = PROFILE.errors.passwordRequired;
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    fieldErrors.password = PROFILE.errors.passwordTooShort;
  }

  if (!confirmation) {
    fieldErrors.confirmation = PROFILE.errors.confirmationRequired;
  } else if (password !== confirmation) {
    fieldErrors.confirmation = PROFILE.errors.confirmationMismatch;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return errorState(PROFILE.errors.fixErrors, fieldErrors);
  }

  const auth = await getAuthenticatedClient();

  if (!auth) {
    return errorState(PROFILE.errors.sessionExpired);
  }

  const { error } = await auth.supabase.auth.updateUser({ password });

  if (error) {
    return errorState(PROFILE.errors.passwordFailed);
  }

  return successState(PROFILE.password.success);
}
