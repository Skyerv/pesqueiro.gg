"use client";

import { useActionState, useEffect, useRef } from "react";
import { enviarSugestao } from "@/app/(site)/sugestoes/actions";

export default function SuggestionForm() {
  const [state, action, busy] = useActionState(enviarSugestao, null);
  const formRef = useRef(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} className="panel" action={action}>
      <h2>Mandar uma sugestão</h2>
      <p className="sub">Ideia de melhoria, algo que não funcionou, nova espécie… Vira uma tarefa para o site.</p>
      <div className="field">
        <label htmlFor="title">Título</label>
        <input id="title" name="title" type="text" minLength={5} maxLength={80} defaultValue={state?.title ?? ""} placeholder="Ex.: Mostrar o peso do peixe" required />
      </div>
      <div className="field">
        <label htmlFor="details">Detalhes</label>
        <textarea id="details" name="details" maxLength={1000} rows={3} defaultValue={state?.details ?? ""} placeholder="Explique como seria ou o que aconteceu." />
        <span className="hint">Opcional. Todo mundo da turma vê as sugestões.</span>
      </div>
      {state?.error && <p className="notice error" role="alert">{state.error}</p>}
      {state?.ok && <p className="notice" role="status">Sugestão enviada. Valeu!</p>}
      <div className="actions">
        <button type="submit" className="btn" disabled={busy}>{busy ? "Enviando…" : "Enviar sugestão"}</button>
      </div>
    </form>
  );
}
