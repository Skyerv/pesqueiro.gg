import Link from "next/link";
import DeleteSuggestion from "@/components/DeleteSuggestion";
import SuggestionForm from "@/components/SuggestionForm";
import { getViewer } from "@/lib/data";
import { githubReady, listSuggestions } from "@/lib/github";

export const metadata = { title: "Sugestões | Pesqueiro.GG" };

const STATUS = {
  aberta: "Na fila",
  feita: "Feita",
  descartada: "Descartada",
};

export default async function SugestoesPage() {
  const { user } = await getViewer();

  if (!githubReady()) {
    return (
      <div className="empty">
        <strong>Sugestões ainda não ligadas</strong>
        Falta configurar o acesso ao GitHub (veja o README).
      </div>
    );
  }

  let items = null;
  try {
    items = await listSuggestions();
  } catch {
    items = null;
  }

  return (
    <>
      <SuggestionForm />
      <h3 className="sec sugg-head">Sugestões da turma</h3>
      {items === null && <p className="notice error">Não deu para carregar as sugestões agora.</p>}
      {items?.length === 0 && (
        <div className="empty">
          <strong>Nenhuma sugestão ainda</strong>
          Seja o primeiro a mandar uma ideia.
        </div>
      )}
      {items?.length > 0 && (
        <ul className="sugg-list">
          {items.map((s) => (
            <li key={s.number} className="sugg">
              <span className={`sugg-status ${s.status}`}>{STATUS[s.status]}</span>
              <span className="sugg-title">{s.title}</span>
              <span className="sugg-meta">
                #{s.number}
                {s.authorName && (
                  <>
                    {" · "}
                    {s.authorId ? <Link href={`/pescador/${s.authorId}`}>{s.authorName}</Link> : s.authorName}
                  </>
                )}
                {" · "}
                {new Date(s.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                {s.comments > 0 && ` · ${s.comments} comentário${s.comments > 1 ? "s" : ""}`}
              </span>
              {s.authorId === user.id && s.status === "aberta" && <DeleteSuggestion number={s.number} />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
