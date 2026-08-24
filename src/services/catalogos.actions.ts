"use server";

// ---------------------------------------------------------------------
// Server Actions · CRUD Catálogos (Create + Update + Inactivar/Reactivar).
// Productos, Variantes (+ precios) y Vendedores.
// "Delete" = inactivar (soft delete) para preservar trazabilidad.
// ---------------------------------------------------------------------
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: boolean; error?: string };

async function getTenant() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, tenantId: null as string | null };
  const { data } = await supabase.from("usuarios").select("tenant_id").eq("id", user.id).single();
  return { supabase, tenantId: (data?.tenant_id as string) ?? null };
}

// =====================================================================
// PRODUCTOS
// =====================================================================
export async function crearProducto(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };

  const nombre = String(formData.get("nombre") ?? "").trim();
  const tipo_producto_id = String(formData.get("tipo_producto_id") ?? "");
  const genero = String(formData.get("genero") ?? "UNISEX");
  if (!nombre || !tipo_producto_id) return { ok: false, error: "Nombre y tipo son obligatorios." };

  const { error } = await supabase.from("productos").insert({
    tenant_id: tenantId, nombre, tipo_producto_id, genero, activo: true,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/catalogos/productos");
  return { ok: true };
}

export async function editarProducto(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };

  const id = String(formData.get("id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const tipo_producto_id = String(formData.get("tipo_producto_id") ?? "");
  const genero = String(formData.get("genero") ?? "UNISEX");
  if (!id || !nombre || !tipo_producto_id) return { ok: false, error: "Datos incompletos." };

  const { error } = await supabase
    .from("productos")
    .update({ nombre, tipo_producto_id, genero })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/catalogos/productos");
  return { ok: true };
}

export async function toggleProducto(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };
  const id = String(formData.get("id") ?? "");
  const activo = String(formData.get("activo") ?? "true") === "true";
  const { error } = await supabase.from("productos").update({ activo: !activo }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/catalogos/productos");
  return { ok: true };
}

// =====================================================================
// VARIANTES (+ precios)
// =====================================================================
export async function crearVariante(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };

  const producto_id = String(formData.get("producto_id") ?? "");
  const referencia = String(formData.get("referencia") ?? "").trim();
  const color_id = String(formData.get("color_id") ?? "");
  const talla_id = String(formData.get("talla_id") ?? "");
  const precio_base = Number(formData.get("precio_base") ?? 0);
  const precio_segunda = Number(formData.get("precio_segunda") ?? 0);
  if (!producto_id || !referencia || !color_id || !talla_id)
    return { ok: false, error: "Producto, referencia, color y talla son obligatorios." };

  const { data: color } = await supabase.from("colores").select("codigo").eq("id", color_id).single();
  const { data: talla } = await supabase.from("tallas").select("codigo").eq("id", talla_id).single();
  const sku = `${referencia}-${color?.codigo ?? "X"}-${talla?.codigo ?? "X"}`;

  const { data: variante, error } = await supabase
    .from("variantes")
    .insert({ tenant_id: tenantId, producto_id, referencia, color_id, talla_id, sku, precio_base: precio_base || 0, activo: true })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  await upsertPrecios(supabase, tenantId, variante.id, precio_base, precio_segunda);
  revalidatePath("/catalogos/variantes");
  return { ok: true };
}

export async function editarVariante(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };

  const id = String(formData.get("id") ?? "");
  const referencia = String(formData.get("referencia") ?? "").trim();
  const precio_base = Number(formData.get("precio_base") ?? 0);
  const precio_segunda = Number(formData.get("precio_segunda") ?? 0);
  if (!id || !referencia) return { ok: false, error: "Referencia obligatoria." };

  // Nota: no cambiamos color/talla (afectarían el SKU y el histórico). Solo referencia y precios.
  const { error } = await supabase.from("variantes").update({ referencia, precio_base: precio_base || 0 }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await upsertPrecios(supabase, tenantId, id, precio_base, precio_segunda);
  revalidatePath("/catalogos/variantes");
  return { ok: true };
}

export async function toggleVariante(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };
  const id = String(formData.get("id") ?? "");
  const activo = String(formData.get("activo") ?? "true") === "true";
  const { error } = await supabase.from("variantes").update({ activo: !activo }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/catalogos/variantes");
  return { ok: true };
}

// Helper: upsert de precios por calidad
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertPrecios(supabase: any, tenantId: string, varianteId: string, precioPrimera: number, precioSegunda: number) {
  const { data: calidades } = await supabase.from("calidades").select("id, codigo").eq("tenant_id", tenantId);
  const primera = calidades?.find((c: { codigo: string }) => c.codigo === "PRIMERA");
  const segunda = calidades?.find((c: { codigo: string }) => c.codigo === "SEGUNDA");
  const filas: { tenant_id: string; variante_id: string; calidad_id: string; precio: number }[] = [];
  if (primera && precioPrimera > 0) filas.push({ tenant_id: tenantId, variante_id: varianteId, calidad_id: primera.id, precio: precioPrimera });
  if (segunda && precioSegunda > 0) filas.push({ tenant_id: tenantId, variante_id: varianteId, calidad_id: segunda.id, precio: precioSegunda });
  if (filas.length) {
    await supabase.from("precios").upsert(filas, { onConflict: "variante_id,calidad_id" });
  }
}

// =====================================================================
// VENDEDORES
// =====================================================================
export async function crearVendedor(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };

  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };

  const { data: vendedor, error } = await supabase
    .from("vendedores")
    .insert({
      tenant_id: tenantId, nombre,
      documento: String(formData.get("documento") ?? "") || null,
      telefono: String(formData.get("telefono") ?? "") || null,
      municipio: String(formData.get("municipio") ?? "") || null,
      activo: true,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  const { data: ubic, error: errUbic } = await supabase
    .from("ubicaciones")
    .insert({ tenant_id: tenantId, tipo: "VENDEDOR", nombre: `Ruta ${nombre}`, vendedor_id: vendedor.id })
    .select("id")
    .single();
  if (errUbic) return { ok: false, error: errUbic.message };

  await supabase.from("vendedores").update({ ubicacion_id: ubic.id }).eq("id", vendedor.id);
  revalidatePath("/catalogos/vendedores");
  return { ok: true };
}

export async function editarVendedor(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };

  const id = String(formData.get("id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!id || !nombre) return { ok: false, error: "El nombre es obligatorio." };

  const { error } = await supabase
    .from("vendedores")
    .update({
      nombre,
      documento: String(formData.get("documento") ?? "") || null,
      telefono: String(formData.get("telefono") ?? "") || null,
      municipio: String(formData.get("municipio") ?? "") || null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/catalogos/vendedores");
  return { ok: true };
}

export async function toggleVendedor(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };
  const id = String(formData.get("id") ?? "");
  const activo = String(formData.get("activo") ?? "true") === "true";
  const { error } = await supabase.from("vendedores").update({ activo: !activo }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/catalogos/vendedores");
  return { ok: true };
}
