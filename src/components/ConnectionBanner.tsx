"use client";

// ---------------------------------------------------------------------
// Banner de conexion (Fase 1: requiere internet siempre).
// Muestra un aviso bloqueante cuando el dispositivo pierde conexion.
// Escucha los eventos online/offline del navegador.
// ---------------------------------------------------------------------
import { useEffect, useState } from "react";

export default function ConnectionBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // Estado inicial
    setOnline(navigator.onLine);

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="offline-banner" role="alert">
      ⚠️ Sin conexión a internet. No es posible registrar operaciones.
    </div>
  );
}
