"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compress";
import { photoUrl } from "@/lib/stats";

export default function ProfileForm({ userId, profile, isNew }) {
  const router = useRouter();
  const [preview, setPreview] = useState(photoUrl(profile?.avatar_path));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const nickname = String(form.get("nickname") || "").trim().replace(/\s+/g, " ").slice(0, 24);
    if (!nickname) return setError("Escolha um apelido.");
    const file = form.get("avatar");

    setBusy(true);
    const supabase = createClient();
    let avatarPath = profile?.avatar_path ?? null;
    try {
      if (file && file.size > 0) {
        const { blob, type, ext } = await compressImage(file, 480);
        const newPath = `${userId}/avatar-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("fotos").upload(newPath, blob, { contentType: type });
        if (upErr) throw new Error("foto");
        if (avatarPath) await supabase.storage.from("fotos").remove([avatarPath]);
        avatarPath = newPath;
      }
      const { error: dbErr } = await supabase
        .from("profiles")
        .upsert({ id: userId, nickname, avatar_path: avatarPath });
      if (dbErr) throw new Error("db");
      router.push(isNew ? "/" : `/pescador/${userId}`);
      router.refresh();
    } catch (err) {
      setBusy(false);
      setError(err.message === "foto" ? "Não deu para enviar a foto. Tente JPG ou PNG." : "Não deu para salvar o perfil. Tente de novo.");
    }
  }

  return (
    <form className="panel" onSubmit={onSubmit}>
      <h2>{isNew ? "Criar seu perfil de pescador" : "Editar perfil"}</h2>
      {isNew && <p className="sub">É assim que a turma vai te ver no ranking. Todo mundo começa como Jovem Aprendiz.</p>}
      <div className="field">
        <label htmlFor="nickname">Apelido</label>
        <input id="nickname" name="nickname" type="text" maxLength={24} defaultValue={profile?.nickname ?? ""} placeholder="Ex.: Zé da Traíra" required />
      </div>
      <div className="field">
        <label htmlFor="avatar">Foto de perfil</label>
        <div className="avatar-pick">
          <span className="avatar avatar-lg">{preview ? <img src={preview} alt="" /> : "?"}</span>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPreview(URL.createObjectURL(f));
            }}
          />
        </div>
        <span className="hint">Opcional.</span>
      </div>
      {error && <p className="notice error" role="alert">{error}</p>}
      <div className="actions">
        {!isNew && <button type="button" className="btn ghost" onClick={() => router.back()} disabled={busy}>Cancelar</button>}
        <button type="submit" className="btn" disabled={busy}>{busy ? "Salvando…" : isNew ? "Criar perfil" : "Salvar perfil"}</button>
      </div>
    </form>
  );
}
