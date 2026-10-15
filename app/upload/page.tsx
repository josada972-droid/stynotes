import { redirect } from "next/navigation";
import UploadForm from "@/components/UploadForm";
import SetupNotice from "@/components/SetupNotice";
import { getCourses } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  if (!isSupabaseConfigured) {
    return (
      <section className="content">
        <SetupNotice />
      </section>
    );
  }

  const sb = await createClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect("/login?next=/upload");

  const courses = await getCourses(sb);

  return (
    <section className="content">
      <a href="/" className="back-link">
        ← Annuler
      </a>
      <div className="content-header" style={{ borderBottom: "none", marginBottom: 20 }}>
        <div>
          <h2>Publier une note</h2>
          <div className="sub-meta">Résumé personnel, fiche de révision ou carte mentale — écrit dans tes mots.</div>
        </div>
      </div>
      <UploadForm courses={courses} />
    </section>
  );
}
