import Header from "@/components/Header";
import { getViewer } from "@/lib/data";

export default async function SiteLayout({ children }) {
  const { profile } = await getViewer({ needProfile: false });
  return (
    <div className="wrap">
      <Header profile={profile} />
      <main>{children}</main>
    </div>
  );
}
