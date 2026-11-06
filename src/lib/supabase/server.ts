import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

export async function createServerSupabaseClient() {
  // Supabase lit l'heure système (Date.now) dès la création du client.
  // Sans cet appel, Next.js tente de prérendre la route et échoue sur
  // « unstable value Date.now() ». On force donc un rendu à la requête.
  await connection();

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Les Server Components ne peuvent pas écrire de cookies.
            // Le proxy rafraîchit la session à chaque requête.
          }
        },
      },
    },
  );
}
