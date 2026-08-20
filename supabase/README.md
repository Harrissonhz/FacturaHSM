# Base de datos · FacturacionHSM (Supabase)

> La base de datos **inicia desde cero**. **No existen datos originales que migrar.** El seed solo carga catálogos parametrizables (estados, calidades, tallas, colores, procesos y la ubicación CENTRAL), nunca datos de negocio.

## Orden de ejecución de las migraciones

Ejecuta los archivos de `migrations/` **en orden numérico**:

| Orden | Archivo | Qué hace |
|-------|---------|----------|
| 1 | `20260820_0001_schema.sql` | Crea todas las tablas, constraints e índices. |
| 2 | `20260820_0002_functions.sql` | Crea las funciones RPC transaccionales (venta, abono, recepción, producción, transferencia, ajuste). |
| 3 | `20260820_0003_views.sql` | Crea las vistas de reportes y trazabilidad. |
| 4 | `20260820_0004_rls.sql` | Habilita Row Level Security (aislamiento multi-tenant). |
| 5 | `20260820_0005_seed_catalogos.sql` | Carga catálogos base para un tenant. |

## Opción A — Supabase CLI (recomendado)

```bash
# 1. Instalar la CLI (una sola vez)
npm i -g supabase

# 2. Iniciar sesión y enlazar tu proyecto
supabase login
supabase link --project-ref <TU_PROJECT_REF>

# 3. Colocar los .sql en supabase/migrations (ya lo están) y aplicar
supabase db push
```

Para desarrollo local con Docker:
```bash
supabase start          # levanta Postgres local
supabase db reset       # aplica migraciones + seed desde cero
```

## Opción B — SQL Editor del panel de Supabase

1. Entra a tu proyecto → **SQL Editor**.
2. Copia y ejecuta el contenido de cada archivo **en orden** (0001 → 0005).
3. Verifica en **Table Editor** que las tablas y catálogos se crearon.

## Opción C — psql

```bash
psql "$SUPABASE_DB_URL" -f migrations/20260820_0001_schema.sql
psql "$SUPABASE_DB_URL" -f migrations/20260820_0002_functions.sql
psql "$SUPABASE_DB_URL" -f migrations/20260820_0003_views.sql
psql "$SUPABASE_DB_URL" -f migrations/20260820_0004_rls.sql
psql "$SUPABASE_DB_URL" -f migrations/20260820_0005_seed_catalogos.sql
```

## Después de aplicar

1. **Crear el primer usuario admin:** registra un usuario en Supabase Auth y luego inserta su perfil enlazándolo al tenant:
   ```sql
   insert into public.usuarios (id, tenant_id, nombre, rol)
   values ('<auth_user_uuid>', (select id from public.tenants where nombre='HSM'), 'Admin HSM', 'admin');
   ```
2. **Storage:** crea dos buckets privados: `facturas` y `comprobantes`.
3. **Generar tipos TS** para el frontend:
   ```bash
   supabase gen types typescript --linked > ../src/types/database.ts
   ```

## Notas de diseño (resumen)

- **Inventario = saldo (`inventario`) + libro mayor inmutable (`movimientos_inventario`)**. Nunca se edita un movimiento.
- Las escrituras de inventario/cartera **solo** ocurren vía funciones RPC (`security definer`), que garantizan atomicidad y validan el tenant.
- **Estado (etapa)** y **calidad (condición)** son catálogos independientes.
- **RLS** aísla cada tenant. El `tenant_id` del usuario se resuelve con `fn_current_tenant()`.
- Importes en `numeric(14,2)`; cantidades enteras `>= 0` (nunca negativas).

## Rollback / reinicio total (⚠️ borra todo)

Solo para entornos de desarrollo:
```sql
drop schema public cascade;
create schema public;
-- luego reaplica las migraciones desde 0001
```
