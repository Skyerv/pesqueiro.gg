// Sugestões da turma viram issues no GitHub (com a etiqueta LABEL)
const API = "https://api.github.com";
export const LABEL = "sugestão";
const MARK = /<!-- pesqueiro:autor=([0-9a-f-]{36});nome=([^>]*?) -->/;

export function githubReady() {
  return Boolean(process.env.GITHUB_TOKEN && repo());
}

function repo() {
  return (process.env.GITHUB_REPO || "Kauecsilva/pesqueiro.gg").trim();
}

async function gh(path, init = {}) {
  const res = await fetch(`${API}/repos/${repo()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "x-github-api-version": "2022-11-28",
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    console.error("Erro na API do GitHub:", res.status, await res.text().catch(() => ""));
    throw new Error("github");
  }
  return res.json();
}

// Evita marcar pessoas (@fulano) e referenciar issues (#12) sem querer
function neutralize(text) {
  return text.replace(/@/g, "@​").replace(/#(\d)/g, "#​$1");
}

function status(issue) {
  if (issue.state === "open") return "aberta";
  return issue.state_reason === "not_planned" ? "descartada" : "feita";
}

export async function listSuggestions() {
  const issues = await gh(`/issues?labels=${encodeURIComponent(LABEL)}&state=all&sort=created&direction=desc&per_page=100`);
  return issues
    .filter((i) => !i.pull_request)
    .map((i) => {
      const m = MARK.exec(i.body || "");
      return {
        number: i.number,
        title: i.title,
        status: status(i),
        createdAt: i.created_at,
        authorId: m?.[1] ?? null,
        authorName: m?.[2] ?? null,
        comments: i.comments,
      };
    });
}

export async function createSuggestion({ title, details, userId, nickname }) {
  const safeName = nickname.replace(/-->|[<>]/g, "");
  const quoted = details
    ? neutralize(details)
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n")
    : "_Sem detalhes._";
  const body = [
    `**Sugerido por:** ${neutralize(safeName)}`,
    "",
    quoted,
    "",
    "---",
    "_Enviado pela aba Sugestões do Pesqueiro.GG._",
    `<!-- pesqueiro:autor=${userId};nome=${safeName} -->`,
  ].join("\n");

  return gh("/issues", {
    method: "POST",
    body: JSON.stringify({ title: neutralize(title), body, labels: [LABEL] }),
  });
}
