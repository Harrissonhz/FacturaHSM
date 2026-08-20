# 05 · Especificación funcional (épicas, historias y pantallas)

> Historias de usuario en formato SDD. Cada historia tiene ID, criterios de aceptación (CA) y referencia a reglas (`07`) y pruebas (`08`).

## Épicas

| ID | Épica | Prioridad |
|----|-------|-----------|
| E1 | Catálogos base | Alta |
| E2 | Compras y recepción (recibos parciales) | Alta |
| E3 | Inventario por estados | **Crítica** |
| E4 | Producción / maquila y calidad | **Crítica** |
| E5 | Distribución a vendedores | **Crítica** |
| E6 | Ventas a crédito y factura PDF | **Crítica** |
| E7 | Cartera / cuentas por cobrar | **Crítica** |
| E8 | Reportes y trazabilidad | Alta |
| E9 | Seguridad, usuarios y multi-tenant | Alta |

---

## E1 · Catálogos base

- **HU-1.1** Como admin quiero gestionar **productos** (nombre, tipo, género) para clasificar el catálogo.
  - CA: crear/editar/inactivar; no eliminar si tiene variantes.
- **HU-1.2** Como admin quiero gestionar **variantes/SKU** (referencia, color, talla, precio base) para tener la unidad mínima de inventario.
  - CA: combinación (producto+color+talla) única; SKU autogenerado.
- **HU-1.3** Como admin quiero gestionar catálogos de **tallas, colores, tipos, procesos, estados y calidades**.
  - CA: parametrizables por tenant; `LISTO` marca `disponible_venta=true`; `MERMA` marca `comercializable=false`.
- **HU-1.4** Como admin quiero definir **precios por calidad** (primera/segunda) por variante.

## E2 · Compras y recepción

- **HU-2.1** Como admin quiero **crear una compra** a un proveedor con variantes, cantidades y costo → estado `PENDIENTE`.
- **HU-2.2** Como admin quiero **registrar recibos parciales** de una compra.
  - CA: no recibir más de lo pendiente; actualiza `cantidad_recibida`; compra pasa a `PARCIAL`/`RECIBIDA`; genera movimiento ENTRADA a `CENTRAL/CRUDO`.
- **HU-2.3** Como admin quiero **consultar el pendiente por recibir** de cada compra.
- **HU-2.4** Como admin quiero **cancelar** una compra sin recibos.

## E3 · Inventario por estados

- **HU-3.1** Como admin quiero **ver el saldo de inventario** por variante, ubicación, estado y calidad.
- **HU-3.2** Como admin quiero que el inventario **diferencie existencia física de disponibilidad de venta** (solo `LISTO`).
- **HU-3.3** Como admin quiero **mover inventario entre estados** de forma auditable (siempre vía movimiento).
- **HU-3.4** Como admin quiero **ajustar inventario** (con motivo) generando un movimiento `AJUSTE` trazable.

## E4 · Producción / maquila y calidad

- **HU-4.1** Como operario quiero **crear una orden de producción** (proceso) y cargar las unidades de entrada desde `CRUDO`.
- **HU-4.2** Como operario quiero **cerrar la orden registrando resultados por calidad** (primera/segunda/merma).
  - CA: `Σ entradas = Σ resultados`; genera movimientos `TRANSFORMACION`; deja `TERMINADO` con su calidad.
- **HU-4.3** Como operario quiero **empacar** (TERMINADO → LISTO) para habilitar la venta.
- **HU-4.4** Como admin quiero **ver la trazabilidad de un lote** (qué pasó con las 50 unidades).

## E5 · Distribución a vendedores

- **HU-5.1** Como admin quiero **gestionar vendedores** (con su ubicación y municipio).
- **HU-5.2** Como admin quiero **enviar inventario a un vendedor** (transferencia ENVIO).
  - CA: valida disponibilidad en `CENTRAL/LISTO`; mueve saldo a la ubicación del vendedor.
- **HU-5.3** Como admin quiero **registrar el retorno** de unidades no vendidas (transferencia RETORNO) para devolverlas al central.
- **HU-5.4** Como admin quiero **consultar el inventario de cada vendedor** (recibido, vendido, disponible, por referencia/talla/color/calidad).

## E6 · Ventas a crédito y factura PDF

- **HU-6.1** Como vendedor quiero **gestionar mis clientes** (nombre, municipio, contacto).
- **HU-6.2** Como vendedor quiero **registrar una venta a crédito** a un cliente con productos de mi inventario.
  - CA: valida disponibilidad en mi ubicación; descuenta inventario (movimiento SALIDA); calcula total; crea la venta atómicamente.
- **HU-6.3** Como vendedor quiero **generar la factura en PDF** (no electrónica) con consecutivo.
  - CA: PDF con datos de cliente, vendedor, productos, cantidades, precios, total; guardado en Storage; descargable por URL firmada.
- **HU-6.4** Como vendedor quiero que la venta a crédito **genere automáticamente la cuenta por cobrar**.
- **HU-6.5** Como admin quiero **anular una venta** (con reverso de inventario y de cartera) de forma auditable.

## E7 · Cartera / cuentas por cobrar

- **HU-7.1** Como vendedor/admin quiero **registrar abonos parciales** a una cuenta.
  - CA: `monto <= saldo_pendiente`; recalcula saldo; actualiza estado (`PARCIAL`/`PAGADA`).
- **HU-7.2** Como admin quiero **consultar la cartera** por cliente, vendedor y factura, con saldo, estado, vencimiento e historial de abonos.
- **HU-7.3** Como admin quiero **ver cuentas vencidas** (saldo>0 y `fecha_vencimiento<hoy`).
- **HU-7.4** Como vendedor quiero **adjuntar comprobante** del abono (consignación, transferencia).

## E8 · Reportes y trazabilidad

- **HU-8.1** Reporte de **inventario** por estado, vendedor, producto, referencia, talla, color.
- **HU-8.2** Reporte de **ventas** por vendedor y municipio.
- **HU-8.3** Reporte de **cartera** por cliente, vendedor y factura (con edades de saldo).
- **HU-8.4** **Trazabilidad** de una variante/lote desde la compra hasta el pago.

## E9 · Seguridad, usuarios y multi-tenant

- **HU-9.1** Como admin quiero **crear usuarios** con rol (`admin`/`produccion`/`vendedor`).
- **HU-9.2** Como sistema debo **aislar los datos por tenant** (RLS) y limitar a cada vendedor a su información.

---

## Mapa de pantallas (UI)

| Módulo | Pantallas |
|--------|-----------|
| **Dashboard** | Resumen: inventario disponible, ventas del mes, cartera pendiente/vencida. |
| **Catálogos** | Productos · Variantes · Tallas · Colores · Tipos · Procesos · Estados · Calidades · Precios. |
| **Proveedores** | Lista · Ficha. |
| **Compras** | Lista · Nueva compra · Detalle/Recepción (recibos parciales) · Pendientes por recibir. |
| **Inventario** | Saldo por estado/calidad/ubicación · Ajustes · Trazabilidad de lote. |
| **Producción** | Órdenes · Nueva orden (entradas) · Cierre (resultados por calidad) · Empaque. |
| **Vendedores** | Lista · Ficha · Inventario del vendedor. |
| **Transferencias** | Envío a vendedor · Retorno · Historial. |
| **Clientes** | Lista · Ficha (por vendedor/municipio). |
| **Ventas** | Nueva venta (POS) · Lista · Detalle · Factura PDF · Anulación. |
| **Cartera** | Lista de CxC · Detalle de cuenta · Registrar abono · Vencidas · Comprobantes. |
| **Reportes** | Inventario · Ventas por municipio · Cartera · Trazabilidad. |
| **Administración** | Usuarios · Roles · Configuración del tenant. |

## Matriz historia → reglas → pruebas

| Historia | Reglas (`07`) | Pruebas (`08`) |
|----------|---------------|----------------|
| HU-2.2 | R-COM-01..03 | TC-COM-01..03 |
| HU-4.2 | R-PRO-01..03 | TC-PRO-01..03 |
| HU-5.2 / 5.3 | R-DIS-01..03 | TC-DIS-01..03 |
| HU-6.2 / 6.3 | R-VEN-01..04 | TC-VEN-01..04 |
| HU-7.1 | R-CAR-01..04 | TC-CAR-01..04 |
