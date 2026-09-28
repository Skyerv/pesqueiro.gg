import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import CatchCard from "@/components/CatchCard";
import FishLine from "@/components/FishLine";
import SpeciesList from "@/components/SpeciesList";
import { getBoard, getViewer } from "@/lib/data";
import { rankFor } from "@/lib/ranks";
import { buildStats, speciesTotals } from "@/lib/stats";

export default async function PescadorPage({ params }) {
  const { id } = await params;
  const { supabase, user } = await getViewer();
  const { profiles, catches } = await getBoard(supabase);
  const s = buildStats(profiles, catches).find((x) => x.id === id);
  if (!s) notFound();

  const isMe = s.id === user.id;
  const own = catches.filter((c) => c.user_id === s.id);
  const speciesCount = Object.keys(s.species).length;

  return (
    <>
      <Link href="/" className="back">← Voltar ao ranking</Link>
      <section className="prof">
        <div className="prof-head">
          <Avatar profile={s} size="lg" />
          <div>
            <h2>{s.nickname}{isMe ? " (você)" : ""}</h2>
            <div className="cargo">{rankFor(s.total).rank.name}</div>
          </div>
          <div className="total">
            <b>{s.total}</b>
            <span>{s.total === 1 ? "peixe" : "peixes"}</span>
          </div>
        </div>
        <FishLine total={s.total} />
        <div className="prof-stats">
          <div><b>{s.position}º</b> no ranking</div>
          <div><b>{speciesCount}</b> {speciesCount === 1 ? "espécie" : "espécies"}</div>
          <div><b>{s.days.size}</b> {s.days.size === 1 ? "dia de pesca" : "dias de pesca"}</div>
          <div><b>{s.photos}</b> {s.photos === 1 ? "foto" : "fotos"}</div>
        </div>
        {isMe && <Link href="/perfil" className="btn ghost small">Editar perfil</Link>}
      </section>

      <section className="block">
        <h3 className="sec">Espécies</h3>
        <SpeciesList rows={speciesTotals([s])} showOwner={false} />
      </section>

      <section className="block">
        <h3 className="sec">Fotos e registros</h3>
        {own.length ? (
          <div className="feed">
            {own.map((c) => (
              <CatchCard key={c.id} item={c} author={s} showAuthor={false} canDelete={isMe} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <strong>Nenhum registro ainda</strong>
            {isMe ? "Registre seu primeiro peixe para sair de Jovem Aprendiz." : "Os registros dessa pessoa aparecem aqui."}
          </div>
        )}
      </section>
    </>
  );
}
