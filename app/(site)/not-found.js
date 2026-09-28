import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty">
      <strong>Pescador não encontrado</strong>
      <Link href="/">Voltar ao ranking</Link>
    </div>
  );
}
