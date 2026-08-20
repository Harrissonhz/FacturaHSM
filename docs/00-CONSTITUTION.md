# 00 · Constitución del proyecto (SDD)

> Principios **no negociables**. Cualquier especificación, plan, tarea o código que contradiga esta constitución debe rechazarse o corregirse. Este documento es la máxima autoridad del proyecto.

---

## Artículo 1 — Separación de conceptos

1.1. El **estado del proceso** (etapa productiva) y la **calidad del producto** (condición física) son **dos dimensiones independientes** y nunca se modelan en el mismo campo.

1.2. "Producto que existe físicamente" y "producto disponible para la venta" son conceptos distintos. Solo el producto en estado `LISTO` **y** calidad comercializable puede venderse.

## Artículo 2 — Inventario dirigido por eventos (event-sourced)

2.1. Todo cambio de inventario se registra como un **movimiento inmutable** en `movimientos_inventario` (libro mayor). Nunca se edita ni se borra un movimiento; los errores se corrigen con un movimiento de ajuste/reverso.

2.2. Los saldos (`inventario`) son una **proyección derivada** de los movimientos. La suma de movimientos siempre debe cuadrar con los saldos.

2.3. Ningún saldo de inventario puede ser negativo. Toda salida valida disponibilidad antes de ejecutarse (idealmente dentro de una transacción/función de base de datos).

## Artículo 3 — Trazabilidad total

3.1. Debe ser posible seguir cualquier unidad desde la **compra** hasta el **pago final** de la cartera, sin rupturas en la cadena.

3.2. Todo registro relevante conserva: quién lo creó, cuándo, y el documento de origen que lo generó.

## Artículo 4 — Multi-tenant desde el día 1 (SaaS Kubit)

4.1. Toda tabla de negocio incluye `tenant_id` y está protegida por **Row Level Security (RLS)** en Supabase.

4.2. No se implementa ninguna lógica exclusiva y rígida para un solo cliente. Todo concepto (estados, calidades, procesos, tipos de documento) es **parametrizable por catálogo**.

## Artículo 5 — Consistencia transaccional

5.1. Las operaciones que afectan varias tablas (venta → inventario → factura → cartera) se ejecutan de forma **atómica** (función RPC de Postgres o transacción). O todo ocurre, o nada.

5.2. Los importes monetarios se almacenan en `numeric` (nunca `float`) para evitar errores de redondeo.

## Artículo 6 — Contratos primero (API-first)

6.1. Antes de implementar una pantalla o servicio se define su **contrato** (entrada, salida, errores) en `06-api-endpoints.md`.

6.2. El frontend nunca modifica inventario ni cartera con lógica propia: solo consume servicios que encapsulan las reglas de negocio.

## Artículo 7 — Pruebas obligatorias

7.1. **Cada cambio** en el sistema ejecuta el set de pruebas de regresión definido en `08-plan-de-pruebas.md` antes de fusionar a `main`.

7.2. Toda nueva regla de negocio nace acompañada de su caso de prueba. Sin prueba no hay merge.

## Artículo 8 — Reutilización y genericidad

8.1. El modelo debe permitir que otros clientes de Kubit usen producción/maquila, inventario por estados, vendedores, ventas a crédito y cartera **sin cambiar el esquema**, solo parametrizando catálogos.

8.2. Se prefiere una solución genérica bien nombrada sobre atajos específicos del cliente HSM.

## Artículo 9 — Simplicidad y evolución por fases

9.1. Se construye siguiendo la prioridad: **Inventario → Producción/Maquila → Distribución → Venta a crédito → Cartera**.

9.2. No se adelanta complejidad no solicitada (YAGNI). Se entrega valor incremental y funcional en cada fase.

## Artículo 10 — Fuente única de verdad

10.1. Esta carpeta de documentación es la fuente única de verdad del proyecto. Cualquier cambio de alcance se refleja **primero** aquí y luego en el código.

---

### Definition of Ready (DoR) — una historia está lista para desarrollarse si:
- Tiene criterios de aceptación claros y medibles.
- Identifica las entidades y movimientos de inventario afectados.
- Referencia las reglas de negocio y validaciones aplicables.
- Define las pruebas que la validarán.

### Definition of Done (DoD) — una historia está terminada si:
- Cumple todos sus criterios de aceptación.
- Respeta todos los artículos de esta constitución.
- Pasa el set de pruebas de regresión (`08`).
- Está documentada y desplegada en el entorno correspondiente (Vercel + Supabase).
