"use client";

import { useEffect, useState, useTransition } from "react";
import { removerSugestao } from "@/app/(site)/sugestoes/actions";

export default function DeleteSuggestion({ number }) {
  const [armed, setArmed] = useState(false);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  function onClick() {
    if (!armed) return setArmed(true);
    setError(null);
    startTransition(async () => {
      const res = await removerSugestao(number);
      if (res?.error) {
        setArmed(false);
        setError(res.error);
      }
    });
  }

  return (
    <span className="sugg-del">
      <button type="button" className={`del ${armed ? "arm" : ""}`} onClick={onClick} disabled={busy}>
        {busy ? "Excluindo…" : armed ? "Toque de novo para excluir" : "Excluir"}
      </button>
      {error && <span className="del-error">{error}</span>}
    </span>
  );
}
