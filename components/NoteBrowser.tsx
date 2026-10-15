"use client";

import { useMemo, useState } from "react";
import NoteRow from "@/components/NoteRow";
import type { NoteListItem, SortMode } from "@/lib/types";

type TypeFilter = "tous" | "cours" | "fiche" | "carte";

interface Props {
  notes: NoteListItem[];
  initialSort?: SortMode;
  showTypeChips?: boolean;
  showCourseChips?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
}

/**
 * Filtre + tri côté client : chips de type (cours / fiche), chips de cours
 * (optionnel) et tri Top / Récents — sur la liste de notes chargée.
 */
export default function NoteBrowser({
  notes,
  initialSort = "top",
  showTypeChips = false,
  showCourseChips = false,
  emptyTitle = "Aucune note ici pour l’instant.",
  emptyHint,
}: Props) {
  const [sort, setSort] = useState<SortMode>(initialSort);
  const [type, setType] = useState<TypeFilter>("tous");
  const [courseId, setCourseId] = useState<string | null>(null);

  const courses = useMemo(() => {
    const map = new Map<string, string>();
    notes.forEach((n) => {
      if (n.course) map.set(n.course.id, n.course.code);
    });
    return Array.from(map.entries()).map(([id, code]) => ({ id, code }));
  }, [notes]);

  const list = useMemo(() => {
    let out = notes.filter((n) => {
      if (type !== "tous" && n.note_type !== type) return false;
      if (courseId && n.course?.id !== courseId) return false;
      return true;
    });
    out = [...out].sort((a, b) =>
      sort === "recent"
        ? b.created_at.localeCompare(a.created_at)
        : b.score - a.score || b.created_at.localeCompare(a.created_at)
    );
    return out;
  }, [notes, sort, type, courseId]);

  return (
    <>
      {(showTypeChips || (showCourseChips && courses.length > 1)) && (
        <div className="toolbar">
          <div className="chips">
            {showTypeChips && (
              <>
                <button
                  type="button"
                  className={`chip${type === "tous" ? " active" : ""}`}
                  onClick={() => setType("tous")}
                >
                  Tout
                </button>
                <button
                  type="button"
                  className={`chip${type === "cours" ? " active" : ""}`}
                  onClick={() => setType("cours")}
                >
                  Résumés personnels
                </button>
                <button
                  type="button"
                  className={`chip${type === "fiche" ? " active" : ""}`}
                  onClick={() => setType("fiche")}
                >
                  Fiches de révision
                </button>
                <button
                  type="button"
                  className={`chip${type === "carte" ? " active" : ""}`}
                  onClick={() => setType("carte")}
                >
                  Cartes mentales
                </button>
              </>
            )}
            {showCourseChips &&
              courses.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`chip${courseId === c.id ? " active" : ""}`}
                  onClick={() => setCourseId((cur) => (cur === c.id ? null : c.id))}
                >
                  {c.code}
                </button>
              ))}
          </div>

          <div className="sort-row">
            <button
              type="button"
              className={sort === "top" ? "active" : ""}
              onClick={() => setSort("top")}
            >
              Top
            </button>
            <button
              type="button"
              className={sort === "recent" ? "active" : ""}
              onClick={() => setSort("recent")}
            >
              Récentes
            </button>
          </div>
        </div>
      )}

      {list.length ? (
        list.map((note) => <NoteRow key={note.id} note={note} />)
      ) : (
        <div className="empty-state">
          <span className="serif">{emptyTitle}</span>
          {emptyHint}
        </div>
      )}
    </>
  );
}
