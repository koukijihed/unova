import { fr } from "@/content/fr";
import type { ManagementActionState } from "@/lib/management/action-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<
  ReturnType<typeof createServerSupabaseClient>
>;

export type AdminClientResult =
  | { ok: true; supabase: ServerSupabaseClient }
  | { ok: false; state: ManagementActionState };

const MESSAGES = fr.app.management.admin.messages;

export async function getAdminSupabaseClient(): Promise<AdminClientResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      state: { status: "error", message: MESSAGES.sessionExpired },
    };
  }

  const { data, error } = await supabase
    .from("user_roles")
    .select("role_code")
    .eq("user_id", user.id);

  if (error) {
    return {
      ok: false,
      state: { status: "error", message: MESSAGES.generic },
    };
  }

  const roles = (data ?? []) as { role_code: string }[];

  if (!roles.some((role) => role.role_code === "admin")) {
    return {
      ok: false,
      state: { status: "error", message: MESSAGES.forbidden },
    };
  }

  return { ok: true, supabase };
}
