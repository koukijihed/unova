"use server";

import { revalidatePath } from "next/cache";
import { fr } from "@/content/fr";
import { readText } from "@/lib/auth/validation";
import type { ManagementActionState } from "@/lib/management/action-state";
import {
  errorState,
  mapManagementError,
  successState,
} from "@/lib/management/action-helpers";
import { getAdminSupabaseClient } from "@/lib/management/admin-client";
import {
  ACADEMIC_YEAR_LABEL_PATTERN,
  isConsecutiveAcademicYear,
  isUuid,
  isValidDate,
} from "@/lib/management/admin-validation";

const YEARS_PATH = "/gestion/annees";
const PROGRAMS_PATH = "/gestion/programmes";
const MESSAGES = fr.app.management.admin.messages;
const LABELS = fr.app.management.admin.years;
const COMMON = fr.app.management.admin.common;

export async function createAcademicYear(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const label = readText(formData, "label").trim();
  const startsOn = readText(formData, "startsOn").trim();
  const endsOn = readText(formData, "endsOn").trim();
  const values = { label, startsOn, endsOn };
  const fieldErrors: Record<string, string> = {};

  if (!label) {
    fieldErrors.label = LABELS.errors.labelRequired;
  } else if (!ACADEMIC_YEAR_LABEL_PATTERN.test(label)) {
    fieldErrors.label = LABELS.errors.labelFormat;
  } else if (!isConsecutiveAcademicYear(label)) {
    fieldErrors.label = LABELS.errors.labelConsecutive;
  }

  if (!startsOn) {
    fieldErrors.startsOn = LABELS.errors.startsOnRequired;
  } else if (!isValidDate(startsOn)) {
    fieldErrors.startsOn = LABELS.errors.startsOnInvalid;
  }

  if (!endsOn) {
    fieldErrors.endsOn = LABELS.errors.endsOnRequired;
  } else if (!isValidDate(endsOn)) {
    fieldErrors.endsOn = LABELS.errors.endsOnInvalid;
  } else if (
    startsOn &&
    isValidDate(startsOn) &&
    endsOn <= startsOn
  ) {
    fieldErrors.endsOn = LABELS.errors.endsOnAfterStart;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return errorState(COMMON.fixErrors, fieldErrors, values);
  }

  const client = await getAdminSupabaseClient();

  if (!client.ok) {
    return client.state;
  }

  const { error } = await client.supabase.from("academic_years").insert({
    label,
    starts_on: startsOn,
    ends_on: endsOn,
  });

  if (error) {
    return errorState(mapManagementError(error), undefined, values);
  }

  revalidatePath(YEARS_PATH);
  revalidatePath(PROGRAMS_PATH);

  return successState(LABELS.success.created);
}

export async function setCurrentAcademicYear(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const yearId = readText(formData, "yearId").trim();

  if (!isUuid(yearId)) {
    return errorState(MESSAGES.generic);
  }

  const client = await getAdminSupabaseClient();

  if (!client.ok) {
    return client.state;
  }

  const { error } = await client.supabase.rpc("set_current_academic_year", {
    p_year: yearId,
  });

  if (error) {
    return errorState(mapManagementError(error));
  }

  revalidatePath(YEARS_PATH);
  revalidatePath(PROGRAMS_PATH);

  return successState(LABELS.success.current);
}

export async function toggleEnrollmentOpen(
  _previousState: ManagementActionState,
  formData: FormData,
): Promise<ManagementActionState> {
  const yearId = readText(formData, "yearId").trim();

  if (!isUuid(yearId)) {
    return errorState(MESSAGES.generic);
  }

  const client = await getAdminSupabaseClient();

  if (!client.ok) {
    return client.state;
  }

  const { data, error } = await client.supabase
    .from("academic_years")
    .select("enrollment_open")
    .eq("id", yearId)
    .maybeSingle();

  if (error) {
    return errorState(mapManagementError(error));
  }

  if (!data) {
    return errorState(MESSAGES.notFound);
  }

  const nextValue = !(data as { enrollment_open: boolean }).enrollment_open;
  const { error: updateError } = await client.supabase
    .from("academic_years")
    .update({ enrollment_open: nextValue })
    .eq("id", yearId);

  if (updateError) {
    return errorState(mapManagementError(updateError));
  }

  revalidatePath(YEARS_PATH);

  return successState(
    nextValue
      ? LABELS.success.enrollmentsOpened
      : LABELS.success.enrollmentsClosed,
  );
}
