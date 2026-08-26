# 12 · Estado actual de implementación

> Documento vivo que refleja **qué está construido y desplegado** a la fecha. Cualquier modelo de IA o desarrollador que retome el proyecto debe leer este documento junto con `00`–`11` para entender el punto exacto en el que se encuentra la solución.

**Última actualización:** implementación MVP funcional en producción.
**Producción:** desplegado en Vercel (`https://factura-hsm.vercel.app`) + Supabase.
**Repositorio:** GitHub (`Harrissonhz/FacturaHSM`).

---

## 1. Resumen ejecutivo

FacturacionHSM es un **sistema POS + gestión de inventario por estados + producción/maquila + distribución por vendedores + ventas a crédito + cartera**, operativo de punta a punta. El ciclo completo funciona **sin necesidad de SQL manual**: desde crear un producto hasta cobrar su cartera.

**Estado:** MVP funcional en producción. Falta únicamente endurecimiento (roles finos, auditoría) que es post-MVP.

## 2. Stack tecnológico (confirmado)

| Capa | Tecnología |
|------|-----------|
| Frontend + Backend | Next.js 14 (App Router) + TypeScript + React 18 |
| Base de datos / Auth / Storage | Supabase (PostgreSQL + RLS) |
| Hosting | Vercel (deploy automático por push a `main`) |
| PWA | Service worker nativo + manifest (instalable) |
| Estilos | CSS propio (design system con variables) |
| Multi-tenant | `tenant_id` + RLS en todas las tablas |

## 3. Fases del plan y su estado

| Fase | Descripción | Estado |
|------|-------------|--------|
| 0 | Fundaciones (repo, Supabase, Auth, deploy) | ✅ Completa |
| 1 | Catálogos + Compras + Inventario base | ✅ Completa |
| 2 | Producción/maquila y calidad | ✅ Completa |
| 3 | Distribución + **Retorno** a vendedores | ✅ Completa |
| 4 | Ventas a crédito + factura PDF | ✅ Completa |
| 5 | Cartera / cuentas por cobrar | ✅ Completa |
| 6 | Reportes y trazabilidad | ✅ Completa |
| 7.1 | PWA instalable | ✅ Completa |
| 7.2 | Update/Delete (editar/inactivar) catálogos | ✅ Completa |
| 7.2b | Correcciones: Clientes, Anular venta, Ajuste inventario | ✅ Completa |
| 7.3 | Roles finos (permisos por rol) | ⏳ Pendiente (post-MVP) |
| 7.4 | Auditoría avanzada | ⏳ Pendiente (post-MVP) |

## 4. Funcionalidades implementadas (por módulo)

### 4.1 Autenticación y seguridad
- Login con Supabase Auth (email/password).
- Perfil en `public.usuarios` (rol + tenant) resuelto vía `getPerfil()`.
- Middleware SSR con guarda de rutas (sin sesión → `/login`).
- RLS multi-tenant en todas las tablas.
- Roles definidos: `admin`, `produccion`, `vendedor` (el filtrado fino por rol es 7.3, pendiente; hoy la navegación oculta opciones admin a no-admins).

### 4.2 Catálogos (CRUD completo)
- **Productos:** crear, editar, inactivar/reactivar.
- **Variantes (SKU):** crear, editar (referencia + precios primera/segunda), inactivar. SKU = `REFERENCIA-CODIGOCOLOR-CODIGOTALLA` (autogenerado).
- **Vendedores:** crear, editar, inactivar (crea ubicación tipo VENDEDOR automáticamente).
- **Proveedores:** crear, editar, inactivar.
- **Clientes:** crear, editar (incluye asignar/cambiar vendedor habitual), inactivar.
- Catálogos base (estados, calidades, tallas, colores, procesos, tipos): cargados por seed.

### 4.3 Compras y recepción
- Crear compra (proveedor + variantes + cantidades + costo). **Número automático** `OC-XXXXXX`.
- Recepción con **recibos parciales** → inventario entra en estado `CRUDO` (RPC `sp_recibir_mercancia`).
- Estados de compra: PENDIENTE / PARCIAL / RECIBIDA.

### 4.4 Producción / maquila
- Órdenes de producción. **Número automático** `OP-XXXXXX`.
- Entradas desde CRUDO → EN_PRODUCCION.
- Cierre con resultados por **calidad** (primera/segunda/merma), con validación de balance (RPC `sp_ejecutar_produccion`, corregida para consumir la calidad de origen).
- Empaque TERMINADO → LISTO (RPC `sp_empacar`).

### 4.5 Distribución y retorno
- **Envío** central → vendedor. **Número automático** `ENV-XXXXXX` (RPC `sp_transferir_inventario`, tipo ENVIO).
- **Retorno** vendedor → central (lo no vendido). **Número automático** `RET-XXXXXX` (tipo RETORNO).

### 4.6 Ventas (POS)
- POS con **selector de cliente** (todos los clientes activos de la empresa — cualquier vendedor puede venderle a cualquiera) + **crear cliente rápido**.
- **Productos disponibles** como dropdown + carrito multi-producto.
- Venta a crédito atómica (RPC `sp_registrar_venta`): descuenta inventario del vendedor, genera factura (`FAC-XXXXXX`) y cuenta por cobrar.
- Vendedor resuelto desde el usuario logueado (o primero disponible para admin).

### 4.7 Factura PDF
- Vista imprimible `/factura/[ventaId]` con **logo** (opcional, `empresa_config.logo_url`), datos del emisor, cliente, productos, totales.
- Emisor parametrizable en tabla `empresa_config`.

### 4.8 Cartera
- Lista con **búsqueda por cliente/factura** + filtros (Todas/Pendientes/Vencidas) + chips de resumen.
- Registro de **abonos parciales** en bottom sheet (RPC `sp_registrar_abono`).
- **Estado de cuenta del cliente** `/cartera/estado/[clienteId]`: documento imprimible/PDF con logo, todas sus facturas y detalle de todos sus abonos.

### 4.9 Reportes
- **Inventario por vendedor** (vista `v_inventario_por_vendedor`).
- **Ventas por municipio** (vista `v_ventas_por_municipio`).
- **Reporte de cartera avanzado:** filtros (cliente, vendedor, municipio, estado, fechas), agrupación (cliente/vendedor/municipio), **aging** (por vencer / 1-30 / 31-60 / 60+), KPIs, y **exportación CSV + PDF**.
- **Trazabilidad** de variante (vista `v_trazabilidad_variante`): recorrido completo de movimientos.

### 4.10 Correcciones
- **Anular venta** (RPC `sp_anular_venta`): reversa inventario y elimina cuenta por cobrar; bloquea si tiene abonos.
- **Ajuste de inventario** (RPC `sp_ajustar_inventario`): corrige saldos con motivo, movimiento auditable.

### 4.11 PWA
- Instalable en celular (manifest + iconos + service worker nativo).
- Requiere internet para operar (sin offline de datos — decisión de Fase 1).
- Banner de instalación + aviso de "sin conexión".

## 5. Navegación (rutas principales)

### Sidebar (escritorio, agrupado por secciones) / Bottom nav (móvil) + "Más"
| Sección | Rutas |
|---------|-------|
| Operación | `/` · `/ventas` · `/inventario` · `/cartera` |
| Abastecimiento | `/compras` · `/produccion` · `/distribucion` · `/retorno` |
| Gestión | `/clientes` · `/catalogos` (productos, variantes, vendedores) |
| Análisis y ajustes | `/reportes` · `/ventas/historial` · `/inventario/ajuste` |
| Documentos | `/factura/[ventaId]` · `/cartera/estado/[clienteId]` |

## 6. Cambios respecto al diseño original (decisiones tomadas)

1. **Sin offline (Fase 1):** el sistema requiere internet; la PWA es solo para instalación (no cola de sincronización).
2. **Clientes = de la empresa:** cualquier vendedor puede venderle a cualquier cliente; el vendedor del cliente es solo "referencia/habitual" (no restringe).
3. **Consecutivos automáticos:** compras (OC), producción (OP), envíos (ENV), retornos (RET), facturas (FAC) — el usuario no digita números.
4. **Delete = inactivar:** los catálogos no se borran físicamente (soft delete) por trazabilidad; las operaciones se corrigen con anulación/ajuste.
5. **Server Actions** para formularios (en vez de muchos endpoints API), por simplicidad y seguridad.
6. **Tabla nueva `empresa_config`** (no estaba en el modelo original): datos del emisor para factura y estado de cuenta.

## 7. Funciones RPC en la base de datos (estado)

| RPC | Estado |
|-----|--------|
| `fn_current_tenant`, `fn_aplicar_movimiento` | ✅ |
| `sp_recibir_mercancia` | ✅ |
| `sp_ejecutar_produccion` | ✅ (corregida: consume calidad de origen) |
| `sp_empacar` | ✅ |
| `sp_transferir_inventario` (ENVIO/RETORNO) | ✅ |
| `sp_registrar_venta` | ✅ |
| `sp_registrar_abono` | ✅ |
| `sp_anular_venta` | ✅ (implementada en 7.2b; no estaba en migración original) |
| `sp_ajustar_inventario` | ✅ |

## 8. Políticas RLS adicionales aplicadas (post-migración)

Se agregaron políticas de INSERT para tablas de detalle que se insertan directamente (no vía RPC):
- `compras_detalle` (insert/update)
- `ordenes_produccion_detalle`, `ordenes_produccion_resultado` (insert)
- `transferencias_detalle` (insert)
- `empresa_config` (select/all por tenant)

## 9. Pendientes / próximos pasos (post-MVP)

1. **Roles finos (7.3):** que vendedor/producción vean solo lo suyo (hoy la navegación oculta, pero falta refuerzo por pantalla + RLS por rol).
2. **Auditoría (7.4):** tabla de auditoría para cambios sensibles + pantalla de consulta.
3. (Opcional) Convención de referencias/SKU estandarizada para búsqueda.
4. (Opcional) Comprobantes de abono en Storage.
5. (Opcional) Migrar consecutivos a secuencias dedicadas si hay alta concurrencia.

## 10. Cómo continuar (para una IA que retome el proyecto)

1. Lee `00-CONSTITUTION.md` (principios), luego este `12`, luego `03-modelo-de-datos.md` y `11-diseno-frontend-y-pwa.md`.
2. El código sigue el patrón: **página server (carga datos)** + **componente client (interacción)** + **Server Action o RPC (escritura)**.
3. Toda escritura crítica de inventario/cartera va por **RPC transaccional**; el frontend nunca descuenta directo.
4. Respeta multi-tenant (RLS) y soft-delete (inactivar).
5. Antes de cambios, revisa qué RPC ya existe (sección 7) para reutilizarla.
