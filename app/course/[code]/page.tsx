import { notFound } from "next/navigation";
import FollowCourseButton from "@/components/FollowCourseButton";
import NoteBrowser from "@/components/NoteBrowser";
import SetupNotice from "@/components/SetupNotice";
import { getCourseByCode, getNotes, isFollowingCourse } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ code: string }> }) {
  const code = decodeURIComponent((await params).code);

  if (!isSupabaseConfigured) {
    return (
      <section className="content">
        <SetupNotice />
      </section>
    );
  }

  const sb = await createClient();
  const course = await getCourseByCode(sb, code);
  if (!course) notFound();

  const [notes, following] = await Promise.all([
    getNotes(sb, "top", { courseId: course.id, limit: 60 }),
    isFollowingCourse(sb, course.id),
  ]);

  return (
    <section className="content">
      <a href="/" className="back-link">
        ← Toutes les matières
      </a>

      <div className="content-header">
        <div>
          <h2>{course.name}</h2>
          <div className="sub-meta">
            {course.code} · {notes.length} note{notes.length > 1 ? "s" : ""}
          </div>
        </div>
        <FollowCourseButton courseId={course.id} following={following} />
      </div>

      <NoteBrowser
        notes={notes}
        showTypeChips
        emptyTitle="Aucune note dans cette matière."
        emptyHint="Sois le ou la premier·ère à en publier une."
      />
    </section>
  );
}
