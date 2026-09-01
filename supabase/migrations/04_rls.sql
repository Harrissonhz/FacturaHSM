-- =====================================================================
-- FacturacionHSM · SCRIPT 04 · RLS (Row Level Security) multi-tenant
-- Incluye TODAS las políticas: tablas principales, tablas de detalle
-- y empresa_config. Ejecutar DESPUÉS del script 03.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tablas principales: aislamiento por tenant (select + all)
-- ---------------------------------------------------------------------
do $$
declare
  t text;
  tablas text[] := array[
    'usuarios','estados_inventario','calidades','tipos_producto','colores','tallas',
    'procesos_produccion','ubicaciones','productos','variantes','precios',
    'proveedores','compras','recibos','inventario','movimientos_inventario',
    'ordenes_produccion','vendedores','clientes','transferencias',
    'ventas','facturas','cuentas_por_cobrar','abonos','empresa_config'
  ];
begin
  foreach t in array tablas loop
    execute format('alter table public.%I enable row level security;', t);

    execute format($f$
      create policy %I_tenant_select on public.%I
        for select using (tenant_id = public.fn_current_tenant());
    $f$, t, t);

    execute format($f$
      create policy %I_tenant_modify on public.%I
        for all using (tenant_id = public.fn_current_tenant())
        with check (tenant_id = public.fn_current_tenant());
    $f$, t, t);
  end loop;
end$$;

-- ---------------------------------------------------------------------
-- Tablas de DETALLE (sin tenant_id propio): RLS + políticas por padre.
-- SELECT vía la fila padre; INSERT/UPDATE validando el tenant del padre.
-- ---------------------------------------------------------------------
alter table public.compras_detalle              enable row level security;
alter table public.recibos_detalle              enable row level security;
alter table public.ordenes_produccion_detalle   enable row level security;
alter table public.ordenes_produccion_resultado enable row level security;
alter table public.transferencias_detalle       enable row level security;
alter table public.ventas_detalle               enable row level security;

-- compras_detalle
create policy compras_detalle_sel on public.compras_detalle
  for select using (exists (select 1 from public.compras c
    where c.id = compras_detalle.compra_id and c.tenant_id = public.fn_current_tenant()));
create policy compras_detalle_insert on public.compras_detalle
  for insert with check (exists (select 1 from public.compras c
    where c.id = compras_detalle.compra_id and c.tenant_id = public.fn_current_tenant()));
create policy compras_detalle_update on public.compras_detalle
  for update using (exists (select 1 from public.compras c
    where c.id = compras_detalle.compra_id and c.tenant_id = public.fn_current_tenant()));

-- ventas_detalle
create policy ventas_detalle_sel on public.ventas_detalle
  for select using (exists (select 1 from public.ventas v
    where v.id = ventas_detalle.venta_id and v.tenant_id = public.fn_current_tenant()));

-- transferencias_detalle
create policy transf_detalle_sel on public.transferencias_detalle
  for select using (exists (select 1 from public.transferencias t
    where t.id = transferencias_detalle.transferencia_id and t.tenant_id = public.fn_current_tenant()));
create policy transf_detalle_insert on public.transferencias_detalle
  for insert with check (exists (select 1 from public.transferencias t
    where t.id = transferencias_detalle.transferencia_id and t.tenant_id = public.fn_current_tenant()));

-- ordenes_produccion_detalle
create policy op_detalle_sel on public.ordenes_produccion_detalle
  for select using (exists (select 1 from public.ordenes_produccion o
    where o.id = ordenes_produccion_detalle.orden_id and o.tenant_id = public.fn_current_tenant()));
create policy op_detalle_insert on public.ordenes_produccion_detalle
  for insert with check (exists (select 1 from public.ordenes_produccion o
    where o.id = ordenes_produccion_detalle.orden_id and o.tenant_id = public.fn_current_tenant()));

-- ordenes_produccion_resultado
create policy op_resultado_sel on public.ordenes_produccion_resultado
  for select using (exists (select 1 from public.ordenes_produccion o
    where o.id = ordenes_produccion_resultado.orden_id and o.tenant_id = public.fn_current_tenant()));
create policy op_resultado_insert on public.ordenes_produccion_resultado
  for insert with check (exists (select 1 from public.ordenes_produccion o
    where o.id = ordenes_produccion_resultado.orden_id and o.tenant_id = public.fn_current_tenant()));

-- recibos_detalle
create policy recibos_detalle_sel on public.recibos_detalle
  for select using (exists (select 1 from public.recibos r
    where r.id = recibos_detalle.recibo_id and r.tenant_id = public.fn_current_tenant()));

-- NOTA: las escrituras de inventario/cartera y otros detalles se hacen
-- mediante funciones RPC (security definer), que ya validan el tenant.

-- =====================================================================
-- FIN SCRIPT 04 (RLS)
-- =====================================================================
