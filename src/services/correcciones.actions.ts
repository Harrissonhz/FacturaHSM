"use server";

// ---------------------------------------------------------------------
// Server Actions · Correcciones (7.2b) + fix cliente/vendedor flexible
//  - Clientes: crear / editar (con vendedor de referencia) / inactivar
//  - Anular venta -> RPC sp_anular_venta
//  - Ajuste de inventario -> RPC sp_ajustar_inventario
// Nota: el vendedor asignado al cliente es solo REFERENCIA (vendedor
// habitual). NO restringe a quién se le puede vender: cualquier vendedor
// puede venderle a cualquier cliente (clientes = de la empresa).
// ---------------------------------------------------------------------
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: boolean; error?: string };

async function getTenant() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, tenantId: null as string | null };
  const { data } = await supabase.from("usuarios").select("tenant_id").eq("id", user.id).single();
  return { supabase, tenantId: (data?.tenant_id as string) ?? null };
}

// =====================================================================
// CLIENTES
// =====================================================================
export async function crearClienteAdmin(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };

  const nombre = String(formData.get("nombre") ?? "").trim();
  const vendedor_id = String(formData.get("vendedor_id") ?? "");
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };

  const { error } = await supabase.from("clientes").insert({
    tenant_id: tenantId,
    nombre,
    documento: String(formData.get("documento") ?? "") || null,
    telefono: String(formData.get("telefono") ?? "") || null,
    direccion: String(formData.get("direccion") ?? "") || null,
    municipio: String(formData.get("municipio") ?? "") || null,
    vendedor_id: vendedor_id || null,
    activo: true,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/clientes");
  return { ok: true };
}

export async function editarCliente(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };

  const id = String(formData.get("id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!id || !nombre) return { ok: false, error: "El nombre es obligatorio." };

  // vendedor_id puede venir vacío ("— Sin asignar —"). Es solo referencia.
  const vendedor_id = String(formData.get("vendedor_id") ?? "");

  const { error } = await supabase
    .from("clientes")
    .update({
      nombre,
      documento: String(formData.get("documento") ?? "") || null,
      telefono: String(formData.get("telefono") ?? "") || null,
      direccion: String(formData.get("direccion") ?? "") || null,
      municipio: String(formData.get("municipio") ?? "") || null,
      vendedor_id: vendedor_id || null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/clientes");
  return { ok: true };
}

export async function toggleCliente(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };
  const id = String(formData.get("id") ?? "");
  const activo = String(formData.get("activo") ?? "true") === "true";
  const { error } = await supabase.from("clientes").update({ activo: !activo }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/clientes");
  return { ok: true };
}

// =====================================================================
// ANULAR VENTA -> RPC sp_anular_venta
// =====================================================================
export async function anularVenta(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };

  const venta_id = String(formData.get("venta_id") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!venta_id) return { ok: false, error: "Venta inválida." };
  if (!motivo) return { ok: false, error: "Indica el motivo de la anulación." };

  const { error } = await supabase.rpc("sp_anular_venta", {
    p_venta_id: venta_id,
    p_motivo: motivo,
  });

  if (error) {
    const msg = error.message.includes("TIENE_ABONOS") || error.message.includes("abono")
      ? "No se puede anular: la cuenta ya tiene abonos registrados."
      : error.message.includes("VENTA_YA_ANULADA")
      ? "La venta ya está anulada."
      : error.message;
    return { ok: false, error: msg };
  }

  revalidatePath("/ventas/historial");
  revalidatePath("/cartera");
  revalidatePath("/inventario");
  return { ok: true };
}

// =====================================================================
// AJUSTE DE INVENTARIO -> RPC sp_ajustar_inventario
// =====================================================================
export async function ajustarInventario(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };

  const variante_id = String(formData.get("variante_id") ?? "");
  const ubicacion_id = String(formData.get("ubicacion_id") ?? "");
  const estado_id = String(formData.get("estado_id") ?? "");
  const calidad_id = String(formData.get("calidad_id") ?? "");
  const delta = Number(formData.get("delta") ?? 0);
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!variante_id || !ubicacion_id || !estado_id || !calidad_id) {
    return { ok: false, error: "Datos de inventario incompletos." };
  }
  if (!delta || delta === 0) return { ok: false, error: "El ajuste no puede ser 0." };
  if (!motivo) return { ok: false, error: "Indica el motivo del ajuste." };

  const { error } = await supabase.rpc("sp_ajustar_inventario", {
    p_variante_id: variante_id,
    p_ubicacion_id: ubicacion_id,
    p_estado_id: estado_id,
    p_calidad_id: calidad_id,
    p_delta: delta,
    p_motivo: motivo,
  });

  if (error) {
    const msg = error.message.includes("SALDO_INSUFICIENTE")
      ? "El ajuste negativo dejaría el saldo por debajo de cero."
      : error.message.includes("DELTA_INVALIDO")
      ? "El ajuste no puede ser 0."
      : error.message;
    return { ok: false, error: msg };
  }

  revalidatePath("/inventario");
  return { ok: true };
}
