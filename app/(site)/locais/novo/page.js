import SpotForm from "@/components/SpotForm";
import { getViewer } from "@/lib/data";

export const metadata = { title: "Novo local | Pesqueiro.GG" };

export default async function NovoLocalPage() {
  const { user } = await getViewer();
  return <SpotForm userId={user.id} />;
}
