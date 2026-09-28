"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Só quem cadastrou o local pode excluir; registros e dicas continuam, só perdem o vínculo
export default function DeleteSpot({ id }) {
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
    const { error } = await createClient().from("spots").delete().eq("id", id);
    if (error) {
      setBusy(false);
      setError("Não deu para excluir. Tente de novo.");
      return;
    }
    router.replace("/locais");
    router.refresh();
  }

  return (
    <>
      <button type="button" className={`del ${armed ? "arm" : ""}`} onClick={onClick} disabled={busy}>
        {busy ? "Excluindo…" : armed ? "Toque de novo para excluir" : "Excluir local"}
      </button>
      {error && <span className="del-error">{error}</span>}
    </>
  );
}
