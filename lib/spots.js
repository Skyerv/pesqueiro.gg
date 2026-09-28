// Locais de pesca: lista com médias e números. Registros antigos (só com o nome do local)
// são ligados ao local pelo nome, sem precisar alterar o registro.

export const sameName = (a, b) => (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();
const key = (s) => (s || "").trim().toLowerCase();

export const MAX_NAME = 60;

// Escapa % e _ para usar o nome num filtro "ilike" (igualdade sem diferenciar maiúsculas)
export const likeExact = (s) => (s || "").trim().replace(/[\\%_]/g, (c) => `\\${c}`);

export function scoreLabel(avg) {
  if (avg == null) return "Sem nota";
  return avg.toFixed(1).replace(".", ",");
}

export async function loadSpots(supabase) {
  const [{ data: spots }, { data: reviews }, { data: catches }, { data: tips }] = await Promise.all([
    supabase.from("spots").select("id, name, city, price, description, lat, lng, created_by, created_at").order("name"),
    supabase.from("spot_reviews").select("spot_id, score"),
    supabase.from("catches").select("spot_id, spot_name, qty").limit(5000),
    supabase.from("tips").select("spot_id").not("spot_id", "is", null),
  ]);
  const list = spots ?? [];
  const byName = new Map(list.map((s) => [key(s.name), s.id]));
  const stats = Object.fromEntries(list.map((s) => [s.id, { reviews: 0, sum: 0, records: 0, fish: 0, tips: 0 }]));

  for (const r of reviews ?? []) {
    const st = stats[r.spot_id];
    if (st) {
      st.reviews++;
      st.sum += r.score;
    }
  }
  for (const c of catches ?? []) {
    const id = c.spot_id ?? byName.get(key(c.spot_name));
    const st = stats[id];
    if (st) {
      st.records++;
      st.fish += c.qty;
    }
  }
  for (const t of tips ?? []) if (stats[t.spot_id]) stats[t.spot_id].tips++;

  return list.map((s) => {
    const st = stats[s.id];
    return { ...s, reviews: st.reviews, avg: st.reviews ? st.sum / st.reviews : null, records: st.records, fish: st.fish, tips: st.tips };
  });
}

// Só o essencial, para listas de escolha (registro e dica)
export async function spotOptions(supabase) {
  const { data } = await supabase.from("spots").select("id, name, city, lat, lng").order("name");
  return data ?? [];
}
