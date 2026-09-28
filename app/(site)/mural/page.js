import CatchCard from "@/components/CatchCard";
import { getBoard, getViewer } from "@/lib/data";

export const metadata = { title: "Mural | Pesqueiro.GG" };

export default async function MuralPage() {
  const { supabase, user } = await getViewer();
  const { profiles, catches } = await getBoard(supabase);
  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));

  if (!catches.length) {
    return (
      <div className="empty">
        <strong>Mural vazio</strong>
        As fotos e registros da turma aparecem aqui.
      </div>
    );
  }

  return (
    <div className="feed">
      {catches.map((c) => (
        <CatchCard key={c.id} item={c} author={byId[c.user_id]} showAuthor canDelete={c.user_id === user.id} />
      ))}
    </div>
  );
}
