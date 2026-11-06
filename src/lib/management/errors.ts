export type PostgrestErrorLike = {
  code?: string | null;
  message?: string | null;
};

export function isForbiddenError(error: PostgrestErrorLike | null): boolean {
  if (!error) {
    return false;
  }

  return (
    error.code === "42501" ||
    error.message?.toLowerCase().includes("forbidden") === true
  );
}

export function isNotFoundError(error: PostgrestErrorLike | null): boolean {
  return error?.message?.toLowerCase().includes("not found") === true;
}

export function isUniqueViolation(
  error: PostgrestErrorLike | null,
): boolean {
  return error?.code === "23505";
}

export function isForeignKeyViolation(
  error: PostgrestErrorLike | null,
): boolean {
  return error?.code === "23503";
}
