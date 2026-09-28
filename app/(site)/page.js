import Link from "next/link";
import Avatar from "@/components/Avatar";
import CareerTab from "@/components/CareerTab";
import EmployeeOfMonth from "@/components/EmployeeOfMonth";
import FishLine from "@/components/FishLine";
import { getBoard, getViewer } from "@/lib/data";
import { daysLeft, employeeOfMonth, monthLabel, monthName, monthOf, monthRanking, pastMonths, todayKey, validMonth } from "@/lib/events";
import { RANKS, rankFor } from "@/lib/ranks";
import { buildStats } from "@/lib/stats";

export default async function RankingPage({ searchParams }) {
  const { supabase, user } = await getViewer();
  const sp = await searchParams;
  const { profiles, catches } = await getBoard(supabase);
  const list = buildStats(profiles, catches);
  const promo = RANKS.find((r) => r.name === sp?.promovido);
  const myTotal = list.find((s) => s.id === user.id)?.total ?? 0;

  const current = monthOf(todayKey());
  const view = sp?.ver === "mes" ? "mes" : "geral";
  const month = validMonth(sp?.mes) && sp.mes <= current ? sp.mes : current;
  const eom = employeeOfMonth(profiles, catches);

  return (
    <>
      {eom && (
        <EmployeeOfMonth
          person={eom.person}
          month={monthName(eom.month)}
          live={eom.live}
          left={eom.left}
          isMe={eom.person.id === user.id}
        />
      )}

      {promo && view === "geral" && (
        <div className="promo-banner" role="status">
          <p>Parabéns, você foi promovido a</p>
          <strong>{promo.name}</strong>
          <Link href="/" className="btn">Aceitar o cargo</Link>
        </div>
      )}

      <nav className="chips rank-switch" aria-label="Tipo de ranking">
        <Link href="/" className="chip" aria-current={view === "geral" ? "true" : undefined}>Geral</Link>
        <Link href="/?ver=mes" className="chip" aria-current={view === "mes" ? "true" : undefined}>
          🏆 Evento de {monthName(current)}
        </Link>
      </nav>

      {view === "geral" ? (
        <ol className="rank-list">
          {list.map((s) => (
            <li key={s.id}>
              <Link href={`/pescador/${s.id}`} className={`angler${s.id === user.id ? " me" : ""}`}>
                <span className="pos">{s.position}</span>
                <Avatar profile={s} />
                <span className="who">
                  {s.nickname}
                  {eom?.person.id === s.id && (
                    <span className="eom-badge" title={`Funcionário do mês (${monthName(eom.month)})`}> 🏆</span>
                  )}
                  {s.id === user.id && <small>você</small>}
                </span>
                <span className="total">
                  <b>{s.total}</b>
                  <span>{s.total === 1 ? "peixe" : "peixes"}</span>
                </span>
                <span className="cargo">{rankFor(s.total).rank.name}</span>
                <FishLine total={s.total} />
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <MonthEvent profiles={profiles} catches={catches} month={month} current={current} userId={user.id} />
      )}

      <CareerTab total={myTotal} />
    </>
  );
}

function MonthEvent({ profiles, catches, month, current, userId }) {
  const ranking = monthRanking(profiles, catches, month);
  const live = month === current;
  const left = daysLeft(month);
  const history = pastMonths(catches, current)
    .map((key) => ({ key, winner: monthRanking(profiles, catches, key)[0] }))
    .filter((h) => h.winner);

  return (
    <>
      <section className="event-head">
        <h2>Evento de {monthLabel(month)}</h2>
        <p>
          {live ? (left > 0 ? `Termina em ${left} ${left === 1 ? "dia" : "dias"}. ` : "Último dia! ") : "Evento encerrado. "}
          Cada peixe pescado em {monthName(month)} conta aqui e no ranking geral.
        </p>
        {!live && <Link href="/?ver=mes" className="event-back">← Voltar ao evento de {monthName(current)}</Link>}
      </section>

      {ranking.length === 0 ? (
        <div className="empty">
          <strong>Ninguém pontuou em {monthName(month)}{live ? " ainda" : ""}</strong>
          {live ? "O primeiro peixe registrado já te coloca no topo." : "Nenhum registro nesse mês."}
        </div>
      ) : (
        <ol className="rank-list">
          {ranking.map((s) => (
            <li key={s.id}>
              <Link
                href={`/pescador/${s.id}`}
                className={`angler month${s.id === userId ? " me" : ""}${s.position === 1 ? " leader" : ""}`}
              >
                <span className="pos">{s.position === 1 ? "🏆" : s.position}</span>
                <Avatar profile={s} />
                <span className="who">
                  {s.nickname}
                  {s.id === userId && <small>você</small>}
                </span>
                <span className="total">
                  <b>{s.total}</b>
                  <span>{s.total === 1 ? "peixe" : "peixes"}</span>
                </span>
                <span className="cargo month-sub">
                  {s.records} {s.records === 1 ? "registro" : "registros"}
                  {s.biggest ? ` · maior: ${s.biggestSpecies} ${s.biggest} cm` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      {history.length > 0 && (
        <section className="hall">
          <h3 className="sec">Hall da fama</h3>
          <ul>
            {history.map(({ key, winner }) => (
              <li key={key}>
                <Link href={`/?ver=mes&mes=${key}`} aria-current={key === month ? "true" : undefined}>
                  <span className="hall-month">{monthLabel(key)}</span>
                  <Avatar profile={winner} size="sm" />
                  <span className="hall-who">{winner.nickname}</span>
                  <span className="hall-score">
                    {winner.total} {winner.total === 1 ? "peixe" : "peixes"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
