export type ManagementActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const initialManagementActionState: ManagementActionState = {
  status: "idle",
};
