"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compress";
import { photoUrl } from "@/lib/stats";
import { KINDS, MAX_BODY, MAX_TITLE, normalizeUrl } from "@/lib/tips";

// Criar ou editar uma dica (com tip = edição)
export default function TipForm({ userId, tip = null, initialKind = "equipamento" }) {
  const router = useRouter();
  const [kind, setKind] = useState(tip?.kind ?? initialKind);
  const [preview, setPreview] = useState(null);
  const [dropPhoto, setDropPhoto] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const current = dropPhoto ? null : photoUrl(tip?.photo_path);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") || "").trim().replace(/\s+/g, " ").slice(0, MAX_TITLE);
    const body = String(form.get("body") || "").trim().slice(0, MAX_BODY) || null;
    const rawUrl = String(form.get("url") || "").trim();
    const url = normalizeUrl(rawUrl);
    const file = form.get("photo");

    if (title.length < 3) return setError("Escreva um título com pelo menos 3 letras.");
    if (rawUrl && !url) return setError("Esse link não parece um endereço válido. Cole o endereço completo da página.");
    if (!body && !url && !(file && file.size > 0) && !current) return setError("Coloque um texto, um link ou uma foto.");

    const supabase = createClient();
    let newPhoto = null;
    try {
      if (file && file.size > 0) {
        setStatus("Enviando foto…");
        const { blob, type, ext } = await compressImage(file);
        newPhoto = `${userId}/dicas/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("fotos").upload(newPhoto, blob, { contentType: type, upsert: false });
        if (upErr) throw new Error("foto");
      }
      setStatus(tip ? "Salvando…" : "Publicando…");
      const row = {
        kind,
        title,
        body,
        url,
        photo_path: newPhoto ?? (dropPhoto ? null : tip?.photo_path ?? null),
      };
      const { data: saved, error: dbErr } = tip
        ? await supabase.from("tips").update({ ...row, updated_at: new Date().toISOString() }).eq("id", tip.id).select("id")
        : await supabase.from("tips").insert({ ...row, user_id: userId }).select("id");
      if (dbErr || !saved?.length) {
        if (newPhoto) await supabase.storage.from("fotos").remove([newPhoto]);
        throw new Error("db");
      }
      // Trocou ou tirou a foto: a antiga não é mais usada
      if (tip?.photo_path && (newPhoto || dropPhoto)) await supabase.storage.from("fotos").remove([tip.photo_path]);

      router.push(`/dicas/${saved[0].id}`);
      router.refresh();
    } catch (err) {
      setStatus(null);
      setError(
        err.message === "foto"
          ? "Não deu para enviar a foto. Tente uma imagem JPG ou PNG menor."
          : "Não deu para salvar a dica. Tente de novo."
      );
    }
  }

  const busy = Boolean(status);
  const selected = KINDS.find((k) => k.key === kind);

  return (
    <form className="panel" onSubmit={onSubmit}>
      <h2>{tip ? "Editar dica" : "Nova dica"}</h2>

      <fieldset className="field group">
        <legend>Categoria</legend>
        <div className="kind-pick" role="radiogroup" aria-label="Categoria">
          {KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              role="radio"
              aria-checked={kind === k.key}
              className="chip"
              onClick={() => setKind(k.key)}
            >
              {k.emoji} {k.label}
            </button>
          ))}
        </div>
        {selected && <span className="hint">{selected.hint}</span>}
      </fieldset>

      <div className="field">
        <label htmlFor="title">Título</label>
        <input
          id="title"
          name="title"
          type="text"
          maxLength={MAX_TITLE}
          minLength={3}
          defaultValue={tip?.title ?? ""}
          placeholder={kind === "receita" ? "Ex.: Tilápia assada com limão" : kind === "isca" ? "Ex.: Massa de mandioca pra tambaqui" : "Ex.: Molinete bom e barato"}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="url">Link</label>
        <input id="url" name="url" type="text" inputMode="url" defaultValue={tip?.url ?? ""} placeholder="Opcional. Cole o endereço da loja, vídeo ou página" />
      </div>

      <div className="field">
        <label htmlFor="body">{kind === "receita" ? "Ingredientes e modo de preparo" : "Texto"}</label>
        <textarea
          id="body"
          name="body"
          rows={kind === "receita" ? 10 : 5}
          maxLength={MAX_BODY}
          defaultValue={tip?.body ?? ""}
          placeholder={
            kind === "receita"
              ? "Ingredientes:\n- 1 tilápia\n- limão\n\nModo de preparo:\n1. …"
              : "Conte por que vale a pena, onde usou, preço, o que pegou…"
          }
        />
      </div>

      <div className="field">
        <label htmlFor="photo">Foto</label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
        />
        <span className="hint">Opcional.</span>
        {(preview || current) && <img className="preview" src={preview || current} alt={preview ? "Prévia da foto" : "Foto atual"} />}
        {tip?.photo_path && !preview && (
          <button type="button" className="linkish" onClick={() => setDropPhoto((d) => !d)}>
            {dropPhoto ? "Manter a foto" : "Tirar a foto"}
          </button>
        )}
      </div>

      {error && <p className="notice error" role="alert">{error}</p>}
      <div className="actions">
        <button type="button" className="btn ghost" onClick={() => router.back()} disabled={busy}>Cancelar</button>
        <button type="submit" className="btn" disabled={busy}>{status || (tip ? "Salvar" : "Publicar dica")}</button>
      </div>
    </form>
  );
}
