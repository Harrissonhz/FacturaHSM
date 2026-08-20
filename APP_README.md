# FacturacionHSM · Aplicación (Next.js + Supabase)

Scaffolding del frontend/backend de FacturacionHSM. Incluye la conexión a Supabase y el **primer servicio funcional** (`registrarVenta`) que consume la RPC transaccional `sp_registrar_venta`.

## Requisitos
- Node.js 20+
- Proyecto Supabase con las migraciones de `supabase/migrations/` aplicadas.

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
#   -> completa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. (Opcional) generar los tipos reales de la base
npm run gen:types      # supabase gen types typescript --linked > src/types/database.ts

# 4. Levantar en desarrollo
npm run dev            # http://localhost:3000
```

## Estructura relevante

```
src/
├── middleware.ts                  # refresca la sesion Supabase (SSR)
├── app/
│   ├── layout.tsx                 # layout raiz
│   ├── page.tsx                   # home
│   ├── globals.css                # estilos base
│   ├── (dashboard)/ventas/page.tsx# demo cliente que llama a /api/ventas
│   └── api/
│       ├── ventas/route.ts        # POST /api/ventas
│       └── cartera/[cuentaId]/abonos/route.ts  # POST abonos
├── lib/
│   ├── supabase/                  # client.ts, server.ts, middleware.ts (SSR)
│   ├── validation/venta.schema.ts # zod (valida antes de la RPC)
│   └── result.ts                  # Result<T> + mapeo de errores RPC
├── services/
│   ├── ventas.service.ts          # caso de uso registrarVenta -> RPC
│   └── cartera.service.ts         # caso de uso registrarAbono -> RPC
└── types/database.ts              # placeholder; regenerar con gen:types
```

## Arquitectura del flujo de una venta

```
Componente/HTTP  ->  POST /api/ventas (Route Handler)
                 ->  services/ventas.service.ts (valida con zod + auth)
                 ->  supabase.rpc("sp_registrar_venta", { p_payload })
                 ->  Postgres: transaccion atomica
                        (descuenta inventario del vendedor + factura + CxC)
```

> **Principio (Constitución Art. 6):** el frontend nunca descuenta inventario ni cartera por su cuenta; toda escritura crítica pasa por una RPC transaccional. Las validaciones de entrada se hacen con **zod** en la capa de servicios; las reglas de negocio se garantizan en la base.

## Probar el endpoint

Con la app corriendo y una sesión válida (los endpoints requieren usuario autenticado por RLS):

```bash
curl -X POST http://localhost:3000/api/ventas \
  -H "Content-Type: application/json" \
  -d '{
    "vendedor_id": "<uuid>",
    "cliente_id": "<uuid>",
    "tipo_pago": "CREDITO",
    "dias_credito": 30,
    "items": [
      { "variante_id": "<uuid>", "calidad_id": "<uuid-PRIMERA>", "cantidad": 10, "precio_unitario": 70000 }
    ]
  }'
```

Respuesta esperada (201):
```json
{ "ok": true, "data": { "venta_id": "...", "numero_factura": "FAC-000001", "cuenta_id": "...", "total": 700000 } }
```

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` / `start` | Build y arranque de producción. |
| `npm run lint` | ESLint (config Next). |
| `npm run typecheck` | Chequeo de tipos TypeScript. |
| `npm run test` | Pruebas con Vitest. |
| `npm run gen:types` | Genera tipos desde Supabase. |

## Despliegue en Vercel
1. Importa el repo en Vercel.
2. Define las variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
3. Cada PR genera un *preview*; `main` despliega a producción.

## Siguiente iteración sugerida
- Autenticación (login) con Supabase Auth + guardas por rol.
- Catálogos reales (productos, variantes, vendedores, clientes) para poblar los selects de la pantalla de venta.
- Generación del PDF de la factura (Server Action + Supabase Storage).
