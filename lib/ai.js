// Identificação de espécie por foto. Usa o Gemini (tem plano gratuito) ou o Claude,
// conforme a chave configurada, e devolve sempre o mesmo formato para o site.
import { SPECIES } from "@/lib/ranks";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

export function aiProvider() {
  const wanted = (process.env.AI_PROVIDER || "").toLowerCase();
  if (wanted === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
  if (wanted === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

const PROMPT = `Você é um especialista em peixes de água doce e salgada do Brasil, ajudando uma turma de pesca amadora.
Analise a foto e identifique o peixe principal.

Como analisar:
- Observe as características visíveis: formato do corpo e da cabeça, boca, barbilhões, escamas ou couro, padrão de manchas e listras, coloração, formato e posição das nadadeiras e da cauda.
- Use o nome popular mais comum no Brasil. Se a espécie estiver nesta lista, use exatamente o nome da lista: ${SPECIES.join(", ")}.
- Se houver mais de um peixe, analise o mais visível.
- Não invente uma espécie se a foto não permitir. Fotos de pescaria costumam ter ângulo ruim, pouca luz ou o peixe coberto pela mão; nesses casos, baixe a confiança e explique no aviso.
- Peixes parecidos (ex.: pintado e cachara, tucunarés, híbridos de piscicultura) merecem confiança menor e alternativas.

Responda SOMENTE com um JSON válido, sem texto antes ou depois, sem crases, neste formato:
{"e_peixe": true, "especie": "Pintado", "nome_cientifico": "Pseudoplatystoma corruscans", "confianca": 0.78, "alternativas": ["Cachara", "Híbrido de pintado"], "caracteristicas": ["Barbilhões longos", "Cabeça achatada", "Manchas escuras arredondadas no corpo"], "aviso": null}

Campos:
- "e_peixe": false se não houver peixe na foto (aí "especie" e "nome_cientifico" são null).
- "confianca": número de 0 a 1 com a sua confiança real na espécie.
- "alternativas": até 3 outras espécies possíveis, da mais para a menos provável (pode ser lista vazia).
- "caracteristicas": de 2 a 4 características curtas, em português, que você usou para identificar.
- "aviso": frase curta se a foto atrapalhar a identificação (escura, desfocada, peixe coberto, muito longe); senão null.`;

function parseJson(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("sem json");
  return JSON.parse(clean.slice(start, end + 1));
}

const str = (v, max) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const list = (v, max, len) =>
  Array.isArray(v) ? v.map((x) => str(x, len)).filter(Boolean).slice(0, max) : [];

// Converte a resposta da IA (qualquer provedor) no formato usado pelo formulário
function normalize(out) {
  let score = Number(out.confianca);
  if (!Number.isFinite(score)) score = { alta: 0.85, media: 0.6, baixa: 0.3 }[out.confianca] ?? 0.3;
  if (score > 1) score = score / 100; // caso venha em porcentagem
  score = Math.min(1, Math.max(0, score));
  const species = str(out.especie, 40);
  return {
    isFish: out.e_peixe !== false && Boolean(species),
    species,
    scientificName: str(out.nome_cientifico, 60),
    confidence: score >= 0.75 ? "alta" : score >= 0.5 ? "media" : "baixa",
    confidencePct: Math.round(score * 100),
    alternatives: list(out.alternativas, 3, 40).filter((a) => a.toLowerCase() !== species?.toLowerCase()),
    traits: list(out.caracteristicas, 4, 80),
    warning: str(out.aviso, 160),
  };
}

async function askGemini(mediaType, data) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ inline_data: { mime_type: mediaType, data } }, { text: PROMPT }],
          },
        ],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2, maxOutputTokens: 1024 },
      }),
    }
  );
  if (!res.ok) {
    console.error("Erro na API do Gemini:", res.status, await res.text().catch(() => ""));
    throw new Error(res.status === 429 ? "limite" : "falha");
  }
  const body = await res.json();
  const parts = body.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p) => p.text || "").join("\n");
}

async function askClaude(mediaType, data) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    console.error("Erro na API da Anthropic:", res.status, await res.text().catch(() => ""));
    throw new Error(res.status === 429 ? "limite" : "falha");
  }
  const body = await res.json();
  return (body.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
}

export async function identifyFish(mediaType, base64) {
  const provider = aiProvider();
  const text = provider === "gemini" ? await askGemini(mediaType, base64) : await askClaude(mediaType, base64);
  return normalize(parseJson(text));
}
