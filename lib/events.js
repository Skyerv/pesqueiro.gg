// Eventos mensais: ranking de cada mês, calculado pelos registros cuja data da pesca cai no mês.
// Pontua igual ao ranking geral (peixes); empate: mais registros, depois o maior peixe.

const TZ = "America/Sao_Paulo";
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

// Hoje no horário de Brasília (o servidor roda em UTC)
export function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export const monthOf = (isoDate) => (isoDate || "").slice(0, 7); // "2026-09-28" → "2026-09"

export function monthName(key) {
  const [, m] = key.split("-").map(Number);
  return MESES[m - 1] ?? key;
}

export function monthLabel(key) {
  const [y] = key.split("-");
  return `${monthName(key)} de ${y}`;
}

export function previousMonth(key) {
  const [y, m] = key.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

export function daysLeft(key) {
  const today = todayKey();
  if (monthOf(today) !== key) return 0;
  const [y, m, d] = today.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return last - d;
}

export const validMonth = (key) => /^\d{4}-(0[1-9]|1[0-2])$/.test(key || "");

// Ranking de um mês: só quem pontuou, com posição (empates dividem a posição)
export function monthRanking(profiles, catches, key) {
  const byId = new Map(profiles.map((p) => [p.id, { ...p, total: 0, records: 0, biggest: 0, biggestSpecies: null }]));
  for (const c of catches) {
    if (monthOf(c.caught_on) !== key) continue;
    const s = byId.get(c.user_id);
    if (!s) continue;
    s.total += c.qty;
    s.records += 1;
    if (c.size_cm && c.size_cm > s.biggest) {
      s.biggest = c.size_cm;
      s.biggestSpecies = c.species;
    }
  }
  const list = [...byId.values()]
    .filter((s) => s.total > 0)
    .sort(
      (a, b) =>
        b.total - a.total || b.records - a.records || b.biggest - a.biggest || a.nickname.localeCompare(b.nickname, "pt-BR")
    );
  let pos = 0;
  let prev = null;
  list.forEach((s, i) => {
    const score = `${s.total}|${s.records}|${s.biggest}`;
    if (score !== prev) {
      pos = i + 1;
      prev = score;
    }
    s.position = pos;
  });
  return list;
}

// Meses que já tiveram registros, do mais recente ao mais antigo (sem o mês atual)
export function pastMonths(catches, current) {
  const set = new Set(catches.map((c) => monthOf(c.caught_on)).filter((k) => validMonth(k) && k < current));
  return [...set].sort().reverse();
}

// Funcionário do mês: quem lidera o mês atual; se ninguém pontuou ainda, o vencedor do mês anterior
export function employeeOfMonth(profiles, catches) {
  const current = monthOf(todayKey());
  const now = monthRanking(profiles, catches, current);
  if (now.length) return { person: now[0], month: current, live: true, left: daysLeft(current) };
  const before = previousMonth(current);
  const last = monthRanking(profiles, catches, before);
  if (last.length) return { person: last[0], month: before, live: false, left: 0 };
  return null;
}
