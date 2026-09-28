import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty">
      <strong>Registro não encontrado</strong>
      Ele pode ter sido excluído. <Link href="/mural">Voltar ao mural</Link>
    </div>
  );
}
