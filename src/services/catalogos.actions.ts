"use server";

// ---------------------------------------------------------------------
// Server Actions para el CRUD de Catálogos (Bloque 1).
// Productos, Variantes (+ precios) y Vendedores (+ ubicacion).
// Todas resuelven el tenant del usuario y respetan RLS.
// ---------------------------------------------------------------------
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: boolean; error?: string };

// Helper: obtiene el tenant_id del usuario autenticado
async function getTenant() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, tenantId: null as string | null };
  const { data } = await supabase
    .from("usuarios")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  return { supabase, tenantId: (data?.tenant_id as string) ?? null };
}

// ---------------------------------------------------------------------
// PRODUCTOS
// ---------------------------------------------------------------------
export async function crearProducto(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };

  const nombre = String(formData.get("nombre") ?? "").trim();
  const tipo_producto_id = String(formData.get("tipo_producto_id") ?? "");
  const genero = String(formData.get("genero") ?? "UNISEX");

  if (!nombre || !tipo_producto_id) {
    return { ok: false, error: "Nombre y tipo son obligatorios." };
  }

  const { error } = await supabase.from("productos").insert({
    tenant_id: tenantId,
    nombre,
    tipo_producto_id,
    genero,
    activo: true,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/catalogos/productos");
  return { ok: true };
}

// ---------------------------------------------------------------------
// VARIANTES (+ precio por calidad opcional)
// ---------------------------------------------------------------------
export async function crearVariante(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };

  const producto_id = String(formData.get("producto_id") ?? "");
  const referencia = String(formData.get("referencia") ?? "").trim();
  const color_id = String(formData.get("color_id") ?? "");
  const talla_id = String(formData.get("talla_id") ?? "");
  const precio_base = Number(formData.get("precio_base") ?? 0);
  const precio_segunda = Number(formData.get("precio_segunda") ?? 0);

  if (!producto_id || !referencia || !color_id || !talla_id) {
    return { ok: false, error: "Producto, referencia, color y talla son obligatorios." };
  }

  // Construir SKU: referencia-COLOR-TALLA (usa codigos de catalogo)
  const { data: color } = await supabase.from("colores").select("codigo").eq("id", color_id).single();
  const { data: talla } = await supabase.from("tallas").select("codigo").eq("id", talla_id).single();
  const sku = `${referencia}-${color?.codigo ?? "X"}-${talla?.codigo ?? "X"}`;

  const { data: variante, error } = await supabase
    .from("variantes")
    .insert({
      tenant_id: tenantId,
      producto_id,
      referencia,
      color_id,
      talla_id,
      sku,
      precio_base: precio_base || 0,
      activo: true,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  // Precios por calidad (PRIMERA = precio_base, SEGUNDA = precio_segunda si viene)
  const { data: calidades } = await supabase
    .from("calidades")
    .select("id, codigo")
    .eq("tenant_id", tenantId);

  const primera = calidades?.find((c) => c.codigo === "PRIMERA");
  const segunda = calidades?.find((c) => c.codigo === "SEGUNDA");
  const filas: { tenant_id: string; variante_id: string; calidad_id: string; precio: number }[] = [];
  if (primera && precio_base > 0)
    filas.push({ tenant_id: tenantId, variante_id: variante.id, calidad_id: primera.id, precio: precio_base });
  if (segunda && precio_segunda > 0)
    filas.push({ tenant_id: tenantId, variante_id: variante.id, calidad_id: segunda.id, precio: precio_segunda });
  if (filas.length) await supabase.from("precios").insert(filas);

  revalidatePath("/catalogos/variantes");
  return { ok: true };
}

// ---------------------------------------------------------------------
// VENDEDORES (+ ubicacion tipo VENDEDOR)
// ---------------------------------------------------------------------
export async function crearVendedor(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };

  const nombre = String(formData.get("nombre") ?? "").trim();
  const documento = String(formData.get("documento") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const municipio = String(formData.get("municipio") ?? "").trim();

  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };

  // 1. Crear el vendedor
  const { data: vendedor, error } = await supabase
    .from("vendedores")
    .insert({
      tenant_id: tenantId,
      nombre,
      documento: documento || null,
      telefono: telefono || null,
      municipio: municipio || null,
      activo: true,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  // 2. Crear su ubicacion tipo VENDEDOR y enlazarla
  const { data: ubic, error: errUbic } = await supabase
    .from("ubicaciones")
    .insert({
      tenant_id: tenantId,
      tipo: "VENDEDOR",
      nombre: `Ruta ${nombre}`,
      vendedor_id: vendedor.id,
    })
    .select("id")
    .single();

  if (errUbic) return { ok: false, error: errUbic.message };

  await supabase.from("vendedores").update({ ubicacion_id: ubic.id }).eq("id", vendedor.id);

  revalidatePath("/catalogos/vendedores");
  return { ok: true };
}
