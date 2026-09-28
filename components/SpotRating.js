"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// A nota da pessoa para o local (0 a 10) e um comentário opcional
export default function SpotRating({ spotId, userId, mine }) {
  const router = useRouter();
  const [score, setScore] = useState(mine?.score ?? null);
  const [comment, setComment] = useState(mine?.comment ?? "");
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (score == null) return setError("Escolha uma nota de 0 a 10.");
    setError(null);
    setSaved(false);
    setStatus("Salvando…");
    const supabase = createClient();
    const { error: dbErr } = await supabase.from("spot_reviews").upsert(
      {
        spot_id: spotId,
        user_id: userId,
        score,
        comment: comment.trim().slice(0, 500) || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "spot_id,user_id" }
    );
    setStatus(null);
    if (dbErr) return setError("Não deu para salvar a nota. Tente de novo.");
    setSaved(true);
    router.refresh();
  }

  async function remove() {
    setStatus("Removendo…");
    const supabase = createClient();
    const { error: dbErr } = await supabase.from("spot_reviews").delete().eq("spot_id", spotId).eq("user_id", userId);
    setStatus(null);
    if (dbErr) return setError("Não deu para remover a nota.");
    setScore(null);
    setComment("");
    router.refresh();
  }

  return (
    <div className="rating">
      <div className="rating-scale" role="radiogroup" aria-label="Sua nota de 0 a 10">
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={score === n}
            className={`rating-n${score != null && n <= score ? " on" : ""}`}
            onClick={() => {
              setScore(n);
              setSaved(false);
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <textarea
        rows={2}
        maxLength={500}
        value={comment}
        onChange={(e) => {
          setComment(e.target.value);
          setSaved(false);
        }}
        placeholder="Comentário opcional: o que achou, vale a pena?"
        aria-label="Comentário sobre o local"
      />
      {error && <p className="notice error" role="alert">{error}</p>}
      <div className="rating-actions">
        {mine && (
          <button type="button" className="linkish" onClick={remove} disabled={Boolean(status)}>
            Remover minha nota
          </button>
        )}
        {saved && <span className="hint">Nota salva ✓</span>}
        <button type="button" className="btn small" onClick={save} disabled={Boolean(status)}>
          {status || (mine ? "Atualizar nota" : "Dar nota")}
        </button>
      </div>
    </div>
  );
}
