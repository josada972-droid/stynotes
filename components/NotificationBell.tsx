"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { NotificationData } from "@/lib/types";

/** Cloche de notifications (Realtime Supabase, aucune notification e-mail). */
export default function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationData[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sb = createClient();
    if (!sb) return;

    let cancelled = false;

    async function fetchNotifications() {
      const { data } = await sb!
        .from("notifications")
        .select("id, type, body, href, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(15);
      if (cancelled || !data) return;
      setItems((cur) => {
        // Fusion par id : les relevés périodiques ne doivent pas écraser
        // l'état « lu » déjà posé localement.
        const map = new Map((data as unknown as NotificationData[]).map((n) => [n.id, n]));
        for (const n of cur) {
          const server = map.get(n.id);
          if (server && !server.read_at && n.read_at) map.set(n.id, { ...server, read_at: n.read_at });
        }
        return Array.from(map.values())
          .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
          .slice(0, 15);
      });
    }

    fetchNotifications();

    // Filet de sécurité : relevé périodique + au retour sur l'onglet,
    // pour que la cloche fonctionne même si le push Realtime ne passe pas.
    const interval = setInterval(fetchNotifications, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchNotifications();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    const channel = sb
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notif = payload.new as NotificationData;
          setItems((cur) =>
            cur.some((n) => n.id === notif.id) ? cur : [notif, ...cur].slice(0, 15)
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      sb.removeChannel(channel);
    };
  }, [userId]);

  // Ferme le panneau si on clique ailleurs.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unread = items.filter((n) => !n.read_at).length;

  async function markAllRead() {
    const sb = createClient();
    if (!sb) return;
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (!ids.length) return;
    await sb.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
    setItems((cur) => cur.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  }

  async function openItem(notif: NotificationData) {
    const sb = createClient();
    if (sb && !notif.read_at) {
      await sb.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notif.id);
      setItems((cur) => cur.map((n) => (n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n)));
    }
    setOpen(false);
    if (notif.href) router.push(notif.href);
  }

  return (
    <div className="bell-wrap" ref={wrapRef}>
      <button
        type="button"
        className="bell-btn"
        aria-label={`Notifications${unread ? ` (${unread} non lues)` : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        🔔
        {unread > 0 && <span className="bell-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="bell-panel">
          <div className="bell-head">
            <span>Notifications</span>
            {unread > 0 && (
              <button type="button" className="mark-read" onClick={markAllRead}>
                Tout marquer comme lu
              </button>
            )}
          </div>
          {items.length ? (
            items.map((n) => (
              <a
                key={n.id}
                href={n.href ?? "#"}
                className={`notif-item${n.read_at ? "" : " unread"}`}
                onClick={(e) => {
                  e.preventDefault();
                  openItem(n);
                }}
              >
                {n.body}
                <span className="notif-time">
                  {new Date(n.created_at).toLocaleString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </a>
            ))
          ) : (
            <div className="bell-empty">Aucune notification pour l’instant.</div>
          )}
        </div>
      )}
    </div>
  );
}
