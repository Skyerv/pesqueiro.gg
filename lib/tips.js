// Aba Dicas: categorias e ajudantes de link
export const KINDS = [
  { key: "equipamento", label: "Equipamento", emoji: "🎣", hint: "Vara, molinete, linha, produto…" },
  { key: "isca", label: "Isca", emoji: "🪱", hint: "Artificial ou natural, e onde comprar" },
  { key: "receita", label: "Receita", emoji: "🍳", hint: "De peixe ou de massa de isca" },
  { key: "tecnica", label: "Técnica", emoji: "💡", hint: "Nós, montagens, macetes" },
  { key: "outro", label: "Outro", emoji: "📌", hint: "O que não se encaixar acima" },
];

export const kindOf = (key) => KINDS.find((k) => k.key === key) ?? KINDS[KINDS.length - 1];

export const MAX_TITLE = 80;
export const MAX_BODY = 4000;

// Aceita link colado sem "https://"; devolve null se não for um endereço web válido
export function normalizeUrl(raw) {
  const text = (raw || "").trim();
  if (!text) return null;
  const withProto = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withProto);
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".")) return null;
    return url.href.slice(0, 500);
  } catch {
    return null;
  }
}

export function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
