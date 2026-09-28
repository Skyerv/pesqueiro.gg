import { notFound } from "next/navigation";
import RegisterForm from "@/components/RegisterForm";
import { getViewer } from "@/lib/data";
import { aiProvider } from "@/lib/ai";

export const metadata = { title: "Editar registro | Pesqueiro.GG" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditarRegistroPage({ params }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const { supabase, user } = await getViewer();
  const { data: mine } = await supabase
    .from("catches")
    .select("id, species, qty, size_cm, caught_on, note, photo_path")
    .eq("user_id", user.id);
  const item = (mine ?? []).find((c) => c.id === id);
  // Registro de outra pessoa (ou apagado): trata como inexistente
  if (!item) notFound();

  const total = mine.reduce((sum, c) => sum + c.qty, 0);
  return <RegisterForm userId={user.id} currentTotal={total} item={item} aiEnabled={Boolean(aiProvider())} />;
}
