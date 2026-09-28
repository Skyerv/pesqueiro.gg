import "./globals.css";

export const metadata = {
  title: "Pesqueiro.GG",
  description: "Ranking da turma de pesca: cada peixe conta pro seu plano de carreira.",
  applicationName: "Pesqueiro.GG",
  appleWebApp: { capable: true, title: "Pesqueiro.GG", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EAF1EE" },
    { media: "(prefers-color-scheme: dark)", color: "#0D1D1F" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
