import Link from "next/link";
import { redirect } from "next/navigation";
import NoteModerationActions from "@/components/NoteModerationActions";
import SetupNotice from "@/components/SetupNotice";
import { getAdminNotes, getIsAdmin, getReportedNotes } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { authorLabel, formatDate } from "@/lib/utils";
import type { ReportRow } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Détail d'un signalement — formulaire légal (LCEN art. 6-I-3). */
function ReportItem({ report }: { report: ReportRow }) {
  return (
    <li className={`report-item${report.kind === "legal" ? " legal" : ""}`}>
      <div className="report-item-head">
        <span
          className={`tag${report.kind === "legal" ? " removed-tag" : ""}`}
          title={
            report.kind === "legal"
              ? "Contrefaçon alléguée — examen prioritaire"
              : "Signalement de la communauté"
          }
        >
          {report.kind === "legal" ? "Droit d’auteur" : "Communauté"}
        </span>
        <span className="report-item-date">{formatDate(report.created_at)}</span>
      </div>
      {report.work_title && (
        <div className="report-item-line">
          <b>Œuvre protégée :</b> {report.work_title}
          {report.work_author ? ` — ${report.work_author}` : ""}
        </div>
      )}
      {report.details && <div className="report-item-line">{report.details}</div>}
      {report.content_url && (
        <div className="report-item-line">
          <b>URL :</b> <span className="report-url">{report.content_url}</span>
        </div>
      )}
      {report.reporter_email && (
        <div className="report-item-line report-contact">
          Contact signalant : {report.reporter_email} ·{" "}
          {report.good_faith ? "déclaration de bonne foi ✓" : "sans déclaration"}
        </div>
      )}
    </li>
  );
}

/**
 * Modération — réservé aux comptes de la liste blanche (voir
 * apply_admin_emails dans le schéma). Section Signalements en
 * tête : chaque note signalée, avec ses mentions légales, et le
 * retrait en un clic (masquer ou supprimer). Puis la liste de
 * toutes les notes, y compris les retirées.
 */
export default async function AdminPage() {
  if (!isSupabaseConfigured) {
    return (
      <section className="content">
        <SetupNotice />
      </section>
    );
  }

  const sb = await createClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect("/login?next=/admin");
  if (!(await getIsAdmin(sb))) redirect("/");

  const [notes, reported] = await Promise.all([getAdminNotes(sb), getReportedNotes(sb)]);
  const openReports = reported.filter((n) => !n.removed_at);

  return (
    <section className="content">
      <div className="content-header">
        <div>
          <h2>Modération</h2>
          <div className="sub-meta">
            {openReports.length} note{openReports.length > 1 ? "s" : ""} signalée
            {openReports.length > 1 ? "s" : ""} · {notes.length} note
            {notes.length > 1 ? "s" : ""} au total — masquer rend une note invisible du site sans
            supprimer le fichier ; supprimer efface tout.
          </div>
        </div>
      </div>

      {reported.length > 0 && (
        <>
          <div className="admin-section-title serif">Signalements</div>
          <ul className="admin-list">
            {reported.map((note) => (
              <li key={note.id} className={`admin-row reported${note.removed_at ? " removed" : ""}`}>
                <div className="admin-row-main">
                  <Link href={`/note/${note.id}`} className="admin-row-title">
                    {note.title}
                  </Link>
                  <div className="admin-row-meta">
                    <span>
                      {note.reports.length} signalement{note.reports.length > 1 ? "s" : ""}
                    </span>
                    {note.reports.some((r) => r.kind === "legal") && (
                      <span className="tag removed-tag">Contrefaçon alléguée</span>
                    )}
                    {note.removed_at && <span className="tag removed-tag">Masquée</span>}
                  </div>
                  <ul className="report-list">
                    {note.reports.map((r) => (
                      <ReportItem key={r.id} report={r} />
                    ))}
                  </ul>
                </div>
                <NoteModerationActions
                  noteId={note.id}
                  filePath={note.file_path}
                  isAuthor={false}
                  isAdmin
                  removed={Boolean(note.removed_at)}
                  stayOnPage
                />
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="admin-section-title serif">Toutes les notes</div>

      {notes.length === 0 ? (
        <div className="empty-state">
          <span className="serif">Rien à modérer.</span>
          Aucune note publiée pour l’instant.
        </div>
      ) : (
        <ul className="admin-list">
          {notes.map((note) => (
            <li key={note.id} className={`admin-row${note.removed_at ? " removed" : ""}`}>
              <div className="admin-row-main">
                <Link href={`/note/${note.id}`} className="admin-row-title">
                  {note.title}
                </Link>
                <div className="admin-row-meta">
                  <span>
                    {note.course ? `${note.course.code} · ${note.course.name}` : "Hors matière"}
                  </span>
                  <span>
                    Par {authorLabel(note.is_anonymous, note.author)}
                  </span>
                  <span>{formatDate(note.created_at)}</span>
                  <span>
                    {note.score} pts · {note.upvotes} ↑ · {note.downvotes} ↓ ·{" "}
                    {note.comment_count} com.
                  </span>
                  {note.removed_at && <span className="tag removed-tag">Masquée</span>}
                </div>
              </div>
              <NoteModerationActions
                noteId={note.id}
                filePath={note.file_path}
                isAuthor={false}
                isAdmin
                removed={Boolean(note.removed_at)}
                stayOnPage
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
