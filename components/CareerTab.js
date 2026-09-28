"use client";

import { useEffect, useRef, useState } from "react";
import { RANKS, rankFor } from "@/lib/ranks";

// Plano de carreira numa aba fina presa na lateral direita; abre um painel estreito com os cargos
export default function CareerTab({ total }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef(null);
  const tabRef = useRef(null);
  const { index, next } = rankFor(total);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      tabRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    tabRef.current?.focus();
  }

  return (
    <>
      <button
        ref={tabRef}
        type="button"
        className="career-tab"
        aria-expanded={open}
        aria-controls="career-panel"
        onClick={() => setOpen(true)}
      >
        Carreira
      </button>

      <div className={`career-backdrop${open ? " open" : ""}`} onClick={close} aria-hidden="true" />
      <aside
        id="career-panel"
        className={`career-panel${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Plano de carreira"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="career-head">
          <h2>Plano de carreira</h2>
          <button ref={closeRef} type="button" className="career-close" onClick={close} aria-label="Fechar">
            ×
          </button>
        </div>
        <ol className="career-list">
          {RANKS.map((r, i) => (
            <li key={r.name} className={i < index ? "done" : i === index ? "now" : ""}>
              <span className="career-name">{r.name}</span>
              <span className="career-min">{r.min === 0 ? "início" : r.min}</span>
            </li>
          ))}
        </ol>
        <p className="career-foot">
          {next ? `Faltam ${next.min - total} ${next.min - total === 1 ? "peixe" : "peixes"} para ${next.name}.` : "Você chegou ao topo."}
        </p>
      </aside>
    </>
  );
}
