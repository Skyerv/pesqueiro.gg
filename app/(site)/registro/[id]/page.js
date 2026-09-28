import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import DeleteCatch from "@/components/DeleteCatch";
import SpotMap from "@/components/SpotMap";
import { getViewer } from "@/lib/data";
import { mapsLink } from "@/lib/media";
import { likeExact } from "@/lib/spots";
import { formatDate, photoUrl } from "@/lib/stats";

export const metadata = { title: "Registro | Pesqueiro.GG" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function RegistroPage({ params, searchParams }) {
  const { id } = await params;
  const failed = Number((await searchParams)?.midia) || 0;
  if (!UUID.test(id)) notFound();

  const { supabase, user } = await getViewer();
  const { data: item } = await supabase
    .from("catches")
    .select("id, user_id, species, qty, size_cm, caught_on, note, photo_path, spot_id, spot_name, lat, lng, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!item) notFound();

  const [{ data: author }, { data: media }, { data: spotRow }] = await Promise.all([
    supabase.from("profiles").select("id, nickname, avatar_path").eq("id", item.user_id).maybeSingle(),
    supabase.from("catch_media").select("id, path, kind").eq("catch_id", item.id).order("position"),
    // Página do local: pelo vínculo ou, em registros antigos, pelo nome
    item.spot_id
      ? supabase.from("spots").select("id").eq("id", item.spot_id).maybeSingle()
      : item.spot_name
        ? supabase.from("spots").select("id").ilike("name", likeExact(item.spot_name)).maybeSingle()
        : Promise.resolve({ data: null }),
  ]);
  const hasSpot = item.lat != null && item.lng != null;

  // Sem foto principal: a primeira foto extra vira a capa (e sai da galeria)
  const coverMedia = item.photo_path ? null : (media ?? []).find((m) => m.kind === "image") ?? null;
  const gallery = (media ?? []).filter((m) => m !== coverMedia);
  const url = photoUrl(item.photo_path || coverMedia?.path);
  const name = author?.nickname || "Pescador";
  const isMine = item.user_id === user.id;

  return (
    <>
      <Link href="/mural" className="back">← Voltar ao mural</Link>
      {failed > 0 && isMine && (
        <p className="notice error" role="alert">
          O registro foi salvo, mas {failed === 1 ? "1 foto ou vídeo não foi enviado" : `${failed} fotos ou vídeos não foram enviados`}.
          Toque em Editar registro para tentar de novo.
        </p>
      )}
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

          {gallery.length > 0 && (
            <section className="detail-section">
              <h3 className="sec">Mais fotos e vídeos</h3>
              <ul className="gallery">
                {gallery.map((m) => {
                  const src = photoUrl(m.path);
                  return (
                    <li key={m.id} className={m.kind}>
                      {m.kind === "video" ? (
                        <video src={src} controls playsInline preload="metadata" />
                      ) : (
                        <a href={src} target="_blank" rel="noopener" title="Abrir em tamanho real">
                          <img src={src} alt={`Foto extra de ${item.species}`} loading="lazy" />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {(hasSpot || item.spot_name) && (
            <section className="detail-section">
              <h3 className="sec">Local da captura</h3>
              {item.spot_name && (
                <p className="spot-name">
                  📍 {spotRow ? <Link href={`/locais/${spotRow.id}`}>{item.spot_name}</Link> : item.spot_name}
                </p>
              )}
              {hasSpot && (
                <>
                  <SpotMap value={{ lat: item.lat, lng: item.lng }} height={240} />
                  <a href={mapsLink(item.lat, item.lng)} target="_blank" rel="noopener" className="detail-open">
                    Abrir no Google Maps
                  </a>
                </>
              )}
            </section>
          )}

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
