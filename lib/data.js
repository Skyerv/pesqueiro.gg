import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Garante que há alguém logado (e, por padrão, com perfil criado)
export async function getViewer({ needProfile = true } = {}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  if (needProfile && !profile) redirect("/perfil?novo=1");
  return { supabase, user, profile };
}

export async function getBoard(supabase) {
  const [profilesRes, catchesRes, mediaRes] = await Promise.all([
    supabase.from("profiles").select("id, nickname, avatar_path, created_at"),
    supabase
      .from("catches")
      .select("id, user_id, species, qty, size_cm, caught_on, note, photo_path, spot_name, created_at")
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase.from("catch_media").select("catch_id").limit(20000),
  ]);
  // Quantas fotos/vídeos extras cada registro tem (para o selo no cartão)
  const counts = {};
  for (const m of mediaRes.data ?? []) counts[m.catch_id] = (counts[m.catch_id] || 0) + 1;
  const catches = (catchesRes.data ?? []).map((c) => ({ ...c, media_count: counts[c.id] || 0 }));
  return { profiles: profilesRes.data ?? [], catches };
}
