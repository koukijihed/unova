import { fr } from "@/content/fr";
import type {
  ManagementActionState,
  ManagementFieldErrors,
  ManagementFormValues,
} from "@/lib/management/action-state";
import {
  isForbiddenError,
  isUniqueViolation,
  type PostgrestErrorLike,
} from "@/lib/management/errors";

const MESSAGES = fr.app.management.admin.messages;

export function errorState(
  message: string,
  fieldErrors?: ManagementFieldErrors,
  values?: ManagementFormValues,
): ManagementActionState {
  return { status: "error", message, fieldErrors, values };
}

export function successState(
  message: string,
  values?: ManagementFormValues,
): ManagementActionState {
  return { status: "success", message, values };
}

export function mapManagementError(
  error: PostgrestErrorLike | null,
): string {
  if (isForbiddenError(error)) {
    return MESSAGES.forbidden;
  }

  if (isUniqueViolation(error)) {
    return MESSAGES.unique;
  }

  return MESSAGES.generic;
}
