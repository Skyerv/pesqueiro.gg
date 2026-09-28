"use client";

import { useRouter } from "next/navigation";
import { KINDS } from "@/lib/tips";

// Filtro compacto por tipo de dica (troca a página ao escolher)
export default function TipFilter({ value }) {
  const router = useRouter();
  return (
    <label className="tip-filter">
      <span>Tipo</span>
      <select
        value={value ?? ""}
        onChange={(e) => router.push(e.target.value ? `/dicas?tipo=${e.target.value}` : "/dicas")}
        aria-label="Filtrar por tipo de dica"
      >
        <option value="">Tudo</option>
        {KINDS.map((k) => (
          <option key={k.key} value={k.key}>
            {k.emoji} {k.label}
          </option>
        ))}
      </select>
    </label>
  );
}
