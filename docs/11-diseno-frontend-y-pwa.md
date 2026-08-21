# 11 · Diseño Frontend, UX/UI y PWA

> Documento maestro de experiencia de usuario, diseño visual y estrategia PWA para FacturacionHSM. Cualquier modelo de IA o desarrollador que aborde el frontend **debe** cumplir este documento junto con la Constitución (`00`) y la Arquitectura (`02`). No contradice ninguna regla previa; añade la capa de presentación.

---

## 1. Contexto de uso real (por qué el diseño importa tanto)

El sistema lo usarán principalmente **vendedores que viajan a municipios de Antioquia** (Jericó y otros), desde su **teléfono celular**, en condiciones reales:

- 📶 **Conectividad intermitente o nula** en zonas rurales.
- ☀️ **Uso a la intemperie** (luz solar directa → necesidad de alto contraste).
- 👆 **Interacción táctil rápida** frente al cliente, sin tiempo para curvas de aprendizaje.
- 📱 **Equipos de gama media/baja** con datos móviles limitados.
- 🧑‍💼 **Usuarios no técnicos** (vendedores y usuarios funcionales) que necesitan cero fricción.

**Conclusión:** el diseño debe ser **mobile-first, PWA, offline-tolerante, simple y de alto contraste**. Un admin puede usar vistas más completas en escritorio, pero el vendedor manda en el diseño.

## 2. Principios de diseño (no negociables)

| # | Principio | Implicación práctica |
|---|-----------|----------------------|
| P1 | **Mobile-first** | Se diseña primero para 360–430px de ancho; el escritorio es una mejora progresiva. |
| P2 | **Cero fricción** | Las tareas del vendedor (vender, cobrar, consultar) se hacen en el menor número de toques (meta: ≤ 4). |
| P3 | **PWA instalable** | La app se instala en el celular como una app nativa (icono, splash, pantalla completa). |
| P4 | **Offline-tolerante** | Consultar inventario/cartera y registrar ventas debe funcionar sin señal; sincroniza al reconectar. |
| P5 | **Alto contraste y legibilidad** | Texto ≥ 16px, contraste AA mínimo, usable bajo el sol. |
| P6 | **Feedback inmediato** | Toda acción confirma visualmente su resultado (éxito/error) en < 1s percibido. |
| P7 | **Prevención de errores** | Confirmaciones para acciones críticas; validación antes de enviar. |
| P8 | **Consistencia** | Un único sistema de diseño (colores, tipografía, componentes) en toda la app. |
| P9 | **Rendimiento** | Carga inicial ligera, imágenes optimizadas, bajo consumo de datos/batería. |
| P10 | **Accesibilidad** | Zonas de toque ≥ 44×44px, navegación con el pulgar, roles ARIA básicos. |

## 3. Requisitos funcionales del cliente (los 5 del negocio)

1. El sistema **debe ser responsivo** (móvil, tablet, escritorio).
2. Interfaz **profesional y moderna**.
3. Tecnología **PWA** (instalable en el celular de vendedores y usuarios funcionales).
4. Interfaz **muy simple** para que los vendedores no tengan fricción al registrar ventas, verificar cartera y su proceso.
5. Optimizada para **uso cómodo en dispositivos móviles**.

## 4. Estrategia PWA

### 4.1. Componentes obligatorios
- **`manifest.json`**: nombre, nombre corto, iconos (192px, 512px, maskable), `theme_color`, `background_color`, `display: standalone`, `orientation: portrait`, `start_url: /`.
- **Service Worker**: cachea el "app shell" (HTML/CSS/JS base) y assets estáticos para carga instantánea y funcionamiento offline básico.
- **Iconos e íconos maskable**: set completo para Android/iOS + splash screens.
- **Prompt de instalación**: banner discreto "Instalar app" (evento `beforeinstallprompt`).

### 4.2. Estrategia de caché (Service Worker)
| Recurso | Estrategia | Motivo |
|---------|-----------|--------|
| App shell (UI base) | **Cache-first** | Carga instantánea, funciona offline. |
| Assets estáticos (JS/CSS/fuentes/iconos) | **Cache-first (con versión)** | Rápido y estable. |
| Datos de lectura (inventario, cartera) | **Stale-while-revalidate** | Muestra lo cacheado y actualiza en segundo plano. |
| Escrituras (ventas, abonos) | **Network-first + cola offline** | Consistencia; si no hay red, se encola. |

### 4.3. Implementación sugerida en Next.js
- Usar **`next-pwa`** (o Serwist) para generar el Service Worker en el build.
- El `manifest.json` va en `public/` y se enlaza desde `app/layout.tsx` (metadata).
- Registrar el SW solo en producción.

> ⚠️ **Nota Vercel:** el SW se sirve desde `/public`. Verificar que el scope sea `/` y que no cachee rutas de API de escritura de forma agresiva.

## 5. Estrategia Offline

> ⚠️ **DECISIÓN DE ALCANCE (Fase 1) — Sin offline:** Se acordó con el cliente que, en la **primera fase**, el sistema **requiere conexión a internet permanente**. Si el dispositivo **no tiene señal, no podrá registrar nada** (ni ventas ni abonos ni consultas). **No** se implementa cola de sincronización ni almacenamiento local para escrituras diferidas en esta fase.
>
> **Implicaciones para Fase 1:**
> - No se implementa IndexedDB para cola de escritura ni `client_op_id` idempotente (queda para una fase futura si el negocio lo requiere).
> - La PWA se usa para **instalación en el dispositivo** (icono, pantalla completa, carga rápida del app shell), **no** para trabajar sin conexión con datos.
> - Se debe mostrar un **aviso claro y bloqueante** cuando no haya conexión: "Sin conexión a internet. No es posible registrar operaciones."
> - El Service Worker cachea únicamente el **app shell y assets estáticos** (para carga rápida), **no** datos de negocio ni operaciones de escritura.
>
> La siguiente sección (5.1–5.3) describe la estrategia offline **completa** como referencia para una **fase futura**, pero **no aplica a la Fase 1**.

### (Fase futura) El vendedor podría estar **sin señal en Jericó** y aun así trabajar.

### 5.1. Lo que DEBE funcionar offline
- ✅ **Consultar** su inventario asignado (última copia sincronizada).
- ✅ **Consultar** su cartera y saldos (última copia).
- ✅ **Registrar** una venta (se guarda local y se encola).
- ✅ **Registrar** un abono (se guarda local y se encola).

### 5.2. Cómo implementarlo
- **Almacenamiento local**: IndexedDB (vía `idb` o Dexie) para inventario, cartera y **cola de operaciones pendientes**.
- **Cola de sincronización**: cada venta/abono offline se guarda con estado `PENDIENTE_SYNC`; al reconectar, se envían en orden a las RPC (`sp_registrar_venta`, `sp_registrar_abono`).
- **Idempotencia**: cada operación offline lleva un **UUID de cliente** (`client_op_id`) para evitar duplicados si se reintenta. *(Requiere que las RPC acepten/ignoren un id idempotente — ver nota a `06`/`03`.)*
- **Resolución de conflictos**: la **base de datos es la fuente de verdad**. Si al sincronizar una venta el inventario ya no alcanza, la operación se marca **rechazada** y se notifica al vendedor para corregir (no se fuerza saldo negativo — respeta Constitución Art. 2.3).

### 5.3. Indicadores de estado (Fase 1: solo aviso, sin cola)
- Badge global **🟢 En línea / 🔴 Sin conexión** siempre visible.
- En **Fase 1**: si no hay conexión, **bloquear** las acciones de registro y mostrar el aviso. No hay cola ni "sincronizar después".
- (Fase futura) Contador de operaciones pendientes de sincronizar con acción "Sincronizar ahora".

> **Alcance por fases:** **Fase 1 = requiere internet siempre** (sin offline de datos, solo PWA instalable + aviso de conexión). La cola de escritura offline es una **fase posterior** si el negocio lo requiere.

## 6. Sistema de diseño (Design System)

### 6.1. Tokens de color (CSS variables)
Definir en `globals.css` bajo `:root`. Paleta profesional, alto contraste, semántica clara.

```css
:root {
  /* Marca */
  --color-primary: #1e3a5f;      /* azul corporativo sobrio */
  --color-primary-600: #16304f;
  --color-accent: #0ea5e9;       /* acento para acciones */

  /* Semánticos (estado de cartera/procesos) */
  --color-success: #16a34a;      /* pagado / disponible */
  --color-warning: #d97706;      /* pendiente */
  --color-danger:  #dc2626;      /* vencido / error */
  --color-info:    #2563eb;      /* parcial / informativo */

  /* Superficies y texto */
  --color-bg:      #f8fafc;
  --color-surface: #ffffff;
  --color-text:    #0f172a;      /* contraste AA sobre bg */
  --color-text-muted: #475569;
  --color-border:  #e2e8f0;

  /* Radios y sombras */
  --radius: 12px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,.05);
  --shadow-md: 0 4px 12px rgba(0,0,0,.08);

  /* Espaciado base (8px scale) */
  --space-1: 4px; --space-2: 8px; --space-3: 12px;
  --space-4: 16px; --space-6: 24px; --space-8: 32px;
}
```

> **Regla de color de estado (alineada con `07`):** `PENDIENTE`=warning, `PARCIAL`=info, `PAGADA`=success, `VENCIDA`=danger. Los estados de inventario disponibles usan success; no disponibles (CRUDO) usan muted.

### 6.2. Tipografía
- **Cuerpo/UI:** una sans legible y neutra (ej. *Inter* está permitida por rendimiento, o *system-ui* para cero descarga). Tamaño base **16px**, línea 1.5.
- **Números/moneda:** usar variante tabular (`font-variant-numeric: tabular-nums`) para alinear precios y saldos.
- **Escala:** 12 / 14 / 16 (base) / 20 / 24 / 32.
- Evitar más de 2 familias tipográficas.

### 6.3. Componentes base (UI kit)
Ubicar en `src/components/ui/`. Reutilizables y consistentes:
- `Button` (variantes: primary, secondary, ghost, danger; tamaños táctiles).
- `Input`, `Select`, `NumberField` (con teclado numérico en móvil: `inputmode="numeric"`).
- `Card`, `Sheet`/`Modal` (bottom sheet en móvil).
- `Badge` (estados semánticos).
- `Table` → en móvil se transforma en **lista de tarjetas** (no scroll horizontal).
- `Toast`/`Alert` (feedback de éxito/error).
- `Money` (formatea COP: `Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 })`).
- `EmptyState`, `Spinner`, `Skeleton` (carga).
- `ConnectionBadge` (online/offline).

## 7. Navegación y layout (mobile-first)

### 7.1. Navegación inferior (Bottom Navigation)
Como las apps que los vendedores ya conocen (WhatsApp, Nequi). Máximo 4–5 destinos, con íconos + etiqueta:

```
[ 🏠 Inicio ]  [ 🛒 Vender ]  [ 📦 Inventario ]  [ 💰 Cartera ]  [ ⋯ Más ]
```

- Fija en la parte inferior (alcanzable con el pulgar).
- El destino activo resaltado con el color primario.
- El **admin** en escritorio usa un sidebar lateral; el vendedor en móvil usa bottom nav.

### 7.2. Estructura de pantalla
- **Header** compacto (título + acción principal + badge de conexión).
- **Contenido** en tarjetas apiladas, una columna en móvil.
- **Acción primaria** como botón grande fijo (o FAB) abajo.

### 7.3. Responsive breakpoints
| Rango | Dispositivo | Layout |
|-------|-------------|--------|
| < 640px | Móvil | 1 columna, bottom nav, tablas→tarjetas |
| 640–1024px | Tablet | 2 columnas, nav híbrida |
| > 1024px | Escritorio (admin) | Sidebar + tablas completas |

## 8. Patrones UX por pantalla clave (vendedor)

### 8.1. Registrar venta (flujo de mínimos toques)
1. Toca **Vender**.
2. Elige **cliente** (lista con búsqueda; recuerda recientes) o "Nuevo cliente" rápido.
3. Agrega **productos** desde su inventario disponible (tarjetas con foto/SKU, +/− cantidad, muestra stock y precio por calidad).
4. Revisa total y **Confirmar venta** → feedback ✅ + acceso a la factura PDF.

- Teclado numérico para cantidades y montos.
- Mostrar siempre el **stock disponible** para prevenir errores.
- Diferenciar visualmente **primera vs. segunda calidad** (badge + precio).

### 8.2. Cartera y abonos
- Lista de cuentas del vendedor con **saldo grande y estado en color**.
- Filtro rápido: Pendientes / Vencidas / Todas.
- Registrar abono en un **bottom sheet**: monto (prellenado con saldo), forma de pago, confirmar.
- Al pagar total → animación/《✔ PAGADA》.

### 8.3. Inventario del vendedor
- Lista/tarjetas por SKU con cantidades por calidad.
- Buscador por referencia/color/talla.
- Indicar claramente **disponible para venta** (LISTO).

## 9. Microinteracciones y feedback
- **Estados de carga**: skeletons en listas, spinner en botones (`Registrando...`).
- **Éxito**: toast verde + resumen (n° factura, total).
- **Error**: mensaje claro y accionable, en español, sin códigos técnicos (mapear errores RPC a lenguaje humano — ver `src/lib/result.ts`).
- **Vacío**: `EmptyState` con guía ("Aún no tienes ventas. Toca Vender para empezar").
- **Confirmaciones**: para anular venta o registrar pago total.

## 10. Accesibilidad (a11y)
- Contraste mínimo AA (4.5:1 en texto normal).
- Objetivos táctiles ≥ 44×44px, separación suficiente.
- `label` asociado a cada campo; `aria-live` para toasts.
- Navegable con teclado en escritorio; foco visible.
- Respetar `prefers-reduced-motion` (desactivar animaciones si el usuario lo pide).
- Textos alternativos en imágenes/iconos significativos.

## 11. Rendimiento
- **App shell** cacheado (PWA) para primera pintura instantánea.
- Imágenes optimizadas (`next/image`, formatos modernos, tamaños responsivos).
- Code splitting por ruta (Next.js lo hace por defecto).
- Evitar librerías pesadas en móvil; preferir componentes propios ligeros.
- Metas orientativas (móvil, 4G): LCP < 2.5s, TTI bajo, JS inicial reducido.
- Fuentes: usar `system-ui` o `next/font` con `display: swap`.

## 12. Internacionalización y formato
- Idioma: **español (Colombia)**.
- Moneda: **COP** sin decimales, separador de miles con punto.
- Fechas: formato local `dd/mm/aaaa`.
- Preparar textos para extraerse a diccionario (futuro multi-cliente Kubit).

## 13. Impacto técnico (qué se toca)

| Capa | Cambios |
|------|---------|
| **Frontend** | Nuevo design system en `globals.css`; componentes en `src/components/ui/`; bottom nav; layout responsivo; conversión de tablas a tarjetas en móvil. |
| **PWA** | `public/manifest.json`, iconos, Service Worker (`next-pwa`/Serwist), registro en `layout.tsx`. |
| **Offline** | IndexedDB (idb/Dexie), cola de sincronización, `client_op_id` idempotente. |
| **Backend/API** | (Fase offline avanzada) aceptar `client_op_id` en `sp_registrar_venta` y `sp_registrar_abono` para idempotencia. Ver `03`/`06`. |
| **Assets** | Set de iconos PWA (192/512/maskable) + splash. |

## 14. Roles y vistas diferenciadas
- **Vendedor (móvil):** bottom nav simplificada → Inicio, Vender, Inventario, Cartera. Solo ve **sus** datos (RLS + rol).
- **Admin (escritorio/móvil):** acceso a catálogos, compras, producción, distribución, reportes, y todo lo anterior. Sidebar en escritorio.
- **Producción:** foco en órdenes de producción/empaque.

## 15. Definition of Done (frontend)
Una pantalla se considera terminada si:
- ✅ Es **responsiva** (probada a 360px, 768px, 1280px).
- ✅ Cumple **contraste AA** y objetivos táctiles ≥ 44px.
- ✅ Usa **solo** tokens del design system (sin colores/hardcode sueltos).
- ✅ Tiene estados de **carga, error y vacío**.
- ✅ Da **feedback** claro en cada acción.
- ✅ Funciona como **PWA** (instalable) y no rompe offline (al menos avisa sin red).
- ✅ Textos en **español**, moneda en **COP**.
- ✅ No contradice `00-CONSTITUTION.md` ni `07-reglas-y-validaciones.md`.

## 16. Plan de aplicación por fases (frontend)
1. **F1 — Design system base:** tokens CSS, tipografía, componentes UI (`Button`, `Card`, `Badge`, `Money`, `Input`), layout responsivo + bottom nav.
2. **F2 — Rediseño de pantallas existentes:** Login, Panel, Ventas, Cartera con el nuevo sistema.
3. **F3 — PWA:** manifest, iconos, Service Worker, prompt de instalación.
4. **F4 — Offline lecturas:** cache de inventario/cartera + `ConnectionBadge`.
5. **F5 — Offline escrituras:** cola de sincronización idempotente para ventas/abonos.
6. **F6 — Pulido:** microinteracciones, skeletons, accesibilidad, performance.

## 17. Riesgos y mitigaciones (frontend/PWA)
| Riesgo | Mitigación |
|--------|-----------|
| Sincronización offline genera duplicados | `client_op_id` idempotente + validación server-side. |
| SW cachea datos sensibles/obsoletos | Estrategias por tipo (network-first en escrituras); versión de caché. |
| Inventario insuficiente al sincronizar venta offline | La BD manda; operación rechazada y notificada (no saldo negativo). |
| PWA no instala en iOS igual que Android | Documentar pasos de "Agregar a inicio" en iOS; probar en Safari. |
| Baja conectividad afecta primera carga | App shell cache-first; assets mínimos. |

---

**Referencias cruzadas:** `00-CONSTITUTION.md` (principios), `02-arquitectura.md` (stack y capas), `05-especificacion-funcional.md` (pantallas), `06-api-endpoints.md` (contratos), `07-reglas-y-validaciones.md` (estados y colores semánticos).
