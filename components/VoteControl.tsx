"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

interface Props {
  targetType: "note" | "comment";
  targetId: string;
  score: number;
  upvotes: number;
  downvotes: number;
  userVote: -1 | 0 | 1;
  compact?: boolean;
}

/**
 * Vote up/down — partagé entre les notes et les comments.
 * L'identité du votant n'est jamais affichée (anonymat permanent
 * des votes) : seuls les compteurs ↑/↓ sont publics.
 */
export default function VoteControl({
  targetType,
  targetId,
  score,
  upvotes,
  downvotes,
  userVote,
  compact,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState({ score, up: upvotes, down: downvotes, vote: userVote });
  const [busy, setBusy] = useState(false);

  async function vote(dir: 1 | -1) {
    if (busy) return;
    const sb = createClient();
    if (!sb) return;

    const { data } = await sb.auth.getUser();
    if (!data.user) {
      toast("Connecte-toi pour voter.");
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    const table = targetType === "note" ? "note_votes" : "comment_votes";
    const key = targetType === "note" ? "note_id" : "comment_id";
    const nextVote: -1 | 0 | 1 = state.vote === dir ? 0 : dir;

    // Optimiste : on applique le delta puis on restaure si échec.
    const prev = state.vote;
    const next = {
      score: state.score - prev + nextVote,
      up: state.up + (nextVote === 1 ? 1 : 0) - (prev === 1 ? 1 : 0),
      down: state.down + (nextVote === -1 ? 1 : 0) - (prev === -1 ? 1 : 0),
      vote: nextVote,
    };

    setState(next);
    setBusy(true);

    try {
      if (nextVote === 0) {
        const { error } = await sb.from(table).delete().eq(key, targetId);
        if (error) throw error;
      } else {
        const row = { [key]: targetId, user_id: data.user.id, value: nextVote };
        const { error } = await sb.from(table).upsert(row, { onConflict: key + ",user_id" });
        if (error) throw error;
      }
    } catch {
      setState(state);
      toast("Le vote n’a pas pu être enregistré.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`vote-control${compact ? " compact" : ""}`}>
      <button
        type="button"
        className={`vote-btn up${state.vote === 1 ? " active" : ""}`}
        aria-label={`Voter pour (${state.up} votes positifs)`}
        onClick={() => vote(1)}
      >
        ▲ <span className="vote-count">{state.up}</span>
      </button>
      <span className="vote-score">{state.score}</span>
      <button
        type="button"
        className={`vote-btn down${state.vote === -1 ? " active" : ""}`}
        aria-label={`Voter contre (${state.down} votes négatifs)`}
        onClick={() => vote(-1)}
      >
        ▼ <span className="vote-count">{state.down}</span>
      </button>
    </div>
  );
}
