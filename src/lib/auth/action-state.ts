export type AuthField =
  | "firstName"
  | "lastName"
  | "email"
  | "password"
  | "confirmation";

export type AuthFieldErrors = Partial<Record<AuthField, string>>;

export type AuthFormValues = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: AuthFieldErrors;
  values?: AuthFormValues;
};

export const initialAuthState: AuthActionState = { status: "idle" };
