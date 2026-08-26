-- =====================================================================
-- FacturacionHSM · RESET PARA PRODUCCIÓN (script oficial de limpieza)
-- =====================================================================
-- USO: Ejecutar cuando el usuario dé luz verde para iniciar operación
--      en vivo, para borrar los datos de PRUEBA que ingresó durante la
--      validación del MVP y dejar la base 100% limpia.
--
-- Este es el mismo script que ya se validó con éxito.
--
-- QUÉ BORRA:
--   - Todo lo transaccional (ventas, compras, producción, transferencias,
--     cartera, abonos, facturas, recibos, inventario, movimientos).
--   - Datos maestros: productos, variantes, precios, clientes,
--     proveedores, vendedores y sus ubicaciones VENDEDOR.
--
-- QUÉ CONSERVA:
--   - Tenant, usuarios (login), empresa_config (datos de tu empresa),
--     ubicación CENTRAL y catálogos base (estados, calidades, tallas,
--     colores, procesos, tipos_producto).
--
-- CÓMO EJECUTAR:
--   1. (Recomendado) Backup en Supabase → Database → Backups.
--   2. Copia TODO este archivo y pégalo en el SQL Editor.
--   3. Ejecuta de UNA SOLA VEZ (no por partes; el orden importa).
--   4. NO necesitas commit; cada sentencia se guarda de inmediato.
--   5. Revisa la verificación del final: todo en 0 excepto lo conservado.
-- =====================================================================

-- ---- 1) TRANSACCIONAL (hijos antes que padres) ----
delete from public.abonos;
delete from public.cuentas_por_cobrar;
delete from public.facturas;
delete from public.ventas_detalle;
delete from public.ventas;                    -- referencia clientes y vendedores

delete from public.transferencias_detalle;
delete from public.transferencias;

delete from public.ordenes_produccion_resultado;
delete from public.ordenes_produccion_detalle;
delete from public.ordenes_produccion;

delete from public.recibos_detalle;
delete from public.recibos;
delete from public.compras_detalle;
delete from public.compras;

delete from public.movimientos_inventario;
delete from public.inventario;

-- ---- 2) CLIENTES (referencian a vendedores -> van ANTES) ----
delete from public.clientes;

-- ---- 3) CATÁLOGO DE PRODUCTOS ----
delete from public.precios;
delete from public.variantes;
delete from public.productos;

-- ---- 4) PROVEEDORES ----
delete from public.proveedores;

-- ---- 5) VENDEDORES <-> UBICACIONES (soltar AMBOS vínculos cruzados) ----
update public.usuarios    set vendedor_id  = null where vendedor_id  is not null;
update public.vendedores  set ubicacion_id = null where ubicacion_id is not null;
update public.ubicaciones set vendedor_id  = null where vendedor_id  is not null;
delete from public.vendedores;
delete from public.ubicaciones where tipo = 'VENDEDOR';

-- ---- VERIFICACIÓN ----
select 'ventas' t, count(*) n from public.ventas
union all select 'clientes', count(*) from public.clientes
union all select 'productos', count(*) from public.productos
union all select 'variantes', count(*) from public.variantes
union all select 'precios', count(*) from public.precios
union all select 'proveedores', count(*) from public.proveedores
union all select 'vendedores', count(*) from public.vendedores
union all select 'inventario', count(*) from public.inventario
union all select 'ubicaciones (total)', count(*) from public.ubicaciones
union all select 'ubicaciones CENTRAL', count(*) from public.ubicaciones where tipo='CENTRAL'
union all select 'usuarios (se conservan)', count(*) from public.usuarios
union all select 'empresa_config (se conserva)', count(*) from public.empresa_config;

-- =====================================================================
-- RESULTADO ESPERADO:
--   ventas, clientes, productos, variantes, precios, proveedores,
--   vendedores, inventario ............... = 0
--   ubicaciones (total) = 1  ·  ubicaciones CENTRAL = 1
--   usuarios > 0  ·  empresa_config = 1
-- =====================================================================
