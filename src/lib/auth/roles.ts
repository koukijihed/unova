export function hasManagementRole(
  roles: string[] | null | undefined,
): boolean {
  return roles?.some((role) => role === "admin" || role === "director") ?? false;
}
