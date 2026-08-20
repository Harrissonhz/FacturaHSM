# 03 · Modelo de datos

> Diseño para PostgreSQL / Supabase. Todas las tablas de negocio llevan `tenant_id` (multi-tenant Kubit) y `created_at` / `created_by`. Los importes usan `numeric(14,2)`.

## 1. Principio rector del inventario

El inventario se modela en **dos capas**:

1. **`movimientos_inventario`** → libro mayor **inmutable** (append-only). Cada fila es un evento que suma o resta.
2. **`inventario`** → **saldo** (proyección) por la llave: `variante × ubicación × estado × calidad`.

> El saldo SIEMPRE debe ser reconstruible a partir de los movimientos. Nunca se edita un movimiento.

### Dos dimensiones independientes
- **Estado (etapa):** `CRUDO → EN_PRODUCCION → TERMINADO → LISTO`
- **Calidad (condición):** `PRIMERA → SEGUNDA → MERMA`

## 2. Diagrama de entidades (texto)

```
tenants ──< usuarios
tenants ──< catálogos (estados_inventario, calidades, tallas, colores, tipos_producto, procesos_produccion, ubicaciones)

productos ──< variantes (SKU: producto+color+talla)  >── colores, tallas
proveedores ──< compras ──< compras_detalle >── variantes
compras ──< recibos ──< recibos_detalle >── compras_detalle

variantes ─┐
ubicaciones├─< inventario (saldo)             ← proyección
estados     │
calidades  ─┘
                └───< movimientos_inventario (libro mayor)   ← verdad

ordenes_produccion ──< ordenes_produccion_detalle (entradas)
ordenes_produccion ──< ordenes_produccion_resultado (salidas por calidad)

transferencias ──< transferencias_detalle   (central ↔ vendedor)

vendedores (ubicacion tipo VENDEDOR)
clientes >── vendedores
ventas ──< ventas_detalle >── variantes
ventas ──1:1── facturas
facturas ──1:1── cuentas_por_cobrar ──< abonos
```

## 3. Catálogos base

### `tenants`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| nombre | text | Nombre del cliente/empresa (ej. HSM). |
| creado_en | timestamptz | |

### `usuarios` (perfil, enlazado a `auth.users`)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | = `auth.users.id` |
| tenant_id | uuid FK | |
| nombre | text | |
| rol | text | `admin` / `produccion` / `vendedor` |
| vendedor_id | uuid FK null | si el usuario es un vendedor |
| activo | bool | |

### `estados_inventario` (etapa del proceso — parametrizable)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| codigo | text | `CRUDO`, `EN_PRODUCCION`, `TERMINADO`, `LISTO` |
| nombre | text | |
| orden | int | orden lógico del flujo |
| disponible_venta | bool | `true` solo para `LISTO` |

### `calidades` (condición — parametrizable)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| codigo | text | `PRIMERA`, `SEGUNDA`, `MERMA` |
| nombre | text | |
| comercializable | bool | `MERMA=false` |

### `tipos_producto`, `colores`, `tallas`
Catálogos simples: `id, tenant_id, codigo, nombre, activo`.
`tallas` puede incluir `orden` (S, M, L, XL...).

### `procesos_produccion` (maquila — parametrizable)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| codigo | text | `ESTAMPACION`, `BORDADO`, `APLIQUE`, `EMPAQUE` |
| nombre | text | |

### `ubicaciones` (dónde reside el inventario)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| tipo | text | `CENTRAL` / `VENDEDOR` |
| nombre | text | |
| vendedor_id | uuid FK null | si tipo=VENDEDOR |

## 4. Productos y variantes

### `productos`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| nombre | text | ej. "Camisa básica" |
| tipo_producto_id | uuid FK | |
| genero | text | `DAMA` / `HOMBRE` / `UNISEX` |
| descripcion | text null | |
| activo | bool | |

### `variantes` (SKU — unidad mínima de inventario)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| producto_id | uuid FK | |
| referencia | text | código de referencia comercial |
| color_id | uuid FK | |
| talla_id | uuid FK | |
| sku | text | código único generado (referencia-color-talla) |
| precio_base | numeric(14,2) | precio sugerido primera calidad |
| activo | bool | |
| **UNIQUE** | (tenant_id, producto_id, color_id, talla_id) | |

### `precios` (precio por calidad — segunda calidad diferente)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| variante_id | uuid FK | |
| calidad_id | uuid FK | |
| precio | numeric(14,2) | |
| **UNIQUE** | (variante_id, calidad_id) | |

## 5. Compras y recepción (recibos parciales)

### `proveedores`
`id, tenant_id, nombre, nit, telefono, direccion, activo`

### `compras` (orden de compra)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| proveedor_id | uuid FK | |
| numero | text | consecutivo |
| fecha | date | |
| estado | text | `PENDIENTE` / `PARCIAL` / `RECIBIDA` / `CANCELADA` |
| total | numeric(14,2) | |

### `compras_detalle`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| compra_id | uuid FK | |
| variante_id | uuid FK | |
| cantidad_solicitada | int | check > 0 |
| cantidad_recibida | int | acumulado; default 0 |
| costo_unitario | numeric(14,2) | |
| *derivado* | cantidad_pendiente = solicitada − recibida | |

### `recibos` (evento de recepción — puede ser parcial)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| compra_id | uuid FK | |
| fecha | date | |
| observacion | text null | |

### `recibos_detalle`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| recibo_id | uuid FK | |
| compra_detalle_id | uuid FK | |
| cantidad_recibida | int | check > 0 |

> Al confirmar un recibo, la RPC `sp_recibir_mercancia`: (1) suma a `compras_detalle.cantidad_recibida`, (2) actualiza el estado de la compra, (3) genera **movimiento de ENTRADA** a `CENTRAL / CRUDO / PRIMERA` (calidad inicial provisional) y (4) actualiza el saldo `inventario`.

## 6. Inventario (saldo + libro mayor)

### `inventario` (SALDO — proyección)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| variante_id | uuid FK | |
| ubicacion_id | uuid FK | |
| estado_id | uuid FK | |
| calidad_id | uuid FK | |
| cantidad | int | check >= 0 |
| **UNIQUE** | (variante_id, ubicacion_id, estado_id, calidad_id) | |

### `movimientos_inventario` (LIBRO MAYOR — inmutable)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| fecha | timestamptz | default now() |
| tipo | text | `ENTRADA`, `SALIDA`, `TRANSFERENCIA`, `TRANSFORMACION`, `AJUSTE`, `REVERSO` |
| variante_id | uuid FK | |
| ubicacion_origen_id | uuid FK null | |
| estado_origen_id | uuid FK null | |
| calidad_origen_id | uuid FK null | |
| ubicacion_destino_id | uuid FK null | |
| estado_destino_id | uuid FK null | |
| calidad_destino_id | uuid FK null | |
| cantidad | int | check > 0 |
| doc_tipo | text | `COMPRA`, `PRODUCCION`, `TRANSFERENCIA`, `VENTA`, `AJUSTE` |
| doc_id | uuid | id del documento origen |
| created_by | uuid FK | |

> Un movimiento con origen y destino (ambos no nulos) representa una **transformación/transferencia** (resta del origen, suma al destino). Solo destino = ENTRADA. Solo origen = SALIDA.

## 7. Producción / maquila

### `ordenes_produccion`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| numero | text | |
| proceso_id | uuid FK | estampación/bordado/aplique/empaque |
| fecha_inicio | date | |
| fecha_fin | date null | |
| estado | text | `ABIERTA` / `EN_PROCESO` / `CERRADA` / `CANCELADA` |

### `ordenes_produccion_detalle` (entradas: qué se metió a producir)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| orden_id | uuid FK | |
| variante_id | uuid FK | |
| estado_origen_id | uuid FK | ej. CRUDO |
| calidad_origen_id | uuid FK | |
| cantidad | int | check > 0 |

### `ordenes_produccion_resultado` (salidas: cómo quedó, por calidad)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| orden_id | uuid FK | |
| variante_id | uuid FK | |
| estado_destino_id | uuid FK | ej. TERMINADO |
| calidad_destino_id | uuid FK | PRIMERA / SEGUNDA / MERMA |
| cantidad | int | check > 0 |

> **Regla de balance:** `Σ entradas = Σ resultados` (incluida la merma). La RPC `sp_ejecutar_produccion` valida el balance y genera los movimientos `TRANSFORMACION`.

## 8. Vendedores, clientes y distribución

### `vendedores`
`id, tenant_id, nombre, documento, telefono, municipio, ubicacion_id (FK a ubicaciones tipo VENDEDOR), activo`

### `clientes`
`id, tenant_id, nombre, documento, telefono, direccion, municipio, vendedor_id (FK), activo`

### `transferencias` (central ↔ vendedor)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| numero | text | |
| ubicacion_origen_id | uuid FK | |
| ubicacion_destino_id | uuid FK | |
| fecha | date | |
| tipo | text | `ENVIO` (central→vendedor) / `RETORNO` (vendedor→central) |
| estado | text | `BORRADOR` / `CONFIRMADA` |

### `transferencias_detalle`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| transferencia_id | uuid FK | |
| variante_id | uuid FK | |
| calidad_id | uuid FK | se transfiere en estado `LISTO` |
| cantidad | int | check > 0 |

> **Retorno de viaje:** cuando el vendedor regresa, se registra una transferencia tipo `RETORNO` con lo no vendido; la RPC devuelve esas unidades al saldo de `CENTRAL / LISTO`.

## 9. Ventas y facturación

### `ventas`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| vendedor_id | uuid FK | |
| cliente_id | uuid FK | |
| municipio | text | denormalizado para reporte |
| fecha | date | |
| tipo_pago | text | `CONTADO` / `CREDITO` |
| subtotal | numeric(14,2) | |
| descuento | numeric(14,2) | default 0 |
| total | numeric(14,2) | |
| estado | text | `CONFIRMADA` / `ANULADA` |

### `ventas_detalle`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| venta_id | uuid FK | |
| variante_id | uuid FK | |
| calidad_id | uuid FK | primera/segunda |
| cantidad | int | check > 0 |
| precio_unitario | numeric(14,2) | |
| subtotal | numeric(14,2) | |

### `facturas`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| venta_id | uuid FK unique | |
| numero | text | consecutivo por tenant |
| fecha | date | |
| pdf_url | text null | path en Supabase Storage |

## 10. Cartera / cuentas por cobrar

### `cuentas_por_cobrar`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| factura_id | uuid FK unique | |
| cliente_id | uuid FK | |
| vendedor_id | uuid FK | |
| fecha_venta | date | |
| dias_credito | int | default 0 |
| fecha_vencimiento | date null | fecha_venta + dias_credito |
| valor_original | numeric(14,2) | |
| total_abonado | numeric(14,2) | default 0 |
| saldo_pendiente | numeric(14,2) | check >= 0 |
| estado | text | `PENDIENTE` / `PARCIAL` / `PAGADA` / `VENCIDA` |

### `abonos`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| cuenta_id | uuid FK | |
| fecha | date | |
| monto | numeric(14,2) | check > 0 |
| forma_pago | text | `EFECTIVO` / `CONSIGNACION` / `TRANSFERENCIA` / `OTRO` |
| comprobante_url | text null | Storage |
| observacion | text null | |

> La RPC `sp_registrar_abono` suma al `total_abonado`, recalcula `saldo_pendiente` y actualiza el `estado` (`PARCIAL` o `PAGADA`). Valida que `monto <= saldo_pendiente`.

## 11. DDL de referencia (extracto para Supabase)

```sql
-- Extensiones
create extension if not exists "pgcrypto";

-- Tenants y usuarios
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  creado_en timestamptz not null default now()
);

create table public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id),
  nombre text not null,
  rol text not null check (rol in ('admin','produccion','vendedor')),
  vendedor_id uuid,
  activo boolean not null default true
);

-- Catálogos
create table public.estados_inventario (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  codigo text not null,
  nombre text not null,
  orden int not null default 0,
  disponible_venta boolean not null default false,
  unique (tenant_id, codigo)
);

create table public.calidades (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  codigo text not null,
  nombre text not null,
  comercializable boolean not null default true,
  unique (tenant_id, codigo)
);

-- Inventario: saldo
create table public.inventario (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  variante_id uuid not null,
  ubicacion_id uuid not null,
  estado_id uuid not null,
  calidad_id uuid not null,
  cantidad int not null default 0 check (cantidad >= 0),
  unique (variante_id, ubicacion_id, estado_id, calidad_id)
);

-- Inventario: libro mayor (inmutable)
create table public.movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  fecha timestamptz not null default now(),
  tipo text not null check (tipo in ('ENTRADA','SALIDA','TRANSFERENCIA','TRANSFORMACION','AJUSTE','REVERSO')),
  variante_id uuid not null,
  ubicacion_origen_id uuid, estado_origen_id uuid, calidad_origen_id uuid,
  ubicacion_destino_id uuid, estado_destino_id uuid, calidad_destino_id uuid,
  cantidad int not null check (cantidad > 0),
  doc_tipo text not null,
  doc_id uuid not null,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

-- Cartera
create table public.cuentas_por_cobrar (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  factura_id uuid not null unique,
  cliente_id uuid not null,
  vendedor_id uuid not null,
  fecha_venta date not null,
  dias_credito int not null default 0,
  fecha_vencimiento date,
  valor_original numeric(14,2) not null,
  total_abonado numeric(14,2) not null default 0,
  saldo_pendiente numeric(14,2) not null check (saldo_pendiente >= 0),
  estado text not null default 'PENDIENTE'
    check (estado in ('PENDIENTE','PARCIAL','PAGADA','VENCIDA'))
);

create table public.abonos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  cuenta_id uuid not null references public.cuentas_por_cobrar(id),
  fecha date not null default current_date,
  monto numeric(14,2) not null check (monto > 0),
  forma_pago text not null check (forma_pago in ('EFECTIVO','CONSIGNACION','TRANSFERENCIA','OTRO')),
  comprobante_url text,
  observacion text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
```

> El DDL completo (todas las tablas, índices, RLS y funciones RPC) se versiona en `supabase/migrations/`. Este extracto muestra el patrón; ver `06-api-endpoints.md` para las firmas de las funciones RPC.

## 12. Vistas de apoyo (reportes)

- `v_inventario_disponible`: saldo por variante/ubicación **solo** estados con `disponible_venta = true`.
- `v_inventario_por_vendedor`: cantidades por vendedor, variante, calidad.
- `v_trazabilidad_variante`: une movimientos para seguir una variante de compra a venta.
- `v_cartera_cliente`: saldos por cliente/vendedor/factura con estado y vencimiento.
- `v_ventas_por_municipio`: ventas agregadas por municipio y vendedor.

## 13. Índices recomendados
- `movimientos_inventario (tenant_id, variante_id, fecha)`
- `inventario (tenant_id, ubicacion_id)`
- `ventas (tenant_id, vendedor_id, fecha)`
- `cuentas_por_cobrar (tenant_id, estado, fecha_vencimiento)`
- `abonos (cuenta_id, fecha)`
