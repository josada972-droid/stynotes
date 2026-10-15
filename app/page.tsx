import NoteBrowser from "@/components/NoteBrowser";
import SetupNotice from "@/components/SetupNotice";
import { getTopNotes } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!isSupabaseConfigured) {
    return (
      <section className="content">
        <SetupNotice />
      </section>
    );
  }

  const notes = await getTopNotes(await createClient(), { limit: 40 });

  return (
    <section className="content">
      <div className="hero">
        <h1>Les meilleures fiches, triées par ceux qui les utilisent.</h1>
        <p>
          Résumés personnels, fiches de révision et cartes mentales partagés par la promo,
          classés par UE et notés par la communauté. Consulte, télécharge sans compte, vote,
          commente.
        </p>
      </div>

      <div className="content-header">
        <div>
          <h2>Le top de la semaine</h2>
          <div className="sub-meta">
            {notes.length} note{notes.length > 1 ? "s" : ""} classées par score
          </div>
        </div>
      </div>

      <NoteBrowser
        notes={notes}
        showCourseChips
        emptyTitle="Rien à classer pour l’instant."
        emptyHint="Publie la première note pour lancer le classement."
      />
    </section>
  );
}
