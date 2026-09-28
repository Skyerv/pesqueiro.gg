import { notFound } from "next/navigation";
import RegisterForm from "@/components/RegisterForm";
import { getViewer } from "@/lib/data";
import { aiProvider } from "@/lib/ai";
import { spotOptions } from "@/lib/spots";

export const metadata = { title: "Editar registro | Pesqueiro.GG" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditarRegistroPage({ params }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const { supabase, user } = await getViewer();
  const { data: mine } = await supabase
    .from("catches")
    .select("id, species, qty, size_cm, caught_on, note, photo_path, spot_id, spot_name, lat, lng")
    .eq("user_id", user.id);
  const item = (mine ?? []).find((c) => c.id === id);
  // Registro de outra pessoa (ou apagado): trata como inexistente
  if (!item) notFound();

  const [{ data: media }, spots] = await Promise.all([
    supabase.from("catch_media").select("id, path, kind, position").eq("catch_id", item.id).order("position"),
    spotOptions(supabase),
  ]);

  const total = mine.reduce((sum, c) => sum + c.qty, 0);
  return (
    <RegisterForm userId={user.id} currentTotal={total} item={item} media={media ?? []} spots={spots} aiEnabled={Boolean(aiProvider())} />
  );
}
