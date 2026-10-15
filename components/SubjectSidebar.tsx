"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Course } from "@/lib/types";

export default function SubjectSidebar({ courses }: { courses: Course[] }) {
  const pathname = usePathname();

  if (!courses.length) {
    return (
      <aside className="subjects">
        <div className="label">Matières</div>
        <ul>
          <li>
            <span className="subject-item" style={{ display: "block", color: "var(--ink-soft)", fontSize: 13 }}>
              Aucune matière pour l’instant.
            </span>
          </li>
        </ul>
      </aside>
    );
  }

  return (
    <aside className="subjects">
      <div className="label">Matières</div>
      <ul>
        {courses.map((course) => {
          const active = pathname === `/course/${encodeURIComponent(course.code)}`;
          return (
            <li key={course.id}>
              <Link
                href={`/course/${encodeURIComponent(course.code)}`}
                className={`subject-item${active ? " active" : ""}`}
              >
                <span>{course.name}</span>
                <span className="count">{course.note_count ?? 0}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
