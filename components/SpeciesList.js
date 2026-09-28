export default function SpeciesList({ rows, showOwner }) {
  if (!rows.length) {
    return (
      <div className="empty">
        <strong>Nenhuma espécie ainda</strong>
        Cada registro soma na espécie escolhida.
      </div>
    );
  }
  const max = rows[0].count;
  return (
    <div className="species">
      {rows.map((r) => (
        <div className="sp-row" key={r.species}>
          <div className="n">{r.species}</div>
          <div className="c">{r.count}</div>
          <div className="bar"><i style={{ width: `${(r.count / max) * 100}%` }} /></div>
          {r.biggest && (
            <div className="rec">
              Maior: {r.biggest.size} cm{showOwner ? `, de ${r.biggest.nickname}` : ""}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
