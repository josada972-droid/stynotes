# La Fichothèque

Reddit rencontre une trousse académique : un site où les étudiants d'une promo
partagent leurs **supports d'étude personnalisés** — résumés personnels,
fiches de révision, cartes mentales — classés par UE, **classés par votes** —
et où le téléchargement reste **sans compte, sans pub, sans attente** (le
contraire de Scribd).

> Périmètre v1 : la promo L1 info de l'UPS uniquement. Uniquement des
> documents **rédigés par les étudiants eux-mêmes** — jamais de PDF de cours,
> d'annales ni de transcriptions mot à mot (voir `/cgu` et `/guide`), pas de
> profils publics, pas de suivi de personnes, pas de notation par étoiles.

## Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript** + React 19
- **Supabase** : Postgres, Auth (lien magique), Storage, Realtime
- **CSS pur** (pas de Tailwind) — tokens de design de la maquette de référence
  (`--paper`, `--ink`, `--rule`, Fraunces + Inter, fond papier réglé,
  coquille 1180px avec sidebar de cours)

## Démarrage (5 minutes)

1. **Crée un projet Supabase** sur <https://supabase.com> (offre gratuite).
2. **Colle `supabase/schema.sql`** dans *SQL Editor* → *Run*. Crée tout :
   tables, index, triggers (scores, modération, notifications), politiques
   RLS, bucket `notes` public, seed de 4 UE.
3. **Configure l'environnement** :

   ```powershell
   Copy-Item .env.example .env.local
   ```

   puis remplis dans `.env.local` :
   - `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     (Supabase → *Project Settings → API*)
   - `NEXT_PUBLIC_SCHOOL_DOMAIN` : le domaine e-mail réel de l'école
     (ex. `etu.univ-toulouse.fr`) — il gâte la porte d'entrée du site.

4. **Lance l'app** :

   ```powershell
   npm install
   npm run dev
   ```

   Ouvre <http://localhost:3000>. Sans `.env.local`, le site s'affiche quand
   même et affiche un écran de configuration au lieu de planter.

### Auth : réglages Supabase nécessaires

*Authentication → Providers → Email* : le **lien magique** (OTP) est actif par
défaut, mais il faut désactiver la confirmation inscrit ("Confirm email") pour
que le lien fonctionne directement, ou activer les liens automatiques.

Pour le **domaine scolaire**, deux niveaux :
- la validation `@domaine` est faite côté client (LoginForm) — c'est le
  garde-fou v1 ;
- avant d'ouvrir au-delà de la promo : *Authentication → Restrictions →
  Blocked emails / Email allow list* avec `*@ton-domaine.fr` (voir README →
  RLS ci-dessous : c'est à revoir avant toute mise à l'échelle).

## Fonctionnalités implémentées

| Feature | Où |
|---|---|
| Feed top voté toutes UE confondues | `/` |
| Page matière : chips Résumé/Fiche/Carte + tri Top/Récent | `/course/[code]` |
| Détail : aperçu PDF inline + téléchargement 1 clic sans compte | `/note/[id]` |
| Votes ↑/↓ anonymes (note **et** commentaires), avec **compteurs ↑/↓ visibles** | `VoteControl` |
| Commentaires filés 1 niveau, votables | `CommentThread` |
| **CGU** (auteur unique et exclusif, interdictions explicites) + **certification sur l'honneur obligatoire à chaque publication, tracée en base** | `/cgu` + `UploadForm` |
| **Signalement légal** toujours accessible (identité, œuvre, URL, bonne foi) → alerte admin immédiate | `/note/[id]` + `ReportNoteButton` |
| Modération communautaire : seuil de signalements → suppression auto + notification auteur | trigger `handle_report_threshold` |
| **Rôles admin** (liste blanche par e-mail) : workflow de retrait en 1 clic, masquer / rétablir / supprimer n'importe quoi | `/admin` + `NoteModerationActions` |
| **Suppression par l'auteur** : chaque auteur peut supprimer sa propre note (fichier storage + cascade) | `NoteModerationActions` |
| **Guide visuel** « Résumer sans plagier » (légal ✓ vs contrefaçon ✗ + checklist) | `/guide` |
| Suivre une matière (pas de follow de personnes) + notif "n°1 dans ta matière" | `FollowCourseButton` |
| Cloche de notifications en-app (Realtime) | `NotificationBell` |
| Recherche titre + description + matière, tri Top/Récent | `/search` |
| Publication avec choix d'anonymat **par note** | `/upload` |
| Connexion par e-mail étudiant uniquement (lien magique) | `/login` + `/auth/callback` |

### Modules légaux

**1. CGU & certification sur l'honneur** — `/cgu` porte les conditions
contractuelles : obligation d'être le **seul et unique auteur** du document
publié, interdictions explicites (PDF/polycopiés d'enseignants, sujets et
annales officiels, transcriptions mot à mot), procédure de signalement,
modération, données personnelles. Sur `/upload`, la case de certification
n'est pas cosmétique : la politique RLS `notes_insert_own` **refuse toute
insertion sans** `copyright_ack = true` **et** `copyright_ack_at` horodaté —
chaque publication laisse donc une preuve datée de la déclaration.

**2. Signalement & take-down (LCEN art. 6-I-3)** — le lien « Signaler ce
document » est présent sur **chaque** page de note (l'auteur excepté). Le
formulaire recueille les mentions exigées des hébergeurs : identité de
contact du signalant (pré-remplie par la RPC `my_school_email`,
`SECURITY DEFINER`, qui ne retourne que l'e-mail de l'appelant), description
de l'œuvre originale protégée (titre + auteur/éditeur), URL du contenu,
description de l'atteinte et **déclaration de bonne foi**. Un signalement de
nature contrefaçon (`kind='legal'`) déclenche le trigger
`notify_admins_on_legal_report` : **chaque admin reçoit une notification
menant à `/admin`**, où la note signalée est en tête de la section
« Signalements » avec ses mentions légales et les boutons Masquer /
**Supprimer** — retrait en un clic. Les signalements « autre »
(`kind='community'`) rejoignent le seuil de suppression automatique. La
policy `reports_select_own` laisse les admins lire tous les rapports.

**3. Sémantique & aide** — vocabulaire légalement sûr partout : les types de
documents s'affichent **Résumé personnel / Fiche de révision / Carte
mentale** (jamais « cours partagé »), la sidebar liste les **Matières**, et
`/guide` propose le guide visuel en deux colonnes (résumé légal ✓ vs
contrefaçon ✗), la checklist de publication et la procédure de signalement.
Le footer du site donne l'accès permanent à `/guide`, `/cgu` et au contact
modération.

### Rôles admin

Deux e-mails sont **modérateurs** (définis dans `apply_admin_emails`,
`supabase/schema.sql`) : `david-alexy.jean-baptiste@univ-tlse3.fr` et
`alex.fabre--laporte@univ-tlse3.fr`. Pour en ajouter un : étends la liste
dans `schema.sql` **et** dans
`supabase/migrations/20261015_admin_and_vote_counters.sql`, puis ré-exécute
ce bloc SQL (le trigger `profiles_apply_admin` met à jour les comptes
existants et les nouvelles inscriptions).

Ce que font les admins, en plus des utilisateurs classiques :

- **Masquer** une note → `removed_at` renseigné via la RPC
  `set_note_removed` (l'auteur est notifié). Elle disparaît du feed, de la
  recherche et des classements, mais reste visible (avec bannière) par son
  auteur et les admins, qui peuvent la **Rétablir**.
- **Supprimer** une note → suppression de la ligne (cascade : votes,
  signalements, commentaires) **et** du fichier storage. Politique RLS
  `notes_delete` : `author_id = auth.uid() or public.is_admin()`.
- La page **`/admin`** ouvre par une section **« Signalements »** (chaque
  note signalée avec ses mentions légales et actions en un clic), puis
  liste toutes les notes (y compris retirées). Le lien n'apparaît dans le
  header que pour les admins, et `/admin` redirige vers `/login` (puis `/`)
  pour les autres.

Sécurité : `is_admin` n'est **pas** lisible via l'API (grants par colonne
inchangés) — la vérification passe par la fonction SQL `is_admin()`
(`SECURITY DEFINER`), utilisée à la fois dans les policies RLS et par le
client via `sb.rpc("is_admin")`.

### Compteurs de votes

`notes` et `comments` portent des colonnes `upvotes` / `downvotes`
maintenues par les mêmes triggers que `score`. Les affichent :
`VoteControl` (les flèches portent leur propre compteur, mis à jour
optimiste), le badge de score dans les listes (`NoteRow`), et la page
détail. L'anonymat est préservé : on voit **combien** mais jamais **qui**.

## Ce qui est volontairement reporté

- **Aperçu PDF** : rendu par l'iframe navigateur via l'URL publique — si tu
  veux un rendu plus robuste (pdf.js, pages miniatures), c'est le point
  d'entrée `preview-box` dans `app/note/[id]/page.tsx`.
- **Anti-doublon** de la notif « note n°1 » : le trigger
  `notify_course_top` est naïf et **peut se déclencher plusieurs fois** pour
  le même passage en tête (commenté dans `schema.sql`). Une piste : écrire la
  notif seulement sur transition `rank != 1 → rank = 1`.
- **RLS** : les politiques sont un point de départ correct (votes lisibles
  uniquement par leur auteur, notifications strictement privées, notes
  retirées invisibles) mais doivent être **relues avant d'ouvrir au-delà de
  la promo**. `profiles` est durci côté colonnes : seuls `id` et
  `display_name` sortent via l'API (grants par colonne) — `school_email`
  n'est lisible que par `service_role`, jamais par anon/authenticated.
- **Push Realtime des notifications** : le canal `postgres_changes` de
  `NotificationBell` est branché normalement, mais le Realtime hébergé du
  projet ne délivrait **aucun événement INSERT** (vérifié avec un client
  authentifié isolé : abonnement OK, table dans la publication
  `supabase_realtime`, streaming WAL actif, RLS ouverte, sans filtre — rien
  n'arrivait, même après redémarrage du service Realtime). La cloche repose
  donc sur un **relevé périodique (30 s) + au retour sur l'onglet**, fusionné
  par id avec le handler Realtime : dès que Supabase répare la livraison, le
  push reprend sans changer le code. Latence max des badge : 30 s.
- **Monétisation** : aucune. Règle non négociable de la maquette : jamais de
  popup, de pub autoplay, ni rien qui masque le bouton de téléchargement ou
  l'aperçu.
- **App mobile** : v1 en web responsive uniquement.

## Structure du code

```
app/                  pages (App Router)
  page.tsx            accueil — feed top
  course/[code]/      page matière
  note/[id]/          détail + votes + commentaires + signalement légal + modération
  admin/              modération (réservée aux admins) — signalements + toutes les notes
  upload/             publication (protégée) + certification CGU
  search/             recherche
  login/              lien magique
  auth/callback/      échange du code de session
  cgu/                conditions générales d'utilisation
  guide/              guide visuel « Résumer sans plagier »
components/           Header, Footer, SubjectSidebar, NoteBrowser, NoteRow,
                      VoteControl, CommentThread, ReportNoteButton (formulaire
                      légal), FollowCourseButton, NotificationBell,
                      NoteModerationActions, UploadForm, LoginForm, SetupNotice
lib/
  env.ts              config + constantes
  data.ts             requêtes serveur (lecture) + helpers admin
  supabase/           clients navigateur / serveur
  types.ts, utils.ts, toast.ts
proxy.ts                rafraîchissement des cookies de session (ex-middleware)
supabase/
  schema.sql          schéma complet à coller dans Supabase
  migrations/         migrations incrémentales à exécuter après coup
    20261015_admin_and_vote_counters.sql      rôles admin + compteurs de votes
    20261015_legal_modules.sql                CGU traçables + signalements enrichis
```

> La spec initiale prévoyait Next.js 14, mais toute la branche ≤ 16.3 est
> signalée comme vulnérable par `npm audit` (sans patch disponible) : le
> projet est donc monté sur **next@16.4.1** (0 vulnerability), avec les
> adaptations `cookies()` / `params` asynchrones et `middleware.ts` → `proxy.ts`.

## Seuils de modération

Table `moderation_settings` (modifiable sans redéploiement) :

| clé | défaut | rôle |
|---|---|---|
| `report_removal_threshold` | 5 | à ce nombre de signalements (toutes natures), la note est retirée automatiquement et l'auteur notifié — lu par le trigger `handle_report_threshold` |

> Le seuil `report_downvote_threshold` (20) existait pour ne montrer le
> bouton « Signaler » qu'au-delà de downvotes (anti-brigading). L'obligation
> légale d'un canal de signalement **toujours accessible** l'a remplacé :
> le formulaire est permanent, protégé par l'authentification (un signalement
> par étudiant et par note, contrainte `unique (note_id, reporter_id)`) et
> les signalements de contrefaçon alertent directement les modérateurs.
