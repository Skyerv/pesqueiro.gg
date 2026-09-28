import TipForm from "@/components/TipForm";
import { getViewer } from "@/lib/data";
import { KINDS } from "@/lib/tips";

export const metadata = { title: "Nova dica | Pesqueiro.GG" };

export default async function NovaDicaPage({ searchParams }) {
  const { user } = await getViewer();
  const sp = await searchParams;
  const kind = KINDS.some((k) => k.key === sp?.tipo) ? sp.tipo : "equipamento";
  return <TipForm userId={user.id} initialKind={kind} />;
}
