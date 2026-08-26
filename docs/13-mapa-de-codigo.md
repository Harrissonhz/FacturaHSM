# 13 · Mapa de código (estructura del proyecto)

> Referencia rápida de dónde vive cada cosa en el repositorio, para orientar a quien retome el desarrollo.

## Estructura general

```
FacturacionHSM/
├── docs/                      # documentación (00–13)
├── public/                    # PWA + logo
│   ├── manifest.json
│   ├── sw.js
│   ├── offline.html
│   ├── logo.png               # logo de la empresa (para documentos)
│   └── icons/                 # iconos PWA
├── supabase/
│   └── migrations/            # 0001 esquema, 0002 funciones, 0003 vistas,
│                              # 0004 RLS, 0005 seed  (+ SQL sueltos aplicados)
└── src/
    ├── middleware.ts
    ├── app/
    │   ├── layout.tsx         # layout raíz (metadata PWA + PWALoader)
    │   ├── globals.css        # design system completo
    │   ├── login/             # page.tsx + actions.ts
    │   ├── factura/[ventaId]/ # factura imprimible (page, PrintButton, css)
    │   └── (dashboard)/       # área protegida (layout con nav + guarda)
    │       ├── page.tsx                 # home
    │       ├── ventas/                  # POS (page, VentaPOS) + historial/
    │       ├── inventario/              # inventario + ajuste/
    │       ├── cartera/                 # page, CarteraTabla + estado/[clienteId]/
    │       ├── compras/                 # page, nueva/, [compraId]/, proveedores/
    │       ├── produccion/              # page, nueva/, [ordenId]/
    │       ├── distribucion/            # page, DistribucionForm
    │       ├── retorno/                 # page, RetornoForm
    │       ├── clientes/                # page, ClientesClient
    │       ├── catalogos/               # productos/, variantes/, vendedores/
    │       ├── reportes/                # inventario/, ventas/, cartera/, trazabilidad/
    │       └── mas/                     # menú agrupado (móvil)
    ├── components/
    │   ├── AppNav.tsx          # navegación (sidebar agrupado + bottom nav)
    │   ├── ConnectionBanner.tsx
    │   ├── EstadoBadge.tsx
    │   └── PWALoader.tsx
    ├── lib/
    │   ├── format.ts           # money(), fecha()
    │   ├── result.ts           # Result<T> + mapeo de errores RPC
    │   ├── auth/session.ts     # getPerfil()
    │   └── supabase/           # client, server, middleware
    ├── services/               # Server Actions (escritura)
    │   ├── catalogos.actions.ts
    │   ├── compras.actions.ts
    │   ├── produccion.actions.ts
    │   ├── correcciones.actions.ts
    │   ├── proveedores.acciones.ts
    │   ├── ventas.service.ts
    │   ├── cartera.service.ts
    │   └── clientes.service.ts
    └── types/database.ts       # tipos (regenerar con `npm run gen:types`)
```

## Patrón por pantalla

1. **`page.tsx` (Server Component):** carga datos con Supabase (respeta RLS) y los pasa al cliente.
2. **`*Client.tsx` / `*Form.tsx` (Client Component):** interacción (formularios, sheets), llama a Server Actions o a `/api`.
3. **Server Action (`services/*.actions.ts`) o RPC:** ejecuta la escritura (transaccional si toca inventario/cartera).

## Convenciones

- Rutas dinámicas con `[param]` (ej. `[ventaId]`, `[clienteId]`, `[compraId]`, `[ordenId]`).
- Documentos imprimibles fuera de `(dashboard)` cuando deben ocupar pantalla completa (factura) o dentro cuando conservan navegación (estado de cuenta).
- CSS: clases del design system (`card`, `btn`, `badge`, `list-cards`, `sheet`, `segment`, `summary-chip`...). Estilos de impresión con `@media print` + clase `.no-print`.
- Consecutivos: helper `siguienteConsecutivo(tabla, prefijo)` en las actions.
