# 03b · Addendum al modelo de datos

> Complementa `03-modelo-de-datos.md` con lo agregado durante la implementación. Lee ambos juntos.

## 1. Tabla NUEVA: `empresa_config` (emisor)

Datos de la empresa para factura y estado de cuenta. Parametrizable, 1 fila por tenant.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK unique | |
| razon_social | text | |
| nit | text | |
| direccion | text | |
| ciudad | text | |
| telefono | text | |
| email | text | |
| logo_url | text null | ruta del logo (ej. `/logo.png` en public) |
| pie_factura | text null | texto libre al pie |

RLS: select/all por `tenant_id = fn_current_tenant()`.

## 2. Función NUEVA: `sp_anular_venta`

No estaba en la migración original (solo documentada). Implementada en 7.2b.
- **Entrada:** `p_venta_id`, `p_motivo`.
- **Lógica:** valida venta CONFIRMADA; si la cuenta tiene abonos → error `TIENE_ABONOS`; reversa inventario (movimiento REVERSO devuelve al vendedor/LISTO/calidad); elimina la cuenta por cobrar; marca venta `ANULADA`. La factura se conserva.

## 3. Corrección en `sp_ejecutar_produccion`

Bug corregido: al registrar resultados, el movimiento debe **consumir de EN_PRODUCCION usando la calidad de ORIGEN** (con la que entró a producir), no la de destino. Antes fallaba con `SALDO_INSUFICIENTE` al pasar unidades a segunda/merma.

## 4. Políticas RLS agregadas (post-migración 0004)

Tablas de detalle que se insertan directamente (no vía RPC) requieren política INSERT que valida el tenant vía la fila padre:
- `compras_detalle` — insert + update
- `ordenes_produccion_detalle` — insert
- `ordenes_produccion_resultado` — insert
- `transferencias_detalle` — insert

## 5. Uso real de campos (aclaraciones)

- **`clientes.vendedor_id`**: es el "vendedor habitual" (referencia), NO restringe las ventas. En el POS se muestran todos los clientes activos.
- **`transferencias.tipo`**: `ENVIO` (central→vendedor) y `RETORNO` (vendedor→central). Ambos confirmados por `sp_transferir_inventario`.
- **Consecutivos**: generados por conteo por tenant + prefijo (OC/OP/ENV/RET/FAC) con relleno a 6 dígitos.
- **`calidades.MERMA`**: `comercializable=false`; no se distribuye ni vende, pero queda en TERMINADO/MERMA para trazabilidad.

## 6. Estados (resumen operativo)

- **Inventario (estado):** CRUDO → EN_PRODUCCION → TERMINADO → LISTO.
- **Calidad:** PRIMERA / SEGUNDA / MERMA.
- **Compra:** PENDIENTE → PARCIAL → RECIBIDA.
- **Orden producción:** ABIERTA → CERRADA.
- **Transferencia:** BORRADOR → CONFIRMADA.
- **Venta:** CONFIRMADA → ANULADA.
- **Cuenta por cobrar:** PENDIENTE → PARCIAL → PAGADA; VENCIDA si `saldo>0` y `vencimiento<hoy`.
