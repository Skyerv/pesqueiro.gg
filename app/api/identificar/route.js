import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SPECIES } from "@/lib/ranks";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const MAX_BYTES = 3 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const PROMPT = `Você é um especialista em peixes de água doce e salgada do Brasil, ajudando uma turma de pesca amadora.
Analise a foto e identifique a espécie do peixe principal.

Regras:
- Use o nome popular mais comum no Brasil. Se a espécie estiver nesta lista, use exatamente o nome da lista: ${SPECIES.join(", ")}.
- Se houver mais de um peixe, identifique o mais visível.
- Se a foto não mostrar um peixe, ou estiver impossível de identificar, diga isso.
- Seja honesto sobre a incerteza: fotos de pescaria costumam ter ângulo ruim, pouca luz ou o peixe parcialmente coberto.

Responda SOMENTE com um JSON válido, sem texto antes ou depois, sem crases, neste formato:
{"e_peixe": true, "especie": "Tucunaré", "confianca": "alta", "alternativas": ["Tucunaré-azul"], "observacao": "Frase curta sobre o que levou à identificação."}

- "e_peixe": false se não houver peixe na foto (aí "especie" é null).
- "confianca": "alta", "media" ou "baixa".
- "alternativas": até 2 outras espécies possíveis (pode ser lista vazia).
- "observacao": no máximo uma frase curta em português.`;

function parseJson(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("sem json");
  return JSON.parse(clean.slice(start, end + 1));
}

export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "indisponivel" }, { status: 503 });
  }

  let file;
  try {
    const form = await request.formData();
    file = form.get("image");
  } catch {
    return NextResponse.json({ error: "imagem" }, { status: 400 });
  }
  if (!file || typeof file === "string" || !TYPES.includes(file.type) || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "imagem" }, { status: 400 });
  }

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");

  let res;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: file.type, data } },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      }),
    });
  } catch {
    return NextResponse.json({ error: "falha" }, { status: 502 });
  }

  if (!res.ok) {
    console.error("Erro na API da Anthropic:", res.status, await res.text().catch(() => ""));
    return NextResponse.json({ error: "falha" }, { status: 502 });
  }

  try {
    const body = await res.json();
    const text = (body.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const out = parseJson(text);
    const conf = ["alta", "media", "baixa"].includes(out.confianca) ? out.confianca : "baixa";
    const especie = typeof out.especie === "string" ? out.especie.trim().slice(0, 40) : null;
    return NextResponse.json({
      isFish: out.e_peixe !== false && Boolean(especie),
      species: especie,
      confidence: conf,
      alternatives: Array.isArray(out.alternativas)
        ? out.alternativas.filter((a) => typeof a === "string" && a.trim()).map((a) => a.trim().slice(0, 40)).slice(0, 2)
        : [],
      note: typeof out.observacao === "string" ? out.observacao.slice(0, 200) : "",
    });
  } catch {
    return NextResponse.json({ error: "falha" }, { status: 502 });
  }
}
