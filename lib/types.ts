export interface Course {
  id: string;
  code: string;
  name: string;
  note_count?: number;
}

/**
 * Types de documents — vocabulaire légalement sûr (voir /guide) :
 * 'cours' reste la valeur en base (rétro-compat) mais s'affiche
 * « Résumé personnel » ; 'carte' = carte mentale.
 */
export type NoteType = "cours" | "fiche" | "carte";

export interface NoteAuthor {
  id: string;
  display_name: string;
}

export interface NoteListItem {
  id: string;
  title: string;
  description: string | null;
  note_type: NoteType;
  is_anonymous: boolean;
  file_name: string | null;
  file_size: number | null;
  score: number;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  created_at: string;
  course: Pick<Course, "id" | "code" | "name"> | null;
  author: NoteAuthor | null;
}

export interface CommentData {
  id: string;
  note_id: string;
  parent_id: string | null;
  body: string;
  score: number;
  upvotes: number;
  downvotes: number;
  created_at: string;
  author: NoteAuthor | null;
  my_vote?: -1 | 0 | 1;
}

export interface NotificationData {
  id: string;
  type: "reply" | "note_comment" | "course_top" | "note_removed" | "report";
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
}

export type SortMode = "top" | "recent";

/** Nature du signalement : contrefaçon vs. signalement de communauté. */
export type ReportKind = "legal" | "community";

/** Une ligne de note_reports (formulaire légal enrichi). */
export interface ReportRow {
  id: string;
  kind: ReportKind;
  reason: string | null;
  reporter_email: string | null;
  work_title: string | null;
  work_author: string | null;
  details: string | null;
  content_url: string | null;
  good_faith: boolean;
  created_at: string;
}

/** Une note signalée, avec ses signalements — page /admin. */
export interface ReportedNote {
  id: string;
  title: string;
  file_path: string | null;
  removed_at: string | null;
  reports: ReportRow[];
}
