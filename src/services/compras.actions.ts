"use server";

// ---------------------------------------------------------------------
// Server Actions para Compras y Recepción (Bloque 2).
// NÚMERO DE COMPRA AUTOMÁTICO (consecutivo por tenant): OC-000001, OC-000002...
// ---------------------------------------------------------------------
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: boolean; error?: string };

async function getTenant() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, tenantId: null as string | null, userId: null as string | null };
  const { data } = await supabase.from("usuarios").select("tenant_id").eq("id", user.id).single();
  return { supabase, tenantId: (data?.tenant_id as string) ?? null, userId: user.id };
}

// Genera el siguiente consecutivo para una tabla dada.
// prefijo: "OC", "OP", "ENV"... ; tabla con columna tenant_id.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function siguienteConsecutivo(supabase: any, tabla: string, tenantId: string, prefijo: string) {
  const { count } = await supabase
    .from(tabla)
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  const n = (count ?? 0) + 1;
  return `${prefijo}-${String(n).padStart(6, "0")}`;
}

// ---------------------------------------------------------------------
// PROVEEDORES
// ---------------------------------------------------------------------
export async function crearProveedor(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };

  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };

  const { error } = await supabase.from("proveedores").insert({
    tenant_id: tenantId,
    nombre,
    nit: String(formData.get("nit") ?? "") || null,
    telefono: String(formData.get("telefono") ?? "") || null,
    direccion: String(formData.get("direccion") ?? "") || null,
    activo: true,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/compras/proveedores");
  return { ok: true };
}

// ---------------------------------------------------------------------
// CREAR COMPRA (número automático OC-XXXXXX)
// items: JSON [{ variante_id, cantidad, costo }]
// ---------------------------------------------------------------------
export async function crearCompra(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId, userId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };

  const proveedor_id = String(formData.get("proveedor_id") ?? "");
  const itemsRaw = String(formData.get("items") ?? "[]");

  if (!proveedor_id) return { ok: false, error: "El proveedor es obligatorio." };

  let items: { variante_id: string; cantidad: number; costo: number }[] = [];
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    return { ok: false, error: "Detalle de compra inválido." };
  }
  if (items.length === 0) return { ok: false, error: "Agrega al menos un producto a la compra." };

  const total = items.reduce((s, it) => s + it.cantidad * it.costo, 0);
  const numero = await siguienteConsecutivo(supabase, "compras", tenantId, "OC");

  // 1. Cabecera
  const { data: compra, error } = await supabase
    .from("compras")
    .insert({
      tenant_id: tenantId,
      proveedor_id,
      numero,
      estado: "PENDIENTE",
      total,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  // 2. Detalle
  const detalle = items.map((it) => ({
    compra_id: compra.id,
    variante_id: it.variante_id,
    cantidad_solicitada: it.cantidad,
    cantidad_recibida: 0,
    costo_unitario: it.costo,
  }));
  const { error: errDet } = await supabase.from("compras_detalle").insert(detalle);
  if (errDet) return { ok: false, error: errDet.message };

  revalidatePath("/compras");
  return { ok: true };
}

// ---------------------------------------------------------------------
// RECIBIR MERCANCÍA (parcial o total) -> RPC sp_recibir_mercancia
// items: JSON [{ compra_detalle_id, cantidad }]
// ---------------------------------------------------------------------
export async function recibirMercancia(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };

  const compra_id = String(formData.get("compra_id") ?? "");
  const itemsRaw = String(formData.get("items") ?? "[]");

  let items: { compra_detalle_id: string; cantidad: number }[] = [];
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    return { ok: false, error: "Datos de recepción inválidos." };
  }
  items = items.filter((it) => it.cantidad > 0);
  if (items.length === 0) return { ok: false, error: "Ingresa al menos una cantidad a recibir." };

  const { error } = await supabase.rpc("sp_recibir_mercancia", {
    p_compra_id: compra_id,
    p_items: items,
  });

  if (error) {
    const msg = error.message.includes("RECIBO_EXCEDE_PENDIENTE")
      ? "La cantidad a recibir supera lo pendiente."
      : error.message.includes("COMPRA_NO_PENDIENTE")
      ? "La compra ya fue recibida o no está pendiente."
      : error.message;
    return { ok: false, error: msg };
  }

  revalidatePath("/compras");
  return { ok: true };
}
