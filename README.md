# FacturacionHSM

> Sistema POS con inventario por estados, producción/maquila, distribución por vendedores, ventas a crédito, cartera y reportes. Construido bajo **SDD (Spec Driven Development)**, multi-tenant (SaaS Kubit), desplegado en Vercel + Supabase.

**Estado:** MVP funcional en producción. Ver [`docs/12-estado-actual-implementacion.md`](docs/12-estado-actual-implementacion.md).

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend + Backend | Next.js 14 (App Router) + TypeScript |
| Base de datos / Auth | Supabase (PostgreSQL + RLS) |
| Hosting | Vercel |
| PWA | Instalable (service worker nativo) |

## Puesta en marcha

```bash
npm install
cp .env.example .env.local     # completa las claves de Supabase
npm run dev                    # http://localhost:3000
```

Variables (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Documentación (orden de lectura)

| # | Documento | Contenido |
|---|-----------|-----------|
| 00 | `docs/00-CONSTITUTION.md` | Principios no negociables |
| 01 | `docs/01-contexto-y-alcance.md` | Negocio, alcance, glosario |
| 02 | `docs/02-arquitectura.md` | Arquitectura y capas |
| 03 | `docs/03-modelo-de-datos.md` | Modelo de datos + DDL |
| 03b | `docs/03b-modelo-de-datos-addendum.md` | Cambios durante la implementación |
| 04 | `docs/04-flujos-de-negocio.md` | Flujos (compra→cartera) |
| 05 | `docs/05-especificacion-funcional.md` | Épicas e historias |
| 06 | `docs/06-api-endpoints.md` | Contratos / RPC |
| 07 | `docs/07-reglas-y-validaciones.md` | Reglas de negocio |
| 08 | `docs/08-plan-de-pruebas.md` | Set de pruebas |
| 09 | `docs/09-plan-de-implementacion.md` | Plan por fases |
| 10 | `docs/10-riesgos-y-escalabilidad.md` | Riesgos y escalabilidad |
| 11 | `docs/11-diseno-frontend-y-pwa.md` | Diseño, UX/UI y PWA |
| **12** | `docs/12-estado-actual-implementacion.md` | **Estado actual (leer para retomar)** |
| **13** | `docs/13-mapa-de-codigo.md` | **Estructura del código** |

## Ciclo de negocio (operativo end-to-end)

```
Compra → Recepción (parcial) → CRUDO → Producción (primera/segunda/merma)
→ Empaque → LISTO → Distribución al vendedor → Venta a crédito → Factura PDF
→ Cartera → Abonos → Estado de cuenta → (Retorno de lo no vendido al central)
```

## Módulos implementados

Catálogos (productos, variantes, vendedores, proveedores, clientes) · Compras + recepción · Producción/maquila · Distribución + retorno · Ventas (POS) + factura PDF · Cartera + abonos + estado de cuenta · Reportes (inventario, ventas, cartera avanzada con aging/KPIs/export, trazabilidad) · Anular venta · Ajuste de inventario · PWA instalable.

## Pendiente (post-MVP)

Roles finos (7.3) · Auditoría avanzada (7.4). Ver `docs/12`.

---

**Propietario:** Harrisson Zapata Gómez · **Producto:** SaaS Kubit
