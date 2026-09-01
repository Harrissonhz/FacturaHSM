-- =====================================================================
-- FacturacionHSM · SCRIPT 01 · ESQUEMA COMPLETO (tablas, constraints, índices)
-- =====================================================================
-- Recrea TODA la estructura de tablas desde cero, incluyendo todas las
-- columnas agregadas durante las iteraciones (empresa_config,
-- productos.imagen_url, empresa_config.cuentas_bancarias).
-- Ejecutar PRIMERO. PostgreSQL / Supabase.
-- =====================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- 1. TENANTS Y USUARIOS (multi-tenant)
-- ---------------------------------------------------------------------
create table public.tenants (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  creado_en   timestamptz not null default now()
);

create table public.usuarios (
  id          uuid primary key references auth.users(id) on delete cascade,
  tenant_id   uuid not null references public.tenants(id),
  nombre      text not null,
  rol         text not null check (rol in ('admin','produccion','vendedor')),
  vendedor_id uuid,   -- FK lógica a vendedores (se enlaza al final)
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index idx_usuarios_tenant on public.usuarios(tenant_id);

-- ---------------------------------------------------------------------
-- 2. CATÁLOGOS PARAMETRIZABLES
-- ---------------------------------------------------------------------
create table public.estados_inventario (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id),
  codigo            text not null,
  nombre            text not null,
  orden             int  not null default 0,
  disponible_venta  boolean not null default false,
  activo            boolean not null default true,
  unique (tenant_id, codigo)
);

create table public.calidades (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id),
  codigo          text not null,
  nombre          text not null,
  comercializable boolean not null default true,
  activo          boolean not null default true,
  unique (tenant_id, codigo)
);

create table public.tipos_producto (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  codigo    text not null,
  nombre    text not null,
  activo    boolean not null default true,
  unique (tenant_id, codigo)
);

create table public.colores (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  codigo    text not null,
  nombre    text not null,
  activo    boolean not null default true,
  unique (tenant_id, codigo)
);

create table public.tallas (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  codigo    text not null,
  nombre    text not null,
  orden     int  not null default 0,
  activo    boolean not null default true,
  unique (tenant_id, codigo)
);

create table public.procesos_produccion (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  codigo    text not null,
  nombre    text not null,
  activo    boolean not null default true,
  unique (tenant_id, codigo)
);

-- ---------------------------------------------------------------------
-- 3. UBICACIONES (CENTRAL / VENDEDOR)
-- ---------------------------------------------------------------------
create table public.ubicaciones (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id),
  tipo        text not null check (tipo in ('CENTRAL','VENDEDOR')),
  nombre      text not null,
  vendedor_id uuid,   -- FK lógica a vendedores (se enlaza al final)
  activo      boolean not null default true
);
create index idx_ubicaciones_tenant on public.ubicaciones(tenant_id);

-- ---------------------------------------------------------------------
-- 4. PRODUCTOS Y VARIANTES (SKU)
-- ---------------------------------------------------------------------
create table public.productos (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants(id),
  nombre           text not null,
  tipo_producto_id uuid not null references public.tipos_producto(id),
  genero           text not null check (genero in ('DAMA','HOMBRE','UNISEX')),
  descripcion      text,
  imagen_url       text,                       -- imagen del producto (public/productos/*)
  activo           boolean not null default true,
  created_at       timestamptz not null default now()
);
create index idx_productos_tenant on public.productos(tenant_id);

create table public.variantes (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id),
  producto_id uuid not null references public.productos(id),
  referencia  text not null,
  color_id    uuid not null references public.colores(id),
  talla_id    uuid not null references public.tallas(id),
  sku         text not null,
  precio_base numeric(14,2) not null default 0 check (precio_base >= 0),
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (tenant_id, producto_id, color_id, talla_id),
  unique (tenant_id, sku)
);
create index idx_variantes_tenant on public.variantes(tenant_id);

create table public.precios (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id),
  variante_id uuid not null references public.variantes(id),
  calidad_id  uuid not null references public.calidades(id),
  precio      numeric(14,2) not null check (precio >= 0),
  unique (variante_id, calidad_id)
);

-- ---------------------------------------------------------------------
-- 5. PROVEEDORES, COMPRAS Y RECEPCIÓN
-- ---------------------------------------------------------------------
create table public.proveedores (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  nombre    text not null,
  nit       text,
  telefono  text,
  direccion text,
  activo    boolean not null default true
);
create index idx_proveedores_tenant on public.proveedores(tenant_id);

create table public.compras (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id),
  proveedor_id uuid not null references public.proveedores(id),
  numero       text not null,
  fecha        date not null default current_date,
  estado       text not null default 'PENDIENTE'
               check (estado in ('PENDIENTE','PARCIAL','RECIBIDA','CANCELADA')),
  total        numeric(14,2) not null default 0 check (total >= 0),
  created_by   uuid not null references public.usuarios(id),
  created_at   timestamptz not null default now(),
  unique (tenant_id, numero)
);
create index idx_compras_tenant_estado on public.compras(tenant_id, estado);

create table public.compras_detalle (
  id                  uuid primary key default gen_random_uuid(),
  compra_id           uuid not null references public.compras(id) on delete cascade,
  variante_id         uuid not null references public.variantes(id),
  cantidad_solicitada int not null check (cantidad_solicitada > 0),
  cantidad_recibida   int not null default 0 check (cantidad_recibida >= 0),
  costo_unitario      numeric(14,2) not null default 0 check (costo_unitario >= 0),
  check (cantidad_recibida <= cantidad_solicitada)
);
create index idx_compras_detalle_compra on public.compras_detalle(compra_id);

create table public.recibos (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id),
  compra_id   uuid not null references public.compras(id),
  fecha       date not null default current_date,
  observacion text,
  created_by  uuid not null references public.usuarios(id),
  created_at  timestamptz not null default now()
);
create index idx_recibos_compra on public.recibos(compra_id);

create table public.recibos_detalle (
  id                 uuid primary key default gen_random_uuid(),
  recibo_id          uuid not null references public.recibos(id) on delete cascade,
  compra_detalle_id  uuid not null references public.compras_detalle(id),
  cantidad_recibida  int not null check (cantidad_recibida > 0)
);

-- ---------------------------------------------------------------------
-- 6. INVENTARIO (saldo) + LIBRO MAYOR (movimientos inmutables)
-- ---------------------------------------------------------------------
create table public.inventario (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id),
  variante_id uuid not null references public.variantes(id),
  ubicacion_id uuid not null references public.ubicaciones(id),
  estado_id   uuid not null references public.estados_inventario(id),
  calidad_id  uuid not null references public.calidades(id),
  cantidad    int not null default 0 check (cantidad >= 0),
  updated_at  timestamptz not null default now(),
  unique (variante_id, ubicacion_id, estado_id, calidad_id)
);
create index idx_inventario_tenant_ubic on public.inventario(tenant_id, ubicacion_id);

create table public.movimientos_inventario (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants(id),
  fecha                timestamptz not null default now(),
  tipo                 text not null check (tipo in
                         ('ENTRADA','SALIDA','TRANSFERENCIA','TRANSFORMACION','AJUSTE','REVERSO')),
  variante_id          uuid not null references public.variantes(id),
  ubicacion_origen_id  uuid references public.ubicaciones(id),
  estado_origen_id     uuid references public.estados_inventario(id),
  calidad_origen_id    uuid references public.calidades(id),
  ubicacion_destino_id uuid references public.ubicaciones(id),
  estado_destino_id    uuid references public.estados_inventario(id),
  calidad_destino_id   uuid references public.calidades(id),
  cantidad             int not null check (cantidad > 0),
  doc_tipo             text not null,
  doc_id               uuid not null,
  created_by           uuid not null references public.usuarios(id),
  created_at           timestamptz not null default now()
);
create index idx_movim_tenant_var_fecha on public.movimientos_inventario(tenant_id, variante_id, fecha);
create index idx_movim_doc on public.movimientos_inventario(doc_tipo, doc_id);

-- ---------------------------------------------------------------------
-- 7. PRODUCCIÓN / MAQUILA
-- ---------------------------------------------------------------------
create table public.ordenes_produccion (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id),
  numero       text not null,
  proceso_id   uuid not null references public.procesos_produccion(id),
  fecha_inicio date not null default current_date,
  fecha_fin    date,
  estado       text not null default 'ABIERTA'
               check (estado in ('ABIERTA','EN_PROCESO','CERRADA','CANCELADA')),
  created_by   uuid not null references public.usuarios(id),
  created_at   timestamptz not null default now(),
  unique (tenant_id, numero)
);

create table public.ordenes_produccion_detalle (
  id                uuid primary key default gen_random_uuid(),
  orden_id          uuid not null references public.ordenes_produccion(id) on delete cascade,
  variante_id       uuid not null references public.variantes(id),
  estado_origen_id  uuid not null references public.estados_inventario(id),
  calidad_origen_id uuid not null references public.calidades(id),
  cantidad          int not null check (cantidad > 0)
);

create table public.ordenes_produccion_resultado (
  id                 uuid primary key default gen_random_uuid(),
  orden_id           uuid not null references public.ordenes_produccion(id) on delete cascade,
  variante_id        uuid not null references public.variantes(id),
  estado_destino_id  uuid not null references public.estados_inventario(id),
  calidad_destino_id uuid not null references public.calidades(id),
  cantidad           int not null check (cantidad > 0)
);

-- ---------------------------------------------------------------------
-- 8. VENDEDORES, CLIENTES Y TRANSFERENCIAS
-- ---------------------------------------------------------------------
create table public.vendedores (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id),
  nombre      text not null,
  documento   text,
  telefono    text,
  municipio   text,
  ubicacion_id uuid references public.ubicaciones(id),
  activo      boolean not null default true
);
create index idx_vendedores_tenant on public.vendedores(tenant_id);

create table public.clientes (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id),
  nombre      text not null,
  documento   text,
  telefono    text,
  direccion   text,
  municipio   text,
  vendedor_id uuid references public.vendedores(id),
  activo      boolean not null default true
);
create index idx_clientes_tenant on public.clientes(tenant_id);

create table public.transferencias (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants(id),
  numero               text not null,
  ubicacion_origen_id  uuid not null references public.ubicaciones(id),
  ubicacion_destino_id uuid not null references public.ubicaciones(id),
  fecha                date not null default current_date,
  tipo                 text not null check (tipo in ('ENVIO','RETORNO')),
  estado               text not null default 'BORRADOR'
                       check (estado in ('BORRADOR','CONFIRMADA')),
  created_by           uuid not null references public.usuarios(id),
  created_at           timestamptz not null default now(),
  unique (tenant_id, numero),
  check (ubicacion_origen_id <> ubicacion_destino_id)
);

create table public.transferencias_detalle (
  id               uuid primary key default gen_random_uuid(),
  transferencia_id uuid not null references public.transferencias(id) on delete cascade,
  variante_id      uuid not null references public.variantes(id),
  calidad_id       uuid not null references public.calidades(id),
  cantidad         int not null check (cantidad > 0)
);

-- ---------------------------------------------------------------------
-- 9. VENTAS Y FACTURAS
-- ---------------------------------------------------------------------
create table public.ventas (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id),
  vendedor_id uuid not null references public.vendedores(id),
  cliente_id  uuid not null references public.clientes(id),
  municipio   text,
  fecha       date not null default current_date,
  tipo_pago   text not null check (tipo_pago in ('CONTADO','CREDITO')),
  subtotal    numeric(14,2) not null default 0 check (subtotal >= 0),
  descuento   numeric(14,2) not null default 0 check (descuento >= 0),
  total       numeric(14,2) not null default 0 check (total >= 0),
  estado      text not null default 'CONFIRMADA'
              check (estado in ('CONFIRMADA','ANULADA')),
  created_by  uuid not null references public.usuarios(id),
  created_at  timestamptz not null default now()
);
create index idx_ventas_tenant_vend_fecha on public.ventas(tenant_id, vendedor_id, fecha);

create table public.ventas_detalle (
  id              uuid primary key default gen_random_uuid(),
  venta_id        uuid not null references public.ventas(id) on delete cascade,
  variante_id     uuid not null references public.variantes(id),
  calidad_id      uuid not null references public.calidades(id),
  cantidad        int not null check (cantidad > 0),
  precio_unitario numeric(14,2) not null check (precio_unitario >= 0),
  subtotal        numeric(14,2) not null check (subtotal >= 0)
);
create index idx_ventas_detalle_venta on public.ventas_detalle(venta_id);

create table public.facturas (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id),
  venta_id   uuid not null unique references public.ventas(id),
  numero     text not null,
  fecha      date not null default current_date,
  pdf_url    text,
  created_at timestamptz not null default now(),
  unique (tenant_id, numero)
);

-- ---------------------------------------------------------------------
-- 10. CARTERA / CUENTAS POR COBRAR
-- ---------------------------------------------------------------------
create table public.cuentas_por_cobrar (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id),
  factura_id        uuid not null unique references public.facturas(id),
  cliente_id        uuid not null references public.clientes(id),
  vendedor_id       uuid not null references public.vendedores(id),
  fecha_venta       date not null,
  dias_credito      int not null default 0 check (dias_credito >= 0),
  fecha_vencimiento date,
  valor_original    numeric(14,2) not null check (valor_original >= 0),
  total_abonado     numeric(14,2) not null default 0 check (total_abonado >= 0),
  saldo_pendiente   numeric(14,2) not null check (saldo_pendiente >= 0),
  estado            text not null default 'PENDIENTE'
                    check (estado in ('PENDIENTE','PARCIAL','PAGADA','VENCIDA')),
  created_at        timestamptz not null default now()
);
create index idx_cxc_tenant_estado on public.cuentas_por_cobrar(tenant_id, estado, fecha_vencimiento);

create table public.abonos (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id),
  cuenta_id       uuid not null references public.cuentas_por_cobrar(id),
  fecha           date not null default current_date,
  monto           numeric(14,2) not null check (monto > 0),
  forma_pago      text not null check (forma_pago in ('EFECTIVO','CONSIGNACION','TRANSFERENCIA','OTRO')),
  comprobante_url text,
  observacion     text,
  created_by      uuid not null references public.usuarios(id),
  created_at      timestamptz not null default now()
);
create index idx_abonos_cuenta on public.abonos(cuenta_id, fecha);

-- ---------------------------------------------------------------------
-- 11. EMPRESA_CONFIG (emisor de factura / estado de cuenta)
-- ---------------------------------------------------------------------
create table public.empresa_config (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id),
  razon_social      text not null,
  nit               text,
  direccion         text,
  ciudad            text,
  telefono          text,
  email             text,
  logo_url          text,
  pie_factura       text,
  cuentas_bancarias text,        -- una cuenta por línea (medios de pago en factura)
  unique (tenant_id)
);

-- ---------------------------------------------------------------------
-- 12. FKs lógicas diferidas (evitan ciclos de creación)
-- ---------------------------------------------------------------------
alter table public.usuarios
  add constraint fk_usuarios_vendedor
  foreign key (vendedor_id) references public.vendedores(id);

alter table public.ubicaciones
  add constraint fk_ubicaciones_vendedor
  foreign key (vendedor_id) references public.vendedores(id);

-- =====================================================================
-- FIN SCRIPT 01 (esquema)
-- =====================================================================
