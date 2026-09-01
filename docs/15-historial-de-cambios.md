# 15 · Historial de cambios (changelog de iteraciones)

> Registro cronológico de las mejoras, correcciones y decisiones tomadas durante el desarrollo iterativo del MVP. Útil para entender por qué el sistema es como es hoy.

## Infraestructura y base
- Proyecto Next.js + Supabase + Vercel desplegado. Auth con login funcional.
- Migraciones iniciales: esquema, funciones, vistas, RLS, seed.
- Diagnóstico: firewall corporativo bloquea Node local → se desarrolla probando en Vercel.

## Diseño (frontend)
- **Fase 1:** design system (tokens CSS), layout responsivo con bottom navigation (móvil) y sidebar (escritorio).
- **Fase 2:** rediseño de Ventas y Cartera (tarjetas, bottom sheet).
- Sidebar reorganizado en **secciones con encabezados** (sin colapsar) por usabilidad.

## Flujo de negocio
- **POS completo:** selector de cliente + crear cliente + carrito multi-producto.
- **Factura PDF** (vista imprimible) con emisor parametrizable (`empresa_config`).
- **Cartera + abonos** + **Estado de cuenta** del cliente (PDF con logo).
- **CRUD Bloque 1** (productos, variantes, vendedores), **Bloque 2** (compras/recepción), **Bloque 3** (producción/distribución/retorno).
- **Retorno de inventario** (cierra Fase 3 del plan original).
- **Reportes:** inventario, ventas por municipio, cartera avanzada (aging/KPIs/export), trazabilidad.
- **PWA instalable** (manifest + iconos + SW).
- **Update/Delete** en catálogos (editar/inactivar).
- **Correcciones (7.2b):** Clientes CRUD, Anular venta, Ajuste de inventario.

## Correcciones de bugs importantes
1. **`sp_ejecutar_produccion` (calidades mixtas):** consumía el origen con la calidad destino → fallaba con SEGUNDA/MERMA. Fix: consumir con calidad de origen.
2. **`sp_ejecutar_produccion` (producción parcial):** el staging EN_PRODUCCION se descuadraba al producir menos de lo que hay en crudo → fix: transformación **directa** CRUDO→TERMINADO.
3. **RLS de tablas de detalle:** faltaban políticas INSERT (compras_detalle, producción, transferencias) → agregadas.
4. **`sp_anular_venta`:** estaba documentada pero no implementada → creada.
5. **Fecha de cliente/vendedor en ventas:** el formulario de cliente no permitía editar/asignar vendedor → corregido; además se decidió que cualquier vendedor puede venderle a cualquier cliente.
6. **Zona horaria:** operaciones después de las 7 PM se guardaban como del día siguiente (UTC vs Colombia) → fix en frontend (`format.ts` con America/Bogota) y en RPC (fecha con `now() at time zone 'America/Bogota'`).

## Requerimientos del usuario (pruebas)
- **Ocultar Distribución/Retorno** y usar **inventario central compartido** (2 hermanos, un solo inventario). Cambio en `sp_registrar_venta` (descuenta de CENTRAL) y en Ventas (lee CENTRAL).
- **Consecutivos automáticos** (dejar de pedir número al usuario).
- **Precio unitario editable** en la venta (descuentos).
- **Búsqueda + reimpresión** de facturas en el historial.
- **Cuentas bancarias** en la factura (medios de pago) → campo `empresa_config.cuentas_bancarias`.
- **Catálogos base** gestionables (colores, tallas, tipos, procesos).
- **Selector en cascada** (Calidad → Producto → Talla → Color) para venta y compra, mobile-first.
- **Imágenes de producto** en el selector (`productos.imagen_url`, fotos en `public/productos/`).
- **Logo real** de HSM Family Sport en factura, estado de cuenta, iconos PWA, favicon y login.
- **Reporte de cartera avanzado** (filtros, agrupación, aging, KPIs, export).

## Datos y operación
- Script de **limpieza/RESET** para dejar la base lista antes de operar en vivo.
- Usuario admin de producción creado y enlazado al tenant.

## Estado actual
MVP funcional en producción. Pendientes post-MVP: roles finos (7.3) y auditoría (7.4). Distribución/Retorno conservados pero ocultos (reactivables).
