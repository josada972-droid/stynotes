export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SCHOOL_DOMAIN = (process.env.NEXT_PUBLIC_SCHOOL_DOMAIN ?? "").toLowerCase();

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith("http")
);

/** Seuil de suppression automatique — lu par le trigger SQL
 *  handle_report_threshold (table moderation_settings) ; les
 *  valeurs par défaut vivent dans le schéma, pas côté client. */
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 Mo
export const BUCKET = "notes";
