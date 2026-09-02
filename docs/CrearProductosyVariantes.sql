-- =====================================================================
-- FacturacionHSM · CREAR PRODUCTOS, TALLAS, COLORES Y VARIANTES (HSM)
-- CON PRECIOS
-- =====================================================================
-- Ejecutar DESPUÉS del script de limpieza (limpiar_datos_prueba.sql).
-- Crea: 15 colores, 9 tallas, 4 productos (con imagen), 106 variantes
-- (con precio_base) y sus precios de PRIMERA calidad.
--
-- Precios:
--   BASICA DAMA 200 GR      = 29000
--   OVERSIZE LARGA 200 GR   = 31000
--   OVERSIZE CORTA 200 GR   = 29000
--   CAMISA HOMBRE 240 GR    = 45000
--
-- Las imágenes deben existir en public/productos/:
--   camisa-dama.jpg, camisa-hombre.jpg, oversize-corta.jpg, oversize-larga.jpg
-- =====================================================================

do $$
declare
  v_tenant uuid;
  v_tipo_camisa uuid;
  v_tipo_oversize uuid;
  v_cal_primera uuid;
  v_prod uuid;
  v_colores_dama text[]   := array['BLA','BEI','NEG','ROJ','ROS','LIL','AZC','VMI','VSA','CAQ','CHO','GRC','GRR'];
  v_colores_hombre text[] := array['BLA','BEI','NEG','CHO','AZO','GRC','GRR','VBO','ROJ'];
begin
  select id into v_tenant from public.tenants where nombre = 'HSM' limit 1;
  if v_tenant is null then raise exception 'No existe el tenant HSM'; end if;

  select id into v_cal_primera from public.calidades where tenant_id=v_tenant and codigo='PRIMERA' limit 1;

  -- ---------------------------------------------------------------
  -- 1) Recrear tallas y colores exactamente como los pidió el usuario
  -- ---------------------------------------------------------------
  delete from public.tallas  where tenant_id = v_tenant;
  delete from public.colores where tenant_id = v_tenant;

  insert into public.tallas (tenant_id, codigo, nombre, orden, activo) values
    (v_tenant, 'SM',   'S/M',   1, true),
    (v_tenant, 'LXL',  'L/XL',  2, true),
    (v_tenant, 'U',    'Única', 1, true),
    (v_tenant, 'S',    'S',     1, true),
    (v_tenant, 'M',    'M',     2, true),
    (v_tenant, 'L',    'L',     3, true),
    (v_tenant, 'XL',   'XL',    4, true),
    (v_tenant, 'XXL',  'XXL',   5, true),
    (v_tenant, 'XXXL', 'XXXL',  6, true);

  insert into public.colores (tenant_id, codigo, nombre, activo) values
    (v_tenant, 'BLA', 'Blanca',        true),
    (v_tenant, 'BEI', 'Beige',         true),
    (v_tenant, 'NEG', 'Negra',         true),
    (v_tenant, 'ROJ', 'Roja',          true),
    (v_tenant, 'ROS', 'Rosada',        true),
    (v_tenant, 'LIL', 'Lila',          true),
    (v_tenant, 'AZC', 'Azul claro',    true),
    (v_tenant, 'VMI', 'Verde menta',   true),
    (v_tenant, 'VSA', 'Verde salvia',  true),
    (v_tenant, 'CAQ', 'Caqui',         true),
    (v_tenant, 'CHO', 'Chocolate',     true),
    (v_tenant, 'GRC', 'Gris claro',    true),
    (v_tenant, 'GRR', 'Gris ratón',    true),
    (v_tenant, 'AZO', 'Azul oscuro',   true),
    (v_tenant, 'VBO', 'Verde botella', true);

  -- ---------------------------------------------------------------
  -- 2) Tipos de producto
  -- ---------------------------------------------------------------
  insert into public.tipos_producto (tenant_id, codigo, nombre) values
    (v_tenant, 'CAMISA',   'Camisa'),
    (v_tenant, 'OVERSIZE', 'Oversize')
  on conflict (tenant_id, codigo) do nothing;

  select id into v_tipo_camisa   from public.tipos_producto where tenant_id=v_tenant and codigo='CAMISA';
  select id into v_tipo_oversize from public.tipos_producto where tenant_id=v_tenant and codigo='OVERSIZE';

  -- ===============================================================
  -- 3) BASICA DAMA 200 GR  · $29.000 · 2 tallas × 13 colores = 26
  -- ===============================================================
  insert into public.productos (tenant_id, nombre, tipo_producto_id, genero, imagen_url, activo)
    values (v_tenant, 'BASICA DAMA 200 GR', v_tipo_camisa, 'DAMA', '/productos/camisa-dama.jpg', true)
    returning id into v_prod;

  insert into public.variantes (tenant_id, producto_id, referencia, color_id, talla_id, sku, precio_base, activo)
  select v_tenant, v_prod, 'BD', c.id, t.id, 'BD-'||c.codigo||'-'||t.codigo, 29000, true
  from public.colores c
  join public.tallas  t on t.tenant_id = v_tenant
  where c.tenant_id = v_tenant and c.codigo = any(v_colores_dama) and t.codigo in ('SM','LXL');

  -- Precio de PRIMERA calidad para esas variantes
  insert into public.precios (tenant_id, variante_id, calidad_id, precio)
  select v_tenant, v.id, v_cal_primera, 29000
  from public.variantes v where v.producto_id = v_prod;

  -- ===============================================================
  -- 4) OVERSIZE LARGA 200 GR · $31.000 · 1 talla × 13 = 13
  -- ===============================================================
  insert into public.productos (tenant_id, nombre, tipo_producto_id, genero, imagen_url, activo)
    values (v_tenant, 'OVERSIZE LARGA 200 GR', v_tipo_oversize, 'UNISEX', '/productos/oversize-larga.jpg', true)
    returning id into v_prod;

  insert into public.variantes (tenant_id, producto_id, referencia, color_id, talla_id, sku, precio_base, activo)
  select v_tenant, v_prod, 'OL', c.id, t.id, 'OL-'||c.codigo||'-'||t.codigo, 31000, true
  from public.colores c
  join public.tallas  t on t.tenant_id = v_tenant
  where c.tenant_id = v_tenant and c.codigo = any(v_colores_dama) and t.codigo = 'U';

  insert into public.precios (tenant_id, variante_id, calidad_id, precio)
  select v_tenant, v.id, v_cal_primera, 31000
  from public.variantes v where v.producto_id = v_prod;

  -- ===============================================================
  -- 5) OVERSIZE CORTA 200 GR · $29.000 · 1 talla × 13 = 13
  -- ===============================================================
  insert into public.productos (tenant_id, nombre, tipo_producto_id, genero, imagen_url, activo)
    values (v_tenant, 'OVERSIZE CORTA 200 GR', v_tipo_oversize, 'UNISEX', '/productos/oversize-corta.jpg', true)
    returning id into v_prod;

  insert into public.variantes (tenant_id, producto_id, referencia, color_id, talla_id, sku, precio_base, activo)
  select v_tenant, v_prod, 'OC', c.id, t.id, 'OC-'||c.codigo||'-'||t.codigo, 29000, true
  from public.colores c
  join public.tallas  t on t.tenant_id = v_tenant
  where c.tenant_id = v_tenant and c.codigo = any(v_colores_dama) and t.codigo = 'U';

  insert into public.precios (tenant_id, variante_id, calidad_id, precio)
  select v_tenant, v.id, v_cal_primera, 29000
  from public.variantes v where v.producto_id = v_prod;

  -- ===============================================================
  -- 6) CAMISA HOMBRE 240 GR · $45.000 · 6 tallas × 9 colores = 54
  -- ===============================================================
  insert into public.productos (tenant_id, nombre, tipo_producto_id, genero, imagen_url, activo)
    values (v_tenant, 'CAMISA HOMBRE 240 GR', v_tipo_camisa, 'HOMBRE', '/productos/camisa-hombre.jpg', true)
    returning id into v_prod;

  insert into public.variantes (tenant_id, producto_id, referencia, color_id, talla_id, sku, precio_base, activo)
  select v_tenant, v_prod, 'CH', c.id, t.id, 'CH-'||c.codigo||'-'||t.codigo, 45000, true
  from public.colores c
  join public.tallas  t on t.tenant_id = v_tenant
  where c.tenant_id = v_tenant and c.codigo = any(v_colores_hombre) and t.codigo in ('S','M','L','XL','XXL','XXXL');

  insert into public.precios (tenant_id, variante_id, calidad_id, precio)
  select v_tenant, v.id, v_cal_primera, 45000
  from public.variantes v where v.producto_id = v_prod;

  raise notice 'Productos con precios creados para HSM.';
end$$;

-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
select 'colores' t, count(*) n from public.colores
union all select 'tallas', count(*) from public.tallas
union all select 'productos', count(*) from public.productos
union all select 'variantes', count(*) from public.variantes
union all select 'precios', count(*) from public.precios;

-- Variantes y precio por producto
select p.nombre, count(v.id) as variantes, max(v.precio_base) as precio
from public.productos p
left join public.variantes v on v.producto_id = p.id
group by p.nombre
order by p.nombre;

-- Verificar imágenes
select nombre, imagen_url from public.productos order by nombre;

-- =====================================================================
-- Esperado:
--   colores=15 · tallas=9 · productos=4 · variantes=106 · precios=106
--   BASICA DAMA=26/29000 · OVERSIZE LARGA=13/31000
--   OVERSIZE CORTA=13/29000 · CAMISA HOMBRE=54/45000
-- =====================================================================
