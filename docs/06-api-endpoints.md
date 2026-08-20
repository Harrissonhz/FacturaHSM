# 06 · APIs, servicios y funciones RPC

> Contratos API-first. Las operaciones que afectan inventario o cartera se ejecutan mediante **funciones RPC de Postgres** (transaccionales). El frontend consume estos servicios; nunca modifica saldos por su cuenta.

## 1. Convenciones

- Base: Next.js Route Handlers (`/app/api/...`) o Server Actions; ambos invocan Supabase (`supabase.rpc(...)` o `from(...)`).
- Autenticación: token de sesión Supabase. Autorización: rol + RLS por tenant.
- Errores estándar: `{ ok: false, error: { code, message } }`. Éxito: `{ ok: true, data }`.
- Validación de entrada con **zod** en la capa de servicios antes de llamar la RPC.
- Todas las escrituras registran `created_by = auth.uid()`.

## 2. Funciones RPC críticas (Postgres)

### `sp_recibir_mercancia(p_compra_id, p_items[])`
Registra un recibo (parcial o total).
- **Entrada:** `compra_id`, lista de `{ compra_detalle_id, cantidad }`.
- **Lógica (transacción):** valida `cantidad <= pendiente`; crea `recibos` + `recibos_detalle`; suma `cantidad_recibida`; recalcula estado de compra (`PARCIAL`/`RECIBIDA`); inserta movimiento `ENTRADA` → `CENTRAL/CRUDO/PRIMERA`; upsert de `inventario`.
- **Errores:** `RECIBO_EXCEDE_PENDIENTE`, `COMPRA_NO_PENDIENTE`.

### `sp_ejecutar_produccion(p_orden_id, p_resultados[])`
Cierra una orden de producción con resultados por calidad.
- **Entrada:** `orden_id`, entradas ya cargadas, `resultados[] = { variante_id, estado_destino_id, calidad_destino_id, cantidad }`.
- **Lógica:** valida `Σ entradas = Σ resultados`; inserta movimientos `TRANSFORMACION` (saca de `EN_PRODUCCION`, mete a `TERMINADO` con su calidad, incluida `MERMA`); actualiza saldos; cierra la orden.
- **Errores:** `BALANCE_NO_CUADRA`, `ORDEN_NO_ABIERTA`.

### `sp_empacar(p_variante_id, p_calidad_id, p_cantidad, p_ubicacion_id)`
Mueve `TERMINADO → LISTO`.
- **Lógica:** valida saldo en TERMINADO; movimiento `TRANSFORMACION`; ahora disponible para venta.

### `sp_transferir_inventario(p_transferencia_id)`
Confirma una transferencia (ENVIO o RETORNO).
- **Lógica:** por cada detalle valida saldo en origen (`LISTO`); movimiento `TRANSFERENCIA` (resta origen, suma destino); actualiza saldos; marca transferencia `CONFIRMADA`.
- **Errores:** `SALDO_INSUFICIENTE`, `TRANSFERENCIA_YA_CONFIRMADA`.

### `sp_registrar_venta(p_payload)`  ⭐ núcleo
Registra venta a crédito/contado de forma atómica.
- **Entrada:** `{ vendedor_id, cliente_id, tipo_pago, dias_credito, items[]={variante_id, calidad_id, cantidad, precio_unitario}, descuento }`.
- **Lógica (una sola transacción):**
  1. Valida disponibilidad en `ubicacion(vendedor)/LISTO/calidad` para cada ítem.
  2. Calcula subtotal/total.
  3. Inserta `ventas` + `ventas_detalle`.
  4. Movimiento `SALIDA` por cada ítem (descuenta inventario del vendedor).
  5. Inserta `facturas` (consecutivo por tenant).
  6. Si `tipo_pago = CREDITO`: inserta `cuentas_por_cobrar` (saldo = total, `fecha_vencimiento = fecha + dias_credito`).
  7. Devuelve `{ venta_id, factura_id, cuenta_id }`.
- **Errores:** `SALDO_INSUFICIENTE`, `CLIENTE_INVALIDO`, `SIN_ITEMS`.

### `sp_registrar_abono(p_cuenta_id, p_monto, p_forma_pago, p_comprobante_url)`
- **Lógica:** valida `monto <= saldo_pendiente`; inserta `abonos`; `total_abonado += monto`; `saldo_pendiente = valor_original − total_abonado`; estado → `PARCIAL` o `PAGADA`.
- **Errores:** `ABONO_EXCEDE_SALDO`, `CUENTA_YA_PAGADA`.

### `sp_anular_venta(p_venta_id, p_motivo)`
- **Lógica:** solo si la cuenta no tiene abonos (o política definida); reversa inventario (movimiento `REVERSO`/`ENTRADA`), anula factura y cuenta; marca venta `ANULADA`.

### `sp_ajustar_inventario(p_variante_id, p_ubicacion_id, p_estado_id, p_calidad_id, p_delta, p_motivo)`
- Ajuste manual auditable (movimiento `AJUSTE`). No permite dejar saldo negativo.

## 3. Endpoints REST (capa Next.js sobre las RPC)

| Método | Ruta | Descripción | RPC/Query |
|--------|------|-------------|-----------|
| POST | `/api/compras` | Crear compra | insert |
| POST | `/api/compras/:id/recibos` | Registrar recibo (parcial) | `sp_recibir_mercancia` |
| GET | `/api/compras?estado=PENDIENTE` | Listar/pendientes | query |
| POST | `/api/produccion` | Crear orden | insert |
| POST | `/api/produccion/:id/cerrar` | Cerrar con resultados | `sp_ejecutar_produccion` |
| POST | `/api/inventario/empacar` | TERMINADO→LISTO | `sp_empacar` |
| GET | `/api/inventario` | Saldos (filtros: ubicación, estado, calidad, variante) | vista |
| GET | `/api/inventario/trazabilidad/:varianteId` | Movimientos de una variante | `v_trazabilidad_variante` |
| POST | `/api/transferencias` | Crear transferencia | insert |
| POST | `/api/transferencias/:id/confirmar` | Confirmar envío/retorno | `sp_transferir_inventario` |
| GET | `/api/vendedores/:id/inventario` | Inventario del vendedor | `v_inventario_por_vendedor` |
| POST | `/api/ventas` | Registrar venta | `sp_registrar_venta` |
| GET | `/api/ventas/:id/factura` | Descargar factura PDF | Storage URL firmada |
| POST | `/api/ventas/:id/anular` | Anular venta | `sp_anular_venta` |
| GET | `/api/cartera` | Cartera (filtros cliente/vendedor/estado) | `v_cartera_cliente` |
| POST | `/api/cartera/:cuentaId/abonos` | Registrar abono | `sp_registrar_abono` |
| GET | `/api/reportes/ventas-municipio` | Ventas por municipio | `v_ventas_por_municipio` |

## 4. Ejemplo de contrato — Registrar venta

**Request** `POST /api/ventas`
```json
{
  "vendedor_id": "uuid",
  "cliente_id": "uuid",
  "tipo_pago": "CREDITO",
  "dias_credito": 30,
  "descuento": 0,
  "items": [
    { "variante_id": "uuid", "calidad_id": "uuid-PRIMERA", "cantidad": 10, "precio_unitario": 70000 }
  ]
}
```
**Response 200**
```json
{
  "ok": true,
  "data": {
    "venta_id": "uuid",
    "factura": { "id": "uuid", "numero": "FAC-000123", "pdf_url": "facturas/uuid.pdf" },
    "cuenta_por_cobrar": { "id": "uuid", "valor_original": 700000, "saldo_pendiente": 700000, "estado": "PENDIENTE" }
  }
}
```
**Response 409** (inventario insuficiente)
```json
{ "ok": false, "error": { "code": "SALDO_INSUFICIENTE", "message": "El vendedor no tiene 10 unidades LISTO/PRIMERA de la variante X." } }
```

## 5. Generación de la factura PDF (Server Action)
```
1. sp_registrar_venta devuelve venta_id + factura_id.
2. Cargar datos (venta, detalle, cliente, vendedor, tenant).
3. Renderizar PDF (@react-pdf/renderer) con plantilla corporativa.
4. Subir a Storage bucket privado 'facturas' → path = facturas/{tenant}/{factura_id}.pdf
5. Actualizar facturas.pdf_url.
6. Entregar URL firmada temporal para descarga.
```

## 6. Tipos TypeScript
Generar tipos desde Supabase (`supabase gen types typescript`) y ubicarlos en `src/types/database.ts` para tipar los servicios y componentes.
