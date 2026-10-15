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

  const notes = await getTopNotes(await createClient(), { limit: 6 });

  return (
    <section className="content">
      {/* Enhanced welcome section */}
      <div className="welcome-section">
        <div className="hero">
          <h1>Bienvenue sur Stynotes</h1>
          <p className="subtitle">
            La bibliothèque collaborative de supports d'étude des étudiants de L1 Info
          </p>
        </div>

        <div className="purpose-card">
          <h2>Partagez et découvrez les meilleurs résumés</h2>
          <p>
            Stynotes est une plateforme où les étudiants de L1 Informatique de l'Université
            Toulouse III peuvent partager leurs <strong>résumés personnels</strong>,
            <strong>fiches de révision</strong> et <strong>cartes mentales</strong>,
            classés par UE et évalués par la communauté.
          </p>

          <div className="features-grid">
            <div className="feature-item">
              <h3>📥 Téléchargement sans compte</h3>
              <p>Accès immédiat à tous les documents, aucune inscription requise</p>
            </div>
            <div className="feature-item">
              <h3>🗳️ Votes anonymes</h3>
              <p>Évaluez la qualité des ressources de façon anonyme</p>
            </div>
            <div className="feature-item">
              <h3>💬 Commentaires</h3>
              <p>Discutez et améliorez les supports avec la communauté</p>
            </div>
            <div className="feature-item">
              <h3>📄 Aperçu PDF</h3>
              <p>Consultez les documents directement dans votre navigateur</p>
            </div>
          </div>
        </div>

        {/* Showcase top notes */}
        {notes.length > 0 ? (
          <>
            <div className="content-header">
              <div>
                <h2>🔥 Les ressources les plus appréciées cette semaine</h2>
                <div className="sub-meta">
                  {notes.length} note{notes.length > 1 ? "s" : ""} classées par score
                </div>
              </div>
            </div>

            <NoteBrowser
              notes={notes.slice(0, 3)} // Show only top 3 in the carousel
              showCourseChips
              emptyTitle="Pas de ressources populaires pour l’occasion."
              emptyHint="Soyez le premier à partager une note qui sera appréciée par la communauté."
            />
          </>
        ) : (
          <div className="empty-state">
            <h2 className="serif">Aucune ressource disponible pour le moment</h2>
            <p>
              Soyez le premier à contribuer en partageant votre propre résumé, fiche
              de révision ou carte mentale !
            </p>
          </div>
        )}
      </div>
    </section>
  );
}