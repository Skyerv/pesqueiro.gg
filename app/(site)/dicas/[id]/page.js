import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import DeleteTip from "@/components/DeleteTip";
import { getViewer } from "@/lib/data";
import { photoUrl } from "@/lib/stats";
import { domainOf, kindOf } from "@/lib/tips";

export const metadata = { title: "Dica | Pesqueiro.GG" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DicaPage({ params }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const { supabase, user } = await getViewer();
  const { data: tip } = await supabase
    .from("tips")
    .select("id, user_id, kind, title, body, url, photo_path, spot_id, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!tip) notFound();

  const [{ data: author }, { data: spot }] = await Promise.all([
    supabase.from("profiles").select("id, nickname, avatar_path").eq("id", tip.user_id).maybeSingle(),
    tip.spot_id ? supabase.from("spots").select("id, name").eq("id", tip.spot_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const k = kindOf(tip.kind);
  const img = photoUrl(tip.photo_path);
  const isMine = tip.user_id === user.id;
  const when = new Date(tip.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <Link href={`/dicas?tipo=${tip.kind}`} className="back">← Dicas de {k.label.toLowerCase()}</Link>
      <article className="detail tip-detail">
        {img && (
          <a href={img} target="_blank" rel="noopener" className="detail-photo" title="Abrir a foto em tamanho real">
            <img src={img} alt={tip.title} />
          </a>
        )}
        <div className="detail-body">
          <span className="tip-kind">{k.emoji} {k.label}</span>
          <h2>{tip.title}</h2>
          <div className="tip-meta">
            <Link href={`/pescador/${tip.user_id}`} className="detail-author">
              <Avatar profile={author ?? { nickname: "?" }} size="sm" />
              {author?.nickname ?? "Pescador"}{isMine ? " (você)" : ""}
            </Link>
            <span className="tip-date">{when}{tip.updated_at ? " · editada" : ""}</span>
          </div>
          {spot && (
            <Link href={`/locais/${spot.id}`} className="tip-spot">📍 {spot.name}</Link>
          )}
          {tip.url && (
            <a href={tip.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="btn tip-open">
              Abrir link · {domainOf(tip.url)}
            </a>
          )}
          {tip.body && <p className="detail-note">{tip.body}</p>}
          {isMine && (
            <div className="detail-owner">
              <Link href={`/dicas/${tip.id}/editar`} className="btn ghost small">Editar dica</Link>
              <DeleteTip id={tip.id} photoPath={tip.photo_path} />
            </div>
          )}
        </div>
      </article>
    </>
  );
}
