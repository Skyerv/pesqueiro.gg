"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compress";
import { SPECIES, rankFor } from "@/lib/ranks";
import { photoUrl } from "@/lib/stats";

function today() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
// Espécie para o formulário: usa a da lista quando existir, senão "Outra…"
function initialSpecies(name) {
  const match = SPECIES.find((s) => norm(s) === norm(name));
  return match ? { species: match, other: "" } : { species: "__outra", other: name };
}

const CONF_LABEL = { alta: "confiança alta", media: "confiança média", baixa: "confiança baixa" };

export default function RegisterForm({ userId, currentTotal, item = null, aiEnabled = false }) {
  const initial = item ? initialSpecies(item.species) : { species: SPECIES[0], other: "" };
  const router = useRouter();
  const [species, setSpecies] = useState(initial.species);
  const [other, setOther] = useState(initial.other);
  const [preview, setPreview] = useState(null);
  const [ai, setAi] = useState(null); // {state: 'loading'|'done'|'nofish'|'error', result}
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const aiRun = useRef(0);
  const currentPhoto = photoUrl(item?.photo_path);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  function applySpecies(name) {
    const next = initialSpecies(name);
    setSpecies(next.species);
    setOther(next.other);
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
      if (res.status === 429) return setAi({ state: "limit" });
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

  // Na edição: roda a IA na foto que já está salva
  async function identifyCurrent() {
    try {
      const res = await fetch(currentPhoto);
      if (!res.ok) throw new Error();
      identify(await res.blob());
    } catch {
      setAi({ state: "error" });
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
    let newPhoto = null;
    try {
      if (file && file.size > 0) {
        setStatus("Enviando foto…");
        const { blob, type, ext } = await compressImage(file);
        newPhoto = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("fotos")
          .upload(newPhoto, blob, { contentType: type, upsert: false });
        if (upErr) throw new Error("foto");
      }
      setStatus(item ? "Salvando…" : "Registrando…");
      const row = {
        species: name.charAt(0).toUpperCase() + name.slice(1),
        qty,
        size_cm: size,
        caught_on: form.get("date") || today(),
        note: String(form.get("note") || "").trim().slice(0, 140) || null,
        photo_path: newPhoto ?? item?.photo_path ?? null,
      };
      const { data: saved, error: dbErr } = item
        ? await supabase.from("catches").update(row).eq("id", item.id).select("id")
        : await supabase.from("catches").insert({ ...row, user_id: userId }).select("id");
      if (dbErr || !saved?.length) {
        if (newPhoto) await supabase.storage.from("fotos").remove([newPhoto]);
        throw new Error("db");
      }
      // Trocou a foto: a antiga não é mais usada
      if (item?.photo_path && newPhoto) await supabase.storage.from("fotos").remove([item.photo_path]);

      const before = rankFor(currentTotal);
      const after = rankFor(currentTotal - (item?.qty ?? 0) + qty);
      const done = item ? `/registro/${item.id}` : "/mural";
      router.push(after.index > before.index ? `/?promovido=${encodeURIComponent(after.rank.name)}` : done);
      router.refresh();
    } catch (err) {
      setStatus(null);
      setError(
        err.message === "foto"
          ? "Não deu para enviar a foto. Tente uma imagem JPG ou PNG menor."
          : item
            ? "Não deu para salvar as alterações. Tente de novo."
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
      <h2>{item ? "Editar registro" : "Registrar peixe"}</h2>

      <div className="field">
        <label htmlFor="photo">Foto</label>
        <input id="photo" name="photo" type="file" accept="image/*" onChange={onPhoto} />
        <span className="hint">
          {item
            ? "Opcional. Escolha uma foto só se quiser trocar a atual."
            : "Mande a foto primeiro: a IA tenta descobrir a espécie pra você."}
        </span>
        {(preview || currentPhoto) && <img className="preview" src={preview || currentPhoto} alt={preview ? "Prévia da nova foto" : "Foto atual"} />}
        {aiEnabled && currentPhoto && !preview && (
          <button type="button" className="btn ghost small ai-again" onClick={identifyCurrent} disabled={ai?.state === "loading"}>
            Analisar a foto atual com a IA
          </button>
        )}
      </div>

      {ai && (
        <div className={`ai-box ai-${ai.state}`} role="status" aria-live="polite">
          {ai.state === "loading" && <p>Analisando a foto…</p>}
          {ai.state === "error" && <p>Não deu para analisar a foto agora. Escolha a espécie abaixo.</p>}
          {ai.state === "nofish" && <p>A IA não encontrou um peixe nessa foto. Escolha a espécie abaixo.</p>}
          {ai.state === "limit" && <p>A IA atingiu o limite de análises por agora. Escolha a espécie abaixo ou tente mais tarde.</p>}
          {ai.state === "done" && r && (
            <>
              <p>
                Possível espécie: <strong>{r.species}</strong>
                {r.scientificName && <> <em className="ai-sci">{r.scientificName}</em></>}
              </p>
              <p className="ai-conf">
                Confiança estimada: {r.confidencePct}% ({CONF_LABEL[r.confidence]})
              </p>
              <div className="ai-meter" aria-hidden="true"><i style={{ width: `${r.confidencePct}%` }} /></div>
              {r.warning && <p className="ai-warn">⚠️ {r.warning}</p>}
              {r.traits?.length > 0 && (
                <>
                  <p className="ai-note">Características observadas:</p>
                  <ul className="ai-traits">
                    {r.traits.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                </>
              )}
              {suggestions.length > 1 && <p className="ai-note">Toque para escolher (a primeira é a mais provável):</p>}
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
          <input id="qty" name="qty" type="number" min={1} max={50} defaultValue={item?.qty ?? 1} required />
        </div>
        <div className="field">
          <label htmlFor="size">Tamanho (cm)</label>
          <input id="size" name="size" type="number" min={1} max={399} step="0.5" defaultValue={item?.size_cm ?? ""} placeholder="Opcional" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="date">Data</label>
        <input id="date" name="date" type="date" defaultValue={item?.caught_on ?? today()} max={today()} required />
      </div>
      <div className="field">
        <label htmlFor="note">Comentário</label>
        <textarea id="note" name="note" maxLength={140} defaultValue={item?.note ?? ""} placeholder="Isca, local, a história do que escapou…" />
      </div>
      {error && <p className="notice error" role="alert">{error}</p>}
      <div className="actions">
        <button type="button" className="btn ghost" onClick={() => router.back()} disabled={busy}>Cancelar</button>
        <button type="submit" className="btn" disabled={busy || ai?.state === "loading"}>
          {status || (ai?.state === "loading" ? "Aguarde a análise…" : item ? "Salvar alterações" : "Registrar")}
        </button>
      </div>
    </form>
  );
}
