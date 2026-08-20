# 02 · Arquitectura técnica

## 1. Visión general

FacturacionHSM es una aplicación web **full-stack sobre Next.js** desplegada en **Vercel**, con **Supabase (PostgreSQL)** como base de datos, autenticación y almacenamiento de archivos (PDFs). El código y la documentación viven en **GitHub**.

```
┌──────────────────────────────────────────────────────────────┐
│                         Usuario (navegador)                    │
│              Next.js App Router · React · TypeScript           │
└───────────────┬───────────────────────────────┬──────────────┘
                │ (UI / Server Components)        │
                ▼                                 ▼
      ┌───────────────────┐            ┌────────────────────────┐
      │  Route Handlers /  │            │  Supabase JS Client     │
      │  Server Actions    │  ────────► │  (auth + queries)       │
      │  (capa de negocio) │            └───────────┬────────────┘
      └─────────┬──────────┘                        │
                │ RPC (funciones Postgres)          │
                ▼                                    ▼
      ┌──────────────────────────────────────────────────────────┐
      │                    Supabase / PostgreSQL                   │
      │  Tablas · Vistas · Funciones RPC · Triggers · RLS · Storage│
      └──────────────────────────────────────────────────────────┘
                │
                ▼
      GitHub (repositorio + CI) ──► Vercel (build & deploy)
```

## 2. Capas de la aplicación

| Capa | Responsabilidad | Tecnología |
|------|-----------------|-----------|
| **Presentación** | Pantallas, formularios, tablas, reportes. | Next.js (App Router), React, TypeScript, Tailwind + shadcn/ui (sugerido). |
| **Aplicación / Servicios** | Orquestación de casos de uso, validaciones, llamada a RPC. | Server Actions / Route Handlers (`/app/api/...`). |
| **Dominio / Reglas** | Reglas de negocio críticas (inventario, cartera) que **deben** vivir cerca de los datos. | **Funciones RPC de Postgres** (PL/pgSQL) + constraints. |
| **Datos** | Persistencia, integridad, seguridad por fila. | PostgreSQL en Supabase, RLS, triggers, vistas. |
| **Archivos** | PDFs de facturas, comprobantes de abono. | Supabase Storage (bucket privado con URLs firmadas). |

> **Principio clave:** las reglas que garantizan consistencia de inventario y cartera se implementan como **funciones RPC transaccionales en la base de datos**, no solo en el frontend. El frontend nunca descuenta inventario "a mano".

## 3. Multi-tenant (SaaS Kubit)

- Modelo **shared database, shared schema** con aislamiento por `tenant_id`.
- Todas las tablas de negocio incluyen `tenant_id uuid not null`.
- **Row Level Security (RLS)** activa en todas las tablas: cada usuario solo ve filas de su tenant.
- El `tenant_id` del usuario se resuelve desde su perfil (`usuarios.tenant_id`) y se valida en cada política RLS mediante `auth.uid()`.

```sql
-- Patrón de política RLS (se repite por tabla)
alter table public.compras enable row level security;

create policy tenant_isolation_select on public.compras
  for select using (tenant_id = (select tenant_id from public.usuarios where id = auth.uid()));

create policy tenant_isolation_modify on public.compras
  for all using (tenant_id = (select tenant_id from public.usuarios where id = auth.uid()))
  with check (tenant_id = (select tenant_id from public.usuarios where id = auth.uid()));
```

## 4. Autenticación y autorización

- **Supabase Auth** (email/password; opcional magic link).
- Tabla `usuarios` (perfil) enlazada a `auth.users` con `tenant_id` y `rol` (`admin`, `produccion`, `vendedor`).
- Autorización por rol en la capa de servicios + RLS por tenant en la base.
- Los **vendedores** solo ven su inventario asignado, sus ventas y su cartera.

## 5. Generación de factura PDF

1. La venta se confirma vía RPC `sp_registrar_venta` (atómica).
2. Un Server Action genera el PDF con `@react-pdf/renderer` (o `pdf-lib`) a partir de una plantilla.
3. El PDF se sube a Supabase Storage (bucket `facturas`, privado).
4. Se guarda la `pdf_url` (path) en `facturas`. La descarga usa **URL firmada** temporal.

## 6. Consistencia y transacciones

- Operaciones compuestas → **una sola función RPC** en Postgres (transacción implícita).
- Ejemplos: `sp_recibir_mercancia`, `sp_ejecutar_produccion`, `sp_transferir_inventario`, `sp_registrar_venta`, `sp_registrar_abono`.
- Constraints de integridad: `check (cantidad > 0)`, `check (saldo_pendiente >= 0)`, unicidad de consecutivos de factura por tenant.

## 7. Estructura sugerida del repositorio

```
FacturacionHSM/
├── README.md
├── docs/                      # ESTA documentación (fuente de verdad)
├── supabase/
│   ├── migrations/            # DDL versionado (tablas, RLS, funciones)
│   └── seed.sql               # catálogos base (estados, calidades, tallas...)
├── src/
│   ├── app/                   # Next.js App Router (páginas + /api)
│   ├── components/            # UI reutilizable
│   ├── lib/                   # supabase client, helpers, validaciones (zod)
│   ├── services/              # capa de aplicación (llama RPC)
│   └── types/                 # tipos TS generados desde Supabase
├── tests/                     # pruebas (unit, integración, e2e)
├── .github/workflows/         # CI: lint, test, migraciones
└── package.json
```

## 8. Entornos

| Entorno | Base de datos | Frontend | Uso |
|---------|--------------|----------|-----|
| **Local** | Supabase local (CLI) o proyecto dev | `next dev` | Desarrollo. |
| **Preview** | Proyecto Supabase de staging | Deploy preview de Vercel (por PR) | QA / revisión. |
| **Producción** | Proyecto Supabase prod | Vercel prod (`main`) | Cliente final. |

## 9. Observabilidad y auditoría
- Tabla `movimientos_inventario` = auditoría natural del inventario.
- Columnas `created_at`, `created_by` en todas las tablas de negocio.
- Logs de errores de los Server Actions centralizados (Vercel logs / Supabase logs).
- (Opcional futuro) tabla `auditoria` genérica para cambios sensibles de cartera.

## 10. Decisiones de arquitectura (ADR resumidas)
- **ADR-01:** Reglas de inventario/cartera en RPC de Postgres (no solo cliente) → garantiza atomicidad y evita saldos inconsistentes.
- **ADR-02:** Inventario como **saldo + libro mayor** (event sourcing ligero) → trazabilidad y auditoría.
- **ADR-03:** `estado` y `calidad` como **catálogos independientes** → flexibilidad y reutilización.
- **ADR-04:** Multi-tenant con RLS desde el inicio → habilita el SaaS Kubit sin refactor futuro.
- **ADR-05:** Importes en `numeric(14,2)` → precisión monetaria.
