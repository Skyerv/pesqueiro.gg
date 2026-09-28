"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteCatch({ id, photoPath, redirectTo }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  async function onClick() {
    if (!armed) return setArmed(true);
    setBusy(true);
    setError(null);
    const supabase = createClient();
    // Guarda os arquivos extras antes: a exclusão do registro apaga as linhas em cascata
    const { data: media } = await supabase.from("catch_media").select("path").eq("catch_id", id);
    const { error } = await supabase.from("catches").delete().eq("id", id);
    if (error) {
      setBusy(false);
      setError("Não deu para excluir. Tente de novo.");
      return;
    }
    const files = [photoPath, ...(media ?? []).map((m) => m.path)].filter(Boolean);
    if (files.length) await supabase.storage.from("fotos").remove(files);
    if (redirectTo) router.replace(redirectTo);
    router.refresh();
  }

  return (
    <>
      <button type="button" className={`del ${armed ? "arm" : ""}`} onClick={onClick} disabled={busy}>
        {busy ? "Excluindo…" : armed ? "Toque de novo para excluir" : "Excluir registro"}
      </button>
      {error && <span className="del-error">{error}</span>}
    </>
  );
}
