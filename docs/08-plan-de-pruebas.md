# 08 · Plan de pruebas (set de regresión)

> **Este set debe ejecutarse SIEMPRE que se haga un cambio en el sistema**, antes de fusionar a `main`. Cada caso indica precondición, pasos y resultado esperado. Los casos e2e replican el caso canónico del negocio.

## 0. Estrategia de pruebas

| Nivel | Qué prueba | Herramienta sugerida |
|-------|-----------|----------------------|
| **Unitarias** | Cálculos puros (totales, saldos, estados) | Vitest / Jest |
| **Integración (DB)** | Funciones RPC y constraints en Postgres | pgTAP / Supabase test + seed |
| **API** | Contratos de endpoints (entrada/salida/errores) | Vitest + supertest |
| **E2E** | Flujos completos de usuario | Playwright |
| **Regresión** | Todo lo anterior en cada cambio (CI) | GitHub Actions |

**Regla de oro (Constitución Art. 7):** ningún merge sin pruebas verdes. Toda regla de negocio nueva nace con su caso de prueba.

---

## 1. Compras y recepción (TC-COM)

- **TC-COM-01 · Recibo parcial** — Pedido 50; recibir 30. → `cantidad_recibida=30`, pendiente=20, compra `PARCIAL`, +30 en `CENTRAL/CRUDO`.
- **TC-COM-02 · Completar recibo** — Sobre TC-COM-01 recibir 20. → recibida=50, pendiente=0, compra `RECIBIDA`, +20 más en CRUDO.
- **TC-COM-03 · Exceso rechazado** — Intentar recibir 60 de 50. → error `RECIBO_EXCEDE_PENDIENTE`; sin cambios de inventario.
- **TC-COM-04 · Cancelar compra con recibo** — Intentar cancelar compra con recibos. → rechazado.

## 2. Inventario por estados (TC-INV)

- **TC-INV-01 · No vendible en CRUDO** — Variante solo con saldo en CRUDO. → `v_inventario_disponible` = 0; no se puede vender.
- **TC-INV-02 · Saldo = movimientos** — Sumar movimientos de una llave. → igual al saldo en `inventario`.
- **TC-INV-03 · Saldo no negativo** — Forzar salida > saldo. → rechazado, saldo intacto.
- **TC-INV-04 · Ajuste auditable** — Ajuste −3 con motivo. → saldo −3 y movimiento `AJUSTE` registrado.

## 3. Producción / maquila (TC-PRO)

- **TC-PRO-01 · Balance correcto** — Entrada 50; resultados 48 PRIMERA + 2 SEGUNDA. → orden `CERRADA`; saldos: 48 TERMINADO/PRIMERA, 2 TERMINADO/SEGUNDA; CRUDO −50.
- **TC-PRO-02 · Balance con merma** — Entrada 50; 47 PRIMERA + 2 SEGUNDA + 1 MERMA. → cierra OK; MERMA no comercializable.
- **TC-PRO-03 · Balance no cuadra** — Entrada 50; resultados suman 49. → error `BALANCE_NO_CUADRA`.
- **TC-PRO-04 · Empaque** — Empacar 48 TERMINADO/PRIMERA → LISTO. → 48 disponibles para venta.
- **TC-PRO-05 · Trazabilidad de lote** — Consultar el recorrido de las 50 uds. → se ven crudo/producción/terminado/primera/segunda/merma/listas.

## 4. Distribución a vendedores (TC-DIS)

- **TC-DIS-01 · Envío** — Enviar 30 a Vendedor A (LISTO/PRIMERA). → CENTRAL −30, VENDEDOR_A +30.
- **TC-DIS-02 · Envío insuficiente** — Enviar 100 con saldo 48. → error `SALDO_INSUFICIENTE`.
- **TC-DIS-03 · Retorno** — Vendedor A retorna 5 sin vender. → VENDEDOR_A −5, CENTRAL +5.
- **TC-DIS-04 · Inventario por vendedor** — Consultar A. → muestra recibido, vendido, disponible por referencia/talla/color/calidad.

## 5. Ventas a crédito y factura (TC-VEN)

- **TC-VEN-01 · Venta descuenta inventario** — Vendedor A (48 disp.) vende 10. → 48→38; venta CONFIRMADA.
- **TC-VEN-02 · Factura PDF** — Tras la venta. → factura con consecutivo y PDF en Storage; descargable.
- **TC-VEN-03 · Genera cartera** — Venta a crédito $700.000. → CxC con saldo 700.000, estado `PENDIENTE`.
- **TC-VEN-04 · Venta sin saldo** — Vender 50 con 38 disponibles. → error `SALDO_INSUFICIENTE`; sin cambios.
- **TC-VEN-05 · Precio por calidad** — Vender 2 unidades SEGUNDA. → usa `precios(variante,SEGUNDA)`.
- **TC-VEN-06 · Atomicidad** — Forzar fallo al generar factura. → rollback total: no descuenta inventario ni crea cartera.

## 6. Cartera / abonos (TC-CAR)

- **TC-CAR-01 · Abono parcial 1** — Cuenta 700.000, abonar 100.000. → abonado 100.000, saldo 600.000, `PARCIAL`.
- **TC-CAR-02 · Abono parcial 2** — Abonar 200.000. → abonado 300.000, saldo 400.000, `PARCIAL`.
- **TC-CAR-03 · Pago total** — Abonar 400.000. → saldo 0, estado `PAGADA`.
- **TC-CAR-04 · Abono excede saldo** — Con saldo 400.000, abonar 500.000. → error `ABONO_EXCEDE_SALDO`.
- **TC-CAR-05 · Vencida** — Cuenta con saldo>0 y vencimiento pasado. → estado `VENCIDA` en el listado.
- **TC-CAR-06 · Comprobante** — Abono por consignación con archivo. → comprobante almacenado y consultable.

## 7. Seguridad / multi-tenant (TC-SEC)

- **TC-SEC-01 · Aislamiento** — Usuario del Tenant B consulta datos del Tenant A. → 0 filas (RLS).
- **TC-SEC-02 · Vendedor restringido** — Vendedor consulta cartera de otro vendedor. → sin acceso.
- **TC-SEC-03 · Rol** — Usuario `vendedor` intenta crear una compra. → denegado.

## 8. E2E — Caso canónico (TC-E2E-01) ⭐

Flujo completo que valida la Constitución de punta a punta:
```
1. Comprar 50 uds var X → recibir 50 → CENTRAL/CRUDO=50
2. Producir: 48 PRIMERA + 2 SEGUNDA → empacar → LISTO
3. Distribuir: A=30, B=20
4. Venta A→Cliente X: 10 uds crédito $700.000 → A: 30→20; factura PDF; CxC 700.000
5. Abonos: 100k, 200k, 400k → cuenta PAGADA
6. Verificar trazabilidad completa e integridad de saldos
```
**Esperado:** todos los saldos cuadran, la factura existe, la cuenta queda `PAGADA` y la trazabilidad reconstruye toda la cadena.

## 9. Integración continua (CI)

`.github/workflows/ci.yml` (esquema):
```yaml
name: ci
on: [pull_request, push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run test:db      # pgTAP contra Supabase local
      - run: npm run test:e2e     # Playwright
```
**Gate de merge:** todos los jobs en verde. Cobertura mínima sugerida: 80% en servicios y RPC.

## 10. Checklist de regresión manual (antes de release)
- [ ] Recibos parciales suman correctamente.
- [ ] CRUDO no aparece como disponible.
- [ ] Balance de producción cuadra (incl. merma).
- [ ] Transferencias mueven saldo exacto (envío y retorno).
- [ ] Venta descuenta inventario del vendedor y genera factura + cartera.
- [ ] Abonos actualizan saldo y estado; no exceden saldo.
- [ ] RLS aísla tenants; vendedor ve solo lo suyo.
- [ ] Reportes de inventario, ventas y cartera cuadran con los datos.
