"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/data";
import { createSuggestion, githubReady, listSuggestions } from "@/lib/github";

const MAX_PER_DAY = 5;

export async function enviarSugestao(_prev, formData) {
  const { user, profile } = await getViewer();
  if (!githubReady()) return { error: "As sugestões ainda não foram ligadas ao GitHub." };

  const title = String(formData.get("title") || "").trim().replace(/\s+/g, " ");
  const details = String(formData.get("details") || "").trim().slice(0, 1000);
  if (title.length < 5) return { error: "Escreva um título com pelo menos 5 letras.", title, details };
  if (title.length > 80) return { error: "O título pode ter no máximo 80 caracteres.", title, details };

  try {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const mine = (await listSuggestions()).filter(
      (s) => s.authorId === user.id && new Date(s.createdAt).getTime() > dayAgo
    );
    if (mine.length >= MAX_PER_DAY) {
      return { error: `Você já mandou ${MAX_PER_DAY} sugestões hoje. Tente de novo amanhã.`, title, details };
    }
    await createSuggestion({ title, details, userId: user.id, nickname: profile.nickname });
  } catch {
    return { error: "Não deu para enviar agora. Tente de novo daqui a pouco.", title, details };
  }

  revalidatePath("/sugestoes");
  return { ok: true };
}
