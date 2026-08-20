# 07 · Reglas de negocio y validaciones

> Reglas normativas del dominio. Cada regla tiene ID y debe tener al menos una prueba en `08`. Se implementan preferentemente en la base de datos (constraints + RPC) y se refuerzan en la UI.

## Reglas generales (R-GEN)
- **R-GEN-01** Todo registro de negocio pertenece a un `tenant_id`; ningún usuario accede a datos de otro tenant (RLS).
- **R-GEN-02** Los importes se almacenan en `numeric(14,2)`; nunca `float`.
- **R-GEN-03** Ninguna cantidad de inventario puede ser negativa.
- **R-GEN-04** Todo cambio de inventario genera un movimiento inmutable; los movimientos no se editan ni borran.
- **R-GEN-05** Estado (etapa) y calidad (condición) son independientes y no se mezclan en un mismo campo.

## Compras y recepción (R-COM)
- **R-COM-01** No se puede recibir una cantidad mayor a la pendiente (`solicitada − recibida`).
- **R-COM-02** La compra pasa a `RECIBIDA` solo cuando todos los renglones están completos; si hay recepción parcial, queda `PARCIAL`.
- **R-COM-03** Cada recepción genera movimiento `ENTRADA` hacia `CENTRAL/CRUDO`.
- **R-COM-04** Una compra con al menos un recibo no puede cancelarse (solo ajustarse).
- **R-COM-05** `cantidad_solicitada > 0` y `costo_unitario >= 0`.

## Inventario (R-INV)
- **R-INV-01** El saldo `inventario` es la suma neta de los movimientos de esa llave (variante/ubicación/estado/calidad).
- **R-INV-02** Solo los estados con `disponible_venta = true` (`LISTO`) cuentan como inventario vendible.
- **R-INV-03** Un producto en `CRUDO` existe físicamente pero **no** puede venderse ni transferirse a un vendedor.
- **R-INV-04** Todo ajuste manual exige un motivo y genera movimiento `AJUSTE`.
- **R-INV-05** No se permite una salida/transferencia que deje el saldo de origen negativo.

## Producción / maquila (R-PRO)
- **R-PRO-01** En el cierre de una orden: `Σ cantidades de entrada = Σ cantidades de resultado` (primera + segunda + merma).
- **R-PRO-02** La calidad (`PRIMERA/SEGUNDA/MERMA`) se asigna al registrar el resultado, no antes.
- **R-PRO-03** La merma se registra como resultado con calidad `MERMA` (no comercializable) y sigue contando en el balance para trazabilidad.
- **R-PRO-04** Solo se puede empacar (`TERMINADO → LISTO`) lo que tenga saldo en `TERMINADO`.
- **R-PRO-05** Una orden `CERRADA` no admite nuevos resultados.

## Distribución a vendedores (R-DIS)
- **R-DIS-01** Solo se transfiere inventario en estado `LISTO`.
- **R-DIS-02** El envío valida saldo suficiente en `CENTRAL`; el retorno valida saldo en el vendedor.
- **R-DIS-03** Al confirmar la transferencia, el saldo se mueve íntegro (resta origen, suma destino) en un solo movimiento por renglón.
- **R-DIS-04** Una transferencia `CONFIRMADA` no puede modificarse; correcciones se hacen con una transferencia inversa.

## Ventas (R-VEN)
- **R-VEN-01** Una venta solo puede incluir productos disponibles (`LISTO`) en el inventario del **vendedor que vende**.
- **R-VEN-02** La venta descuenta el inventario del vendedor de forma atómica junto con la creación de la factura y (si aplica) la cuenta por cobrar.
- **R-VEN-03** El precio unitario depende de la **calidad**: segunda calidad usa `precios(variante, SEGUNDA)`.
- **R-VEN-04** Toda venta genera una **factura PDF** con consecutivo único por tenant.
- **R-VEN-05** Una venta a `CREDITO` genera obligatoriamente una cuenta por cobrar por el total.
- **R-VEN-06** Anular una venta reversa inventario y cartera; no se permite si la cuenta ya tiene abonos (salvo política de nota de crédito futura).

## Cartera / cuentas por cobrar (R-CAR)
- **R-CAR-01** `saldo_pendiente = valor_original − total_abonado` y nunca es negativo.
- **R-CAR-02** Un abono no puede superar el saldo pendiente.
- **R-CAR-03** Estados: `PENDIENTE` (sin abonos) → `PARCIAL` (abonos < total) → `PAGADA` (saldo = 0).
- **R-CAR-04** Si `saldo_pendiente > 0` y `fecha_vencimiento < hoy`, el estado se marca `VENCIDA`.
- **R-CAR-05** Cada abono conserva fecha, monto, forma de pago y (opcional) comprobante.
- **R-CAR-06** El historial de abonos es inmutable; una corrección se hace con un abono negativo/nota justificada y auditada.

## Trazabilidad (R-TRA)
- **R-TRA-01** Toda operación conserva `doc_tipo` + `doc_id` que la originó.
- **R-TRA-02** Debe poder reconstruirse el recorrido de una variante: compra → recepción → producción → distribución → venta → cartera → pago.

## Validaciones de entrada (UI + zod)
| Campo | Validación |
|-------|-----------|
| Cantidades | entero > 0 |
| Precios / montos | numérico >= 0, máx 2 decimales |
| Fechas | válidas; recepción/abono no futuras (configurable) |
| Selección de producto en venta | debe tener saldo disponible del vendedor |
| Documento cliente/proveedor | requerido y con formato válido |
| Consecutivos (compra, factura, orden) | únicos por tenant |
| Días de crédito | entero >= 0 |
