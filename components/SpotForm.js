"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MAX_NAME } from "@/lib/spots";

const SpotMap = dynamic(() => import("./SpotMap"), { ssr: false, loading: () => <div className="spot-map loading" /> });

// Cadastrar ou editar um local (qualquer um da turma pode completar as informações)
export default function SpotForm({ userId, spot = null }) {
  const router = useRouter();
  const [name, setName] = useState(spot?.name ?? "");
  const [point, setPoint] = useState(spot?.lat != null ? { lat: spot.lat, lng: spot.lng } : null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const clean = (v, max) => String(v || "").trim().replace(/[ \t]+/g, " ").slice(0, max) || null;
    const row = {
      name: clean(name, MAX_NAME),
      city: clean(form.get("city"), 60),
      price: clean(form.get("price"), 80),
      description: String(form.get("description") || "").trim().slice(0, 2000) || null,
      lat: point?.lat ?? null,
      lng: point?.lng ?? null,
    };
    if (!row.name || row.name.length < 2) return setError("Escreva o nome do local.");

    setStatus("Salvando…");
    const supabase = createClient();
    const { data, error: dbErr } = spot
      ? await supabase
          .from("spots")
          .update({ ...row, updated_by: userId, updated_at: new Date().toISOString() })
          .eq("id", spot.id)
          .select("id")
      : await supabase.from("spots").insert({ ...row, created_by: userId }).select("id");
    if (dbErr || !data?.length) {
      setStatus(null);
      return setError(
        dbErr?.code === "23505" ? "Já existe um local com esse nome na lista." : "Não deu para salvar o local. Tente de novo."
      );
    }
    router.push(`/locais/${data[0].id}`);
    router.refresh();
  }

  const busy = Boolean(status);
  return (
    <form className="panel" onSubmit={onSubmit}>
      <h2>{spot ? "Editar local" : "Novo local"}</h2>
      {spot && <p className="sub">Qualquer um da turma pode completar ou corrigir as informações do local.</p>}

      <div className="field">
        <label htmlFor="name">Nome</label>
        <input id="name" type="text" maxLength={MAX_NAME} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Pesqueiro Veneza" required />
      </div>
      <div className="row2">
        <div className="field">
          <label htmlFor="city">Cidade</label>
          <input id="city" name="city" type="text" maxLength={60} defaultValue={spot?.city ?? ""} placeholder="Ex.: Indaiatuba" />
        </div>
        <div className="field">
          <label htmlFor="price">Valor para pescar</label>
          <input id="price" name="price" type="text" maxLength={80} defaultValue={spot?.price ?? ""} placeholder="Ex.: R$ 60 o dia" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="description">Descrição</label>
        <textarea
          id="description"
          name="description"
          rows={5}
          maxLength={2000}
          defaultValue={spot?.description ?? ""}
          placeholder="Como é o lugar, quais peixes tem, estrutura (banheiro, restaurante), horário, regras…"
        />
      </div>
      <fieldset className="field group">
        <legend>Onde fica</legend>
        <SpotMap value={point} onChange={setPoint} onPick={(label) => setName((n) => (n.trim() ? n : label.slice(0, MAX_NAME)))} />
        <span className="hint">
          Busque pelo nome, cole um link do Google Maps ou toque no mapa.
          {point && (
            <>
              {" "}
              <button type="button" className="linkish" onClick={() => setPoint(null)}>Tirar o ponto</button>
            </>
          )}
        </span>
      </fieldset>

      {error && <p className="notice error" role="alert">{error}</p>}
      <div className="actions">
        <button type="button" className="btn ghost" onClick={() => router.back()} disabled={busy}>Cancelar</button>
        <button type="submit" className="btn" disabled={busy}>{status || (spot ? "Salvar" : "Cadastrar local")}</button>
      </div>
    </form>
  );
}
