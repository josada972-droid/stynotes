import Link from "next/link";
import type { NoteListItem } from "@/lib/types";
import { authorLabel, excerpt, formatDate, formatFileSize, noteTypeShort } from "@/lib/utils";

export default function NoteRow({ note }: { note: NoteListItem }) {
  const text = excerpt(note.description, 170) || note.file_name || "Document PDF partagé.";
  const author = authorLabel(note.is_anonymous, note.author);

  return (
    <Link href={`/note/${note.id}`} className="note-row">
      <div className="note-main">
        <div className="note-title">{note.title}</div>
        <p className="note-excerpt">{text}</p>
        <div className="note-meta">
          <span
            className={`tag${note.note_type === "fiche" ? " type-fiche" : note.note_type === "carte" ? " type-carte" : ""}`}
          >
            {noteTypeShort(note.note_type)}
          </span>
          <span className="tag">
            {note.course ? `${note.course.code} · ${note.course.name}` : "Sans cours"}
          </span>
          <span className={note.is_anonymous ? "anon-label" : ""}>{author}</span>
          <span>·</span>
          <span>{formatDate(note.created_at)}</span>
          {note.file_size ? <span>· {formatFileSize(note.file_size)}</span> : null}
          <span>· {note.comment_count} commentaire{note.comment_count > 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className={`score-badge${note.score > 0 ? " positive" : ""}`} aria-label={`${note.score} points, ${note.upvotes} positifs, ${note.downvotes} négatifs`}>
        <span className="arrow">▲ <span className="count">{note.upvotes}</span></span>
        <span className="value">{note.score}</span>
        <span className="arrow">▼ <span className="count">{note.downvotes}</span></span>
      </div>
    </Link>
  );
}
