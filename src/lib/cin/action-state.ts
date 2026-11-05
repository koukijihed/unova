export type CinFieldErrors = {
  cin?: string;
  lastName?: string;
};

export type CinActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: CinFieldErrors;
  lastName?: string;
};

export const initialCinState: CinActionState = { status: "idle" };
