import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty">
      <strong>Local não encontrado</strong>
      Ele pode ter sido excluído. <Link href="/locais">Voltar aos locais</Link>
    </div>
  );
}
