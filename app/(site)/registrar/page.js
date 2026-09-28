import RegisterForm from "@/components/RegisterForm";
import { getViewer } from "@/lib/data";

export const metadata = { title: "Registrar peixe | Pesqueiro.GG" };

export default async function RegistrarPage() {
  const { supabase, user } = await getViewer();
  const { data } = await supabase.from("catches").select("qty").eq("user_id", user.id);
  const total = (data ?? []).reduce((sum, c) => sum + c.qty, 0);
  return <RegisterForm userId={user.id} currentTotal={total} />;
}
