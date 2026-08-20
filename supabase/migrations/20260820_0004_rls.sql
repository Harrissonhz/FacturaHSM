-- =====================================================================
-- FacturacionHSM · Migración 0004 · RLS (Row Level Security) multi-tenant
-- Cada usuario solo accede a filas de su propio tenant.
-- =====================================================================

-- Habilitar RLS y crear políticas de aislamiento por tenant en cada tabla.
do $$
declare
  t text;
  tablas text[] := array[
    'usuarios','estados_inventario','calidades','tipos_producto','colores','tallas',
    'procesos_produccion','ubicaciones','productos','variantes','precios',
    'proveedores','compras','recibos','inventario','movimientos_inventario',
    'ordenes_produccion','vendedores','clientes','transferencias',
    'ventas','facturas','cuentas_por_cobrar','abonos'
  ];
begin
  foreach t in array tablas loop
    execute format('alter table public.%I enable row level security;', t);

    -- SELECT: solo filas del tenant del usuario
    execute format($f$
      create policy %I_tenant_select on public.%I
        for select using (tenant_id = public.fn_current_tenant());
    $f$, t, t);

    -- INSERT/UPDATE/DELETE: solo dentro del tenant del usuario
    execute format($f$
      create policy %I_tenant_modify on public.%I
        for all using (tenant_id = public.fn_current_tenant())
        with check (tenant_id = public.fn_current_tenant());
    $f$, t, t);
  end loop;
end$$;

-- ---------------------------------------------------------------------
-- Tablas de detalle (sin tenant_id propio): heredan seguridad vía su
-- tabla padre a través de las funciones RPC (security definer).
-- Se habilita RLS y se restringe el acceso directo; el acceso normal
-- ocurre mediante las funciones RPC o joins desde la tabla padre.
-- ---------------------------------------------------------------------
alter table public.compras_detalle              enable row level security;
alter table public.recibos_detalle              enable row level security;
alter table public.ordenes_produccion_detalle   enable row level security;
alter table public.ordenes_produccion_resultado enable row level security;
alter table public.transferencias_detalle       enable row level security;
alter table public.ventas_detalle               enable row level security;

-- Política de detalle: visible si la fila padre pertenece al tenant.
create policy compras_detalle_sel on public.compras_detalle
  for select using (exists (
    select 1 from public.compras c
    where c.id = compras_detalle.compra_id and c.tenant_id = public.fn_current_tenant()));

create policy ventas_detalle_sel on public.ventas_detalle
  for select using (exists (
    select 1 from public.ventas v
    where v.id = ventas_detalle.venta_id and v.tenant_id = public.fn_current_tenant()));

create policy transf_detalle_sel on public.transferencias_detalle
  for select using (exists (
    select 1 from public.transferencias t
    where t.id = transferencias_detalle.transferencia_id and t.tenant_id = public.fn_current_tenant()));

create policy op_detalle_sel on public.ordenes_produccion_detalle
  for select using (exists (
    select 1 from public.ordenes_produccion o
    where o.id = ordenes_produccion_detalle.orden_id and o.tenant_id = public.fn_current_tenant()));

create policy op_resultado_sel on public.ordenes_produccion_resultado
  for select using (exists (
    select 1 from public.ordenes_produccion o
    where o.id = ordenes_produccion_resultado.orden_id and o.tenant_id = public.fn_current_tenant()));

create policy recibos_detalle_sel on public.recibos_detalle
  for select using (exists (
    select 1 from public.recibos r
    where r.id = recibos_detalle.recibo_id and r.tenant_id = public.fn_current_tenant()));

-- NOTA: las escrituras a tablas de detalle e inventario se realizan
-- mediante funciones RPC (security definer), que ya validan el tenant.

-- =====================================================================
-- FIN MIGRACIÓN 0004 (RLS)
-- =====================================================================
