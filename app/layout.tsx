import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import SubjectSidebar from "@/components/SubjectSidebar";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getCourses } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: "La Fichothèque",
  description:
    "Résumés personnels, fiches de révision et cartes mentales, classés par UE et votés par les étudiants.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const courses = isSupabaseConfigured ? await getCourses(await createClient()) : [];

  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div id="shell">
          <Header />
          <main>
            <SubjectSidebar courses={courses} />
            {children}
          </main>
          <Footer />
        </div>
        <div className="toast" id="toast" aria-live="polite" />
        <noscript>
          <div style={{ padding: 20, textAlign: "center" }}>
            <Link href="/">La Fichothèque</Link>
          </div>
        </noscript>
      </body>
    </html>
  );
}
