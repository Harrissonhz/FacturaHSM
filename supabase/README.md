# Base de datos · FacturacionHSM (Supabase)

Scripts consolidados para crear TODA la base de datos desde cero. Incluyen **todos los cambios** aplicados durante las iteraciones (versión final de cada tabla y función).

## 🚀 Orden de ejecución (crear desde cero)

Ejecuta en el **SQL Editor de Supabase**, uno por uno, en este orden:

| # | Archivo | Qué hace |
|---|---------|----------|
| 1 | `migrations/01_schema.sql` | Todas las tablas, constraints e índices (incluye `empresa_config`, `productos.imagen_url`, `empresa_config.cuentas_bancarias`). |
| 2 | `migrations/02_functions.sql` | Todas las funciones RPC en su **versión final** (producción parcial, inventario central, zona horaria Colombia). |
| 3 | `migrations/03_views.sql` | Vistas de reportes y trazabilidad. |
| 4 | `migrations/04_rls.sql` | Row Level Security completo (tablas principales + detalle + empresa_config). |
| 5 | `migrations/05_seed.sql` | Catálogos base + `empresa_config` (con cuentas bancarias). |
| 6 | `migrations/06_post_instalacion.sql` | **Guía** de pasos manuales (crear usuario admin, editar empresa, asignar imágenes). No se corre de una vez; sigue cada bloque. |

## 🧹 Reset (para producción)

| Archivo | Cuándo usarlo |
|---------|---------------|
| `migrations/99_reset_datos.sql` | Cuando el cliente dé luz verde para operar en vivo: borra datos de prueba y deja la base lista. Conserva tenant, usuarios, empresa_config, CENTRAL y catálogos base. |

## 📋 Después de crear la base (pasos rápidos)

1. **Crear usuario admin:** Supabase → Authentication → Add user (marca "Auto Confirm User"). Luego, en SQL Editor, inserta su perfil (ver bloque A de `06_post_instalacion.sql`).
2. **Editar datos de la empresa:** el seed trae valores de ejemplo; edítalos con los reales (bloque B).
3. **Storage:** crea los buckets privados `facturas` y `comprobantes` si vas a usar PDF/comprobantes en Storage (opcional; hoy la factura es vista imprimible).
4. **Imágenes de producto:** crea los productos en la app y asigna `imagen_url` (bloque C), con las fotos en `public/productos/`.

## 🧠 Cambios acumulados que ya vienen incluidos

- **Tabla `empresa_config`** (emisor de factura) + campo `cuentas_bancarias`.
- **`productos.imagen_url`** (imagen del producto en el POS).
- **RLS de tablas de detalle** (compras, producción, transferencias).
- **`sp_anular_venta`** (no existía en la versión original).
- **`sp_ejecutar_produccion` final:** transformación directa CRUDO→TERMINADO (soporta producción parcial y calidades segunda/merma).
- **`sp_registrar_venta` final:** descuenta del inventario **CENTRAL compartido** (Fase 1, sin distribución) + fechas en **zona horaria Colombia**.
- **`sp_registrar_abono` final:** fecha en zona horaria Colombia.

## ⚠️ Notas
- Las funciones `sp_transferir_inventario` y las pantallas de Distribución/Retorno se conservan en la base (ocultas en la app en Fase 1). Reactivables en el futuro.
- Los campos `created_at` se guardan en UTC (auditoría); los campos `fecha` (date) reflejan el día en Colombia.
