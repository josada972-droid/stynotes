"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

interface Props {
  noteId: string;
  filePath: string | null;
  isAuthor: boolean;
  isAdmin: boolean;
  removed: boolean;
  /** true = rester sur la page après suppression (liste /admin). */
  stayOnPage?: boolean;
}

/**
 * Actions de modération sur une note :
 * - l'auteur peut supprimer sa propre note (fichier storage inclus) ;
 * - un admin peut masquer / rétablir (retirée = invisible du feed,
 *   l'auteur est notifié) et supprimer définitivement n'importe quoi.
 * Toutes les actions sont protégées par la RLS côté serveur — ce
 * composant ne fait qu'afficher les boutons autorisés.
 */
export default function NoteModerationActions({
  noteId,
  filePath,
  isAuthor,
  isAdmin,
  removed,
  stayOnPage,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (!isAuthor && !isAdmin) return null;

  async function setRemoved(next: boolean) {
    if (busy) return;
    const sb = createClient();
    if (!sb) return;
    setBusy(true);
    const { error } = await sb.rpc("set_note_removed", {
      p_note_id: noteId,
      p_removed: next,
    });
    setBusy(false);
    if (error) {
      toast("L’action n’a pas pu être effectuée.");
      return;
    }
    toast(next ? "Note masquée du site." : "Note rétablie.");
    router.refresh();
  }

  async function remove() {
    if (busy) return;
    const ok = window.confirm(
      isAdmin && !isAuthor
        ? "Supprimer définitivement cette note (fichier, votes et commentaires inclus) ?"
        : "Supprimer définitivement ta note (fichier, votes et commentaires inclus) ?"
    );
    if (!ok) return;

    setBusy(true);
    const sb = createClient();
    if (!sb) return;

    // 1. la ligne d'abord : la RLS valide auteur ou admin, la
    //    cascade PostgreSQL nettoie votes / signalements /
    //    commentaires.
    const { error } = await sb.from("notes").delete().eq("id", noteId);
    if (error) {
      setBusy(false);
      toast("La note n’a pas pu être supprimée.");
      return;
    }

    // 2. le fichier storage (best effort — la policy autorise le
    //    propriétaire du dossier et les admins). Un échec ici ne
    //    doit pas bloquer : la note est déjà retirée du site.
    if (filePath) {
      const { error: fileError } = await sb.storage.from("notes").remove([filePath]);
      if (fileError) {
        console.warn("Suppression du fichier storage échouée :", fileError.message);
      }
    }

    toast("Note supprimée.");
    setBusy(false);
    if (stayOnPage) {
      router.refresh();
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="moderation-box">
      <span className="moderation-label">Modération</span>
      <div className="moderation-actions">
        {isAdmin && (
          <button
            type="button"
            className="btn small"
            disabled={busy}
            onClick={() => setRemoved(!removed)}
          >
            {removed ? "Rétablir" : "Masquer"}
          </button>
        )}
        <button type="button" className="btn danger small" disabled={busy} onClick={remove}>
          Supprimer
        </button>
      </div>
    </div>
  );
}
