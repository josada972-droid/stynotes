/** Affiché sur toutes les pages tant que Supabase n'est pas configuré. */
export default function SetupNotice() {
  return (
    <div className="setup-notice">
      <h2>Configuration requise</h2>
      <p>
        L’application est construite, mais elle n’est pas encore reliée à une base de
        données Supabase. Trois étapes suffisent&nbsp;:
      </p>
      <ol>
        <li>
          Crée un projet sur <code>supabase.com</code> (offre gratuite), puis colle le
          contenu de <code>supabase/schema.sql</code> dans l’éditeur SQL et exécute-le.
        </li>
        <li>
          Copie <code>.env.example</code> en <code>.env.local</code> et remplis l’URL du
          projet, la clé <code>anon</code> et le domaine e-mail de ton école.
        </li>
        <li>
          Redémarre le serveur&nbsp;: <code>npm run dev</code>.
        </li>
      </ol>
      <p>
        Sans cela, aucune requête n’est envoyée&nbsp;: cette page te le signale au lieu de
        planter.
      </p>
    </div>
  );
}
