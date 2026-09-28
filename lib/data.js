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
    supabase.from("catch_media").select("catch_id, path, kind, position").order("position").limit(20000),
  ]);
  // Fotos/vídeos extras de cada registro: contagem para o selo e, se o registro não tem foto
  // principal, a primeira foto extra vira a capa (cover_path)
  const byCatch = {};
  for (const m of mediaRes.data ?? []) (byCatch[m.catch_id] ??= []).push(m);
  const catches = (catchesRes.data ?? []).map((c) => {
    const list = byCatch[c.id] ?? [];
    const cover = c.photo_path ? null : list.find((m) => m.kind === "image")?.path ?? null;
    return { ...c, cover_path: cover, media_count: list.length - (cover ? 1 : 0) };
  });
  return { profiles: profilesRes.data ?? [], catches };
}
