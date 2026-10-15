import Link from "next/link";
import { notFound } from "next/navigation";
import CommentThread from "@/components/CommentThread";
import FollowCourseButton from "@/components/FollowCourseButton";
import NoteModerationActions from "@/components/NoteModerationActions";
import ReportNoteButton from "@/components/ReportNoteButton";
import SetupNotice from "@/components/SetupNotice";
import VoteControl from "@/components/VoteControl";
import {
  getComments,
  getCourseById,
  getIsAdmin,
  getMyNoteVotes,
  getNoteById,
  hasReportedNote,
  isFollowingCourse,
} from "@/lib/data";
import { BUCKET, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { authorLabel, formatDate, formatFileSize, noteTypeLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isSupabaseConfigured) {
    return (
      <section className="content">
        <SetupNotice />
      </section>
    );
  }

  const sb = await createClient();
  const note = await getNoteById(sb, id);
  if (!note) notFound();

  const course =
    note.course ??
    (note.course_id ? await getCourseById(sb, note.course_id) : null);

  const [comments, votes, reported, authResult, isAdmin] = await Promise.all([
    getComments(sb, note.id),
    getMyNoteVotes(sb, [note.id]),
    hasReportedNote(sb, note.id),
    sb.auth.getUser(),
    getIsAdmin(sb),
  ]);
  const following = course ? await isFollowingCourse(sb, course.id) : false;

  const viewer = authResult.data.user;
  const isAuthor = viewer?.id === note.author_id;
  let viewerName: string | null = null;
  if (viewer) {
    const { data: profile } = await sb
      .from("profiles")
      .select("display_name")
      .eq("id", viewer.id)
      .maybeSingle();
    viewerName = profile?.display_name ?? null;
  }

  const fileUrl = note.file_path
    ? sb.storage.from(BUCKET).getPublicUrl(note.file_path).data.publicUrl
    : null;
  const downloadUrl = fileUrl ? `${fileUrl}?download` : null;
  const author = authorLabel(note.is_anonymous, note.author);

  return (
    <section className="content">
      <Link href={course ? `/course/${encodeURIComponent(course.code)}` : "/"} className="back-link">
        ← {course ? `${course.code} · ${course.name}` : "Toutes les matières"}
      </Link>

      {note.removed_at && (
        <div className="removed-banner" role="alert">
          <b>Note retirée.</b>{" "}
          {isAdmin
            ? "Elle n’apparaît plus dans les classements ni la recherche — tu peux la rétablir ci-dessous."
            : "Elle a été retirée du site par la modération et n’apparaît plus dans les classements."}
        </div>
      )}

      <div className="note-detail-header">
        <h2>{note.title}</h2>
        <div className="note-detail-meta">
          <span
            className={`tag${note.note_type === "fiche" ? " type-fiche" : note.note_type === "carte" ? " type-carte" : ""}`}
          >
            {noteTypeLabel(note.note_type)}
          </span>
          {course && (
            <Link href={`/course/${encodeURIComponent(course.code)}`} className="tag">
              {course.code} · {course.name}
            </Link>
          )}
          <span className={note.is_anonymous ? "anon-label" : ""}>Par {author}</span>
          <span>{formatDate(note.created_at)}</span>
          {note.file_size ? <span>{formatFileSize(note.file_size)}</span> : null}
        </div>
      </div>

      <div className="detail-layout">
        <VoteControl
          targetType="note"
          targetId={note.id}
          score={note.score}
          upvotes={note.upvotes}
          downvotes={note.downvotes}
          userVote={votes[note.id] ?? 0}
        />

        <div className="detail-main">
          {note.description && <p className="note-description">{note.description}</p>}

          <div className="preview-box">
            <div className="preview-label">
              <span>Aperçu — {note.file_name ?? "document.pdf"}</span>
            </div>
            {fileUrl ? (
              <iframe
                className="preview-frame"
                src={fileUrl}
                title={`Aperçu de ${note.title}`}
              />
            ) : (
              <div className="preview-placeholder">Aperçu indisponible pour cette note.</div>
            )}
          </div>

          <div className="action-row">
            {downloadUrl ? (
              <a className="btn primary" href={downloadUrl}>
                Télécharger le PDF
              </a>
            ) : (
              <span className="download-hint">Fichier absent.</span>
            )}
            <span className="download-hint">
              Direct, sans connexion, sans pub, sans attente.
            </span>
            <ReportNoteButton noteId={note.id} hasReported={reported} isAuthor={Boolean(isAuthor)} />
          </div>

          <NoteModerationActions
            noteId={note.id}
            filePath={note.file_path}
            isAuthor={isAuthor}
            isAdmin={isAdmin}
            removed={Boolean(note.removed_at)}
          />

          {course && (
            <div className="follow-box">
              <p>
                Suis <b>{course.name}</b> pour être prévenu quand une de ses notes passe n°1
                du classement.
              </p>
              <FollowCourseButton courseId={course.id} following={following} />
            </div>
          )}

          <CommentThread
            noteId={note.id}
            comments={comments}
            viewerId={viewer?.id ?? null}
            viewerName={viewerName}
          />
        </div>
      </div>
    </section>
  );
}
