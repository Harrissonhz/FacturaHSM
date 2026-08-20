# 10 · Riesgos y recomendaciones de escalabilidad

## 1. Riesgos técnicos

| ID | Riesgo | Impacto | Mitigación |
|----|--------|---------|-----------|
| RT-01 | Inconsistencia entre `inventario` (saldo) y `movimientos_inventario` (libro mayor). | Alto | Toda escritura vía RPC transaccional; job/consulta de reconciliación (Σ movimientos = saldo); pruebas TC-INV-02. |
| RT-02 | Condiciones de carrera al vender el mismo stock en paralelo. | Alto | Bloqueo de fila (`SELECT ... FOR UPDATE`) dentro de la RPC; validación de saldo dentro de la transacción. |
| RT-03 | Saldos negativos por lógica en el cliente. | Alto | Reglas solo en la base (constraints `>= 0` + RPC); el frontend nunca descuenta directo. |
| RT-04 | Fuga de datos entre tenants. | Crítico | RLS obligatoria en todas las tablas; pruebas TC-SEC-01/02. |
| RT-05 | Errores de redondeo monetario. | Medio | `numeric(14,2)`; nunca `float`; pruebas de cartera. |
| RT-06 | Falla al generar/guardar el PDF tras confirmar la venta. | Medio | Venta y factura atómicas; reintento de generación de PDF idempotente; PDF regenerable desde datos. |
| RT-07 | Migraciones que rompen datos existentes. | Medio | Migraciones versionadas y probadas en preview antes de prod; backups automáticos de Supabase. |
| RT-08 | Crecimiento de `movimientos_inventario`. | Bajo/Medio | Índices adecuados; particionado por fecha/tenant si crece mucho; vistas materializadas para reportes. |

## 2. Riesgos funcionales

| ID | Riesgo | Mitigación |
|----|--------|-----------|
| RF-01 | Confundir estado (etapa) con calidad. | Modelado independiente (Art. 1) + capacitación + validaciones. |
| RF-02 | Vendedores sin conectividad en campo (municipios). | Diseñar UI responsive y tolerante; evaluar modo offline/sincronización en fase futura. |
| RF-03 | Registro tardío de abonos (se anotan en papel primero). | Permitir fecha del abono distinta a la de captura; comprobante adjunto. |
| RF-04 | Merma no registrada correctamente. | Balance obligatorio en cierre de producción (R-PRO-01). |
| RF-05 | Numeración de factura duplicada. | Consecutivo único por tenant con constraint. |
| RF-06 | Anulaciones que descuadran cartera. | RPC `sp_anular_venta` con reverso controlado; bloqueo si hay abonos. |

## 3. Recomendaciones de escalabilidad y reutilización (SaaS Kubit)

1. **Todo por catálogo, nada quemado.** Estados, calidades, procesos y tipos de documento son parametrizables por tenant → otro cliente reutiliza el motor sin cambiar el esquema.
2. **Motor de inventario genérico.** El patrón "saldo + libro mayor por (variante × ubicación × estado × calidad)" sirve para cualquier negocio con transformación e inventario por etapas.
3. **Ubicaciones polimórficas.** `CENTRAL`/`VENDEDOR` hoy; mañana `BODEGA`, `PUNTO_VENTA`, `CONSIGNACION` sin cambiar el modelo.
4. **Reglas en la base de datos.** Mantener la lógica crítica en RPC de Postgres garantiza consistencia independientemente del cliente (web, móvil, API externa) que consuma.
5. **Multi-tenant desde el día 1.** Evita un refactor costoso al sumar clientes al SaaS.
6. **Contratos estables (API-first).** Versionar las RPC/endpoints permite evolucionar sin romper integraciones.
7. **Observabilidad.** El libro mayor de movimientos es la base de auditoría; añadir métricas de inventario y cartera para dashboards.
8. **Feature flags por tenant.** Activar/desactivar módulos (producción, cartera) según el cliente.
9. **Internacionalización/moneda.** Aislar formato de moneda y textos para futuros clientes.
10. **Estrategia de datos maestros.** Catálogos compartibles como plantillas al dar de alta un nuevo tenant (onboarding rápido).

## 4. Deuda técnica aceptable (consciente)
- Sin trazabilidad por pieza individual (se maneja por lote/movimiento) — suficiente para el caso actual.
- Sin factura electrónica DIAN — explícitamente fuera de alcance.
- Abonos sin conciliación bancaria automática — registro manual con comprobante.

## 5. Próximos pasos recomendados
1. Validar este diseño con el cliente (nombres definitivos de estados/calidades).
2. Crear el repo y ejecutar la **Fase 0**.
3. Descomponer la **Fase 1** en issues de GitHub siguiendo `09`.
4. Implementar tarea por tarea con el set de pruebas de `08` como gate.
