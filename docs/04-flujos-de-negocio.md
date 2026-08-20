# 04 · Flujos de negocio

> Como el sistema es **nuevo**, "flujo actual" describe cómo opera hoy el negocio (manual/informal) y "flujo propuesto" cómo lo hará FacturacionHSM.

## 1. Flujo actual (operación del negocio hoy)

| Proceso | Cómo funciona hoy |
|---------|-------------------|
| **Compras** | El dueño compra camisas básicas a proveedores; a veces la mercancía llega en varias entregas. Control manual. |
| **Recepción** | Se cuentan las prendas al llegar; no hay registro sistemático de pendientes por recibir. |
| **Inventario** | Se lleva de forma informal; no distingue crudo vs. terminado ni primera vs. segunda calidad. |
| **Producción** | Las prendas se mandan a estampar/bordar; el conteo de resultados (buenas/averiadas) no queda registrado formalmente. |
| **Distribución** | Se entregan prendas a vendedores sin un control preciso de cuánto tiene cada uno. |
| **Ventas** | Los vendedores venden a crédito en municipios; las facturas y saldos se llevan en cuadernos o planillas. |
| **Cartera** | Los abonos se anotan manualmente; es difícil conocer el saldo real y el histórico por cliente. |

**Problemas actuales:** falta de trazabilidad, no se sabe cuánto inventario tiene cada vendedor, difícil control de cartera, sin diferenciación de calidad ni de estados.

## 2. Flujo propuesto de COMPRA y RECEPCIÓN (recibos parciales)

```
1. Crear compra (proveedor + variantes + cantidades + costo) → estado PENDIENTE
2. Llega mercancía → registrar RECIBO (total o parcial)
   - Ej: se pidieron 50; llegan 30 → recibo de 30
   - compras_detalle.cantidad_recibida = 30 ; pendiente = 20
   - compra queda en estado PARCIAL
   - Movimiento ENTRADA → CENTRAL / CRUDO / (calidad inicial)
3. Llega el resto (20) → nuevo RECIBO
   - recibida = 50 ; pendiente = 0 ; compra = RECIBIDA
   - Movimiento ENTRADA por 20 → CENTRAL / CRUDO
```
**Regla:** no se puede recibir más de lo pendiente. La compra pasa a `RECIBIDA` solo cuando todo el detalle está completo.

## 3. Flujo propuesto de INVENTARIO por estados

El inventario vive como saldo por `variante × ubicación × estado × calidad`. Los estados forman un flujo:

```
CRUDO ──(orden de producción)──► EN_PRODUCCION ──(cierre)──► TERMINADO ──(empaque)──► LISTO
```

- Solo el estado `LISTO` tiene `disponible_venta = true`.
- Una unidad en `CRUDO` existe físicamente pero **no** es vendible.
- Cada cambio de estado genera un **movimiento** (`TRANSFORMACION`).

## 4. Flujo propuesto de PRODUCCIÓN / MAQUILA

```
1. Crear orden de producción (proceso = ESTAMPACION) → ABIERTA
2. Cargar ENTRADAS: 50 uds variante X, desde CRUDO/PRIMERA (provisional)
   → movimiento saca 50 de CENTRAL/CRUDO y las pone en EN_PRODUCCION
3. Ejecutar / cerrar producción con RESULTADOS por calidad:
   - 48 → TERMINADO / PRIMERA
   -  2 → TERMINADO / SEGUNDA
   -  0 → MERMA (si hubiera)
   VALIDACIÓN: Σ entradas (50) = Σ resultados (48+2+0)
4. Empaque: TERMINADO → LISTO (movimiento TRANSFORMACION)
   Ahora 48 PRIMERA y 2 SEGUNDA quedan disponibles para venta.
```

**Trazabilidad del ejemplo de 50 unidades** — el sistema puede responder en todo momento:
| Pregunta | Fuente |
|----------|--------|
| ¿Cuántas en crudo / producción / terminadas? | saldo `inventario` por estado |
| ¿Cuántas primera / segunda / merma? | saldo `inventario` por calidad |
| ¿Cuántas listas para venta? | `v_inventario_disponible` |
| ¿Cuántas entregadas a vendedores / vendidas / disponibles? | movimientos + saldos por ubicación |

## 5. Flujo propuesto de DISTRIBUCIÓN a vendedores

```
1. Crear TRANSFERENCIA tipo ENVIO: origen CENTRAL → destino Vendedor A
2. Detalle: 30 uds variante X, calidad PRIMERA, estado LISTO
3. Confirmar → movimiento TRANSFERENCIA:
   - resta 30 de CENTRAL/LISTO/PRIMERA
   - suma  30 a  VENDEDOR_A/LISTO/PRIMERA
4. El saldo por vendedor queda actualizado.
```

**Retorno de viaje (unidades no vendidas):**
```
1. Vendedor A regresa con 5 uds sin vender
2. Crear TRANSFERENCIA tipo RETORNO: origen Vendedor A → destino CENTRAL
3. Confirmar → mueve 5 de VENDEDOR_A/LISTO → CENTRAL/LISTO
   Las 5 vuelven a estar disponibles en el inventario central.
```

El sistema responde por vendedor: cuánto recibió, cuánto vendió, cuánto tiene, qué referencias/tallas/colores, primera vs. segunda, e historial de movimientos.

## 6. Flujo propuesto de VENTA a crédito

```
1. Vendedor A selecciona cliente (Jericó) y productos (10 uds var X, PRIMERA)
2. Sistema valida disponibilidad en el inventario del Vendedor A
3. Confirmar venta (tipo_pago = CREDITO) → RPC atómica:
   a. Crea venta + ventas_detalle (total $700.000)
   b. Movimiento SALIDA: 10 uds de VENDEDOR_A/LISTO/PRIMERA (48→38)
   c. Genera FACTURA (consecutivo) + PDF
   d. Crea CUENTA POR COBRAR: valor_original=700.000, saldo=700.000, estado PENDIENTE
4. Descarga/entrega la factura PDF al cliente.
```

Si la venta es de **segunda calidad**, se usa el precio de `precios(variante, SEGUNDA)`.

## 7. Flujo propuesto de CARTERA (abonos parciales)

```
Cuenta creada: valor 700.000 · abonado 0 · saldo 700.000 · PENDIENTE
  Abono 1: 100.000 (efectivo)  → abonado 100.000 · saldo 600.000 · PARCIAL
  Abono 2: 200.000 (consignac.) → abonado 300.000 · saldo 400.000 · PARCIAL
  Abono 3: 400.000 (efectivo)  → abonado 700.000 · saldo 0       · PAGADA
```
**Reglas:** un abono nunca supera el saldo pendiente; al llegar a saldo 0 la cuenta pasa a `PAGADA`; si `fecha_vencimiento < hoy` y saldo > 0 → `VENCIDA`.

## 8. Trazabilidad end-to-end (cadena completa)

```
Compra 50 → Recepción 50 → CRUDO 50 → Producción → TERMINADO(48 P + 2 S) →
LISTO → Distribución (A:30, B:20) → Venta A→Cliente X: 10 (A:30→20) →
Factura $700.000 → CxC $700.000 → Abono 100k (saldo 600k) →
Abono 200k (saldo 400k) → Pago 400k (PAGADA)
```

Cada flecha corresponde a uno o más **movimientos** en `movimientos_inventario` (para inventario) o a registros en `ventas/facturas/cuentas_por_cobrar/abonos` (para el ciclo comercial), todos enlazados por `doc_tipo`/`doc_id`, garantizando auditoría total.

## 9. Diagrama de estados

**Compra:** `PENDIENTE → PARCIAL → RECIBIDA` (o `CANCELADA`)
**Orden de producción:** `ABIERTA → EN_PROCESO → CERRADA` (o `CANCELADA`)
**Transferencia:** `BORRADOR → CONFIRMADA`
**Venta:** `CONFIRMADA → ANULADA`
**Cuenta por cobrar:** `PENDIENTE → PARCIAL → PAGADA`; y `PENDIENTE/PARCIAL → VENCIDA` si pasa el vencimiento.
**Inventario (estado de unidad):** `CRUDO → EN_PRODUCCION → TERMINADO → LISTO`
**Calidad (condición):** `PRIMERA` | `SEGUNDA` | `MERMA` (asignada al cerrar producción).
