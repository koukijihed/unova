export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  avatar_path: string | null;
  status: "active" | "suspended";
};

export type UserRole = {
  role_code: string;
};

export type ProfileNames = {
  firstName: string;
  lastName: string;
  fullName: string;
};
