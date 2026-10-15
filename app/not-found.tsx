import Link from "next/link";

export default function NotFound() {
  return (
    <section className="content">
      <div className="empty-state">
        <span className="serif">Page introuvable.</span>
        Cette note n’existe plus (ou n’a jamais existé).
        <div style={{ marginTop: 18 }}>
          <Link href="/" className="btn small">
            Retour à l’accueil
          </Link>
        </div>
      </div>
    </section>
  );
}
