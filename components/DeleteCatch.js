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
    const { error } = await supabase.from("catches").delete().eq("id", id);
    if (error) {
      setBusy(false);
      setError("Não deu para excluir. Tente de novo.");
      return;
    }
    if (photoPath) await supabase.storage.from("fotos").remove([photoPath]);
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
