import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "CGU — La Fichothèque",
  description:
    "Conditions générales d’utilisation de La Fichothèque : propriété intellectuelle, signalement et modération.",
};

/**
 * CGU — conditions générales d'utilisation. Document contractuel :
 * chaque publication vaut acceptation intégrale (case obligatoire
 * sur /upload, tracée en base via copyright_ack — voir migration
 * 20261015_legal_modules.sql).
 */
export default function CguPage() {
  return (
    <section className="content">
      <Link href="/" className="back-link">
        ← La Fichothèque
      </Link>

      <div className="content-header">
        <div>
          <h2>Conditions générales d’utilisation</h2>
          <div className="sub-meta">
            En vigueur au 15 octobre 2026 — toute publication vaut acceptation pleine et
            entière des présentes conditions.
          </div>
        </div>
      </div>

      <div className="legal-prose">
        <h3>Article 1 — Objet</h3>
        <p>
          La Fichothèque est une plateforme de partage de <b>supports d’étude personnalisés</b>{" "}
          (résumés personnels, fiches de révision, cartes mentales) entre étudiants de
          l’Université Toulouse III — Paul Sabatier. Elle est éditée à des fins pédagogiques et
          non lucratives.
        </p>

        <h3>Article 2 — Éligibilité</h3>
        <p>
          L’accès est réservé aux personnes disposant d’une adresse électronique étudiante
          <b> @univ-tlse3.fr</b>. La connexion s’effectue par lien magique envoyé à cette
          adresse ; elle vaut identification de l’utilisateur.
        </p>

        <h3>Article 3 — Contenu publié : obligation d’être l’auteur unique et exclusif</h3>
        <p>
          Tout utilisateur qui publie un document sur La Fichothèque déclare et garantit en être{" "}
          <b>le seul et unique auteur</b>, à l’exclusion de toute autre personne physique ou
          morale. Le document doit être issu de son travail personnel, rédigé dans ses propres
          mots, et ne reprendre aucune œuvre tiers sans autorisation.
        </p>
        <p>Sont <b>expressément interdits</b> la publication et la diffusion de :</p>
        <ul>
          <li>
            tout <b>PDF, polycopié ou support de cours établi par un enseignant</b>, y compris
            scanné, photographié ou remis « à plat » ;
          </li>
          <li>
            toute <b>épreuve d’examen officielle</b>, annale, sujet ou corrigé distribué par
            l’université ou une instance d’examen ;
          </li>
          <li>
            toute <b>transcription mot à mot</b> d’un cours, TD ou TP, sous quelque forme que
            ce soit ;
          </li>
          <li>
            tout extrait substantiel d’un manuel, d’un livre ou d’une ressource sous droits sans
            l’accord préalable de l’ayant droit.
          </li>
        </ul>
        <p>
          La citation courte, à des fins d’illustration, reste possible dès lors qu’elle est
          signalée comme telle et n’emporte pas la reproduction de la structure de l’œuvre.
        </p>

        <h3>Article 4 — Certification sur l’honneur</h3>
        <p>
          Avant toute publication, l’utilisateur doit cocher la case de certification par
          laquelle il atteste, <b>sur l’honneur</b>, respecter les articles 3 et 5 des présentes
          CGU. Cette certification est enregistrée et horodatée à chaque publication ; toute
          publication non certifiée est techniquement refusée par la plateforme. Le certifiant
          est civilement et pénalement responsable de la véracité de sa déclaration (art. 441-1
          du code pénal — fausse déclaration).
        </p>

        <h3>Article 5 — Propriété intellectuelle</h3>
        <p>
          L’utilisateur conserve l’ensemble des droits sur le document qu’il publie. Il concède
          à La Fichothèque la seule autorisation technique de stocker, afficher et permettre le
          téléchargement du document via la plateforme, à des fins de partage entre étudiants. Le
          retrait du document par son auteur met fin à cette autorisation. En cas de publication
          anonyme, l’anonymat de l’auteur est préservé à l’égard des autres utilisateurs ; il
          n’empêche pas les modérateurs désignés d’être saisis d’une demande judiciaire.
        </p>

        <h3>Article 6 — Signalement et procédure de retrait</h3>
        <p>
          Conformément à l’article 6-I-3 de la loi pour la confiance dans l’économie numérique,
          tout utilisateur ou tiers dispose d’un moyen de signalement accessible sur chaque page
          de document (« Signaler ce document »). Le formulaire recueille les mentions
          suivantes :
        </p>
        <ul>
          <li>l’identité et l’adresse électronique de contact du signalement ;</li>
          <li>la description de l’œuvre originale protégée (titre, auteur ou éditeur) ;</li>
          <li>l’URL exacte du contenu signalé ;</li>
          <li>la description précise de l’atteinte alléguée ;</li>
          <li>la déclaration de bonne foi du signalement.</li>
        </ul>
        <p>
          Tout signalement de nature contrefaçon est transmis <b>immédiatement</b> aux
          modérateurs, qui procèdent au retrait du contenu en un clic (« take-down »), sous
          réserve d’un examen sommaire. Les seuils de la modération communautaire (downvotes et
          signalements cumulés) complètent ce dispositif. Le retrait d’un document est notifié à
          son auteur ; le signalement est conservé à des fins de preuve le temps de son
          traitement.
        </p>

        <h3>Article 7 — Modération</h3>
        <p>
          Les modérateurs désignés peuvent masquer (rendre invisible du site sans suppression du
          fichier) ou supprimer définitivement tout document contraire aux présentes CGU, et ce
          sans préavis lorsque la gravité l’exige. L’auteur peut lui-même supprimer ses
          publications à tout moment. Les décisions de modération sont prises de bonne foi dans
          le cadre de la protection de la plateforme et de ses utilisateurs.
        </p>

        <h3>Article 8 — Votes et commentaires</h3>
        <p>
          Les votes (positifs ou négatifs) sont <b>anonymes</b> : ils ne sont associés à aucun
          nom public. Les commentaires restent publiés sous le nom de leur auteur ou sous le nom
          anonyme choisi pour la publication concernée. Toute tentative de brigading ou de
          manipulation des classements peut entraîner l’exclusion du compte.
        </p>

        <h3>Article 9 — Données personnelles</h3>
        <p>
          L’adresse électronique étudiante sert exclusivement à la connexion, à la sécurisation
          du compte et — pour les signalements — au contact du modérateur. Elle n’est jamais
          publiée ni cédée à des tiers. Les documents publiés anonymement ne comportent aucun
          identifiant visible ; la correspondance auteur–compte est réservée aux modérateurs et
          aux réquisitions légitimes.
        </p>

        <h3>Article 10 — Responsabilité</h3>
        <p>
          L’utilisateur est seul responsable du contenu qu’il publie. La Fichothèque, en sa
          qualité d’hébergeur, n’exerce aucun contrôle a priori et intervient uniquement à
          réception d’un signalement ou d’une décision de modération. Toute publication illicite
          expose son auteur à des poursuites civiles et pénales indépendantes des mesures prises
          par la plateforme.
        </p>

        <h3>Article 11 — Droit applicable</h3>
        <p>
          Les présentes CGU sont soumises au droit français. Toute difficulté sera d’abord
          cherchée à être résolue à l’amiable, conformément à l’esprit de la plateforme.
        </p>

        <p className="legal-footer-note">
          Voir aussi :{" "}
          <Link href="/guide">
            <b>Le guide « Résumer sans plagier »</b>
          </Link>{" "}
          — la différence visuelle entre un résumé légal et une contrefaçon.
        </p>
      </div>
    </section>
  );
}
