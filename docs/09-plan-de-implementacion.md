# 09 · Plan de implementación por fases

> Orden de prioridad del cliente: **INVENTARIO → PRODUCCIÓN/MAQUILA → DISTRIBUCIÓN → VENTA A CRÉDITO → CARTERA**. Se entrega valor funcional en cada fase (SDD: specify → plan → tasks → implement).

## Fase 0 · Fundaciones (setup)
**Objetivo:** repositorio, entornos y esqueleto listos.
- T0.1 Crear repo en GitHub + estructura (`docs/`, `supabase/`, `src/`, `tests/`).
- T0.2 Crear proyectos Supabase (dev/prod) + Supabase CLI y migraciones.
- T0.3 Inicializar Next.js + TypeScript + Tailwind + shadcn/ui; conectar Vercel.
- T0.4 Configurar Supabase Auth y tabla `usuarios`; generar tipos TS.
- T0.5 Migración base multi-tenant: `tenants`, `usuarios`, RLS y `seed.sql` de catálogos (`estados_inventario`, `calidades`, `tallas`, `colores`, `tipos_producto`, `procesos_produccion`, `ubicaciones` con CENTRAL).
- T0.6 Pipeline CI (`ci.yml`) con lint + tests.
**Criterio de aceptación:** login funcional, RLS activa, deploy a Vercel en verde, seed carga catálogos.

## Fase 1 · Catálogos + Compras + Inventario base ⭐
**Objetivo:** registrar compras, recibir (parcial) y ver saldo en CRUDO.
- T1.1 CRUD Productos y Variantes (SKU) + Precios por calidad.
- T1.2 CRUD Proveedores.
- T1.3 Compras (crear, listar, pendientes por recibir).
- T1.4 RPC `sp_recibir_mercancia` + tablas `recibos`.
- T1.5 Tablas `inventario` + `movimientos_inventario` + vista `v_inventario_disponible`.
- T1.6 Pantalla de saldos de inventario por estado/calidad/ubicación.
- T1.7 RPC `sp_ajustar_inventario`.
- **Pruebas:** TC-COM-01..04, TC-INV-01..04.
**Criterio de aceptación:** una compra recibida parcialmente refleja saldo correcto en CENTRAL/CRUDO y no aparece como vendible.

## Fase 2 · Producción / maquila y calidad ⭐
**Objetivo:** transformar CRUDO en TERMINADO con calidades y empacar a LISTO.
- T2.1 CRUD Órdenes de producción + entradas.
- T2.2 RPC `sp_ejecutar_produccion` (balance + resultados por calidad).
- T2.3 RPC `sp_empacar` (TERMINADO → LISTO).
- T2.4 Vista/pantalla de trazabilidad de lote.
- **Pruebas:** TC-PRO-01..05.
**Criterio de aceptación:** el ejemplo 50 → 48 PRIMERA + 2 SEGUNDA cuadra y quedan disponibles tras empacar.

## Fase 3 · Distribución a vendedores ⭐
**Objetivo:** enviar/retornar inventario y consultarlo por vendedor.
- T3.1 CRUD Vendedores (+ ubicación tipo VENDEDOR) y Clientes.
- T3.2 Transferencias (ENVIO/RETORNO) + detalle.
- T3.3 RPC `sp_transferir_inventario`.
- T3.4 Vista `v_inventario_por_vendedor` + pantalla "Inventario del vendedor".
- **Pruebas:** TC-DIS-01..04.
**Criterio de aceptación:** el saldo del vendedor sube al enviar, baja al retornar, y se responde cuánto/qué tiene.

## Fase 4 · Ventas a crédito + factura PDF ⭐
**Objetivo:** vender desde el inventario del vendedor y emitir factura PDF.
- T4.1 Pantalla POS de venta (selección de cliente y productos disponibles).
- T4.2 RPC `sp_registrar_venta` (atómica: venta + inventario + factura + CxC).
- T4.3 Generación de factura PDF + Supabase Storage + descarga firmada.
- T4.4 RPC `sp_anular_venta`.
- **Pruebas:** TC-VEN-01..06.
**Criterio de aceptación:** venta a crédito de 10 uds descuenta inventario, emite PDF y crea la cuenta por cobrar.

## Fase 5 · Cartera / cuentas por cobrar ⭐
**Objetivo:** gestionar abonos parciales y estados de cuenta.
- T5.1 Pantalla de cartera (por cliente/vendedor/factura) + estados y vencimiento.
- T5.2 RPC `sp_registrar_abono` + historial de abonos.
- T5.3 Comprobantes de abono en Storage.
- T5.4 Job/consulta de cuentas `VENCIDA`.
- **Pruebas:** TC-CAR-01..06.
**Criterio de aceptación:** la secuencia 100k/200k/400k lleva la cuenta a `PAGADA` y refleja saldos e historial.

## Fase 6 · Reportes y trazabilidad
**Objetivo:** visibilidad de negocio.
- T6.1 Reporte de inventario (estado, vendedor, producto, referencia, talla, color).
- T6.2 Reporte de ventas por vendedor y municipio.
- T6.3 Reporte de cartera por cliente/vendedor/factura (edades de saldo).
- T6.4 Trazabilidad compra → pago.
- **Pruebas:** TC-PRO-05, TC-E2E-01.
**Criterio de aceptación:** los reportes cuadran con los movimientos y con el caso canónico.

## Fase 7 · Endurecimiento y salida a producción
- T7.1 Roles/permisos finos (admin/produccion/vendedor).
- T7.2 Auditoría de cartera; backups; monitoreo.
- T7.3 Pruebas e2e completas (Playwright) + performance básica.
- T7.4 Documentación de usuario y despliegue productivo.

---

## Cronograma sugerido (referencial)

| Fase | Alcance | Estimación |
|------|---------|-----------|
| 0 | Fundaciones | 1 semana |
| 1 | Catálogos + Compras + Inventario | 2 semanas |
| 2 | Producción/maquila | 1.5 semanas |
| 3 | Distribución | 1.5 semanas |
| 4 | Ventas + PDF | 2 semanas |
| 5 | Cartera | 1.5 semanas |
| 6 | Reportes | 1 semana |
| 7 | Endurecimiento | 1 semana |

> Ajustable según dedicación. Cada fase termina con su set de pruebas verde y un deploy a Vercel.

## Descomposición SDD por tarea
Cada tarea (`Tx.y`) se convierte en un issue de GitHub con: descripción, historias relacionadas (`05`), reglas (`07`), pruebas (`08`) y DoR/DoD (`00`). Se implementa una tarea a la vez, ejecutando el set de regresión en cada PR.

## Entregables por fase
- Migraciones SQL versionadas (`supabase/migrations/`).
- Pantallas Next.js desplegadas en Vercel (preview por PR).
- Pruebas automatizadas verdes.
- Actualización de esta documentación si cambia el alcance (fuente única de verdad).
