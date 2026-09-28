import { progressFor } from "@/lib/ranks";

// A linha de pesca com a boia marcando o progresso até o próximo cargo
export default function FishLine({ total }) {
  const { pct, text } = progressFor(total);
  return (
    <>
      <div className="line" aria-hidden="true">
        <div className="reeled" style={{ width: `${pct}%` }} />
        <div className="bobber" style={{ left: `calc(10px + (100% - 20px) * ${pct / 100})` }} />
      </div>
      <div className="next">{text}</div>
    </>
  );
}
