import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty">
      <strong>Dica não encontrada</strong>
      Ela pode ter sido excluída. <Link href="/dicas">Voltar às dicas</Link>
    </div>
  );
}
