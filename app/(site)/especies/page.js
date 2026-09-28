import Link from "next/link";
import SpeciesList from "@/components/SpeciesList";
import { getBoard, getViewer } from "@/lib/data";
import { buildStats, speciesTotals } from "@/lib/stats";

export const metadata = { title: "Espécies | Quadro de promoções" };

export default async function EspeciesPage({ searchParams }) {
  const { supabase, user } = await getViewer();
  const sp = await searchParams;
  const { profiles, catches } = await getBoard(supabase);
  const list = buildStats(profiles, catches).filter((s) => s.total > 0);
  const selected = list.find((s) => s.id === sp?.pescador) ?? null;
  const rows = speciesTotals(selected ? [selected] : list);

  return (
    <>
      <div className="chips">
        <Link href="/especies" className="chip" aria-current={!selected ? "true" : undefined}>Turma toda</Link>
        {list.map((s) => (
          <Link
            key={s.id}
            href={`/especies?pescador=${s.id}`}
            className="chip"
            aria-current={selected?.id === s.id ? "true" : undefined}
          >
            {s.id === user.id ? "Você" : s.nickname}
          </Link>
        ))}
      </div>
      <SpeciesList rows={rows} showOwner={!selected} />
    </>
  );
}
