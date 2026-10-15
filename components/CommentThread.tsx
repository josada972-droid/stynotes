"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import VoteControl from "@/components/VoteControl";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import type { CommentData } from "@/lib/types";
import { colorFor, formatDate, initialsOf } from "@/lib/utils";

interface Props {
  noteId: string;
  comments: CommentData[];
  viewerId: string | null;
  viewerName: string | null;
}

/**
 * Fil de commentaires Reddit : un seul niveau de réponses, votes
 * indépendants du vote de la note.
 */
export default function CommentThread({ noteId, comments, viewerId, viewerName }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [list, setList] = useState<CommentData[]>(comments);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const tree = useMemo(() => {
    const sorted = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const roots = sorted.filter((c) => !c.parent_id);
    return roots.map((root) => ({
      root,
      replies: sorted.filter((c) => c.parent_id && c.parent_id === root.id),
    }));
  }, [list]);

  // Les réponses dont le parent est lui-même une réponse sont rattachées
  // à la racine du fil (1 niveau de réponses maximum).
  const strayReplies = useMemo(
    () => list.filter((c) => c.parent_id && !list.some((r) => r.id === c.parent_id)),
    [list]
  );

  async function ensureSession(): Promise<string | null> {
    const sb = createClient();
    if (!sb) return null;
    const { data } = await sb.auth.getUser();
    if (!data.user) {
      toast("Connecte-toi pour commenter.");
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return null;
    }
    return data.user.id;
  }

  async function post(body: string, parentId: string | null, onSuccess: () => void) {
    const text = body.trim();
    if (!text) {
      toast("Écris un commentaire d’abord.");
      return;
    }
    const userId = await ensureSession();
    if (!userId) return;

    const sb = createClient();
    if (!sb) return;

    setBusy(true);
    const { data, error } = await sb
      .from("comments")
      .insert({ note_id: noteId, author_id: userId, parent_id: parentId, body: text })
      .select("id, note_id, parent_id, body, score, upvotes, downvotes, created_at")
      .single();

    setBusy(false);

    if (error || !data) {
      toast("Le commentaire n’a pas pu être publié.");
      return;
    }

    const rootId = parentId && list.some((c) => c.id === parentId)
      ? list.find((c) => c.id === parentId)!.parent_id ?? parentId
      : null;

    setList((cur) => [
      ...cur,
      {
        ...(data as CommentData),
        author: { id: userId, display_name: viewerName ?? "Étudiant·e" },
        my_vote: 0,
        parent_id: rootId,
      },
    ]);
    onSuccess();
    toast("Commentaire publié.");
  }

  function renderComment(comment: CommentData, isReply: boolean) {
    const authorName = comment.author?.display_name ?? "Étudiant·e";
    return (
      <div key={comment.id} className={`comment${isReply ? " reply" : ""}`}>
        <span className="avatar" style={{ background: colorFor(authorName) }}>
          {initialsOf(authorName)}
        </span>
        <div className="comment-body">
          <div className="comment-meta">
            <span className="author">{authorName}</span>
            <span>{formatDate(comment.created_at)}</span>
          </div>
          <p className="comment-text">{comment.body}</p>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <VoteControl
              targetType="comment"
              targetId={comment.id}
              score={comment.score}
              upvotes={comment.upvotes}
              downvotes={comment.downvotes}
              userVote={comment.my_vote ?? 0}
              compact
            />
            {!isReply && (
              <button
                type="button"
                className="reply-link"
                onClick={() => {
                  setReplyTo(replyTo === comment.id ? null : comment.id);
                  setReplyDraft("");
                }}
              >
                Répondre
              </button>
            )}
          </div>

          {replyTo === comment.id && (
            <div className="comment-form" style={{ marginTop: 12 }}>
              <textarea
                autoFocus
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                placeholder={`Répondre à ${authorName}…`}
              />
              <div className="form-actions">
                <button
                  type="button"
                  className="btn primary small"
                  disabled={busy}
                  onClick={() => post(replyDraft, comment.id, () => {
                    setReplyDraft("");
                    setReplyTo(null);
                  })}
                >
                  Répondre
                </button>
                <button type="button" className="back-link" style={{ margin: 0 }} onClick={() => setReplyTo(null)}>
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="comments-section">
      <h3>
        Commentaires{" "}
        <span style={{ color: "var(--ink-soft)", fontWeight: 400 }}>({list.length})</span>
      </h3>

      <div className="comment-form" style={{ marginBottom: 18 }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            viewerName
              ? `Pose une question ou clarifie une notion… (publié en tant que ${viewerName})`
              : "Pose une question ou clarifie une notion…"
          }
        />
        <div className="form-actions">
          <button
            type="button"
            className="btn primary small"
            disabled={busy}
            onClick={() => post(draft, null, () => setDraft(""))}
          >
            Commenter
          </button>
          {!viewerId && <span className="form-note">Un compte étudiant est nécessaire.</span>}
        </div>
      </div>

      {tree.length || strayReplies.length ? (
        <div>
          {tree.map(({ root, replies }) => (
            <div key={root.id}>
              {renderComment(root, false)}
              {replies.map((r) => renderComment(r, true))}
            </div>
          ))}
          {strayReplies.map((r) => renderComment(r, true))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="serif">Aucun commentaire.</span>
          Lance la discussion sur cette note.
        </div>
      )}
    </section>
  );
}
