import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";
import { getIsAdmin } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function Header({ initialQuery = "" }: { initialQuery?: string }) {
  let userId: string | null = null;
  let displayName: string | null = null;
  let isAdmin = false;

  if (isSupabaseConfigured) {
    const sb = await createClient();
    const { data } = await sb.auth.getUser();
    if (data.user) {
      userId = data.user.id;
      const { data: profile } = await sb
        .from("profiles")
        .select("display_name")
        .eq("id", data.user.id)
        .maybeSingle();
      displayName = profile?.display_name ?? null;
      isAdmin = await getIsAdmin(sb);
    }
  }

  return (
    <header className="top">
      <Link href="/" className="brand serif">
        Stynotes<span className="dot">.</span>
      </Link>

      <form className="search-form" action="/search" method="get" role="search">
        <input
          type="search"
          name="q"
          defaultValue={initialQuery}
          placeholder="Rechercher une fiche, une matière…"
          aria-label="Rechercher"
        />
        <button type="submit" aria-label="Lancer la recherche">
          Rechercher
        </button>
      </form>

      <nav>
        {userId && <NotificationBell userId={userId} />}
        <Link href="/upload" className="btn primary small">
          Publier
        </Link>
        {isAdmin && (
          <Link href="/admin" className="btn small">
            Modération
          </Link>
        )}
        {userId ? (
          <span className="user-name" title={displayName ?? undefined}>
            {displayName ?? "Étudiant·e"}
          </span>
        ) : (
          <Link href="/login" className="btn small">
            Se connecter
          </Link>
        )}
      </nav>
    </header>
  );
}
