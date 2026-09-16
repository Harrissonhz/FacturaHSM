-- =====================================================================
-- FacturacionHSM · CARGA DE INVENTARIO INICIAL (Septiembre)
-- =====================================================================
-- Carga el inventario inicial en CENTRAL / LISTO / PRIMERA calidad.
-- Genera además un movimiento ENTRADA (doc_tipo = 'INVENTARIO_INICIAL')
-- por cada línea, para preservar la trazabilidad.
--
-- REQUISITOS:
--   - Ejecutar DESPUÉS de crear productos/variantes (crear_productos_HSM...).
--   - Ejecutar UNA sola vez (usa ON CONFLICT para no fallar si se repite,
--     pero re-ejecutar duplicaría los movimientos).
--
-- TOTALES ESPERADOS (según el Excel):
--   BASICA DAMA: 102 (S/M) + 122 (L/XL)
--   OVERSIZE LARGA: 71   ·   OVERSIZE CORTA: 95
--   CAMISA HOMBRE: 149   ·   GRAN TOTAL: 539
--
-- ⚠️ NOTA IMPORTANTE:
--   El inventario incluye 1 unidad de CAMISA HOMBRE / Caqui / L (CH-CAQ-L),
--   pero esa variante NO fue creada (camisa hombre no tenía color caqui).
--   Esa línea se REPORTA como faltante y NO se carga en este bloque.
--   Si quieres cargarla, ejecuta el BLOQUE OPCIONAL del final (crea la
--   variante y agrega la unidad). Sin ella se cargan 538 unidades.
-- =====================================================================

do $$
declare
  v_tenant   uuid;
  v_central  uuid;
  v_listo    uuid;
  v_primera  uuid;
  v_user     uuid;
  v_var      uuid;
  r          record;
  v_faltantes text := '';
  v_total    int := 0;
begin
  select id into v_tenant  from public.tenants where nombre='HSM' limit 1;
  if v_tenant is null then raise exception 'No existe el tenant HSM'; end if;

  select id into v_central from public.ubicaciones where tenant_id=v_tenant and tipo='CENTRAL' limit 1;
  select id into v_listo   from public.estados_inventario where tenant_id=v_tenant and codigo='LISTO' limit 1;
  select id into v_primera from public.calidades where tenant_id=v_tenant and codigo='PRIMERA' limit 1;

  -- Usuario para created_by de los movimientos (un admin)
  select id into v_user from public.usuarios where tenant_id=v_tenant and rol='admin' order by created_at limit 1;
  if v_user is null then select id into v_user from public.usuarios where tenant_id=v_tenant limit 1; end if;
  if v_user is null then raise exception 'No hay usuarios para asignar created_by'; end if;

  for r in
    select * from (values
      -- ===== BASICA DAMA (BD) · S/M y L/XL =====
      ('BD-BLA-SM',12),('BD-BLA-LXL',21),
      ('BD-BEI-SM', 9),('BD-BEI-LXL',15),
      ('BD-NEG-SM',15),('BD-NEG-LXL',19),
      ('BD-ROJ-SM',13),('BD-ROJ-LXL',11),
      ('BD-ROS-SM',10),('BD-ROS-LXL',11),
      ('BD-LIL-SM',10),('BD-LIL-LXL', 9),
      ('BD-AZC-SM', 9),('BD-AZC-LXL', 7),
      ('BD-VMI-SM', 6),('BD-VMI-LXL',13),
      ('BD-VSA-SM', 7),('BD-VSA-LXL', 4),
      ('BD-CAQ-SM', 5),('BD-CAQ-LXL', 4),
      ('BD-GRC-SM', 6),('BD-GRC-LXL', 8),
      -- ===== OVERSIZE LARGA (OL) · UNICA =====
      ('OL-BLA-U', 5),('OL-BEI-U',15),('OL-NEG-U',15),('OL-ROJ-U',11),
      ('OL-ROS-U', 6),('OL-LIL-U', 4),('OL-AZC-U', 8),('OL-VMI-U', 4),
      ('OL-CHO-U', 1),('OL-GRR-U', 2),
      -- ===== OVERSIZE CORTA (OC) · UNICA =====
      ('OC-BLA-U',18),('OC-BEI-U',15),('OC-NEG-U',17),('OC-ROJ-U',13),
      ('OC-ROS-U',11),('OC-LIL-U', 5),('OC-AZC-U', 5),('OC-VMI-U', 7),
      ('OC-GRC-U', 4),
      -- ===== CAMISA HOMBRE (CH) · S,M,L,XL,XXL =====
      ('CH-BLA-S', 2),('CH-BLA-M', 5),('CH-BLA-L', 6),('CH-BLA-XL', 8),('CH-BLA-XXL', 4),
      ('CH-BEI-S', 4),('CH-BEI-M', 6),('CH-BEI-L',14),('CH-BEI-XL', 5),('CH-BEI-XXL', 6),
      ('CH-NEG-S', 6),('CH-NEG-M', 6),('CH-NEG-L', 5),('CH-NEG-XL', 3),('CH-NEG-XXL', 6),
      ('CH-CHO-M', 3),('CH-CHO-L', 3),('CH-CHO-XL', 3),('CH-CHO-XXL', 3),
      ('CH-AZO-S', 2),('CH-AZO-M', 4),('CH-AZO-L', 4),('CH-AZO-XL', 4),('CH-AZO-XXL', 4),
      ('CH-GRC-S', 4),('CH-GRC-M', 6),('CH-GRC-L', 8),('CH-GRC-XL', 8),
      ('CH-VBO-L', 3),('CH-VBO-XL', 3)
    ) as t(sku, cant)
  loop
    select id into v_var from public.variantes where tenant_id=v_tenant and sku=r.sku limit 1;
    if v_var is null then
      v_faltantes := v_faltantes || r.sku || ' ';
      continue;
    end if;

    insert into public.inventario (tenant_id, variante_id, ubicacion_id, estado_id, calidad_id, cantidad)
    values (v_tenant, v_var, v_central, v_listo, v_primera, r.cant)
    on conflict (variante_id, ubicacion_id, estado_id, calidad_id)
    do update set cantidad = excluded.cantidad, updated_at = now();

    insert into public.movimientos_inventario
      (tenant_id, tipo, variante_id, ubicacion_destino_id, estado_destino_id, calidad_destino_id,
       cantidad, doc_tipo, doc_id, created_by)
    values
      (v_tenant, 'ENTRADA', v_var, v_central, v_listo, v_primera,
       r.cant, 'INVENTARIO_INICIAL', gen_random_uuid(), v_user);

    v_total := v_total + r.cant;
  end loop;

  if length(v_faltantes) > 0 then
    raise notice 'SKU no encontrados (no cargados): %', v_faltantes;
  end if;
  raise notice 'Inventario inicial cargado. Total unidades: %', v_total;
end$$;

-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- Total de unidades cargadas (esperado: 538 sin la caqui, 539 con ella)
select sum(cantidad) as total_unidades from public.inventario;

-- Detalle por producto
select p.nombre, sum(i.cantidad) as unidades
from public.inventario i
join public.variantes v on v.id = i.variante_id
join public.productos p on p.id = v.producto_id
group by p.nombre
order by p.nombre;

-- =====================================================================
-- BLOQUE OPCIONAL · Cargar CAMISA HOMBRE / Caqui / L (1 unidad)
-- La variante no existía; este bloque la crea y carga la unidad.
-- Descomenta y ejecuta SOLO si quieres incluir esa unidad (total 539).
-- =====================================================================
-- do $$
-- declare
--   v_tenant uuid; v_central uuid; v_listo uuid; v_primera uuid; v_user uuid;
--   v_prod uuid; v_color uuid; v_talla uuid; v_var uuid;
-- begin
--   select id into v_tenant from public.tenants where nombre='HSM' limit 1;
--   select id into v_central from public.ubicaciones where tenant_id=v_tenant and tipo='CENTRAL' limit 1;
--   select id into v_listo from public.estados_inventario where tenant_id=v_tenant and codigo='LISTO' limit 1;
--   select id into v_primera from public.calidades where tenant_id=v_tenant and codigo='PRIMERA' limit 1;
--   select id into v_user from public.usuarios where tenant_id=v_tenant and rol='admin' order by created_at limit 1;
--   select id into v_prod from public.productos where tenant_id=v_tenant and nombre='CAMISA HOMBRE 240 GR' limit 1;
--   select id into v_color from public.colores where tenant_id=v_tenant and codigo='CAQ' limit 1;
--   select id into v_talla from public.tallas where tenant_id=v_tenant and codigo='L' limit 1;
--
--   insert into public.variantes (tenant_id, producto_id, referencia, color_id, talla_id, sku, precio_base, activo)
--   values (v_tenant, v_prod, 'CH', v_color, v_talla, 'CH-CAQ-L', 45000, true)
--   on conflict (tenant_id, sku) do nothing
--   returning id into v_var;
--   if v_var is null then select id into v_var from public.variantes where tenant_id=v_tenant and sku='CH-CAQ-L'; end if;
--
--   insert into public.precios (tenant_id, variante_id, calidad_id, precio)
--   values (v_tenant, v_var, v_primera, 45000)
--   on conflict (variante_id, calidad_id) do nothing;
--
--   insert into public.inventario (tenant_id, variante_id, ubicacion_id, estado_id, calidad_id, cantidad)
--   values (v_tenant, v_var, v_central, v_listo, v_primera, 1)
--   on conflict (variante_id, ubicacion_id, estado_id, calidad_id) do update set cantidad = excluded.cantidad;
--
--   insert into public.movimientos_inventario
--     (tenant_id, tipo, variante_id, ubicacion_destino_id, estado_destino_id, calidad_destino_id,
--      cantidad, doc_tipo, doc_id, created_by)
--   values (v_tenant,'ENTRADA',v_var,v_central,v_listo,v_primera,1,'INVENTARIO_INICIAL',gen_random_uuid(),v_user);
-- end$$;
-- =====================================================================
