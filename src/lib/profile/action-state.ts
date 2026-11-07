export type ProfileField =
  | "firstName"
  | "lastName"
  | "phone"
  | "avatar"
  | "password"
  | "confirmation";

export type ProfileFieldErrors = Partial<Record<ProfileField, string>>;

export type ProfileFormValues = {
  firstName?: string;
  lastName?: string;
  phone?: string;
};

export type ProfileActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: ProfileFieldErrors;
  values?: ProfileFormValues;
};

export const initialProfileActionState: ProfileActionState = { status: "idle" };
