import RegisterForm from "@/components/RegisterForm";
import { getViewer } from "@/lib/data";
import { aiProvider } from "@/lib/ai";
import { spotOptions } from "@/lib/spots";

export const metadata = { title: "Registrar peixe | Pesqueiro.GG" };

export default async function RegistrarPage({ searchParams }) {
  const { supabase, user } = await getViewer();
  const sp = await searchParams;
  const [{ data }, spots] = await Promise.all([
    supabase.from("catches").select("qty").eq("user_id", user.id),
    spotOptions(supabase),
  ]);
  const total = (data ?? []).reduce((sum, c) => sum + c.qty, 0);
  // Vindo da página de um local ("Registrar peixe aqui"), o local já vem escolhido
  const preset = spots.find((s) => s.id === sp?.local);
  return (
    <RegisterForm
      userId={user.id}
      currentTotal={total}
      spots={spots}
      initialSpotId={preset?.id ?? null}
      aiEnabled={Boolean(aiProvider())}
    />
  );
}
