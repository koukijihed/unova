import "server-only";

import { createClient } from "@supabase/supabase-js";

// Node.js 20 n'expose pas WebSocket nativement. Le client administrateur
// n'utilise jamais Realtime : un transport désactivé évite l'erreur au
// démarrage sans ajouter de dépendance.
class DisabledRealtimeTransport {
  constructor() {
    throw new Error("Realtime n'est pas utilisé par le client administrateur.");
  }
}

export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    const missing = [
      !url ? "NEXT_PUBLIC_SUPABASE_URL" : null,
      !secretKey ? "SUPABASE_SECRET_KEY" : null,
    ]
      .filter(Boolean)
      .join(", ");

    throw new Error(
      `Configuration Supabase administrateur incomplète : ${missing}.`,
    );
  }

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      transport: DisabledRealtimeTransport as never,
    },
  });
}
