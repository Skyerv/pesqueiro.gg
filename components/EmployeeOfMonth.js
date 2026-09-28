"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Avatar from "./Avatar";

// Funcionário do mês na lateral esquerda do ranking: cartão fixo em tela larga;
// no celular, uma aba fina na borda que abre o mesmo cartão.
export default function EmployeeOfMonth({ person, month, live, left, isMe }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const card = (
    <div className="eom-card-body">
      <span className="eom-kicker">🏆 Funcionário do mês</span>
      <span className="eom-month">{month}</span>
      <Link href={`/pescador/${person.id}`} className="eom-who" onClick={() => setOpen(false)}>
        <Avatar profile={person} size="lg" />
        <strong>{person.nickname}{isMe ? " (você)" : ""}</strong>
      </Link>
      <span className="eom-score">
        <b>{person.total}</b> {person.total === 1 ? "peixe" : "peixes"} · {person.records} {person.records === 1 ? "registro" : "registros"}
      </span>
      <span className="eom-note">
        {live ? (left > 0 ? `Parcial · faltam ${left} ${left === 1 ? "dia" : "dias"}` : "Parcial · último dia!") : `Vencedor de ${month}`}
      </span>
      <Link href="/?ver=mes" className="eom-link" onClick={() => setOpen(false)}>
        Ver o evento do mês
      </Link>
    </div>
  );

  return (
    <>
      <aside className="eom-card" aria-label="Funcionário do mês">
        {card}
      </aside>

      <button
        type="button"
        className="eom-tab"
        aria-expanded={open}
        aria-controls="eom-pop"
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">🏆</span> Destaque
      </button>
      {open && <div className="eom-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}
      <div id="eom-pop" className={`eom-pop${open ? " open" : ""}`} role="dialog" aria-label="Funcionário do mês" hidden={!open}>
        <button type="button" className="career-close eom-close" onClick={() => setOpen(false)} aria-label="Fechar">
          ×
        </button>
        {card}
      </div>
    </>
  );
}
