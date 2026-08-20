-- =====================================================================
-- FacturacionHSM · Migración 0005 · SEED de catálogos base
-- SOLO catálogos parametrizables (estados, calidades, tallas, etc.).
-- NO contiene datos de negocio (ni compras, ni ventas, ni inventario).
-- La base inicia desde cero. Este seed es idempotente (ON CONFLICT).
--
-- Uso: reemplaza :'tenant_id' por el UUID del tenant recién creado,
-- o ejecuta el bloque DO que crea un tenant demo y carga sus catálogos.
-- =====================================================================

do $$
declare
  v_tenant uuid;
begin
  -- 1) Crear (o reutilizar) un tenant base. Cambia el nombre a tu gusto.
  select id into v_tenant from public.tenants where nombre = 'HSM' limit 1;
  if v_tenant is null then
    insert into public.tenants (nombre) values ('HSM') returning id into v_tenant;
  end if;

  -- 2) ESTADOS / etapas del proceso (LISTO = disponible para venta)
  insert into public.estados_inventario (tenant_id, codigo, nombre, orden, disponible_venta) values
    (v_tenant, 'CRUDO',         'Crudo / recibido',       1, false),
    (v_tenant, 'EN_PRODUCCION', 'En producción',          2, false),
    (v_tenant, 'TERMINADO',     'Producto terminado',     3, false),
    (v_tenant, 'LISTO',         'Listo para venta',       4, true)
  on conflict (tenant_id, codigo) do nothing;

  -- 3) CALIDADES (MERMA = no comercializable)
  insert into public.calidades (tenant_id, codigo, nombre, comercializable) values
    (v_tenant, 'PRIMERA', 'Primera calidad',           true),
    (v_tenant, 'SEGUNDA', 'Segunda calidad / avería',  true),
    (v_tenant, 'MERMA',   'Merma / no comercializable', false)
  on conflict (tenant_id, codigo) do nothing;

  -- 4) TIPOS DE PRODUCTO (ejemplo base; ajustable)
  insert into public.tipos_producto (tenant_id, codigo, nombre) values
    (v_tenant, 'CAMISA', 'Camisa')
  on conflict (tenant_id, codigo) do nothing;

  -- 5) PROCESOS DE PRODUCCIÓN
  insert into public.procesos_produccion (tenant_id, codigo, nombre) values
    (v_tenant, 'ESTAMPACION', 'Estampación'),
    (v_tenant, 'BORDADO',     'Bordado'),
    (v_tenant, 'APLIQUE',     'Aplique'),
    (v_tenant, 'EMPAQUE',     'Empaque')
  on conflict (tenant_id, codigo) do nothing;

  -- 6) TALLAS (base; ajustable)
  insert into public.tallas (tenant_id, codigo, nombre, orden) values
    (v_tenant, 'S',  'Small',       1),
    (v_tenant, 'M',  'Medium',      2),
    (v_tenant, 'L',  'Large',       3),
    (v_tenant, 'XL', 'Extra Large', 4)
  on conflict (tenant_id, codigo) do nothing;

  -- 7) COLORES (base; ajustable)
  insert into public.colores (tenant_id, codigo, nombre) values
    (v_tenant, 'BLA', 'Blanco'),
    (v_tenant, 'NEG', 'Negro'),
    (v_tenant, 'AZU', 'Azul'),
    (v_tenant, 'ROJ', 'Rojo')
  on conflict (tenant_id, codigo) do nothing;

  -- 8) UBICACIÓN CENTRAL (obligatoria para el flujo de inventario)
  insert into public.ubicaciones (tenant_id, tipo, nombre) values
    (v_tenant, 'CENTRAL', 'Bodega central')
  on conflict do nothing;

  raise notice 'Seed de catálogos cargado para tenant %', v_tenant;
end$$;

-- =====================================================================
-- FIN MIGRACIÓN 0005 (seed de catálogos — sin datos de negocio)
-- =====================================================================
