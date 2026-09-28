import { notFound } from "next/navigation";
import SpotForm from "@/components/SpotForm";
import { getViewer } from "@/lib/data";

export const metadata = { title: "Editar local | Pesqueiro.GG" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditarLocalPage({ params }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase, user } = await getViewer();
  const { data: spot } = await supabase.from("spots").select("id, name, city, price, description, lat, lng").eq("id", id).maybeSingle();
  if (!spot) notFound();
  return <SpotForm userId={user.id} spot={spot} />;
}
