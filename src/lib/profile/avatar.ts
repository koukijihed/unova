import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const AVATAR_BUCKET = "avatars";
const AVATAR_URL_TTL_SECONDS = 60 * 60;

/**
 * Transforme le chemin stocké dans profiles.avatar_path en URL signée
 * valable une heure. Retourne null si aucune photo n'est disponible.
 */
export const getSignedAvatarUrl = cache(
  async (avatarPath: string | null | undefined): Promise<string | null> => {
    const path = avatarPath?.trim();

    if (!path) {
      return null;
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(path, AVATAR_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      return null;
    }

    return data.signedUrl;
  },
);
