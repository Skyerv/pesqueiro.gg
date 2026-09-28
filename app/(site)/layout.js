import Header from "@/components/Header";
import SeaScene from "@/components/SeaScene";
import { getViewer } from "@/lib/data";

export default async function SiteLayout({ children }) {
  const { profile } = await getViewer({ needProfile: false });
  return (
    <div className="wrap">
      <SeaScene />
      <Header profile={profile} />
      <main>{children}</main>
    </div>
  );
}
