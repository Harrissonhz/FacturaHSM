"use client";

// ---------------------------------------------------------------------
// Registra el Service Worker y muestra un banner "Instalar app"
// cuando el navegador lo permite (evento beforeinstallprompt).
// ---------------------------------------------------------------------
import { useEffect, useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BIPEvent = any;

export default function PWALoader() {
  const [prompt, setPrompt] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Registrar el service worker (solo en el navegador)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* silencioso: si falla el SW, la app sigue funcionando */
      });
    }

    // Capturar el evento de instalación
    const onBIP = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // Ocultar el banner si ya se instaló
    const onInstalled = () => setVisible(false);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function instalar() {
    if (!prompt) return;
    prompt.prompt();
    try {
      await prompt.userChoice;
    } finally {
      setPrompt(null);
      setVisible(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: "calc(var(--bottomnav-h, 64px) + 12px)",
        zIndex: 55,
        background: "var(--color-surface, #fff)",
        border: "1px solid var(--color-border, #e2e8f0)",
        borderRadius: 14,
        boxShadow: "0 10px 30px rgba(0,0,0,.15)",
        padding: 14,
        display: "flex",
        alignItems: "center",
        gap: 12,
        maxWidth: 520,
        margin: "0 auto",
      }}
    >
      <span style={{ fontSize: "1.6rem" }}>📲</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700 }}>Instalar FacturacionHSM</div>
        <div style={{ fontSize: ".85rem", color: "var(--color-text-muted, #475569)" }}>
          Añádela a tu pantalla de inicio para acceso rápido.
        </div>
      </div>
      <button className="btn btn-sm" onClick={instalar}>Instalar</button>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => setVisible(false)}
        aria-label="Cerrar"
      >
        ✕
      </button>
    </div>
  );
}
