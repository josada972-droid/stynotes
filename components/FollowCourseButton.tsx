"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

interface Props {
  courseId: string;
  following: boolean;
}

/** Suivre un cours : déclenche la notif "nouveau n°1" dans ce cours. */
export default function FollowCourseButton({ courseId, following }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isFollowing, setIsFollowing] = useState(following);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    const sb = createClient();
    if (!sb) return;

    const { data } = await sb.auth.getUser();
    if (!data.user) {
      toast("Connecte-toi pour suivre une matière.");
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    const next = !isFollowing;
    setIsFollowing(next);
    setBusy(true);

    try {
      if (next) {
        const { error } = await sb
          .from("course_follows")
          .insert({ user_id: data.user.id, course_id: courseId });
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await sb
          .from("course_follows")
          .delete()
          .eq("user_id", data.user.id)
          .eq("course_id", courseId);
        if (error) throw error;
      }
      toast(next ? "Matière suivie." : "Matière non suivie.");
    } catch {
      setIsFollowing(!next);
      toast("Action impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`btn small${isFollowing ? " following" : " primary"}`}
      onClick={toggle}
      disabled={busy}
    >
      {isFollowing ? "Matière suivie ✓" : "Suivre cette matière"}
    </button>
  );
}
