"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SCHOOL_DOMAIN, isSupabaseConfigured } from "@/lib/env";

/**
 * Connexion par lien magique — e-mail étudiant uniquement.
 * Pas de pseudo + mot de passe : le domaine e-mail fait le filtrage.
 */
export default function LoginForm({ next = "/" }: { next: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Entre une adresse e-mail valide.");
      return;
    }
    if (SCHOOL_DOMAIN && !value.endsWith(`@${SCHOOL_DOMAIN}`)) {
      setError(`Seul un e-mail de l’école (@${SCHOOL_DOMAIN}) est accepté.`);
      return;
    }

    const sb = createClient();
    if (!sb) {
      setError("Supabase n’est pas encore configuré (voir .env.local).");
      return;
    }

    setBusy(true);
    const { error: otpError } = await sb.auth.signInWithOtp({
      email: value,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);

    if (otpError) {
      setError("L’envoi a échoué. Réessaie dans un instant.");
      return;
    }
    setSent(true);
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="onboarding-box">
        <p>Supabase n’est pas encore configuré : la connexion est désactivée.</p>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="onboarding-box">
        <p className="auth-success">
          Lien de connexion envoyé à <b>{email}</b>. Ouvre-le depuis ton mail étudiant pour
          revenir sur le site — le lien expire rapidement.
        </p>
        <p>
          Tu n’as rien d’autre à faire : pas de mot de passe, pas de pseudo.
        </p>
        <p className="auth-hint" style={{ marginBottom: 0 }}>
          Rien après quelques minutes ? Vérifie tes <b>indésirables / courrier
          indésirable</b> — les liens de connexion y atterrissent souvent.
        </p>
      </div>
    );
  }

  return (
    <form className="onboarding-box" onSubmit={submit}>
      <p>
        Entre ton <b>e-mail étudiant</b> : on t’envoie un lien de connexion, sans mot de
        passe. C’est ce qui garde le site réservé aux vrais étudiants.
      </p>
      <div className="field">
        <label htmlFor="login-email">E-mail étudiant</label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={SCHOOL_DOMAIN ? `prenom.nom@${SCHOOL_DOMAIN}` : "prenom.nom@ecole.fr"}
          autoComplete="email"
          autoFocus
        />
      </div>
      {error && <div className="auth-error">{error}</div>}
      <button type="submit" className="btn primary" disabled={busy}>
        {busy ? "Envoi en cours…" : "Recevoir mon lien de connexion"}
      </button>
      <p className="auth-hint" style={{ marginBottom: 0 }}>
        Pense à vérifier tes <b>indésirables</b> si le mail n’arrive pas.
      </p>
    </form>
  );
}
