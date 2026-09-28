import Link from "next/link";
import Avatar from "@/components/Avatar";
import CareerTab from "@/components/CareerTab";
import FishLine from "@/components/FishLine";
import { getBoard, getViewer } from "@/lib/data";
import { RANKS, rankFor } from "@/lib/ranks";
import { buildStats } from "@/lib/stats";

export default async function RankingPage({ searchParams }) {
  const { supabase, user } = await getViewer();
  const sp = await searchParams;
  const { profiles, catches } = await getBoard(supabase);
  const list = buildStats(profiles, catches);
  const promo = RANKS.find((r) => r.name === sp?.promovido);
  const myTotal = list.find((s) => s.id === user.id)?.total ?? 0;

  return (
    <>
      {promo && (
        <div className="promo-banner" role="status">
          <p>Parabéns, você foi promovido a</p>
          <strong>{promo.name}</strong>
          <Link href="/" className="btn">Aceitar o cargo</Link>
        </div>
      )}

      <ol className="rank-list">
        {list.map((s) => (
          <li key={s.id}>
            <Link href={`/pescador/${s.id}`} className={`angler${s.id === user.id ? " me" : ""}`}>
              <span className="pos">{s.position}</span>
              <Avatar profile={s} />
              <span className="who">
                {s.nickname}
                {s.id === user.id && <small>você</small>}
              </span>
              <span className="total">
                <b>{s.total}</b>
                <span>{s.total === 1 ? "peixe" : "peixes"}</span>
              </span>
              <span className="cargo">{rankFor(s.total).rank.name}</span>
              <FishLine total={s.total} />
            </Link>
          </li>
        ))}
      </ol>

      <CareerTab total={myTotal} />
    </>
  );
}
