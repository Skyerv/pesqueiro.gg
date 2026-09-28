import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import CatchCard from "@/components/CatchCard";
import DeleteSpot from "@/components/DeleteSpot";
import SpotMap from "@/components/SpotMap";
import SpotRating from "@/components/SpotRating";
import { getViewer } from "@/lib/data";
import { mapsLink } from "@/lib/media";
import { likeExact, scoreLabel } from "@/lib/spots";
import { kindOf } from "@/lib/tips";

export const metadata = { title: "Local | Pesqueiro.GG" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CATCH_FIELDS = "id, user_id, species, qty, size_cm, caught_on, note, photo_path, spot_name, created_at";

export default async function LocalPage({ params }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const { supabase, user } = await getViewer();
  const { data: spot } = await supabase
    .from("spots")
    .select("id, name, city, price, description, lat, lng, created_by, updated_by, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!spot) notFound();

  // Registros ligados ao local, ou antigos que só têm o mesmo nome
  const [{ data: reviews }, { data: byId }, { data: byName }, { data: tips }, { data: profiles }] = await Promise.all([
    supabase.from("spot_reviews").select("user_id, score, comment, created_at, updated_at").eq("spot_id", id),
    supabase.from("catches").select(CATCH_FIELDS).eq("spot_id", id).order("caught_on", { ascending: false }),
    supabase.from("catches").select(CATCH_FIELDS).is("spot_id", null).ilike("spot_name", likeExact(spot.name)).order("caught_on", { ascending: false }),
    supabase.from("tips").select("id, kind, title, user_id, created_at").eq("spot_id", id).order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, nickname, avatar_path"),
  ]);
  const people = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  const catches = [...(byId ?? []), ...(byName ?? [])].sort((a, b) => (a.caught_on < b.caught_on ? 1 : -1));
  const list = reviews ?? [];
  const avg = list.length ? list.reduce((s, r) => s + r.score, 0) / list.length : null;
  const mine = list.find((r) => r.user_id === user.id) ?? null;

  // Números do local
  const fish = catches.reduce((s, c) => s + c.qty, 0);
  const bySpecies = {};
  const byPerson = {};
  for (const c of catches) {
    bySpecies[c.species] = (bySpecies[c.species] || 0) + c.qty;
    byPerson[c.user_id] = (byPerson[c.user_id] || 0) + c.qty;
  }
  const topSpecies = Object.entries(bySpecies).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const [topId, topQty] = Object.entries(byPerson).sort((a, b) => b[1] - a[1])[0] ?? [];
  const biggest = catches.filter((c) => c.size_cm).sort((a, b) => b.size_cm - a.size_cm)[0];

  return (
    <>
      <Link href="/locais" className="back">← Locais</Link>
      <article className="detail spot-detail">
        {spot.lat != null && <SpotMap value={{ lat: spot.lat, lng: spot.lng }} height={220} />}
        <div className="detail-body">
          <div className="spot-head">
            <div>
              <h2>{spot.name}</h2>
              {spot.city && <p className="sub">{spot.city}</p>}
            </div>
            <span className={`spot-score big${avg == null ? " none" : ""}`}>
              <b>{avg == null ? "–" : scoreLabel(avg)}</b>
              <small>{list.length ? `${list.length} ${list.length === 1 ? "nota" : "notas"}` : "sem nota"}</small>
            </span>
          </div>

          <dl className="detail-facts">
            <div><dt>Valor para pescar</dt><dd>{spot.price || "Não informado"}</dd></div>
            <div><dt>Registros</dt><dd>{catches.length}</dd></div>
            <div><dt>Peixes</dt><dd>{fish}</dd></div>
          </dl>
          {spot.description ? <p className="detail-note">{spot.description}</p> : <p className="detail-note muted">Sem descrição ainda. Conte como é o lugar em “Editar informações”.</p>}

          <div className="detail-owner">
            <Link href={`/registrar?local=${spot.id}`} className="btn small">Registrar peixe aqui</Link>
            <Link href={`/locais/${spot.id}/editar`} className="btn ghost small">Editar informações</Link>
            {spot.lat != null && (
              <a href={mapsLink(spot.lat, spot.lng)} target="_blank" rel="noopener" className="detail-open">Abrir no Google Maps</a>
            )}
          </div>

          <section className="detail-section">
            <h3 className="sec">Sua nota</h3>
            <SpotRating spotId={spot.id} userId={user.id} mine={mine} />
          </section>

          {list.length > 0 && (
            <section className="detail-section">
              <h3 className="sec">Notas da turma</h3>
              <ul className="reviews">
                {list
                  .sort((a, b) => (b.updated_at ?? b.created_at).localeCompare(a.updated_at ?? a.created_at))
                  .map((r) => (
                    <li key={r.user_id}>
                      <Avatar profile={people[r.user_id] ?? { nickname: "?" }} size="sm" />
                      <span className="review-who">{people[r.user_id]?.nickname ?? "Pescador"}</span>
                      <span className="review-score">{r.score}</span>
                      {r.comment && <p className="review-text">{r.comment}</p>}
                    </li>
                  ))}
              </ul>
            </section>
          )}

          {catches.length > 0 && (
            <section className="detail-section">
              <h3 className="sec">O que sai aqui</h3>
              <p className="spot-facts">
                {topSpecies.map(([sp, n]) => `${sp} (${n})`).join(" · ")}
                {topId && <><br />Quem mais pescou: <b>{people[topId]?.nickname ?? "?"}</b>, {topQty} {topQty === 1 ? "peixe" : "peixes"}</>}
                {biggest && <><br />Maior: {biggest.species} de {biggest.size_cm} cm</>}
              </p>
            </section>
          )}

          <section className="detail-section">
            <div className="section-row">
              <h3 className="sec">Dicas deste local</h3>
              <Link href={`/dicas/nova?local=${spot.id}`} className="btn ghost small">+ Adicionar dica</Link>
            </div>
            {tips?.length ? (
              <ul className="spot-tips">
                {tips.map((t) => (
                  <li key={t.id}>
                    <Link href={`/dicas/${t.id}`}>
                      <span>{kindOf(t.kind).emoji}</span> {t.title}
                      <small> · {people[t.user_id]?.nickname ?? "Pescador"}</small>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hint">Nenhuma dica ainda. Isca que funciona aqui, melhor horário, onde parar…</p>
            )}
          </section>

          {spot.created_by === user.id && (
            <div className="detail-owner">
              <DeleteSpot id={spot.id} />
            </div>
          )}
        </div>
      </article>

      {catches.length > 0 && (
        <section className="block">
          <h3 className="sec">Registros neste local</h3>
          <div className="feed">
            {catches.slice(0, 24).map((c) => (
              <CatchCard key={c.id} item={c} author={people[c.user_id]} showAuthor canDelete={false} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
