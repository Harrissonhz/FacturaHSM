# 16 · Carga de inventario inicial

> Documenta el proceso y el script usado para cargar el inventario inicial con el que HSM Family Sport arrancó operación. Script: `docs/CargarInventarioInicial.sql`.

## 1. Contexto

Antes de iniciar operación en vivo, se cargó el inventario físico existente que el cliente tenía en bodega. Los datos provienen del archivo del cliente **"CUADRO HARRISON (1).xlsx"** (hoja "INVENTARIO SEPTIEMBRE 14").

- **Fecha de carga:** septiembre 2026.
- **Estado en que entra:** todo el inventario inicial se cargó como **CENTRAL / LISTO / PRIMERA calidad** (disponible para venta inmediata), acorde con la decisión de Fase 1 (inventario central compartido).

## 2. Enfoque técnico (por qué así)

No se hizo un INSERT "crudo" solo a la tabla `inventario`. Cada línea:
1. Inserta/actualiza el saldo en `public.inventario` (CENTRAL / LISTO / PRIMERA).
2. Genera un **movimiento `ENTRADA`** en `public.movimientos_inventario` con `doc_tipo = 'INVENTARIO_INICIAL'`.

Esto **preserva la trazabilidad** (Constitución Art. 2: todo saldo tiene su respaldo en el libro mayor de movimientos). Así, el inventario inicial queda auditables como cualquier otra entrada.

> Nota: se optó por INSERT directo + movimiento (en lugar de la RPC `sp_ajustar_inventario`) porque es una carga masiva puntual y controlada; el resultado es equivalente y trazable.

## 3. Totales cargados

| Producto | Unidades |
|----------|----------|
| BASICA DAMA 200 GR | 224 (102 en S/M + 122 en L/XL) |
| OVERSIZE LARGA 200 GR | 71 (talla Única) |
| OVERSIZE CORTA 200 GR | 95 (talla Única) |
| CAMISA HOMBRE 240 GR | 149 |
| **TOTAL** | **539 unidades** |

Los totales coinciden exactamente con los del archivo del cliente.

## 4. Nota sobre la variante CH-CAQ-L

El Excel incluía **1 unidad de CAMISA HOMBRE / Caqui / L**, pero esa variante no existía (la camisa de hombre no se creó con color caqui en el catálogo). El script:
- Carga 538 unidades en el bloque principal (reportando `CH-CAQ-L` como faltante).
- Incluye un **bloque opcional** que crea la variante `CH-CAQ-L` (precio $45.000) y carga esa unidad → total **539**.

**Decisión tomada:** se ejecutó el bloque opcional, por lo que la variante `CH-CAQ-L` existe y el total quedó en **539 unidades**.

## 5. Ubicación del script

```
FacturacionHSM/docs/CargarInventarioInicial.sql
```

## 6. Requisitos y orden de ejecución

Este script se ejecuta **una sola vez**, en este orden dentro de la puesta en marcha:

1. Crear base de datos (scripts `01`–`05`).
2. Crear usuario admin y editar `empresa_config`.
3. Crear productos, tallas, colores y variantes (`crear_productos_HSM_con_precios.sql`).
4. **Cargar inventario inicial** (`CargarInventarioInicial.sql`). ← este paso.

> ⚠️ Re-ejecutarlo duplicaría los movimientos de inventario. Ejecutar solo una vez.

## 7. Verificación

El script termina mostrando:
- `total_unidades` (esperado: 539).
- Detalle por producto (224 / 71 / 95 / 149).

También se puede validar visualmente en la app: **Inventario** (existencias) e **Inventario → Hoja de conteo** (para cotejar contra el físico).
