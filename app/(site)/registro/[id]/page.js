import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import DeleteCatch from "@/components/DeleteCatch";
import { getViewer } from "@/lib/data";
import { formatDate, photoUrl } from "@/lib/stats";

export const metadata = { title: "Registro | Pesqueiro.GG" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function RegistroPage({ params }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const { supabase, user } = await getViewer();
  const { data: item } = await supabase
    .from("catches")
    .select("id, user_id, species, qty, size_cm, caught_on, note, photo_path, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!item) notFound();

  const { data: author } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_path")
    .eq("id", item.user_id)
    .maybeSingle();

  const url = photoUrl(item.photo_path);
  const name = author?.nickname || "Pescador";
  const isMine = item.user_id === user.id;

  return (
    <>
      <Link href="/mural" className="back">← Voltar ao mural</Link>
      <article className="detail">
        {url ? (
          <a href={url} target="_blank" rel="noopener" className="detail-photo" title="Abrir a foto em tamanho real">
            <img src={url} alt={`${item.species} de ${name}`} />
          </a>
        ) : (
          <div className="detail-nophoto">{item.species}</div>
        )}
        <div className="detail-body">
          <h2>
            {item.qty > 1 ? `${item.qty}× ` : ""}
            {item.species}
          </h2>
          <Link href={`/pescador/${item.user_id}`} className="detail-author">
            <Avatar profile={author ?? { nickname: name }} size="sm" />
            {name}{isMine ? " (você)" : ""}
          </Link>
          <dl className="detail-facts">
            <div><dt>Data</dt><dd>{formatDate(item.caught_on)}</dd></div>
            {item.size_cm ? <div><dt>Tamanho</dt><dd>{item.size_cm} cm</dd></div> : null}
            <div><dt>Quantidade</dt><dd>{item.qty}</dd></div>
          </dl>
          {item.note ? <p className="detail-note">{item.note}</p> : <p className="detail-note muted">Sem descrição.</p>}
          {url && <a href={url} target="_blank" rel="noopener" className="detail-open">Abrir foto em tamanho real</a>}
          {isMine && (
            <div className="detail-owner">
              <Link href={`/registro/${item.id}/editar`} className="btn ghost small">Editar registro</Link>
              <DeleteCatch id={item.id} photoPath={item.photo_path} redirectTo="/mural" />
            </div>
          )}
        </div>
      </article>
    </>
  );
}
