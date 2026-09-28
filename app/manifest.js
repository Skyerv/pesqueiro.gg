// Permite instalar o site como app (Android, iPhone e computador) e é a base do APK
export default function manifest() {
  return {
    id: "/",
    name: "Pesqueiro.GG",
    short_name: "Pesqueiro.GG",
    description: "Ranking da turma de pesca: cada peixe conta pro seu plano de carreira.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0D1D1F",
    theme_color: "#1E5C63",
    categories: ["sports", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Registrar peixe", url: "/registrar", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Mural", url: "/mural", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
