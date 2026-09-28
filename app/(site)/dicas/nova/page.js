import TipForm from "@/components/TipForm";
import { getViewer } from "@/lib/data";
import { spotOptions } from "@/lib/spots";
import { KINDS } from "@/lib/tips";

export const metadata = { title: "Nova dica | Pesqueiro.GG" };

export default async function NovaDicaPage({ searchParams }) {
  const { supabase, user } = await getViewer();
  const sp = await searchParams;
  const kind = KINDS.some((k) => k.key === sp?.tipo) ? sp.tipo : "equipamento";
  const spots = await spotOptions(supabase);
  // Vindo da página de um local ("+ Adicionar dica"), o local já vem escolhido
  const spotId = spots.some((s) => s.id === sp?.local) ? sp.local : null;
  return <TipForm userId={user.id} initialKind={kind} spots={spots} initialSpotId={spotId} />;
}
