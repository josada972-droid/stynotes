import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";

/**
 * Client Supabase côté serveur (Server Components / Route Handlers).
 * Les cookies de session sont lus/écrits automatiquement.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    // Valeurs factices si non configurées : les pages appellent
    // isSupabaseConfigured avant toute requête réelle.
    isSupabaseConfigured ? SUPABASE_URL : "https://placeholder.supabase.co",
    isSupabaseConfigured ? SUPABASE_ANON_KEY : "placeholder-anon-key",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Appel depuis un Server Component : le middleware rafraîchit la session.
          }
        },
      },
    }
  );
}
