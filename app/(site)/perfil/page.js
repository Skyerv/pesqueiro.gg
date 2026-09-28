import ProfileForm from "@/components/ProfileForm";
import { getViewer } from "@/lib/data";

export const metadata = { title: "Perfil | Quadro de promoções" };

export default async function PerfilPage() {
  const { user, profile } = await getViewer({ needProfile: false });
  return <ProfileForm userId={user.id} profile={profile} isNew={!profile} />;
}
