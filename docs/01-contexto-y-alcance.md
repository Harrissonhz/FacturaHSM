# 01 · Contexto de negocio y alcance

## 1. Descripción del negocio

El cliente comercializa **prendas (principalmente camisas básicas)** que compra sin terminar y a las que **agrega valor** mediante procesos de maquila (estampación, bordado, apliques, empaque). Una vez terminadas, las prendas se **distribuyen entre vendedores** que viajan a municipios de **Antioquia**, visitan clientes y realizan principalmente **ventas a crédito**, que luego se recaudan mediante **abonos parciales** hasta el pago total.

**FacturacionHSM** es un **sistema POS nuevo** que debe gestionar todo ese ciclo: compras, proveedores, inventario, producción, ventas y facturación en **PDF (no factura electrónica)**, más la gestión de **cartera / cuentas por cobrar**.

## 2. Objetivo del sistema

Construir un sistema **completamente nuevo** que:
1. Gestione el ciclo comercial completo (compra → cartera).
2. Modele el **inventario por estados/etapas** y por **calidad** de forma independiente.
3. Controle el **inventario asignado a cada vendedor** y los movimientos entre ubicaciones.
4. Soporte **ventas a crédito** con generación de **factura PDF**.
5. Administre la **cartera** con abonos parciales, saldos y estados.
6. Garantice **trazabilidad y auditoría** de extremo a extremo.
7. Sea **genérico y reutilizable** dentro del SaaS **Kubit**.

## 3. Prioridad de construcción (orden del cliente)

```
INVENTARIO → PRODUCCIÓN/MAQUILA → DISTRIBUCIÓN POR VENDEDORES → VENTA A CRÉDITO → CARTERA
```

## 4. Alcance

### 4.1. Dentro del alcance (funcionalidades a CONSTRUIR)
- Catálogos: Productos, Referencias, Tipos de producto, Género (Dama/Hombre), Tallas, Colores.
- Proveedores.
- Compras / órdenes de compra con estado pendiente.
- Recepción de mercancía con **recibos parciales**.
- Inventario base (saldos por variante/ubicación).
- Ventas.
- Facturación y **generación de factura en PDF**.

### 4.2. Dentro del alcance (funcionalidades a DISEÑAR)
- Inventario por **estados/etapas** del proceso.
- Flujo de **transformación / producción / maquila**.
- Movimientos de inventario entre estados.
- **Clasificación de calidad** (primera, segunda, merma).
- **Inventario asignado a vendedores** y transferencias hacia/desde vendedores.
- Retorno al inventario disponible de lo no vendido al regresar el vendedor.
- **Ventas a crédito**.
- Modelo de **cuentas por cobrar / cartera**.
- **Abonos parciales**, saldo pendiente, estados de cuenta, historial de pagos.
- **Reportes**: inventario (por estado, vendedor, producto, referencia, talla, color), ventas (por vendedor y municipio), cartera (por cliente, vendedor y factura).
- **Trazabilidad completa** compra → venta → pago.

### 4.3. Fuera del alcance (por ahora)
- **Factura electrónica DIAN** (solo factura en PDF).
- Contabilidad/impuestos avanzados.
- Integración con pasarelas de pago en línea (los abonos se registran manualmente).
- Aplicación móvil nativa (se prioriza web responsive).

## 5. Actores del sistema

| Actor | Descripción |
|-------|-------------|
| **Administrador / Dueño** | Configura catálogos, compras, producción y distribución; ve todos los reportes. |
| **Operario de producción** | Registra órdenes de producción y sus resultados (primera/segunda/merma). |
| **Vendedor** | Recibe inventario, realiza ventas a crédito, registra abonos en campo. |
| **Cliente** (dato, no usuario) | Comprador final asociado a un vendedor y municipio. |
| **Proveedor** (dato, no usuario) | Suministra las prendas en crudo. |

## 6. Glosario (lenguaje ubicuo)

| Término | Definición |
|---------|-----------|
| **Variante / SKU** | Combinación única de referencia + tipo + género + color + talla. Es la unidad mínima de inventario. |
| **Estado / Etapa** | Fase del proceso productivo de una unidad: `CRUDO`, `EN_PRODUCCION`, `TERMINADO`, `LISTO`. |
| **Calidad** | Condición comercial de una unidad: `PRIMERA`, `SEGUNDA`, `MERMA`. Independiente del estado. |
| **Ubicación** | Lugar/responsable donde reside el inventario: `CENTRAL` o un vendedor. |
| **Movimiento** | Registro inmutable de un cambio de inventario (entrada, salida, transferencia, transformación, ajuste). |
| **Orden de producción** | Documento que transforma unidades de un estado/calidad a otro (maquila). |
| **Transferencia** | Movimiento de inventario entre dos ubicaciones (central ↔ vendedor). |
| **Venta a crédito** | Venta cuyo pago se difiere y genera una cuenta por cobrar. |
| **Cartera / CxC** | Cuenta por cobrar generada por una factura a crédito. |
| **Abono** | Pago parcial que reduce el saldo pendiente de una cuenta por cobrar. |
| **Merma** | Unidad no comercializable (pérdida). |
| **Recibo parcial** | Recepción incompleta de una compra; deja saldo pendiente por recibir. |

## 7. Ejemplo canónico (caso de referencia del sistema)

Se compra **50 camisas** (referencia X, talla M, color azul):
1. Se reciben 50 → entran a `CENTRAL` en estado **CRUDO**.
2. Pasan a **EN_PRODUCCION** (estampación).
3. Resultado: **48 PRIMERA** + **2 SEGUNDA** → estado **TERMINADO** → luego **LISTO**.
4. Distribución: Vendedor A recibe 30, Vendedor B recibe 20.
5. Vendedor A vende 10 a crédito al Cliente X en Jericó por **\$700.000** → su saldo pasa de 30 a 20 disponibles.
6. Se genera **factura PDF** y una **cuenta por cobrar** de \$700.000.
7. Abono 1: \$100.000 → saldo \$600.000. Abono 2: \$200.000 → saldo \$400.000. Pago final: \$400.000 → **CANCELADA**.

> Este caso se usa como **prueba de aceptación end-to-end** en `08-plan-de-pruebas.md`.

## 8. Supuestos y decisiones iniciales
- El inventario se maneja por **cantidades por variante**, no por número de serie individual (la trazabilidad es a nivel de lote/movimiento, no de pieza individual).
- La factura PDF lleva numeración consecutiva por tenant.
- Un cliente pertenece principalmente a un vendedor/municipio, pero el modelo permite flexibilidad.
- La moneda es **COP (pesos colombianos)**.
