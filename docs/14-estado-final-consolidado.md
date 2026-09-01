# 14 · Estado FINAL consolidado del proyecto

> Documento maestro que refleja el estado **actual y completo** de FacturacionHSM tras todas las iteraciones. Cualquier IA o desarrollador que retome el proyecto debe leer este documento primero. Reemplaza como referencia principal a los documentos 12 y 13 anteriores (que quedan como histórico).

---

## 1. Qué es FacturacionHSM

Sistema **POS + gestión de inventario por estados + producción/maquila + ventas a crédito + cartera + reportes**, para HSM Family Sport (confección de prendas). Operativo end-to-end, en producción.

- **Producción:** Vercel (`factura-hsm.vercel.app`) + Supabase.
- **Repo:** GitHub `Harrissonhz/FacturaHSM`.
- **Usuarios:** 2 vendedores (hermanos) que comparten un único inventario.

## 2. Stack (confirmado)

| Capa | Tecnología |
|------|-----------|
| Frontend + Backend | Next.js 14 (App Router) + TypeScript + React 18 |
| Base de datos / Auth | Supabase (PostgreSQL + RLS) |
| Hosting | Vercel (deploy automático por push a main) |
| PWA | Instalable (service worker nativo) |
| Multi-tenant | `tenant_id` + RLS en todas las tablas |

## 3. Decisiones clave (Fase 1) — MUY IMPORTANTE

Estas decisiones definen cómo funciona hoy el sistema y difieren del diseño original:

1. **Inventario CENTRAL compartido.** No se usa Distribución/Retorno. Al empacar, el producto queda en CENTRAL/LISTO y **está disponible para vender de inmediato**. La venta descuenta del inventario central. Los 2 vendedores comparten el mismo stock. (Distribución/Retorno están ocultas en el menú pero su estructura de datos y RPC se conservan para el futuro.)

2. **Clientes = de la empresa.** Cualquier vendedor puede venderle a cualquier cliente. El `vendedor_id` del cliente es solo "vendedor habitual" (referencia), no restringe.

3. **Sin offline.** El sistema requiere internet. La PWA es solo para instalación (icono, pantalla completa), no para trabajar sin datos.

4. **Consecutivos automáticos:** compras (OC), producción (OP), envíos (ENV), retornos (RET), facturas (FAC). El usuario no digita números.

5. **Delete = inactivar** (soft delete) en catálogos. Operaciones se corrigen con **anulación** (ventas) o **ajuste** (inventario), nunca borrado.

6. **Zona horaria Colombia** (America/Bogota) en fechas guardadas y mostradas.

7. **Precio unitario editable** en la venta (descuentos por línea).

8. **Selector en cascada** (Calidad → Producto con imagen → Talla → Color) en venta y compra.

## 4. Módulos implementados (estado actual)

### Autenticación y seguridad
- Login (Supabase Auth) + perfil en `public.usuarios` (rol + tenant).
- Middleware SSR con guarda de rutas. RLS multi-tenant.
- Roles: admin / produccion / vendedor (navegación oculta opciones admin a no-admin; el filtrado fino por rol queda pendiente para 7.3).

### Catálogos (CRUD completo: crear/editar/inactivar)
- **Productos** (con `imagen_url`), **Variantes** (SKU + precios primera/segunda), **Vendedores**, **Proveedores**, **Clientes**.
- **Catálogos base:** Colores, Tallas, Tipos de producto, Procesos (crear/editar/inactivar).

### Compras y recepción
- Crear compra (número automático OC) con **selector en cascada**.
- Recepción con **recibos parciales** → inventario a CRUDO (`sp_recibir_mercancia`).

### Producción / maquila
- Órdenes (número automático OP). Entradas desde CRUDO.
- Cierre con resultados por **calidad** (primera/segunda/merma), con balance. Soporta **producción parcial** (`sp_ejecutar_produccion` final).
- Empaque TERMINADO → LISTO (`sp_empacar`) → disponible para venta.

### Ventas (POS)
- Selector en cascada con **imágenes de producto**, calidad al inicio.
- Cliente (todos los activos) + crear cliente rápido.
- **Precio unitario editable** (descuentos) + carrito multi-producto.
- Venta atómica (`sp_registrar_venta`): descuenta de CENTRAL, genera factura (FAC) y cuenta por cobrar. Fechas en hora Colombia.

### Factura (imprimible / PDF)
- `/factura/[ventaId]` con **logo**, datos del emisor, cliente, productos, totales y **medios de pago** (cuentas bancarias). Reimprimible desde Historial.

### Cartera
- Búsqueda por cliente/factura, filtros, abonos parciales (`sp_registrar_abono`).
- **Estado de cuenta del cliente** `/cartera/estado/[clienteId]`: PDF con logo, facturas y detalle de abonos.

### Reportes
- Inventario por vendedor, Ventas por municipio, **Reporte de cartera avanzado** (filtros + agrupación + aging + KPIs + export CSV/PDF), Trazabilidad de variante.

### Correcciones
- **Anular venta** (`sp_anular_venta`), **Ajuste de inventario** (`sp_ajustar_inventario`).

### PWA
- Instalable (manifest + iconos + service worker). Requiere internet.

## 5. Navegación (rutas)

### Sidebar (escritorio, agrupado) / Bottom nav (móvil) + "Más"
| Sección | Rutas |
|---------|-------|
| Operación | `/` · `/ventas` · `/inventario` · `/cartera` |
| Abastecimiento | `/compras` · `/produccion` *(Distribución y Retorno ocultas)* |
| Gestión | `/clientes` · `/catalogos` (+ productos, variantes, vendedores, colores, tallas, tipos, procesos) |
| Análisis y ajustes | `/reportes` · `/ventas/historial` · `/inventario/ajuste` |
| Documentos | `/factura/[ventaId]` · `/cartera/estado/[clienteId]` |

## 6. Funciones RPC (versión vigente)

| RPC | Notas |
|-----|-------|
| `fn_current_tenant`, `fn_aplicar_movimiento` | Helpers |
| `sp_recibir_mercancia` | Recepción parcial → CRUDO |
| `sp_ejecutar_produccion` | **Final:** directa CRUDO→TERMINADO (parcial + calidades) |
| `sp_empacar` | TERMINADO → LISTO |
| `sp_transferir_inventario` | Conservada (Distribución/Retorno, oculta) |
| `sp_registrar_venta` | **Final:** descuenta de CENTRAL + fecha Colombia |
| `sp_registrar_abono` | **Final:** fecha Colombia |
| `sp_anular_venta` | Reversa a CENTRAL + elimina cartera |
| `sp_ajustar_inventario` | Ajuste auditable +/- |

## 7. Base de datos

Ver `supabase/README.md` y los scripts `01`–`06` (crear desde cero) + `99` (reset). Cambios acumulados incluidos: `empresa_config` (+ cuentas_bancarias), `productos.imagen_url`, RLS de detalle, y todas las funciones en versión final.

## 8. Pendientes (post-MVP)

1. **Roles finos (7.3):** que vendedor/producción vean solo lo suyo (hoy la navegación oculta, falta refuerzo por pantalla + RLS por rol).
2. **Auditoría (7.4):** tabla de auditoría + pantalla de consulta.
3. (Futuro) Reactivar Distribución/Retorno si suman más vendedores con inventario separado.
4. (Opcional) Gestión de imágenes desde la app (Supabase Storage).

## 9. Cómo continuar (para una IA)

1. Lee `00-CONSTITUTION.md`, este `14`, `03-modelo-de-datos.md` + `03b-addendum`, y `supabase/README.md`.
2. Patrón: **página server (carga datos)** + **componente client (interacción)** + **Server Action o RPC (escritura)**.
3. Escrituras de inventario/cartera SIEMPRE por RPC transaccional (nunca desde el frontend directo).
4. Respeta: multi-tenant (RLS), soft-delete, inventario central (Fase 1), zona horaria Colombia.
5. Antes de cambiar una función, usa la versión de `supabase/migrations/02_functions.sql` como base (es la vigente).
