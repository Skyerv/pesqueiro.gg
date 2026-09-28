import { photoUrl } from "@/lib/stats";

export default function Avatar({ profile, size = "md" }) {
  const url = photoUrl(profile?.avatar_path);
  const initial = (profile?.nickname?.trim()?.[0] || "?").toUpperCase();
  return (
    <span className={`avatar avatar-${size}`} aria-hidden="true">
      {url ? <img src={url} alt="" /> : initial}
    </span>
  );
}
