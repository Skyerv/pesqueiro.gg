"use client";

import { useEffect, useState } from "react";

// Registra o service worker e oferece "Instalar app" quando o navegador permite.
// No iPhone não existe esse aviso: mostra como adicionar pela tela de compartilhar.
export default function InstallApp() {
  const [prompt, setPrompt] = useState(null);
  const [ios, setIos] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

    const installed =
      window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (installed) return;

    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (prompt) {
    return (
      <button
        type="button"
        className="linkish install"
        onClick={async () => {
          prompt.prompt();
          await prompt.userChoice.catch(() => null);
          setPrompt(null);
        }}
      >
        Instalar app
      </button>
    );
  }

  if (ios) {
    return (
      <span className="install-ios">
        <button type="button" className="linkish install" onClick={() => setHelp((h) => !h)} aria-expanded={help}>
          Instalar app
        </button>
        {help && (
          <span className="install-help" role="note">
            No Safari, toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.
          </span>
        )}
      </span>
    );
  }

  return null;
}
