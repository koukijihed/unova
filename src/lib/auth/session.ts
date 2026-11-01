import type { User } from "@supabase/supabase-js";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Profile, ProfileNames, UserRole } from "@/lib/types";

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return data.user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_path, status")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Profile;
});

export const getCurrentUserRoles = cache(
  async (): Promise<UserRole[] | null> => {
    const user = await getCurrentUser();

    if (!user) {
      return null;
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("user_roles")
      .select("role_code")
      .eq("user_id", user.id);

    if (error) {
      return null;
    }

    return (data ?? []) as UserRole[];
  },
);

export async function redirectIfAuthenticated(): Promise<void> {
  const user = await getCurrentUser();

  if (user) {
    redirect("/tableau-de-bord");
  }
}

export function getProfileNames(
  profile: Profile | null,
  user: User,
): ProfileNames {
  const metadataFirstName =
    typeof user.user_metadata?.first_name === "string"
      ? user.user_metadata.first_name.trim()
      : "";
  const metadataLastName =
    typeof user.user_metadata?.last_name === "string"
      ? user.user_metadata.last_name.trim()
      : "";

  const firstName = profile?.first_name?.trim() || metadataFirstName;
  const lastName = profile?.last_name?.trim() || metadataLastName;
  const fullName = `${firstName} ${lastName}`.trim();

  return { firstName, lastName, fullName };
}
