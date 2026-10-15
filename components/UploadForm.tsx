"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BUCKET, MAX_FILE_SIZE } from "@/lib/env";
import { toast } from "@/lib/toast";
import type { Course, NoteType } from "@/lib/types";
import { formatFileSize } from "@/lib/utils";

export default function UploadForm({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [noteType, setNoteType] = useState<NoteType>("cours");
  const [anonymous, setAnonymous] = useState(false);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return setError("Ajoute un titre.");
    if (!courseId) return setError("Choisis une matière.");
    if (!file) return setError("Ajoute un fichier PDF.");
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"))
      return setError("Seuls les fichiers PDF sont acceptés.");
    if (file.size > MAX_FILE_SIZE)
      return setError(`Fichier trop lourd (max ${formatFileSize(MAX_FILE_SIZE)}).`);
    // Certification sur l'honneur obligatoire — la base refuse de
    // toute façon toute insertion sans copyright_ack horodaté.
    if (!ack)
      return setError(
        "Certifie sur l’honneur être l’auteur du document (case obligatoire)."
      );

    const sb = createClient();
    if (!sb) return setError("Supabase n’est pas configuré.");

    setBusy(true);

    try {
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) {
        router.push(`/login?next=${encodeURIComponent("/upload")}`);
        return;
      }

      const path = `${auth.user.id}/${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await sb.storage
        .from(BUCKET)
        .upload(path, file, { contentType: "application/pdf", upsert: false });

      if (uploadError) throw uploadError;

      const { data: note, error: insertError } = await sb
        .from("notes")
        .insert({
          course_id: courseId,
          author_id: auth.user.id,
          title: title.trim(),
          description: description.trim() || null,
          note_type: noteType,
          is_anonymous: anonymous,
          file_path: path,
          file_name: file.name,
          file_size: file.size,
          // Déclaration sur l'honneur (CGU art. 3) — tracée et
          // horodatée, exigée par la RLS côté serveur.
          copyright_ack: true,
          copyright_ack_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError || !note) throw insertError ?? new Error("insert failed");

      toast("Note publiée !");
      router.push(`/note/${note.id}`);
    } catch (err) {
      console.error(err);
      setError("La publication a échoué. Réessaie.");
      setBusy(false);
    }
  }

  if (!courses.length) {
    return (
      <div className="empty-state">
        <span className="serif">Aucune matière disponible.</span>
        Le catalogue des UE n’a pas encore été initialisé dans Supabase.
      </div>
    );
  }

  return (
    <form className="form-wrap" onSubmit={submit}>
      <div className="field">
        <label htmlFor="f-title">Titre</label>
        <input
          id="f-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex. Suites et récurrence — exercices corrigés"
        />
      </div>

      <div className="field">
        <label htmlFor="f-course">Matière (UE)</label>
        <select id="f-course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} · {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Type de document</label>
        <div className="radio-group">
          <label className={`radio-card${noteType === "cours" ? " active" : ""}`}>
            <input
              type="radio"
              name="note_type"
              checked={noteType === "cours"}
              onChange={() => setNoteType("cours")}
            />
            <span>
              <span className="rc-title">Résumé personnel</span>
              <span className="rc-desc">
                Tes propres notes, reformulées avec tes mots — jamais une copie du support du
                prof.
              </span>
            </span>
          </label>
          <label className={`radio-card${noteType === "fiche" ? " active" : ""}`}>
            <input
              type="radio"
              name="note_type"
              checked={noteType === "fiche"}
              onChange={() => setNoteType("fiche")}
            />
            <span>
              <span className="rc-title">Fiche de révision</span>
              <span className="rc-desc">Version condensée pour réviser vite avant un examen.</span>
            </span>
          </label>
          <label className={`radio-card${noteType === "carte" ? " active" : ""}`}>
            <input
              type="radio"
              name="note_type"
              checked={noteType === "carte"}
              onChange={() => setNoteType("carte")}
            />
            <span>
              <span className="rc-title">Carte mentale</span>
              <span className="rc-desc">Vue d’ensemble visuelle des notions et de leurs liens.</span>
            </span>
          </label>
        </div>
      </div>

      <div className="field">
        <label>Auteur</label>
        <div className="radio-group">
          <label className={`radio-card${!anonymous ? " active" : ""}`}>
            <input
              type="radio"
              name="anon"
              checked={!anonymous}
              onChange={() => setAnonymous(false)}
            />
            <span>
              <span className="rc-title">Afficher mon nom</span>
              <span className="rc-desc">Ton nom apparaîtra sur cette note.</span>
            </span>
          </label>
          <label className={`radio-card${anonymous ? " active" : ""}`}>
            <input type="radio" name="anon" checked={anonymous} onChange={() => setAnonymous(true)} />
            <span>
              <span className="rc-title">Publier anonymement</span>
              <span className="rc-desc">Choisi pour cette note uniquement, pas pour tout ton compte.</span>
            </span>
          </label>
        </div>
      </div>

      <div className="field">
        <label htmlFor="f-desc">Description (optionnelle)</label>
        <textarea
          id="f-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="De quoi parle la note, chapitres couverts, etc."
          style={{ minHeight: 100 }}
        />
      </div>

      <div className="field">
        <label>Fichier PDF</label>
        <div className="file-drop">
          <div>
            {file ? (
              <span className="file-name">
                {file.name} · {formatFileSize(file.size)}
              </span>
            ) : (
              "PDF uniquement — 20 Mo maximum"
            )}
          </div>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      {/* Certification CGU obligatoire — la RLS refuse l'insertion
          sans copyright_ack horodaté, cette case n'est donc pas
          une simple formalité d'UI. */}
      <label className="ack-check">
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
        <span>
          Je certifie <b>sur l’honneur</b> être l’auteur unique et exclusif de ce document,
          qu’il est rédigé dans mes propres mots, et qu’il ne contient{" "}
          <b>aucun PDF de cours, aucune annale ni aucune transcription mot à mot</b> — le tout
          conforme aux <Link href="/cgu" target="_blank">CGU</Link>.{" "}
          <Link href="/guide" target="_blank">
            Résumé légal ou contrefaçon ?
          </Link>
        </span>
      </label>

      {error && <div className="form-error">{error}</div>}

      <div className="form-actions">
        <button type="submit" className="btn primary" disabled={busy || !ack}>
          {busy ? "Publication…" : "Publier la note"}
        </button>
        <span className="form-note">
          Téléchargement libre et sans connexion pour tout le monde — c’est le principe.
        </span>
      </div>
    </form>
  );
}
