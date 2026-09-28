import { notFound } from "next/navigation";
import TipForm from "@/components/TipForm";
import { getViewer } from "@/lib/data";
import { spotOptions } from "@/lib/spots";

export const metadata = { title: "Editar dica | Pesqueiro.GG" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditarDicaPage({ params }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const { supabase, user } = await getViewer();
  const { data: tip } = await supabase
    .from("tips")
    .select("id, kind, title, body, url, photo_path, spot_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  // Dica de outra pessoa (ou apagada): trata como inexistente
  if (!tip) notFound();

  const spots = await spotOptions(supabase);
  return <TipForm userId={user.id} tip={tip} spots={spots} />;
}
