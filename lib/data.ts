import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CommentData,
  Course,
  NoteListItem,
  NotificationData,
  ReportRow,
  ReportedNote,
  SortMode,
} from "@/lib/types";
import {
  isSupabaseConfigured,
} from "@/lib/env";

type Any = Record<string, any>;

const NOTE_SELECT = `
  id, title, description, note_type, is_anonymous, file_name, file_size,
  score, upvotes, downvotes, comment_count, created_at,
  course:courses ( id, code, name ),
  author:profiles!notes_author_id_fkey ( id, display_name )
`;

/** Liste des cours avec le nombre de notes non retirées. */
export async function getCourses(sb: SupabaseClient): Promise<Course[]> {
  const { data, error } = await sb
    .from("courses")
    .select("id, code, name, notes(count)")
    .order("code", { ascending: true });

  if (error || !data) return [];

  return (data as unknown as Any[]).map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    note_count: c.notes?.[0]?.count ?? 0,
  }));
}

/** Les meilleures notes (score décroissant), éventuellement filtrées. */
export async function getTopNotes(
  sb: SupabaseClient,
  opts: { courseId?: string; limit?: number } = {}
): Promise<NoteListItem[]> {
  let query = sb
    .from("notes")
    .select(NOTE_SELECT)
    .is("removed_at", null)
    .order("score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 40);

  if (opts.courseId) query = query.eq("course_id", opts.courseId);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as NoteListItem[];
}

/** Les notes les plus récentes. */
export async function getRecentNotes(
  sb: SupabaseClient,
  opts: { courseId?: string; limit?: number } = {}
): Promise<NoteListItem[]> {
  let query = sb
    .from("notes")
    .select(NOTE_SELECT)
    .is("removed_at", null)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 40);

  if (opts.courseId) query = query.eq("course_id", opts.courseId);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as NoteListItem[];
}

export async function getNotes(
  sb: SupabaseClient,
  sort: SortMode,
  opts: { courseId?: string; limit?: number } = {}
): Promise<NoteListItem[]> {
  return sort === "recent"
    ? getRecentNotes(sb, opts)
    : getTopNotes(sb, opts);
}

export async function getCourseByCode(
  sb: SupabaseClient,
  code: string
): Promise<Course | null> {
  const { data } = await sb
    .from("courses")
    .select("id, code, name")
    .eq("code", code)
    .maybeSingle();
  return (data as Course | null) ?? null;
}

export async function getCourseById(
  sb: SupabaseClient,
  id: string
): Promise<Course | null> {
  const { data } = await sb.from("courses").select("id, code, name").eq("id", id).maybeSingle();
  return (data as Course | null) ?? null;
}

export async function getNoteById(
  sb: SupabaseClient,
  id: string
): Promise<
  | (NoteListItem & {
      author_id: string;
      course_id: string;
      file_path: string | null;
      removed_at: string | null;
    })
  | null
> {
  const { data, error } = await sb
    .from("notes")
    .select(`${NOTE_SELECT}, author_id, course_id, file_path, removed_at`)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  // Pas de filtre removed_at ici : la RLS laisse l'auteur et les
  // admins voir les notes retirées (la page affiche alors une
  // bannière). Pour les autres, la ligne n'est pas renvoyée.
  return data as unknown as NoteListItem & {
    author_id: string;
    course_id: string;
    file_path: string | null;
    removed_at: string | null;
  };
}

/** L'utilisateur courant est-il modérateur ? */
export async function getIsAdmin(sb: SupabaseClient): Promise<boolean> {
  const { data } = await sb.rpc("is_admin");
  return Boolean(data);
}

/**
 * Toutes les notes y compris les retirées — réservé à la page
 * /admin (la RLS filtre pour les non-admins).
 */
export async function getAdminNotes(
  sb: SupabaseClient,
  limit = 60
): Promise<(NoteListItem & { removed_at: string | null; file_path: string | null })[]> {
  const { data, error } = await sb
    .from("notes")
    .select(`${NOTE_SELECT}, removed_at, file_path`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as unknown as (NoteListItem & { removed_at: string | null; file_path: string | null })[];
}

/** Recherche simple : titre + description + code/nom de cours. */
export async function searchNotes(
  sb: SupabaseClient,
  opts: { q: string; courseId?: string; sort: SortMode }
): Promise<NoteListItem[]> {
  const q = opts.q.trim();
  const safe = q.replace(/[,%()]/g, " ").trim();

  let query = sb.from("notes").select(NOTE_SELECT).is("removed_at", null);

  if (opts.courseId) {
    query = query.eq("course_id", opts.courseId);
  } else if (safe) {
    // Les mots qui correspondent à un cours incluent toutes ses notes.
    const { data: matchingCourses } = await sb
      .from("courses")
      .select("id")
      .or(`code.ilike.%${safe}%,name.ilike.%${safe}%`);

    const courseIds = (matchingCourses ?? []).map((c: Any) => c.id);
    const titleCond = `title.ilike.%${safe}%,description.ilike.%${safe}%`;
    query = courseIds.length
      ? query.or(`${titleCond},course_id=in.(${courseIds.join(",")})`)
      : query.or(titleCond);
  }

  query =
    opts.sort === "recent"
      ? query.order("created_at", { ascending: false })
      : query.order("score", { ascending: false }).order("created_at", { ascending: false });

  const { data, error } = await query.limit(60);
  if (error || !data) return [];
  return data as unknown as NoteListItem[];
}

/** Les votes que l'utilisateur actuel a posés (RLS : uniquement les siens). */
export async function getMyNoteVotes(
  sb: SupabaseClient,
  noteIds: string[]
): Promise<Record<string, -1 | 1>> {
  if (!noteIds.length) return {};
  const { data } = await sb
    .from("note_votes")
    .select("note_id, value")
    .in("note_id", noteIds);
  if (!data) return {};
  const out: Record<string, -1 | 1> = {};
  data.forEach((v: Any) => (out[v.note_id] = v.value));
  return out;
}

/** Commentaires d'une note (1 niveau de réponses) + mes votes. */
export async function getComments(
  sb: SupabaseClient,
  noteId: string
): Promise<CommentData[]> {
  const { data } = await sb
    .from("comments")
    .select(
      "id, note_id, parent_id, body, score, upvotes, downvotes, created_at, author:profiles!comments_author_id_fkey ( id, display_name )"
    )
    .eq("note_id", noteId)
    .order("created_at", { ascending: true });

  if (!data) return [];
  const comments = data as unknown as CommentData[];
  const ids = comments.map((c) => c.id);

  let myVotes: Record<string, -1 | 1> = {};
  if (ids.length) {
    const { data: votes } = await sb
      .from("comment_votes")
      .select("comment_id, value")
      .in("comment_id", ids);
    (votes ?? []).forEach((v: Any) => (myVotes[v.comment_id] = v.value));
  }

  return comments.map((c) => ({ ...c, my_vote: myVotes[c.id] ?? 0 }));
}

export async function isFollowingCourse(
  sb: SupabaseClient,
  courseId: string
): Promise<boolean> {
  const { data } = await sb
    .from("course_follows")
    .select("course_id")
    .eq("course_id", courseId)
    .maybeSingle();
  return Boolean(data);
}

export async function hasReportedNote(sb: SupabaseClient, noteId: string): Promise<boolean> {
  const { data } = await sb
    .from("note_reports")
    .select("note_id")
    .eq("note_id", noteId)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Tous les signalements, groupés par note — page /admin (la RLS
 * n'expose aux admins que les rapports, via reports_select_own
 * élargi ; l'identité du signalant est stockée sur le rapport
 * lui-même : reporter_email).
 */
export async function getReportedNotes(sb: SupabaseClient): Promise<ReportedNote[]> {
  const { data, error } = await sb
    .from("note_reports")
    .select(
      `id, kind, reason, reporter_email, work_title, work_author, details,
       content_url, good_faith, created_at,
       note:notes!note_reports_note_id_fkey ( id, title, file_path, removed_at )`
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];

  const groups = new Map<string, ReportedNote>();
  for (const row of data as unknown as (ReportRow & { note: Any | null })[]) {
    if (!row.note) continue; // note déjà supprimée (cascade interrompue)
    let g = groups.get(row.note.id);
    if (!g) {
      g = {
        id: row.note.id,
        title: row.note.title,
        file_path: row.note.file_path,
        removed_at: row.note.removed_at,
        reports: [],
      };
      groups.set(row.note.id, g);
    }
    const { note: _note, ...report } = row;
    g.reports.push(report as ReportRow);
  }
  return Array.from(groups.values());
}

export async function getUnreadNotifications(
  sb: SupabaseClient,
  limit = 15
): Promise<NotificationData[]> {
  const { data } = await sb
    .from("notifications")
    .select("id, type, body, href, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as unknown as NotificationData[]) ?? [];
}
