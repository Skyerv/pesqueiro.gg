export const RANKS = [
  { name: "Jovem Aprendiz", min: 0 },
  { name: "Estagiário", min: 5 },
  { name: "Pescador Júnior", min: 15 },
  { name: "Pescador Pleno", min: 35 },
  { name: "Pescador Sênior", min: 70 },
  { name: "Especialista em Anzol", min: 120 },
  { name: "Coordenador de Cardume", min: 200 },
  { name: "Gerente de Águas", min: 300 },
  { name: "Diretor de Pescaria", min: 500 },
  { name: "CEO dos Mares", min: 1000 },
];

export const SPECIES = [
  "Tilápia", "Tucunaré", "Traíra", "Pacu", "Tambaqui", "Lambari", "Piau", "Curimbatá",
  "Carpa", "Bagre", "Pintado", "Pirarara", "Dourado", "Pirarucu", "Robalo", "Corvina", "Pescada",
  "Tainha", "Anchova",
];

export function rankFor(total) {
  let index = 0;
  while (index + 1 < RANKS.length && total >= RANKS[index + 1].min) index++;
  return { index, rank: RANKS[index], next: RANKS[index + 1] ?? null };
}

export function progressFor(total) {
  const { rank, next } = rankFor(total);
  if (!next) return { pct: 100, text: "Topo da empresa. Ninguém manda em você." };
  const pct = Math.max(0, Math.min(100, ((total - rank.min) / (next.min - rank.min)) * 100));
  return { pct, text: `Faltam ${next.min - total} para ${next.name}` };
}
