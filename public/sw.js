/* =====================================================================
   Service Worker · FacturacionHSM (Fase 7 - PWA)
   Estrategia MÍNIMA y segura (Fase 1 = requiere internet):
   - Cachea solo el "app shell" básico para instalación y arranque rápido.
   - NO cachea datos de negocio ni respuestas de API (siempre a la red).
   - Network-first para navegación; si falla, muestra la página offline.
   ===================================================================== */

const CACHE = "hsm-shell-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/manifest.json", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Solo GET; nunca interceptar POST/PUT (ventas, abonos, etc.)
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // No cachear API ni Supabase: siempre a la red.
  if (url.pathname.startsWith("/api/") || url.hostname.includes("supabase")) {
    return; // deja pasar a la red normalmente
  }

  // Navegación (documentos): network-first, fallback a offline.html
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Iconos/estáticos del shell: cache-first
  if (url.pathname.startsWith("/icons/") || url.pathname === "/manifest.json") {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
    return;
  }
});
