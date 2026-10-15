import LoginForm from "@/components/LoginForm";
import SetupNotice from "@/components/SetupNotice";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const rawNext = (await searchParams).next ?? "/";
  // Anti open-redirect : on n'accepte que les chemins internes.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  return (
    <section className="content">
      <a href="/" className="back-link">
        ← Retour
      </a>
      <div className="content-header" style={{ borderBottom: "none", marginBottom: 20 }}>
        <div>
          <h2>Connexion étudiante</h2>
          <div className="sub-meta">Réservé aux e-mails de l’école — pas de mot de passe.</div>
        </div>
      </div>

      {isSupabaseConfigured ? (
        <>
          <LoginForm next={next} />
          <p className="form-note" style={{ marginTop: 16, maxWidth: 440, lineHeight: 1.6 }}>
            Ton adresse sert uniquement à vérifier que tu es bien de la promo. Aucune donnée
            n’est revendue, aucun profil public n’est créé.
          </p>
        </>
      ) : (
        <SetupNotice />
      )}
    </section>
  );
}
