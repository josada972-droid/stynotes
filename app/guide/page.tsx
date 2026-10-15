import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Résumer sans plagier — Stynotes",
  description:
    "Guide visuel : la différence entre un résumé légal et une contrefaçon, et comment signaler un document.",
};

/**
 * Aide visuelle — la charte de publication de Stynotes.
 * Deux colonnes graphiques (légal ✓ / contrefaçon ✗), une
 * checklist et la procédure de signalement. Accessible sans
 * connexion depuis le formulaire d'upload, les CGU et le footer.
 */
export default function GuidePage() {
  return (
    <section className="content">
      <Link href="/" className="back-link">
        ← Stynotes
      </Link>

      <div className="content-header">
        <div>
          <h2>Résumer sans plagier</h2>
          <div className="sub-meta">
            La règle en une phrase : <b>publie ce que tu as écrit, jamais ce qu’on t’a remis.</b>
          </div>
        </div>
      </div>

      <div className="guide-grid">
        <div className="guide-card legal">
          <div className="guide-card-head">
            <span className="guide-mark">✓</span>
            <h3>Un résumé légal</h3>
          </div>
          <ul>
            <li>
              <b>Tes propres mots.</b> Tu as reformulé les notions, pas recopié les phrases du
              professeur.
            </li>
            <li>
              <b>Tes exemples et tes schémas.</b> Les diagrammes redessinés à la main, les
              connecteurs que tu as inventés pour y voir clair.
            </li>
            <li>
              <b>Ta structure.</b> L’organisation du document suit ta logique d’apprentissage
              (chapitres, mnémotechniques, comparaisons personnelles).
            </li>
            <li>
              <b>Citations courtes.</b> Une définition ou une formule reprise telle quelle, en
              signalant la source, c’est de la citation — c’est permis.
            </li>
            <li>
              <b>Extraits minimaux.</b> Tu ne cites que ce dont tu as strictement besoin pour
              illustrer.
            </li>
          </ul>
          <div className="guide-example">
            <span className="guide-example-label">Exemple</span>
            « La dérivate d’une somme est la somme des dérivées — en pratique je retiens :
            dériver terme à terme, puis vérifier le signe sur un cas simple (exo 3 du TD). »
          </div>
        </div>

        <div className="guide-card infringe">
          <div className="guide-card-head">
            <span className="guide-mark">✗</span>
            <h3>Une contrefaçon</h3>
          </div>
          <ul>
            <li>
              <b>Le PDF du prof, scanné ou photographié.</b> Même partiellement, même « remis à
              plat » : ce n’est pas ton document.
            </li>
            <li>
              <b>Le polycopié distribué en cours.</b> Le support officiel appartient à son
              auteur — le republier ici est une reproduction illicite.
            </li>
            <li>
              <b>Une annale ou un sujet d’examen officiel.</b> Interdit à la publication comme à
              la diffusion.
            </li>
            <li>
              <b>Une transcription mot à mot.</b> Recopier le cours phrase par phrase (même
              tapé soi-même) reste une copie de l’œuvre.
            </li>
            <li>
              <b>Un chapitre de manuel copié.</b> Photocopier ou recopier un extrait substantiel
              d’un livre sous droits.
            </li>
          </ul>
          <div className="guide-example">
            <span className="guide-example-label">Test simple</span>
            Si ton document pouvait être remis par le professeur tel quel, c’est une
            contrefaçon. S’il n’existe que parce que <b>toi</b> l’as écrit, c’est un résumé.
          </div>
        </div>
      </div>

      <div className="guide-section">
        <h3>Avant de publier — la checklist</h3>
        <ol className="guide-checklist">
          <li>Le document a été rédigé entièrement par moi, dans mes mots.</li>
          <li>
            Il ne contient aucune page scannée, photographiée ou reproduite d’un support
            d’enseignant.
          </li>
          <li>Il ne contient ni sujet d’examen, ni annale, ni corrigé officiel.</li>
          <li>
            Les éventuelles citations courtes sont signalées et n’emportent pas un extrait
            substantiel.
          </li>
          <li>
            Je coche la case de certification sur l’honneur au moment de la publication (obligatoire,
            tracée).
          </li>
        </ol>
        <p className="form-note">
          Le détail juridique est dans les{" "}
          <Link href="/cgu">
            <b>CGU — articles 3 à 6</b>
          </Link>
          .
        </p>
      </div>

      <div className="guide-section">
        <h3>Tu as repéré une contrefaçon ?</h3>
        <p>
          Chaque page de document porte un lien{" "}
          <b>« Signaler ce document »</b> (sous le bouton de téléchargement). Le formulaire
          demande ce dont l’hébergeur a légalement besoin : l’œuvre originale protégée, son
          auteur, l’URL du contenu et ta description de l’atteinte. Un signalement de contrefaçon
          est transmis <b>immédiatement</b> aux modérateurs, qui peuvent retirer le document en
          un clic.
        </p>
        <p className="form-note">
          Un faux signalement est un abus — la déclaration de bonne foi est obligatoire.
        </p>
      </div>
    </section>
  );
}
