import Link from "next/link";
import { getViewer } from "@/lib/data";
import { loadSpots, scoreLabel } from "@/lib/spots";

export const metadata = { title: "Locais | Pesqueiro.GG" };

const ORDERS = {
  pescados: { label: "Mais pescados", sort: (a, b) => b.records - a.records || (b.avg ?? -1) - (a.avg ?? -1) },
  nota: { label: "Melhor nota", sort: (a, b) => (b.avg ?? -1) - (a.avg ?? -1) || b.reviews - a.reviews },
  nome: { label: "Nome", sort: (a, b) => a.name.localeCompare(b.name, "pt-BR") },
};

export default async function LocaisPage({ searchParams }) {
  const { supabase } = await getViewer();
  const sp = await searchParams;
  const order = ORDERS[sp?.ordem] ? sp.ordem : "pescados";
  const spots = (await loadSpots(supabase)).sort(ORDERS[order].sort);

  return (
    <>
      <div className="tips-top">
        <nav className="order-pick" aria-label="Ordenar locais">
          {Object.entries(ORDERS).map(([k, o]) => (
            <Link key={k} href={k === "pescados" ? "/locais" : `/locais?ordem=${k}`} aria-current={order === k ? "true" : undefined}>
              {o.label}
            </Link>
          ))}
        </nav>
        <Link href="/locais/novo" className="btn small">+ Novo local</Link>
      </div>
      <p className="sub tips-sub">Onde a turma já pescou: notas, valores, dicas e o que saiu em cada lugar.</p>

      {spots.length === 0 ? (
        <div className="empty">
          <strong>Nenhum local ainda</strong>
          Cadastre o primeiro pesqueiro, ou escolha “Outro” no local ao registrar um peixe.
        </div>
      ) : (
        <ul className="spots">
          {spots.map((s) => (
            <li key={s.id}>
              <Link href={`/locais/${s.id}`} className="spot-card">
                <span className={`spot-score${s.avg == null ? " none" : ""}`}>
                  <b>{s.avg == null ? "–" : scoreLabel(s.avg)}</b>
                  <small>{s.reviews ? `${s.reviews} ${s.reviews === 1 ? "nota" : "notas"}` : "sem nota"}</small>
                </span>
                <span className="spot-info">
                  <span className="spot-name">{s.name}</span>
                  <span className="spot-sub">
                    {[s.city, s.price && `💰 ${s.price}`].filter(Boolean).join(" · ") || "Sem informações ainda"}
                  </span>
                  <span className="spot-stats">
                    🐟 {s.records} {s.records === 1 ? "registro" : "registros"}
                    {s.tips > 0 && ` · 💡 ${s.tips} ${s.tips === 1 ? "dica" : "dicas"}`}
                    {s.lat != null && " · 📍 no mapa"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
