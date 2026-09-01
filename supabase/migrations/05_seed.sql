-- =====================================================================
-- FacturacionHSM · SCRIPT 05 · SEED (catálogos base + empresa_config)
-- SOLO catálogos parametrizables y config del emisor. NO datos de negocio.
-- Ejecutar DESPUÉS del script 04. Idempotente.
-- =====================================================================

do $$
declare
  v_tenant uuid;
begin
  -- 1) Tenant base
  select id into v_tenant from public.tenants where nombre = 'HSM' limit 1;
  if v_tenant is null then
    insert into public.tenants (nombre) values ('HSM') returning id into v_tenant;
  end if;

  -- 2) Estados / etapas
  insert into public.estados_inventario (tenant_id, codigo, nombre, orden, disponible_venta) values
    (v_tenant, 'CRUDO',         'Crudo / recibido',   1, false),
    (v_tenant, 'EN_PRODUCCION', 'En producción',      2, false),
    (v_tenant, 'TERMINADO',     'Producto terminado', 3, false),
    (v_tenant, 'LISTO',         'Listo para venta',   4, true)
  on conflict (tenant_id, codigo) do nothing;

  -- 3) Calidades
  insert into public.calidades (tenant_id, codigo, nombre, comercializable) values
    (v_tenant, 'PRIMERA', 'Primera calidad',            true),
    (v_tenant, 'SEGUNDA', 'Segunda calidad / avería',   true),
    (v_tenant, 'MERMA',   'Merma / no comercializable', false)
  on conflict (tenant_id, codigo) do nothing;

  -- 4) Tipos de producto (ajustable)
  insert into public.tipos_producto (tenant_id, codigo, nombre) values
    (v_tenant, 'CAMISA', 'Camisa'),
    (v_tenant, 'OVERSIZE', 'Oversize')
  on conflict (tenant_id, codigo) do nothing;

  -- 5) Procesos de producción
  insert into public.procesos_produccion (tenant_id, codigo, nombre) values
    (v_tenant, 'ESTAMPACION', 'Estampación'),
    (v_tenant, 'BORDADO',     'Bordado'),
    (v_tenant, 'APLIQUE',     'Aplique'),
    (v_tenant, 'EMPAQUE',     'Empaque')
  on conflict (tenant_id, codigo) do nothing;

  -- 6) Tallas (ajustable)
  insert into public.tallas (tenant_id, codigo, nombre, orden) values
    (v_tenant, 'S',  'Small',       1),
    (v_tenant, 'M',  'Medium',      2),
    (v_tenant, 'L',  'Large',       3),
    (v_tenant, 'XL', 'Extra Large', 4)
  on conflict (tenant_id, codigo) do nothing;

  -- 7) Colores (ajustable)
  insert into public.colores (tenant_id, codigo, nombre) values
    (v_tenant, 'BLA', 'Blanco'),
    (v_tenant, 'NEG', 'Negro'),
    (v_tenant, 'AZU', 'Azul'),
    (v_tenant, 'ROJ', 'Rojo')
  on conflict (tenant_id, codigo) do nothing;

  -- 8) Ubicación CENTRAL (obligatoria para el flujo de inventario)
  insert into public.ubicaciones (tenant_id, tipo, nombre) values
    (v_tenant, 'CENTRAL', 'Bodega central')
  on conflict do nothing;

  -- 9) empresa_config (emisor de factura/estado de cuenta)
  --    Incluye las cuentas bancarias reales para medios de pago.
  insert into public.empresa_config
    (tenant_id, razon_social, nit, direccion, ciudad, telefono, email, pie_factura, cuentas_bancarias)
  values
    (v_tenant,
     'HSM Family Sport',
     '900.000.000-0',                 -- EDITAR con el NIT real
     'Dirección de la empresa',       -- EDITAR
     'Medellín, Antioquia',           -- EDITAR
     '(604) 000 0000',                -- EDITAR
     'contacto@hsm.com',              -- EDITAR
     'Gracias por su compra. Documento no válido como factura electrónica DIAN.',
     'Bancolombia - Ahorros: 00869331619 - Juan Esteban Sepulveda
Bancolombia - Ahorros: 35100000796 - Duberney Sepúlveda')
  on conflict (tenant_id) do nothing;

  raise notice 'Seed cargado para tenant %', v_tenant;
end$$;

-- =====================================================================
-- FIN SCRIPT 05 (seed)
-- =====================================================================
