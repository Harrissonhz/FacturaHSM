-- =====================================================================
-- FacturacionHSM · Migración 0003 · VISTAS de reportes / trazabilidad
-- =====================================================================

-- Inventario disponible (solo estados con disponible_venta = true)
create or replace view public.v_inventario_disponible as
select i.tenant_id, i.variante_id, v.sku, v.referencia,
       i.ubicacion_id, u.nombre as ubicacion, u.tipo as ubicacion_tipo,
       i.calidad_id, c.codigo as calidad, i.cantidad
from public.inventario i
join public.estados_inventario e on e.id = i.estado_id
join public.variantes v on v.id = i.variante_id
join public.ubicaciones u on u.id = i.ubicacion_id
join public.calidades c on c.id = i.calidad_id
where e.disponible_venta = true and i.cantidad > 0;

-- Inventario por vendedor (todas las cantidades por variante/calidad/estado)
create or replace view public.v_inventario_por_vendedor as
select ven.tenant_id, ven.id as vendedor_id, ven.nombre as vendedor, ven.municipio,
       i.variante_id, v.sku, v.referencia,
       col.nombre as color, t.nombre as talla,
       est.codigo as estado, cal.codigo as calidad, i.cantidad
from public.vendedores ven
join public.ubicaciones u on u.vendedor_id = ven.id
join public.inventario i on i.ubicacion_id = u.id
join public.variantes v on v.id = i.variante_id
join public.colores col on col.id = v.color_id
join public.tallas t on t.id = v.talla_id
join public.estados_inventario est on est.id = i.estado_id
join public.calidades cal on cal.id = i.calidad_id
where i.cantidad > 0;

-- Trazabilidad de una variante (todos los movimientos, ordenados)
create or replace view public.v_trazabilidad_variante as
select m.tenant_id, m.variante_id, v.sku, m.fecha, m.tipo,
       uo.nombre as origen, eo.codigo as estado_origen, co.codigo as calidad_origen,
       ud.nombre as destino, ed.codigo as estado_destino, cd.codigo as calidad_destino,
       m.cantidad, m.doc_tipo, m.doc_id
from public.movimientos_inventario m
join public.variantes v on v.id = m.variante_id
left join public.ubicaciones uo on uo.id = m.ubicacion_origen_id
left join public.ubicaciones ud on ud.id = m.ubicacion_destino_id
left join public.estados_inventario eo on eo.id = m.estado_origen_id
left join public.estados_inventario ed on ed.id = m.estado_destino_id
left join public.calidades co on co.id = m.calidad_origen_id
left join public.calidades cd on cd.id = m.calidad_destino_id
order by m.fecha;

-- Cartera por cliente/vendedor/factura
create or replace view public.v_cartera_cliente as
select cxc.tenant_id, cxc.id as cuenta_id, cl.nombre as cliente, ven.nombre as vendedor,
       f.numero as factura, cxc.fecha_venta, cxc.fecha_vencimiento,
       cxc.valor_original, cxc.total_abonado, cxc.saldo_pendiente,
       case when cxc.saldo_pendiente > 0 and cxc.fecha_vencimiento < current_date
            then 'VENCIDA' else cxc.estado end as estado_calculado
from public.cuentas_por_cobrar cxc
join public.clientes cl on cl.id = cxc.cliente_id
join public.vendedores ven on ven.id = cxc.vendedor_id
join public.facturas f on f.id = cxc.factura_id;

-- Ventas por municipio y vendedor
create or replace view public.v_ventas_por_municipio as
select ve.tenant_id, ve.municipio, ven.nombre as vendedor,
       count(*) as num_ventas, sum(ve.total) as total_vendido
from public.ventas ve
join public.vendedores ven on ven.id = ve.vendedor_id
where ve.estado = 'CONFIRMADA'
group by ve.tenant_id, ve.municipio, ven.nombre;

-- =====================================================================
-- FIN MIGRACIÓN 0003 (vistas)
-- =====================================================================
