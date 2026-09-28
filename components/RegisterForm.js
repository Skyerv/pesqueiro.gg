"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compress";
import { SPECIES, rankFor } from "@/lib/ranks";

function today() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const CONF_LABEL = { alta: "confiança alta", media: "confiança média", baixa: "confiança baixa" };

export default function RegisterForm({ userId, currentTotal }) {
  const router = useRouter();
  const [species, setSpecies] = useState(SPECIES[0]);
  const [other, setOther] = useState("");
  const [preview, setPreview] = useState(null);
  const [ai, setAi] = useState(null); // {state: 'loading'|'done'|'nofish'|'error', result}
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const aiRun = useRef(0);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  // Coloca a espécie no formulário: usa a da lista quando existir, senão "Outra…"
  function applySpecies(name) {
    const match = SPECIES.find((s) => norm(s) === norm(name));
    if (match) {
      setSpecies(match);
      setOther("");
    } else {
      setSpecies("__outra");
      setOther(name);
    }
  }

  async function identify(file) {
    const run = ++aiRun.current;
    setAi({ state: "loading" });
    try {
      const { blob, type } = await compressImage(file, 1024);
      const fd = new FormData();
      fd.append("image", new File([blob], "foto", { type }));
      const res = await fetch("/api/identificar", { method: "POST", body: fd });
      if (run !== aiRun.current) return;
      if (res.status === 503) return setAi(null); // IA não configurada: some sem alarde
      if (!res.ok) throw new Error();
      const result = await res.json();
      if (run !== aiRun.current) return;
      if (!result.isFish) return setAi({ state: "nofish" });
      if (result.confidence !== "baixa") applySpecies(result.species);
      setAi({ state: "done", result });
    } catch {
      if (run === aiRun.current) setAi({ state: "error" });
    }
  }

  function onPhoto(e) {
    const f = e.target.files?.[0];
    setPreview(f ? URL.createObjectURL(f) : null);
    if (f) identify(f);
    else {
      aiRun.current++;
      setAi(null);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const name = species === "__outra" ? other.trim().replace(/\s+/g, " ") : species;
    if (!name) return setError("Escolha a espécie.");
    const qty = Math.max(1, Math.min(50, parseInt(form.get("qty"), 10) || 1));
    const size = parseFloat(String(form.get("size")).replace(",", ".")) || null;
    const file = form.get("photo");

    const supabase = createClient();
    let photoPath = null;
    try {
      if (file && file.size > 0) {
        setStatus("Enviando foto…");
        const { blob, type, ext } = await compressImage(file);
        photoPath = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("fotos")
          .upload(photoPath, blob, { contentType: type, upsert: false });
        if (upErr) throw new Error("foto");
      }
      setStatus("Registrando…");
      const { error: dbErr } = await supabase.from("catches").insert({
        user_id: userId,
        species: name.charAt(0).toUpperCase() + name.slice(1),
        qty,
        size_cm: size,
        caught_on: form.get("date") || today(),
        note: String(form.get("note") || "").trim().slice(0, 140) || null,
        photo_path: photoPath,
      });
      if (dbErr) {
        if (photoPath) await supabase.storage.from("fotos").remove([photoPath]);
        throw new Error("db");
      }
      const before = rankFor(currentTotal);
      const after = rankFor(currentTotal + qty);
      router.push(after.index > before.index ? `/?promovido=${encodeURIComponent(after.rank.name)}` : "/mural");
      router.refresh();
    } catch (err) {
      setStatus(null);
      setError(
        err.message === "foto"
          ? "Não deu para enviar a foto. Tente uma imagem JPG ou PNG menor."
          : "Não deu para registrar. Tente de novo."
      );
    }
  }

  const busy = Boolean(status);
  const r = ai?.result;
  const chosen = species === "__outra" ? other : species;
  const suggestions = r ? [r.species, ...r.alternatives].filter((s, i, a) => s && a.findIndex((x) => norm(x) === norm(s)) === i) : [];

  return (
    <form className="panel" onSubmit={onSubmit}>
      <h2>Registrar peixe</h2>

      <div className="field">
        <label htmlFor="photo">Foto</label>
        <input id="photo" name="photo" type="file" accept="image/*" onChange={onPhoto} />
        <span className="hint">Mande a foto primeiro: a IA tenta descobrir a espécie pra você.</span>
        {preview && <img className="preview" src={preview} alt="Prévia da foto" />}
      </div>

      {ai && (
        <div className={`ai-box ai-${ai.state}`} role="status" aria-live="polite">
          {ai.state === "loading" && <p>Analisando a foto…</p>}
          {ai.state === "error" && <p>Não deu para analisar a foto agora. Escolha a espécie abaixo.</p>}
          {ai.state === "nofish" && <p>A IA não encontrou um peixe nessa foto. Escolha a espécie abaixo.</p>}
          {ai.state === "done" && r && (
            <>
              <p>
                {r.confidence === "baixa" ? "Talvez seja" : "Parece ser"}: <strong>{r.species}</strong>{" "}
                <span className="ai-conf">({CONF_LABEL[r.confidence]})</span>
              </p>
              {r.note && <p className="ai-note">{r.note}</p>}
              <div className="ai-options">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chip"
                    aria-pressed={norm(chosen) === norm(s)}
                    onClick={() => applySpecies(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="ai-note">Confira antes de registrar. A IA pode errar.</p>
            </>
          )}
        </div>
      )}

      <div className="field">
        <label htmlFor="species">Espécie</label>
        <select id="species" value={species} onChange={(e) => setSpecies(e.target.value)}>
          {SPECIES.map((s) => <option key={s} value={s}>{s}</option>)}
          <option value="__outra">Outra…</option>
        </select>
        {species === "__outra" && (
          <input
            type="text"
            maxLength={40}
            placeholder="Nome da espécie"
            value={other}
            onChange={(e) => setOther(e.target.value)}
            required
          />
        )}
      </div>
      <div className="row2">
        <div className="field">
          <label htmlFor="qty">Quantidade</label>
          <input id="qty" name="qty" type="number" min={1} max={50} defaultValue={1} required />
        </div>
        <div className="field">
          <label htmlFor="size">Tamanho (cm)</label>
          <input id="size" name="size" type="number" min={1} max={399} step="0.5" placeholder="Opcional" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="date">Data</label>
        <input id="date" name="date" type="date" defaultValue={today()} max={today()} required />
      </div>
      <div className="field">
        <label htmlFor="note">Comentário</label>
        <textarea id="note" name="note" maxLength={140} placeholder="Isca, local, a história do que escapou…" />
      </div>
      {error && <p className="notice error" role="alert">{error}</p>}
      <div className="actions">
        <button type="button" className="btn ghost" onClick={() => router.back()} disabled={busy}>Cancelar</button>
        <button type="submit" className="btn" disabled={busy || ai?.state === "loading"}>
          {status || (ai?.state === "loading" ? "Aguarde a análise…" : "Registrar")}
        </button>
      </div>
    </form>
  );
}
