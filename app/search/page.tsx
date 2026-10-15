import NoteBrowser from "@/components/NoteBrowser";
import SetupNotice from "@/components/SetupNotice";
import { getCourses, getCourseByCode, searchNotes } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { SortMode } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ q?: string; course?: string; sort?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  if (!isSupabaseConfigured) {
    return (
      <section className="content">
        <SetupNotice />
      </section>
    );
  }

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const sort: SortMode = params.sort === "recent" ? "recent" : "top";
  const sb = await createClient();

  const course = params.course ? await getCourseByCode(sb, params.course) : null;
  const [results, courses] = await Promise.all([
    searchNotes(sb, { q, courseId: course?.id, sort }),
    getCourses(sb),
  ]);

  return (
    <section className="content">
      <div className="content-header">
        <div>
          <h2>Recherche</h2>
          <div className="sub-meta">
            {q ? `« ${q} »` : "Toutes les notes"}
            {course ? ` · filtré sur ${course.code}` : ""} — {results.length} résultat
            {results.length > 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <form className="toolbar" action="/search" method="get" style={{ marginTop: 18 }}>
        <div style={{ display: "flex", gap: 10, flex: 1, flexWrap: "wrap" }}>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Titre, description ou matière…"
            aria-label="Rechercher"
            style={{
              flex: 1,
              minWidth: 180,
              border: "1px solid var(--rule-strong)",
              background: "var(--paper-raised)",
              padding: "9px 12px",
              fontSize: 14,
              fontFamily: "inherit",
              borderRadius: 2,
            }}
          />
          <select
            name="course"
            defaultValue={course?.code ?? ""}
            aria-label="Filtrer par cours"
            style={{
              border: "1px solid var(--rule-strong)",
              background: "var(--paper-raised)",
              padding: "9px 10px",
              fontSize: 14,
              fontFamily: "inherit",
              borderRadius: 2,
              color: "var(--ink)",
            }}
          >
            <option value="">Toutes les matières</option>
            {courses.map((c) => (
              <option key={c.id} value={c.code}>
                {c.code} · {c.name}
              </option>
            ))}
          </select>
          <input type="hidden" name="sort" value={sort} />
          <button type="submit" className="btn small">
            Filtrer
          </button>
        </div>
      </form>

      <div style={{ height: 8 }} />

      <NoteBrowser
        notes={results}
        initialSort={sort}
        showTypeChips
        emptyTitle={q ? "Aucun résultat." : "Rien à chercher pour l’instant."}
        emptyHint={
          q
            ? "Essaie un autre mot-clé, ou parcours les matières dans la barre de gauche."
            : "Publie une première note pour alimenter la recherche."
        }
      />
    </section>
  );
}
