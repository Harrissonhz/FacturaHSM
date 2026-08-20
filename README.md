# FacturacionHSM

> Sistema POS con inventario por estados, producción/maquila, distribución por vendedores, ventas a crédito y cartera.
> Diseñado bajo el marco **SDD (Spec Driven Development)** para ser genérico y reutilizable dentro del SaaS **Kubit**.

---

## 1. Qué es este repositorio

Este repositorio contiene **toda la especificación técnica y funcional** del proyecto *FacturacionHSM* **antes** de escribir una sola línea de código de producción.

El objetivo es que **cualquier modelo de IA o desarrollador** que se conecte a este repositorio tenga el **contexto completo** y el **plan de implementación** sin necesidad de explicaciones adicionales.

Todo está escrito en Markdown para poder copiar/pegar, versionar en Git y evolucionar de forma incremental.

## 2. Stack tecnológico objetivo

| Capa | Tecnología |
|------|-----------|
| Repositorio / versionado | **GitHub** |
| Hosting / despliegue frontend | **Vercel** |
| Base de datos + Auth + Storage | **Supabase** (PostgreSQL + Row Level Security + Storage) |
| Frontend | **Next.js (React) + TypeScript** |
| API | **Next.js Route Handlers / Server Actions** + Supabase JS Client |
| Generación de PDF | Librería de PDF en servidor (ej. `@react-pdf/renderer` o `pdf-lib`) |
| Multi-tenant (SaaS Kubit) | `tenant_id` en todas las tablas + políticas RLS |

## 3. Índice de la documentación (orden de lectura sugerido)

| # | Archivo | Contenido |
|---|---------|-----------|
| 00 | [`docs/00-CONSTITUTION.md`](docs/00-CONSTITUTION.md) | Principios no negociables del proyecto (SDD). |
| 01 | [`docs/01-contexto-y-alcance.md`](docs/01-contexto-y-alcance.md) | Contexto de negocio, alcance, glosario y prioridades. |
| 02 | [`docs/02-arquitectura.md`](docs/02-arquitectura.md) | Arquitectura técnica, capas, multi-tenant, seguridad. |
| 03 | [`docs/03-modelo-de-datos.md`](docs/03-modelo-de-datos.md) | Modelo de datos completo + DDL SQL para Supabase. |
| 04 | [`docs/04-flujos-de-negocio.md`](docs/04-flujos-de-negocio.md) | Flujos actuales y propuestos (compra → cartera). |
| 05 | [`docs/05-especificacion-funcional.md`](docs/05-especificacion-funcional.md) | Épicas, historias de usuario y pantallas. |
| 06 | [`docs/06-api-endpoints.md`](docs/06-api-endpoints.md) | Contratos de API / servicios. |
| 07 | [`docs/07-reglas-y-validaciones.md`](docs/07-reglas-y-validaciones.md) | Reglas de negocio y validaciones. |
| 08 | [`docs/08-plan-de-pruebas.md`](docs/08-plan-de-pruebas.md) | Set de pruebas de regresión (ejecutar en cada cambio). |
| 09 | [`docs/09-plan-de-implementacion.md`](docs/09-plan-de-implementacion.md) | Plan por fases, tareas y criterios de aceptación. |
| 10 | [`docs/10-riesgos-y-escalabilidad.md`](docs/10-riesgos-y-escalabilidad.md) | Riesgos técnicos/funcionales y recomendaciones. |

## 4. Concepto central del diseño

Dos dimensiones **independientes** que nunca se deben confundir:

- **ESTADO / ETAPA del proceso** → `CRUDO → EN_PRODUCCION → TERMINADO → EMPACADO/LISTO`
- **CALIDAD / CONDICIÓN del producto** → `PRIMERA → SEGUNDA → MERMA`

El inventario es un **saldo por combinación** de: `variante (referencia/talla/color) × ubicación × estado × calidad`, respaldado por un **libro mayor inmutable de movimientos** (`movimientos_inventario`) que garantiza trazabilidad y auditoría total.

## 5. Flujo de negocio de extremo a extremo

```
Compra → Recepción (parcial) → Inventario CRUDO → Producción/Maquila →
Producto TERMINADO (Primera/Segunda/Merma) → Empacado/LISTO →
Distribución a vendedores → Venta a crédito → Factura PDF →
Cuenta por cobrar → Abonos parciales → Saldo → Pago total (CANCELADA)
```

## 6. Cómo trabajar bajo SDD

1. **Specify** → Los documentos `01`–`07` son la *especificación*.
2. **Plan** → El documento `09` es el *plan* técnico por fases.
3. **Tasks** → Cada fase del `09` se descompone en tareas atómicas.
4. **Implement** → Se codifica una tarea a la vez, ejecutando el set de pruebas del `08` en cada cambio.
5. Ninguna decisión de código puede contradecir `00-CONSTITUTION.md`.

---

**Propietario:** Harrisson Zapata Gómez · **Producto:** SaaS Kubit · **Estado:** Especificación (pre-código)
