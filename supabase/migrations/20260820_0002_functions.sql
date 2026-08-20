-- =====================================================================
-- FacturacionHSM · Migración 0002 · FUNCIONES RPC (lógica transaccional)
-- Toda regla crítica de inventario/cartera vive aquí (atómica y auditable).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper: tenant_id del usuario autenticado
-- ---------------------------------------------------------------------
create or replace function public.fn_current_tenant()
returns uuid
language sql stable security definer set search_path = public
as $$
  select tenant_id from public.usuarios where id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- Helper interno: aplica un movimiento y actualiza el saldo (upsert)
-- Suma en destino (si viene) y resta en origen (si viene), validando saldo.
-- ---------------------------------------------------------------------
create or replace function public.fn_aplicar_movimiento(
  p_tenant          uuid,
  p_tipo            text,
  p_variante        uuid,
  p_ubic_origen     uuid, p_est_origen  uuid, p_cal_origen  uuid,
  p_ubic_destino    uuid, p_est_destino uuid, p_cal_destino uuid,
  p_cantidad        int,
  p_doc_tipo        text,
  p_doc_id          uuid,
  p_user            uuid
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_saldo int;
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'CANTIDAD_INVALIDA';
  end if;

  -- RESTA en el origen (con bloqueo de fila para evitar carreras)
  if p_ubic_origen is not null then
    select cantidad into v_saldo
      from public.inventario
     where variante_id = p_variante and ubicacion_id = p_ubic_origen
       and estado_id = p_est_origen and calidad_id = p_cal_origen
     for update;

    if v_saldo is null or v_saldo < p_cantidad then
      raise exception 'SALDO_INSUFICIENTE';
    end if;

    update public.inventario
       set cantidad = cantidad - p_cantidad, updated_at = now()
     where variante_id = p_variante and ubicacion_id = p_ubic_origen
       and estado_id = p_est_origen and calidad_id = p_cal_origen;
  end if;

  -- SUMA en el destino (upsert)
  if p_ubic_destino is not null then
    insert into public.inventario
      (tenant_id, variante_id, ubicacion_id, estado_id, calidad_id, cantidad)
    values
      (p_tenant, p_variante, p_ubic_destino, p_est_destino, p_cal_destino, p_cantidad)
    on conflict (variante_id, ubicacion_id, estado_id, calidad_id)
    do update set cantidad = public.inventario.cantidad + excluded.cantidad,
                  updated_at = now();
  end if;

  -- Registra el movimiento en el libro mayor (inmutable)
  insert into public.movimientos_inventario
    (tenant_id, tipo, variante_id,
     ubicacion_origen_id, estado_origen_id, calidad_origen_id,
     ubicacion_destino_id, estado_destino_id, calidad_destino_id,
     cantidad, doc_tipo, doc_id, created_by)
  values
    (p_tenant, p_tipo, p_variante,
     p_ubic_origen, p_est_origen, p_cal_origen,
     p_ubic_destino, p_est_destino, p_cal_destino,
     p_cantidad, p_doc_tipo, p_doc_id, p_user);
end;
$$;

-- =====================================================================
-- sp_recibir_mercancia: recibo total o parcial de una compra
-- p_items: jsonb array [{ "compra_detalle_id": uuid, "cantidad": int }]
-- =====================================================================
create or replace function public.sp_recibir_mercancia(
  p_compra_id uuid,
  p_items     jsonb
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_tenant   uuid := public.fn_current_tenant();
  v_user     uuid := auth.uid();
  v_recibo   uuid;
  v_item     jsonb;
  v_det      record;
  v_ubic_central uuid;
  v_est_crudo    uuid;
  v_cal_primera  uuid;
  v_pendiente_total int;
begin
  -- Validar compra
  perform 1 from public.compras
    where id = p_compra_id and tenant_id = v_tenant
      and estado in ('PENDIENTE','PARCIAL');
  if not found then
    raise exception 'COMPRA_NO_PENDIENTE';
  end if;

  -- Catálogos base de destino
  select id into v_ubic_central from public.ubicaciones
    where tenant_id = v_tenant and tipo = 'CENTRAL' limit 1;
  select id into v_est_crudo from public.estados_inventario
    where tenant_id = v_tenant and codigo = 'CRUDO' limit 1;
  select id into v_cal_primera from public.calidades
    where tenant_id = v_tenant and codigo = 'PRIMERA' limit 1;

  -- Crear el recibo
  insert into public.recibos (tenant_id, compra_id, created_by)
    values (v_tenant, p_compra_id, v_user)
    returning id into v_recibo;

  -- Procesar cada renglón recibido
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select cd.*, (cd.cantidad_solicitada - cd.cantidad_recibida) as pendiente
      into v_det
      from public.compras_detalle cd
     where cd.id = (v_item->>'compra_detalle_id')::uuid
       and cd.compra_id = p_compra_id
     for update;

    if not found then
      raise exception 'DETALLE_INVALIDO';
    end if;
    if (v_item->>'cantidad')::int > v_det.pendiente then
      raise exception 'RECIBO_EXCEDE_PENDIENTE';
    end if;

    insert into public.recibos_detalle (recibo_id, compra_detalle_id, cantidad_recibida)
      values (v_recibo, v_det.id, (v_item->>'cantidad')::int);

    update public.compras_detalle
       set cantidad_recibida = cantidad_recibida + (v_item->>'cantidad')::int
     where id = v_det.id;

    -- Movimiento ENTRADA -> CENTRAL / CRUDO / PRIMERA (calidad inicial provisional)
    perform public.fn_aplicar_movimiento(
      v_tenant, 'ENTRADA', v_det.variante_id,
      null, null, null,
      v_ubic_central, v_est_crudo, v_cal_primera,
      (v_item->>'cantidad')::int, 'COMPRA', p_compra_id, v_user);
  end loop;

  -- Recalcular estado de la compra
  select coalesce(sum(cantidad_solicitada - cantidad_recibida),0)
    into v_pendiente_total
    from public.compras_detalle where compra_id = p_compra_id;

  update public.compras
     set estado = case when v_pendiente_total = 0 then 'RECIBIDA' else 'PARCIAL' end
   where id = p_compra_id;

  return v_recibo;
end;
$$;

-- =====================================================================
-- sp_ejecutar_produccion: mete entradas a EN_PRODUCCION y cierra con
-- resultados por calidad. Valida balance (Σ entradas = Σ resultados).
-- p_resultados: jsonb [{ "variante_id":uuid, "estado_destino_id":uuid,
--                        "calidad_destino_id":uuid, "cantidad":int }]
-- =====================================================================
create or replace function public.sp_ejecutar_produccion(
  p_orden_id   uuid,
  p_resultados jsonb
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_tenant uuid := public.fn_current_tenant();
  v_user   uuid := auth.uid();
  v_ubic_central uuid;
  v_est_prod uuid;
  v_sum_ent int;
  v_sum_res int;
  v_det record;
  v_res jsonb;
begin
  perform 1 from public.ordenes_produccion
    where id = p_orden_id and tenant_id = v_tenant and estado in ('ABIERTA','EN_PROCESO');
  if not found then raise exception 'ORDEN_NO_ABIERTA'; end if;

  select id into v_ubic_central from public.ubicaciones
    where tenant_id = v_tenant and tipo = 'CENTRAL' limit 1;
  select id into v_est_prod from public.estados_inventario
    where tenant_id = v_tenant and codigo = 'EN_PRODUCCION' limit 1;

  -- Validar balance
  select coalesce(sum(cantidad),0) into v_sum_ent
    from public.ordenes_produccion_detalle where orden_id = p_orden_id;
  select coalesce(sum((r->>'cantidad')::int),0) into v_sum_res
    from jsonb_array_elements(p_resultados) r;
  if v_sum_ent <> v_sum_res then
    raise exception 'BALANCE_NO_CUADRA';
  end if;

  -- 1) Mover entradas: origen (CRUDO u otro) -> EN_PRODUCCION
  for v_det in select * from public.ordenes_produccion_detalle where orden_id = p_orden_id
  loop
    perform public.fn_aplicar_movimiento(
      v_tenant, 'TRANSFORMACION', v_det.variante_id,
      v_ubic_central, v_det.estado_origen_id, v_det.calidad_origen_id,
      v_ubic_central, v_est_prod, v_det.calidad_origen_id,
      v_det.cantidad, 'PRODUCCION', p_orden_id, v_user);
  end loop;

  -- 2) Registrar resultados: EN_PRODUCCION -> estado/calidad destino
  for v_res in select * from jsonb_array_elements(p_resultados)
  loop
    insert into public.ordenes_produccion_resultado
      (orden_id, variante_id, estado_destino_id, calidad_destino_id, cantidad)
    values
      (p_orden_id, (v_res->>'variante_id')::uuid, (v_res->>'estado_destino_id')::uuid,
       (v_res->>'calidad_destino_id')::uuid, (v_res->>'cantidad')::int);

    perform public.fn_aplicar_movimiento(
      v_tenant, 'TRANSFORMACION', (v_res->>'variante_id')::uuid,
      v_ubic_central, v_est_prod, (v_res->>'calidad_destino_id')::uuid,
      v_ubic_central, (v_res->>'estado_destino_id')::uuid, (v_res->>'calidad_destino_id')::uuid,
      (v_res->>'cantidad')::int, 'PRODUCCION', p_orden_id, v_user);
  end loop;

  update public.ordenes_produccion
     set estado = 'CERRADA', fecha_fin = current_date
   where id = p_orden_id;
end;
$$;

-- =====================================================================
-- sp_empacar: TERMINADO -> LISTO (habilita venta)
-- =====================================================================
create or replace function public.sp_empacar(
  p_variante_id  uuid,
  p_calidad_id   uuid,
  p_cantidad     int,
  p_ubicacion_id uuid
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_tenant uuid := public.fn_current_tenant();
  v_user   uuid := auth.uid();
  v_est_term uuid;
  v_est_listo uuid;
begin
  select id into v_est_term  from public.estados_inventario where tenant_id=v_tenant and codigo='TERMINADO' limit 1;
  select id into v_est_listo from public.estados_inventario where tenant_id=v_tenant and codigo='LISTO' limit 1;

  perform public.fn_aplicar_movimiento(
    v_tenant, 'TRANSFORMACION', p_variante_id,
    p_ubicacion_id, v_est_term,  p_calidad_id,
    p_ubicacion_id, v_est_listo, p_calidad_id,
    p_cantidad, 'PRODUCCION', gen_random_uuid(), v_user);
end;
$$;

-- =====================================================================
-- sp_transferir_inventario: confirma ENVIO/RETORNO (LISTO)
-- =====================================================================
create or replace function public.sp_transferir_inventario(
  p_transferencia_id uuid
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_tenant uuid := public.fn_current_tenant();
  v_user   uuid := auth.uid();
  v_tr record;
  v_det record;
  v_est_listo uuid;
begin
  select * into v_tr from public.transferencias
    where id = p_transferencia_id and tenant_id = v_tenant;
  if not found then raise exception 'TRANSFERENCIA_INVALIDA'; end if;
  if v_tr.estado = 'CONFIRMADA' then raise exception 'TRANSFERENCIA_YA_CONFIRMADA'; end if;

  select id into v_est_listo from public.estados_inventario
    where tenant_id = v_tenant and codigo = 'LISTO' limit 1;

  for v_det in select * from public.transferencias_detalle where transferencia_id = p_transferencia_id
  loop
    perform public.fn_aplicar_movimiento(
      v_tenant, 'TRANSFERENCIA', v_det.variante_id,
      v_tr.ubicacion_origen_id,  v_est_listo, v_det.calidad_id,
      v_tr.ubicacion_destino_id, v_est_listo, v_det.calidad_id,
      v_det.cantidad, 'TRANSFERENCIA', p_transferencia_id, v_user);
  end loop;

  update public.transferencias set estado = 'CONFIRMADA' where id = p_transferencia_id;
end;
$$;

-- =====================================================================
-- sp_registrar_venta: NÚCLEO. Venta atómica (inventario+factura+cartera)
-- p_payload: jsonb {
--   vendedor_id, cliente_id, tipo_pago, dias_credito, descuento,
--   items: [{ variante_id, calidad_id, cantidad, precio_unitario }]
-- }
-- Devuelve jsonb con venta_id, factura_id, cuenta_id.
-- =====================================================================
create or replace function public.sp_registrar_venta(
  p_payload jsonb
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_tenant uuid := public.fn_current_tenant();
  v_user   uuid := auth.uid();
  v_vendedor uuid := (p_payload->>'vendedor_id')::uuid;
  v_cliente  uuid := (p_payload->>'cliente_id')::uuid;
  v_tipo     text := coalesce(p_payload->>'tipo_pago','CREDITO');
  v_dias     int  := coalesce((p_payload->>'dias_credito')::int, 0);
  v_desc     numeric(14,2) := coalesce((p_payload->>'descuento')::numeric, 0);
  v_ubic_vend uuid;
  v_est_listo uuid;
  v_item jsonb;
  v_venta uuid;
  v_factura uuid;
  v_cuenta uuid;
  v_subtotal numeric(14,2) := 0;
  v_total numeric(14,2);
  v_municipio text;
  v_num_fac text;
  v_line_sub numeric(14,2);
begin
  if p_payload->'items' is null or jsonb_array_length(p_payload->'items') = 0 then
    raise exception 'SIN_ITEMS';
  end if;

  select ubicacion_id, municipio into v_ubic_vend, v_municipio
    from public.vendedores where id = v_vendedor and tenant_id = v_tenant;
  if v_ubic_vend is null then raise exception 'VENDEDOR_INVALIDO'; end if;

  select id into v_est_listo from public.estados_inventario
    where tenant_id = v_tenant and codigo = 'LISTO' limit 1;

  -- Crear cabecera de venta (total provisional 0)
  insert into public.ventas (tenant_id, vendedor_id, cliente_id, municipio, tipo_pago,
                             subtotal, descuento, total, created_by)
    values (v_tenant, v_vendedor, v_cliente, v_municipio, v_tipo, 0, v_desc, 0, v_user)
    returning id into v_venta;

  -- Procesar items: descuenta inventario del vendedor y arma detalle
  for v_item in select * from jsonb_array_elements(p_payload->'items')
  loop
    v_line_sub := (v_item->>'cantidad')::int * (v_item->>'precio_unitario')::numeric;
    v_subtotal := v_subtotal + v_line_sub;

    insert into public.ventas_detalle
      (venta_id, variante_id, calidad_id, cantidad, precio_unitario, subtotal)
    values
      (v_venta, (v_item->>'variante_id')::uuid, (v_item->>'calidad_id')::uuid,
       (v_item->>'cantidad')::int, (v_item->>'precio_unitario')::numeric, v_line_sub);

    -- SALIDA del inventario del vendedor (LISTO / calidad)
    perform public.fn_aplicar_movimiento(
      v_tenant, 'SALIDA', (v_item->>'variante_id')::uuid,
      v_ubic_vend, v_est_listo, (v_item->>'calidad_id')::uuid,
      null, null, null,
      (v_item->>'cantidad')::int, 'VENTA', v_venta, v_user);
  end loop;

  v_total := v_subtotal - v_desc;
  update public.ventas set subtotal = v_subtotal, total = v_total where id = v_venta;

  -- Factura con consecutivo por tenant
  v_num_fac := 'FAC-' || lpad((
      coalesce((select count(*) from public.facturas where tenant_id = v_tenant), 0) + 1
    )::text, 6, '0');
  insert into public.facturas (tenant_id, venta_id, numero)
    values (v_tenant, v_venta, v_num_fac)
    returning id into v_factura;

  -- Cuenta por cobrar (si es crédito)
  if v_tipo = 'CREDITO' then
    insert into public.cuentas_por_cobrar
      (tenant_id, factura_id, cliente_id, vendedor_id, fecha_venta, dias_credito,
       fecha_vencimiento, valor_original, total_abonado, saldo_pendiente, estado)
    values
      (v_tenant, v_factura, v_cliente, v_vendedor, current_date, v_dias,
       current_date + v_dias, v_total, 0, v_total, 'PENDIENTE')
    returning id into v_cuenta;
  end if;

  return jsonb_build_object(
    'venta_id', v_venta,
    'factura_id', v_factura,
    'numero_factura', v_num_fac,
    'cuenta_id', v_cuenta,
    'total', v_total);
end;
$$;

-- =====================================================================
-- sp_registrar_abono: abono parcial; recalcula saldo y estado
-- =====================================================================
create or replace function public.sp_registrar_abono(
  p_cuenta_id       uuid,
  p_monto           numeric,
  p_forma_pago      text,
  p_comprobante_url text default null,
  p_observacion     text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_tenant uuid := public.fn_current_tenant();
  v_user   uuid := auth.uid();
  v_c record;
  v_nuevo_abonado numeric(14,2);
  v_nuevo_saldo numeric(14,2);
  v_estado text;
begin
  select * into v_c from public.cuentas_por_cobrar
    where id = p_cuenta_id and tenant_id = v_tenant for update;
  if not found then raise exception 'CUENTA_INVALIDA'; end if;
  if v_c.estado = 'PAGADA' then raise exception 'CUENTA_YA_PAGADA'; end if;
  if p_monto <= 0 then raise exception 'MONTO_INVALIDO'; end if;
  if p_monto > v_c.saldo_pendiente then raise exception 'ABONO_EXCEDE_SALDO'; end if;

  insert into public.abonos (tenant_id, cuenta_id, monto, forma_pago, comprobante_url, observacion, created_by)
    values (v_tenant, p_cuenta_id, p_monto, p_forma_pago, p_comprobante_url, p_observacion, v_user);

  v_nuevo_abonado := v_c.total_abonado + p_monto;
  v_nuevo_saldo   := v_c.valor_original - v_nuevo_abonado;
  v_estado := case when v_nuevo_saldo = 0 then 'PAGADA' else 'PARCIAL' end;

  update public.cuentas_por_cobrar
     set total_abonado = v_nuevo_abonado,
         saldo_pendiente = v_nuevo_saldo,
         estado = v_estado
   where id = p_cuenta_id;

  return jsonb_build_object('cuenta_id', p_cuenta_id, 'saldo_pendiente', v_nuevo_saldo, 'estado', v_estado);
end;
$$;

-- =====================================================================
-- sp_ajustar_inventario: ajuste manual auditable (delta +/-)
-- =====================================================================
create or replace function public.sp_ajustar_inventario(
  p_variante_id  uuid,
  p_ubicacion_id uuid,
  p_estado_id    uuid,
  p_calidad_id   uuid,
  p_delta        int,
  p_motivo       text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_tenant uuid := public.fn_current_tenant();
  v_user   uuid := auth.uid();
begin
  if p_delta = 0 then raise exception 'DELTA_INVALIDO'; end if;

  if p_delta > 0 then
    perform public.fn_aplicar_movimiento(
      v_tenant, 'AJUSTE', p_variante_id,
      null, null, null,
      p_ubicacion_id, p_estado_id, p_calidad_id,
      p_delta, 'AJUSTE', gen_random_uuid(), v_user);
  else
    perform public.fn_aplicar_movimiento(
      v_tenant, 'AJUSTE', p_variante_id,
      p_ubicacion_id, p_estado_id, p_calidad_id,
      null, null, null,
      abs(p_delta), 'AJUSTE', gen_random_uuid(), v_user);
  end if;
end;
$$;

-- =====================================================================
-- FIN MIGRACIÓN 0002 (funciones)
-- =====================================================================
