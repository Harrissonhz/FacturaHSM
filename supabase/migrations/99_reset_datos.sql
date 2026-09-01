-- =====================================================================
-- FacturacionHSM · SCRIPT 99 · RESET DE DATOS (limpieza para producción)
-- =====================================================================
-- Borra todos los datos TRANSACCIONALES y MAESTROS DE PRUEBA, dejando la
-- base lista para operar. Conserva: tenant, usuarios, empresa_config,
-- ubicación CENTRAL y catálogos base (estados, calidades, tallas, colores,
-- tipos, procesos).
--
-- Sin transacción: cada sentencia se guarda de inmediato. Orden correcto
-- de dependencias (evita errores de FK).
--
-- ⚠️ USO: ejecutar cuando el usuario dé luz verde para operar en vivo,
-- para borrar los datos de prueba ingresados durante la validación.
-- Haz un backup antes por seguridad.
-- =====================================================================

-- 1) TRANSACCIONAL (hijos antes que padres)
delete from public.abonos;
delete from public.cuentas_por_cobrar;
delete from public.facturas;
delete from public.ventas_detalle;
delete from public.ventas;

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

-- 2) CLIENTES (referencian a vendedores -> antes que vendedores)
delete from public.clientes;

-- 3) CATÁLOGO DE PRODUCTOS
delete from public.precios;
delete from public.variantes;
delete from public.productos;

-- 4) PROVEEDORES
delete from public.proveedores;

-- 5) VENDEDORES <-> UBICACIONES (soltar ambos vínculos cruzados)
update public.usuarios    set vendedor_id  = null where vendedor_id  is not null;
update public.vendedores  set ubicacion_id = null where ubicacion_id is not null;
update public.ubicaciones set vendedor_id  = null where vendedor_id  is not null;
delete from public.vendedores;
delete from public.ubicaciones where tipo = 'VENDEDOR';

-- 6) VERIFICACIÓN
select 'ventas' t, count(*) n from public.ventas
union all select 'clientes', count(*) from public.clientes
union all select 'productos', count(*) from public.productos
union all select 'variantes', count(*) from public.variantes
union all select 'proveedores', count(*) from public.proveedores
union all select 'vendedores', count(*) from public.vendedores
union all select 'inventario', count(*) from public.inventario
union all select 'ubicaciones (total)', count(*) from public.ubicaciones
union all select 'ubicaciones CENTRAL', count(*) from public.ubicaciones where tipo='CENTRAL'
union all select 'usuarios (se conservan)', count(*) from public.usuarios
union all select 'empresa_config (se conserva)', count(*) from public.empresa_config;

-- Esperado: todo 0 excepto ubicaciones(total)=1, CENTRAL=1, usuarios>0, empresa_config=1.
-- =====================================================================
-- FIN SCRIPT 99 (reset)
-- =====================================================================
