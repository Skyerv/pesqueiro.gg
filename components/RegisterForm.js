"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compress";
import { MAX_EXTRA, MAX_VIDEO_MB, VIDEO_TYPES, mediaKind, videoExt, videoType } from "@/lib/media";
import { SPECIES, rankFor } from "@/lib/ranks";
import { sameName } from "@/lib/spots";
import { photoUrl } from "@/lib/stats";

// O mapa usa o Leaflet, que só roda no navegador
const SpotMap = dynamic(() => import("./SpotMap"), { ssr: false, loading: () => <div className="spot-map loading" /> });

function today() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
// Espécie para o formulário: usa a da lista quando existir, senão "Outra…"
function initialSpecies(name) {
  const match = SPECIES.find((s) => norm(s) === norm(name));
  return match ? { species: match, other: "" } : { species: "__outra", other: name };
}

const CONF_LABEL = { alta: "confiança alta", media: "confiança média", baixa: "confiança baixa" };

export default function RegisterForm({ userId, currentTotal, item = null, media = [], spots = [], initialSpotId = null, aiEnabled = false }) {
  const initial = item ? initialSpecies(item.species) : { species: SPECIES[0], other: "" };
  const router = useRouter();
  const [species, setSpecies] = useState(initial.species);
  const [other, setOther] = useState(initial.other);
  const [preview, setPreview] = useState(null);
  const [ai, setAi] = useState(null); // {state: 'loading'|'done'|'nofish'|'error'|'limit'|'busy', result}
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [extras, setExtras] = useState([]); // fotos e vídeos novos: {key, file, url, kind}
  const [removed, setRemoved] = useState(() => new Set()); // ids de mídias já salvas para apagar
  const [spot, setSpot] = useState(item?.lat != null ? { lat: item.lat, lng: item.lng } : null);
  const [showMap, setShowMap] = useState(item?.lat != null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(null);
  // Local: "" = sem local, id de um local da lista, ou "__novo" para cadastrar outro
  const [spotChoice, setSpotChoice] = useState(() => {
    if (!item && initialSpotId && spots.some((s) => s.id === initialSpotId)) return initialSpotId;
    if (item?.spot_id && spots.some((s) => s.id === item.spot_id)) return item.spot_id;
    const byName = item?.spot_name ? spots.find((s) => sameName(s.name, item.spot_name)) : null;
    if (byName) return byName.id;
    return item?.spot_name ? "__novo" : "";
  });
  const [spotName, setSpotName] = useState(item?.spot_name ?? "");
  const [cover, setCover] = useState(null); // foto extra escolhida como capa: {saved: id} ou {extra: key}
  const aiRun = useRef(0);
  const fileRef = useRef(null);
  const currentPhoto = photoUrl(item?.photo_path);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);
  useEffect(() => () => extras.forEach((x) => URL.revokeObjectURL(x.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (res.status === 503) {
        const { error } = await res.json().catch(() => ({}));
        if (run !== aiRun.current) return;
        // "ocupado": a IA está sobrecarregada; qualquer outro 503 é IA não configurada (some sem alarde)
        return setAi(error === "ocupado" ? { state: "busy" } : null);
      }
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

  // Só roda quando a pessoa pede: na foto escolhida agora ou, na edição, na que já está salva
  async function analyze() {
    if (fileRef.current) return identify(fileRef.current);
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
    fileRef.current = f ?? null;
    setPreview(f ? URL.createObjectURL(f) : null);
    // Foto nova: a análise anterior não vale mais
    aiRun.current++;
    setAi(null);
  }

  const keptMedia = media.filter((m) => !removed.has(m.id));
  const slotsLeft = MAX_EXTRA - keptMedia.length - extras.length;

  // Foto extra que vai virar a capa do mural ("s:id" salva, "n:key" nova): a marcada pela pessoa ou,
  // se o registro não tem capa, a primeira foto. Com uma foto principal nova escolhida, nenhuma.
  const coverId = (() => {
    if (preview) return null;
    if (cover?.saved && keptMedia.some((m) => m.id === cover.saved)) return `s:${cover.saved}`;
    if (cover?.extra && extras.some((x) => x.key === cover.extra)) return `n:${cover.extra}`;
    if (item?.photo_path) return null;
    const saved = keptMedia.find((m) => m.kind === "image");
    if (saved) return `s:${saved.id}`;
    const fresh = extras.find((x) => x.kind === "image");
    return fresh ? `n:${fresh.key}` : null;
  })();

  function onExtras(e) {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    setError(null);
    const accepted = [];
    const problems = [];
    for (const file of files) {
      const kind = mediaKind(file);
      if (!kind) problems.push(`${file.name}: formato não suportado.`);
      else if (kind === "video" && !VIDEO_TYPES.includes(videoType(file))) problems.push(`${file.name}: use vídeo MP4, MOV ou WEBM.`);
      else if (kind === "video" && file.size > MAX_VIDEO_MB * 1024 * 1024) problems.push(`${file.name}: vídeo maior que ${MAX_VIDEO_MB} MB.`);
      else if (accepted.length >= slotsLeft) problems.push(`Limite de ${MAX_EXTRA} fotos e vídeos extras por registro.`);
      else accepted.push({ key: crypto.randomUUID(), file, kind, url: URL.createObjectURL(file) });
    }
    if (accepted.length) setExtras((list) => [...list, ...accepted]);
    if (problems.length) setError([...new Set(problems)].join(" "));
  }

  function dropExtra(key) {
    setExtras((list) => {
      const x = list.find((i) => i.key === key);
      if (x) URL.revokeObjectURL(x.url);
      return list.filter((i) => i.key !== key);
    });
  }

  function toggleSaved(id) {
    setRemoved((set) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function useMyLocation() {
    setLocError(null);
    if (!navigator.geolocation) return setLocError("Este aparelho não informa a localização.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setShowMap(true);
        setSpot({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        setLocating(false);
        setLocError(
          err.code === 1
            ? "Permissão de localização negada. Marque o ponto tocando no mapa."
            : "Não deu para pegar a localização agora. Marque o ponto tocando no mapa."
        );
        setShowMap(true);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  // Envia as mídias novas e apaga as removidas; devolve quantas falharam.
  // promoted: mídia salva que virou capa (sai da lista, o arquivo fica); demoted: capa antiga que virou extra.
  async function syncMedia(supabase, catchId, toUpload, promoted, demoted) {
    const gone = media.filter((m) => removed.has(m.id));
    if (gone.length) {
      const { error: delErr } = await supabase.from("catch_media").delete().in("id", gone.map((m) => m.id));
      if (!delErr) await supabase.storage.from("fotos").remove(gone.map((m) => m.path));
    }
    if (promoted) await supabase.from("catch_media").delete().eq("id", promoted.id);

    let failed = 0;
    let position = Math.max(-1, ...media.map((m) => m.position ?? 0)) + 1;
    if (demoted) {
      const { error: demErr } = await supabase
        .from("catch_media")
        .insert({ catch_id: catchId, user_id: userId, path: demoted, kind: "image", position: position++ });
      if (demErr) failed++;
    }
    for (const [i, x] of toUpload.entries()) {
      setStatus(`Enviando ${x.kind === "video" ? "vídeo" : "foto"} ${i + 1} de ${toUpload.length}…`);
      try {
        const { blob, type, ext } =
          x.kind === "image"
            ? await compressImage(x.file)
            : { blob: x.file, type: videoType(x.file), ext: videoExt(x.file) };
        const path = `${userId}/${catchId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("fotos").upload(path, blob, { contentType: type, upsert: false });
        if (upErr) throw upErr;
        const { error: rowErr } = await supabase
          .from("catch_media")
          .insert({ catch_id: catchId, user_id: userId, path, kind: x.kind, position: position++ });
        if (rowErr) {
          await supabase.storage.from("fotos").remove([path]);
          throw rowErr;
        }
      } catch {
        failed++;
      }
    }
    return failed;
  }

  async function onSubmit(e) {
    e.preventDefault();
    aiRun.current++; // registrou sem esperar a IA: ignora a análise em andamento
    setError(null);
    const form = new FormData(e.currentTarget);
    const name = species === "__outra" ? other.trim().replace(/\s+/g, " ") : species;
    if (!name) return setError("Escolha a espécie.");
    const qty = Math.max(1, Math.min(50, parseInt(form.get("qty"), 10) || 1));
    const size = parseFloat(String(form.get("size")).replace(",", ".")) || null;
    const file = form.get("photo");
    const chosenSpot = spots.find((s) => s.id === spotChoice) ?? null;
    const newSpotName = spotChoice === "__novo" ? spotName.trim().replace(/\s+/g, " ").slice(0, 60) : "";
    if (spotChoice === "__novo" && newSpotName.length < 2) {
      return setError("Escreva o nome do local novo ou escolha “Sem local”.");
    }

    // Qual foto vira a capa (a do mural): a principal escolhida agora > a extra marcada como capa >
    // a capa atual > a primeira foto extra, quando o registro não tem capa nenhuma
    const mainFile = file && file.size > 0 ? file : null;
    const coverSaved = !mainFile && coverId?.startsWith("s:") ? keptMedia.find((m) => `s:${m.id}` === coverId) ?? null : null;
    const coverExtra = !mainFile && coverId?.startsWith("n:") ? extras.find((x) => `n:${x.key}` === coverId) ?? null : null;
    const coverFile = mainFile ?? coverExtra?.file ?? null;
    // Trocou a capa por uma foto extra: a capa antiga não é apagada, vira foto extra
    const demoted = (coverSaved || coverExtra) && item?.photo_path ? item.photo_path : null;

    const supabase = createClient();
    let newPhoto = null;
    try {
      if (coverFile) {
        setStatus("Enviando foto…");
        const { blob, type, ext } = await compressImage(coverFile);
        newPhoto = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("fotos")
          .upload(newPhoto, blob, { contentType: type, upsert: false });
        if (upErr) throw new Error("foto");
      }
      setStatus(item ? "Salvando…" : "Registrando…");

      // Local novo: usa o que já existe com o mesmo nome ou cadastra na lista da turma
      let spotRow = chosenSpot;
      if (newSpotName) {
        spotRow = spots.find((s) => sameName(s.name, newSpotName)) ?? null;
        if (!spotRow) {
          const { data: created, error: spotErr } = await supabase
            .from("spots")
            .insert({ name: newSpotName, lat: spot?.lat ?? null, lng: spot?.lng ?? null, created_by: userId })
            .select("id, name, lat, lng")
            .single();
          if (created) spotRow = created;
          else if (spotErr?.code === "23505") {
            // Alguém cadastrou o mesmo nome agora há pouco
            const { data: existing } = await supabase.from("spots").select("id, name, lat, lng").ilike("name", newSpotName).maybeSingle();
            spotRow = existing ?? null;
          }
          if (!spotRow) throw new Error("local");
        }
      }
      const spotLabel = spotRow?.name ?? null;

      const row = {
        species: name.charAt(0).toUpperCase() + name.slice(1),
        qty,
        size_cm: size,
        caught_on: form.get("date") || today(),
        note: String(form.get("note") || "").trim().slice(0, 140) || null,
        photo_path: newPhoto ?? coverSaved?.path ?? item?.photo_path ?? null,
        spot_id: spotRow?.id ?? null,
        spot_name: spotLabel,
        // Ponto exato marcado ou, se não marcou, o ponto do local
        lat: spot?.lat ?? spotRow?.lat ?? null,
        lng: spot?.lng ?? spotRow?.lng ?? null,
      };
      const { data: saved, error: dbErr } = item
        ? await supabase.from("catches").update(row).eq("id", item.id).select("id")
        : await supabase.from("catches").insert({ ...row, user_id: userId }).select("id");
      if (dbErr || !saved?.length) {
        if (newPhoto) await supabase.storage.from("fotos").remove([newPhoto]);
        throw new Error("db");
      }
      // Escolheu outra foto principal: a antiga não é mais usada
      if (item?.photo_path && mainFile && newPhoto) await supabase.storage.from("fotos").remove([item.photo_path]);

      const catchId = saved[0].id;
      const failed = await syncMedia(supabase, catchId, extras.filter((x) => x !== coverExtra), coverSaved, demoted);

      const before = rankFor(currentTotal);
      const after = rankFor(currentTotal - (item?.qty ?? 0) + qty);
      const done = failed
        ? `/registro/${catchId}?midia=${failed}`
        : item || extras.length
          ? `/registro/${catchId}`
          : "/mural";
      router.push(after.index > before.index && !failed ? `/?promovido=${encodeURIComponent(after.rank.name)}` : done);
      router.refresh();
    } catch (err) {
      setStatus(null);
      setAi((a) => (a?.state === "loading" ? null : a));
      setError(
        err.message === "foto"
          ? "Não deu para enviar a foto. Tente uma imagem JPG ou PNG menor."
          : err.message === "local"
            ? "Não deu para cadastrar o local novo. Tente de novo ou escolha um da lista."
            : item
            ? "Não deu para salvar as alterações. Tente de novo."
            : "Não deu para registrar. Tente de novo."
      );
    }
  }

  const busy = Boolean(status);
  const chosenSpotView = spots.find((s) => s.id === spotChoice) ?? null;
  const r = ai?.result;
  const chosen = species === "__outra" ? other : species;
  const suggestions = r ? [r.species, ...r.alternatives].filter((s, i, a) => s && a.findIndex((x) => norm(x) === norm(s)) === i) : [];

  return (
    <form className="panel" onSubmit={onSubmit}>
      <h2>{item ? "Editar registro" : "Registrar peixe"}</h2>

      <div className="field">
        <label htmlFor="photo">Foto principal</label>
        <input id="photo" name="photo" type="file" accept="image/*" onChange={onPhoto} />
        <span className="hint">
          {item ? "Opcional. Escolha uma foto só se quiser trocar a atual." : "Opcional. É a que aparece no mural."}
          {aiEnabled && " Com a foto, você pode pedir para a IA verificar a espécie."}
        </span>
        {(preview || currentPhoto) && <img className="preview" src={preview || currentPhoto} alt={preview ? "Prévia da nova foto" : "Foto atual"} />}
        {aiEnabled && (preview || currentPhoto) && (
          <button type="button" className="btn ghost small ai-again" onClick={analyze} disabled={ai?.state === "loading"}>
            {ai?.state === "loading" ? "IA analisando…" : "IA verificar"}
          </button>
        )}
      </div>

      {ai && (
        <div className={`ai-box ai-${ai.state}`} role="status" aria-live="polite">
          {ai.state === "loading" && <p>Analisando a foto…</p>}
          {ai.state === "error" && <p>Não deu para analisar a foto agora. Escolha a espécie abaixo.</p>}
          {ai.state === "nofish" && <p>A IA não encontrou um peixe nessa foto. Escolha a espécie abaixo.</p>}
          {ai.state === "limit" && <p>A IA atingiu o limite de análises por agora. Escolha a espécie abaixo ou tente mais tarde.</p>}
          {ai.state === "busy" && <p>A IA está sobrecarregada agora. Escolha a espécie abaixo ou tente de novo em alguns minutos.</p>}
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
        <textarea id="note" name="note" maxLength={140} defaultValue={item?.note ?? ""} placeholder="Isca, a história do que escapou…" />
      </div>

      <fieldset className="field group">
        <legend>Mais fotos e vídeos</legend>
        {(keptMedia.length > 0 || extras.length > 0 || removed.size > 0) && (
          <ul className="media-pick">
            {media.map((m) => {
              const gone = removed.has(m.id);
              const isCover = !gone && coverId === `s:${m.id}`;
              return (
                <li key={m.id} className={`${gone ? "gone" : ""}${isCover ? " cover" : ""}`}>
                  {m.kind === "video" ? <video src={photoUrl(m.path)} muted playsInline preload="metadata" /> : <img src={photoUrl(m.path)} alt="" />}
                  {m.kind === "video" && <span className="media-tag">▶</span>}
                  <button type="button" onClick={() => toggleSaved(m.id)} aria-label={gone ? "Manter" : "Remover"}>
                    {gone ? "Manter" : "×"}
                  </button>
                  {m.kind === "image" && !gone && !preview && (
                    <button type="button" className="cover-btn" aria-pressed={isCover} onClick={() => setCover(isCover ? null : { saved: m.id })}>
                      {isCover ? "★ Capa" : "Usar como capa"}
                    </button>
                  )}
                </li>
              );
            })}
            {extras.map((x) => {
              const isCover = coverId === `n:${x.key}`;
              return (
                <li key={x.key} className={`new${isCover ? " cover" : ""}`}>
                  {x.kind === "video" ? <video src={x.url} muted playsInline preload="metadata" /> : <img src={x.url} alt="" />}
                  {x.kind === "video" && <span className="media-tag">▶</span>}
                  <button type="button" onClick={() => dropExtra(x.key)} aria-label="Remover">×</button>
                  {x.kind === "image" && !preview && (
                    <button type="button" className="cover-btn" aria-pressed={isCover} onClick={() => setCover(isCover ? null : { extra: x.key })}>
                      {isCover ? "★ Capa" : "Usar como capa"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {slotsLeft > 0 && (
          <label className="btn ghost small media-add">
            + Adicionar fotos ou vídeos
            <input type="file" accept="image/*,video/*" multiple onChange={onExtras} hidden />
          </label>
        )}
        <span className="hint">
          Opcional. Até {MAX_EXTRA} por registro; vídeos de até {MAX_VIDEO_MB} MB (MP4, MOV ou WEBM).
          {!preview && " A foto marcada como capa é a que aparece no mural."}
          {removed.size > 0 && " Os marcados como removidos são apagados ao salvar."}
        </span>
      </fieldset>

      <fieldset className="field group">
        <legend>Local da captura</legend>
        <select
          value={spotChoice}
          onChange={(e) => {
            setSpotChoice(e.target.value);
            // Trocou de local: o ponto exato marcado era do local anterior
            setSpot(null);
            setShowMap(e.target.value === "__novo");
          }}
          aria-label="Local da captura"
        >
          <option value="">Sem local</option>
          {spots.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}{s.city ? ` · ${s.city}` : ""}
            </option>
          ))}
          <option value="__novo">➕ Outro (novo local)</option>
        </select>
        {spotChoice === "__novo" && (
          <input
            type="text"
            maxLength={60}
            value={spotName}
            onChange={(e) => setSpotName(e.target.value)}
            placeholder="Nome do local novo (ex.: Pesqueiro do Zé, Rio Tietê)"
            aria-label="Nome do local novo"
            className="spot-new-name"
          />
        )}
        {spotChoice && (
          <>
            <div className="spot-actions">
              <button type="button" className="btn ghost small" onClick={useMyLocation} disabled={locating}>
                {locating ? "Localizando…" : "📍 Usar minha localização"}
              </button>
              {!showMap && (
                <button type="button" className="btn ghost small" onClick={() => setShowMap(true)}>
                  {spotChoice === "__novo" ? "Marcar no mapa" : "Marcar o ponto exato"}
                </button>
              )}
              {spot && (
                <button type="button" className="linkish" onClick={() => setSpot(null)}>
                  Tirar o ponto
                </button>
              )}
            </div>
            {locError && <span className="hint warn">{locError}</span>}
            {showMap && (
              <>
                <SpotMap
                  value={spot ?? (chosenSpotView?.lat != null ? { lat: chosenSpotView.lat, lng: chosenSpotView.lng } : null)}
                  onChange={setSpot}
                  onPick={(label) => spotChoice === "__novo" && setSpotName((n) => (n.trim() ? n : label.slice(0, 60)))}
                />
                <span className="hint">
                  {spot || chosenSpotView?.lat != null
                    ? "Arraste o alfinete ou toque no mapa para ajustar."
                    : "Toque no mapa para marcar onde pegou o peixe."}{" "}
                  A turma toda vê o local.
                </span>
              </>
            )}
          </>
        )}
        {!spotChoice && <span className="hint">Escolha um local da lista ou “Outro” para cadastrar um novo.</span>}
      </fieldset>

      {error && <p className="notice error" role="alert">{error}</p>}
      <div className="actions">
        <button type="button" className="btn ghost" onClick={() => router.back()} disabled={busy}>Cancelar</button>
        <button type="submit" className="btn" disabled={busy}>
          {status || (item ? "Salvar alterações" : "Registrar")}
        </button>
      </div>
    </form>
  );
}
