import Link from "next/link";

/**
 * Footer minimal — mentions légales minimales (LCEN art. 6-III) et
 * accès rapide au guide / CGU. Statique : aucun appel réseau.
 */
export default function Footer() {
  return (
    <footer className="site-footer">
      <span className="footer-brand serif">
        La Fichothèque<span className="dot">.</span>
      </span>
      <nav>
        <Link href="/guide">Résumer sans plagier</Link>
        <Link href="/cgu">CGU</Link>
        <a href="mailto:david-alexy.jean-baptiste@univ-tlse3.fr,alex.fabre--laporte@univ-tlse3.fr?subject=Contact%20mod%C3%A9ration%20-%20La%20Fichoth%C3%A8que">Contact modération</a>
      </nav>
      <span className="footer-note">
        Fondée par David-Alexy Jean-Baptiste &amp; Alex Fabre-Laporte — supports d’étude
        partagés par les étudiants, pour les étudiants.
      </span>
    </footer>
  );
}
