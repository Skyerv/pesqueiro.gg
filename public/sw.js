// Service worker do Pesqueiro.GG: não guarda páginas nem dados da turma em cache,
// só mostra um aviso amigável quando o celular está sem internet.
const OFFLINE_HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem conexão | Pesqueiro.GG</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#0D1D1F;color:#E4EEEA;text-align:center;padding:24px}
h1{font-size:1.6rem;margin:0 0 8px}p{color:#8FA8A5;margin:0 0 20px}button{font:inherit;font-weight:700;border:0;border-radius:999px;padding:12px 22px;background:#F0584A;color:#fff}</style>
</head><body><div><h1>Sem sinal no pesqueiro 🎣</h1><p>Você está sem internet. Assim que a conexão voltar, é só tentar de novo.</p>
<button onclick="location.reload()">Tentar de novo</button></div></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { headers: { "content-type": "text/html; charset=utf-8" } })
    )
  );
});
