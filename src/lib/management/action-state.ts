export type ManagementFieldErrors = Record<string, string | undefined>;

export type ManagementFormValues = Record<
  string,
  string | boolean | undefined
>;

export type ManagementActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: ManagementFieldErrors;
  values?: ManagementFormValues;
};

export type ManagementAction = (
  previousState: ManagementActionState,
  formData: FormData,
) => Promise<ManagementActionState>;

export const initialManagementActionState: ManagementActionState = {
  status: "idle",
};

export function readFormString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function readFormBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}
