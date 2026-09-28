export function photoUrl(path) {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/fotos/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
}

// Agrega os registros por pescador e ordena o ranking (empates dividem a posição)
export function buildStats(profiles, catches) {
  const byId = new Map();
  for (const p of profiles) {
    byId.set(p.id, { ...p, total: 0, species: {}, biggest: {}, photos: 0, days: new Set() });
  }
  for (const c of catches) {
    const s = byId.get(c.user_id);
    if (!s) continue;
    s.total += c.qty;
    s.species[c.species] = (s.species[c.species] || 0) + c.qty;
    if (c.photo_path) s.photos++;
    if (c.caught_on) s.days.add(c.caught_on);
    if (c.size_cm && (!s.biggest[c.species] || c.size_cm > s.biggest[c.species])) {
      s.biggest[c.species] = c.size_cm;
    }
  }
  const list = [...byId.values()].sort(
    (a, b) => b.total - a.total || a.nickname.localeCompare(b.nickname, "pt-BR")
  );
  let pos = 0;
  let prev = null;
  list.forEach((s, i) => {
    if (s.total !== prev) {
      pos = i + 1;
      prev = s.total;
    }
    s.position = pos;
  });
  return list;
}

// Totais por espécie para uma lista de pescadores
export function speciesTotals(list) {
  const counts = {};
  const biggest = {};
  for (const s of list) {
    for (const [sp, n] of Object.entries(s.species)) counts[sp] = (counts[sp] || 0) + n;
    for (const [sp, size] of Object.entries(s.biggest)) {
      if (!biggest[sp] || size > biggest[sp].size) biggest[sp] = { size, nickname: s.nickname };
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([species, count]) => ({ species, count, biggest: biggest[species] ?? null }));
}
