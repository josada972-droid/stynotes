"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

interface Props {
  noteId: string;
  hasReported: boolean;
  /** L'auteur ne signale pas sa propre note. */
  isAuthor: boolean;
}

/**
 * Bouton "Signaler ce document" — accessible sur CHAQUE page de
 * note (obligation légale des hébergeurs : LCEN art. 6-I-3, un
 * moyen de signalement doit toujours être disponible). Le clic
 * ouvre un formulaire reprenant les mentions exigées :
 * identité du signalant, œuvre protégée, URL du contenu,
 * description de l'atteinte et déclaration de bonne foi.
 *
 * Un signalement de nature contrefaçon (kind='legal') alerte
 * immédiatement les modérateurs (trigger SQL) — retrait en un
 * clic depuis /admin. Un signalement « autre » (kind='community')
 * rejoint le seuil de suppression automatique existant.
 */
export default function ReportNoteButton({ noteId, hasReported, isAuthor }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [reported, setReported] = useState(hasReported);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nature, setNature] = useState("copyright");
  const [workTitle, setWorkTitle] = useState("");
  const [workAuthor, setWorkAuthor] = useState("");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [goodFaith, setGoodFaith] = useState(false);

  // L'identité de contact est pré-remplie par un RPC SECURITY
  // DEFINER qui ne retourne QUE l'e-mail de l'appelant.
  useEffect(() => {
    if (!open) return;
    const sb = createClient();
    if (!sb) return;
    sb.rpc("my_school_email").then(({ data }) => {
      if (typeof data === "string" && data) setEmail(data);
    });
  }, [open]);

  if (isAuthor) return null;

  const isLegal = nature !== "other";
  const contentUrl =
    typeof window !== "undefined" ? `${window.location.origin}/note/${noteId}` : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (busy) return;

    if (isLegal) {
      if (!workTitle.trim()) return setError("Indique le titre de l’œuvre protégée.");
      if (!workAuthor.trim()) return setError("Indique l’auteur ou l’éditeur de l’œuvre.");
      if (!goodFaith) return setError("La déclaration de bonne foi est obligatoire.");
    }
    if (!details.trim()) return setError("Décris ce que tu reproches à ce document.");
    if (!email.trim() || !email.includes("@"))
      return setError("Indique un e-mail de contact valide.");

    const sb = createClient();
    if (!sb) return;

    const { data: authData } = await sb.auth.getUser();
    if (!authData.user) {
      toast("Connecte-toi pour signaler.");
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    setBusy(true);
    const { error: insertError } = await sb.from("note_reports").insert({
      note_id: noteId,
      reporter_id: authData.user.id,
      kind: isLegal ? "legal" : "community",
      reason: nature,
      reporter_email: email.trim(),
      work_title: isLegal ? workTitle.trim() : null,
      work_author: isLegal ? workAuthor.trim() : null,
      details: details.trim(),
      content_url: contentUrl,
      good_faith: isLegal && goodFaith,
    });
    setBusy(false);

    if (insertError) {
      if (insertError.code === "23505") {
        setReported(true);
        toast("Tu as déjà signalé cette note.");
        return;
      }
      toast("Le signalement n’a pas pu être transmis.");
      return;
    }

    setReported(true);
    setOpen(false);
    toast(
      isLegal
        ? "Signalement transmis aux modérateurs — réponse rapide."
        : "Signalement transmis, merci."
    );
  }

  if (reported) {
    return (
      <span className="report-done" title="Ta demande est entre les mains des modérateurs.">
        ✓ Signalé
      </span>
    );
  }

  return (
    <div className="report-wrap">
      <button
        type="button"
        className="report-link"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        Signaler ce document
      </button>

      {open && (
        <form className="report-box" onSubmit={submit}>
          <div className="report-title serif">Signaler ce document</div>
          <p className="form-note">
            Réservé aux contenus illicites ou non conformes (contrefaçon, examen officiel…).
            Le signalement est examiné par les modérateurs —{" "}
            <Link href="/guide" target="_blank">
              voir le guide
            </Link>
            .
          </p>

          <div className="field">
            <label htmlFor="report-nature">Nature du signalement</label>
            <select
              id="report-nature"
              value={nature}
              onChange={(e) => setNature(e.target.value)}
            >
              <option value="copyright">Copie d’un PDF de cours ou d’un polycopié</option>
              <option value="exam">Examen officiel ou annale</option>
              <option value="transcription">Transcription mot à mot d’un cours</option>
              <option value="other">Autre problème</option>
            </select>
          </div>

          {isLegal && (
            <>
              <div className="field">
                <label htmlFor="report-work">
                  Œuvre originale protégée — titre <b>(obligatoire)</b>
                </label>
                <input
                  id="report-work"
                  type="text"
                  value={workTitle}
                  onChange={(e) => setWorkTitle(e.target.value)}
                  placeholder="Ex. : « Introduction auxprobabilités », polycopié TD"
                />
              </div>
              <div className="field">
                <label htmlFor="report-author">
                  Auteur ou éditeur de l’œuvre <b>(obligatoire)</b>
                </label>
                <input
                  id="report-author"
                  type="text"
                  value={workAuthor}
                  onChange={(e) => setWorkAuthor(e.target.value)}
                  placeholder="Ex. : Pr. Dupont, Université Toulouse III"
                />
              </div>
            </>
          )}

          <div className="field">
            <label htmlFor="report-details">
              Description de l’atteinte <b>(obligatoire)</b>
            </label>
            <textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              style={{ minHeight: 90 }}
              placeholder="En quoi ce document porte-t-il atteinte à tes droits ?"
            />
          </div>

          <div className="field">
            <label htmlFor="report-url">URL du contenu signalé</label>
            <input id="report-url" type="text" value={contentUrl} readOnly />
          </div>

          <div className="field">
            <label htmlFor="report-email">
              Ton identité de contact (e-mail) <b>(obligatoire)</b>
            </label>
            <input
              id="report-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@univ-tlse3.fr"
            />
            <p className="form-note">
              Utilisé uniquement par les modérateurs pour te répondre — jamais publié.
            </p>
          </div>

          {isLegal && (
            <label className="good-faith">
              <input
                type="checkbox"
                checked={goodFaith}
                onChange={(e) => setGoodFaith(e.target.checked)}
              />
              <span>
                Je déclare de bonne foi que les informations ci-dessus sont exactes et que
                l’usage que ce document fait de l’œuvre décrite n’est pas autorisé.
              </span>
            </label>
          )}

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            <button type="submit" className="btn danger small" disabled={busy}>
              {busy ? "Envoi…" : "Envoyer le signalement"}
            </button>
            <button type="button" className="btn small" onClick={() => setOpen(false)}>
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
