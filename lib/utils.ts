/** Petits utilitaires partagés (affichage, dates, avatar). */

import type { NoteType } from "@/lib/types";

/**
 * Libellés de types — vocabulaire légalement sûr imposé par la
 * charte (/guide) : on ne parle jamais de « cours » partagé
 * (cela évoque la copie du support du professeur), mais de
 * résumés personnels, fiches de révision et cartes mentales.
 */
export function noteTypeLabel(type: NoteType): string {
  switch (type) {
    case "fiche":
      return "Fiche de révision";
    case "carte":
      return "Carte mentale";
    default:
      return "Résumé personnel";
  }
}

/** Version courte pour les tags des listes. */
export function noteTypeShort(type: NoteType): string {
  switch (type) {
    case "fiche":
      return "Fiche";
    case "carte":
      return "Carte mentale";
    default:
      return "Résumé";
  }
}

const AVATAR_PALETTE = ["#1B2A4A", "#B23A2E", "#3E6259", "#7A5230", "#4A5876", "#8A3B5E"];

export function initialsOf(name: string): string {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < (seed || "").length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) % AVATAR_PALETTE.length;
  }
  return AVATAR_PALETTE[Math.abs(h)];
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function excerpt(text: string | null, n = 160): string {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n) + "…" : clean;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/** Affiche "Anonyme" si l'auteur a choisi de publier sous anonymat. */
export function authorLabel(
  isAnonymous: boolean,
  author: { display_name: string } | null | undefined
): string {
  if (isAnonymous) return "Anonyme";
  return author?.display_name ?? "Anonyme";
}
