"use server";

// ---------------------------------------------------------------------
// Server Actions para Producción y Distribución (Bloque 3).
// - crearOrdenProduccion (cabecera + entradas desde CRUDO)
// - ejecutarProduccion (resultados por calidad) -> RPC sp_ejecutar_produccion
// - empacar (TERMINADO -> LISTO) -> RPC sp_empacar
// - crearTransferencia + confirmar (CENTRAL -> VENDEDOR) -> sp_transferir_inventario
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

// ---------------------------------------------------------------------
// CREAR ORDEN DE PRODUCCIÓN (cabecera + entradas)
// entradas: JSON [{ variante_id, cantidad }]  (se toman desde CRUDO/PRIMERA)
// ---------------------------------------------------------------------
export async function crearOrdenProduccion(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId, userId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };

  const numero = String(formData.get("numero") ?? "").trim();
  const proceso_id = String(formData.get("proceso_id") ?? "");
  const entradasRaw = String(formData.get("entradas") ?? "[]");

  if (!numero || !proceso_id) return { ok: false, error: "Número y proceso son obligatorios." };

  let entradas: { variante_id: string; cantidad: number }[] = [];
  try {
    entradas = JSON.parse(entradasRaw);
  } catch {
    return { ok: false, error: "Entradas inválidas." };
  }
  entradas = entradas.filter((e) => e.cantidad > 0);
  if (entradas.length === 0) return { ok: false, error: "Agrega al menos una unidad a producir." };

  // Catálogos de estado/calidad de origen (CRUDO / PRIMERA)
  const { data: estCrudo } = await supabase
    .from("estados_inventario").select("id").eq("tenant_id", tenantId).eq("codigo", "CRUDO").single();
  const { data: calPrimera } = await supabase
    .from("calidades").select("id").eq("tenant_id", tenantId).eq("codigo", "PRIMERA").single();

  // 1. Cabecera
  const { data: orden, error } = await supabase
    .from("ordenes_produccion")
    .insert({
      tenant_id: tenantId,
      numero,
      proceso_id,
      estado: "ABIERTA",
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  // 2. Entradas
  const detalle = entradas.map((e) => ({
    orden_id: orden.id,
    variante_id: e.variante_id,
    estado_origen_id: estCrudo?.id,
    calidad_origen_id: calPrimera?.id,
    cantidad: e.cantidad,
  }));
  const { error: errDet } = await supabase.from("ordenes_produccion_detalle").insert(detalle);
  if (errDet) return { ok: false, error: errDet.message };

  revalidatePath("/produccion");
  return { ok: true };
}

// ---------------------------------------------------------------------
// EJECUTAR PRODUCCIÓN (cierra con resultados por calidad)
// resultados: JSON [{ variante_id, calidad_codigo, cantidad }]  -> TERMINADO
// ---------------------------------------------------------------------
export async function ejecutarProduccion(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };

  const orden_id = String(formData.get("orden_id") ?? "");
  const resultadosRaw = String(formData.get("resultados") ?? "[]");

  let resultados: { variante_id: string; calidad_codigo: string; cantidad: number }[] = [];
  try {
    resultados = JSON.parse(resultadosRaw);
  } catch {
    return { ok: false, error: "Resultados inválidos." };
  }
  resultados = resultados.filter((r) => r.cantidad > 0);
  if (resultados.length === 0) return { ok: false, error: "Ingresa los resultados de la producción." };

  // Resolver ids de estado TERMINADO y de cada calidad
  const { data: estTerm } = await supabase
    .from("estados_inventario").select("id").eq("tenant_id", tenantId).eq("codigo", "TERMINADO").single();
  const { data: calidades } = await supabase
    .from("calidades").select("id, codigo").eq("tenant_id", tenantId);

  const p_resultados = resultados.map((r) => ({
    variante_id: r.variante_id,
    estado_destino_id: estTerm?.id,
    calidad_destino_id: calidades?.find((c) => c.codigo === r.calidad_codigo)?.id,
    cantidad: r.cantidad,
  }));

  const { error } = await supabase.rpc("sp_ejecutar_produccion", {
    p_orden_id: orden_id,
    p_resultados,
  });

  if (error) {
    const msg = error.message.includes("BALANCE_NO_CUADRA")
      ? "El total de resultados no coincide con lo que entró a producir."
      : error.message.includes("ORDEN_NO_ABIERTA")
      ? "La orden ya fue cerrada o no está abierta."
      : error.message;
    return { ok: false, error: msg };
  }

  revalidatePath("/produccion");
  return { ok: true };
}

// ---------------------------------------------------------------------
// EMPACAR (TERMINADO -> LISTO) -> RPC sp_empacar
// ---------------------------------------------------------------------
export async function empacar(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };

  const variante_id = String(formData.get("variante_id") ?? "");
  const calidad_id = String(formData.get("calidad_id") ?? "");
  const cantidad = Number(formData.get("cantidad") ?? 0);
  const ubicacion_id = String(formData.get("ubicacion_id") ?? "");

  if (!variante_id || !calidad_id || cantidad <= 0 || !ubicacion_id) {
    return { ok: false, error: "Datos de empaque incompletos." };
  }

  const { error } = await supabase.rpc("sp_empacar", {
    p_variante_id: variante_id,
    p_calidad_id: calidad_id,
    p_cantidad: cantidad,
    p_ubicacion_id: ubicacion_id,
  });

  if (error) {
    const msg = error.message.includes("SALDO_INSUFICIENTE")
      ? "No hay suficientes unidades TERMINADAS para empacar."
      : error.message;
    return { ok: false, error: msg };
  }

  revalidatePath("/produccion");
  return { ok: true };
}

// ---------------------------------------------------------------------
// DISTRIBUCIÓN: crear transferencia CENTRAL -> VENDEDOR y confirmarla.
// items: JSON [{ variante_id, calidad_id, cantidad }]  (en estado LISTO)
// ---------------------------------------------------------------------
export async function distribuir(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId, userId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };

  const vendedor_id = String(formData.get("vendedor_id") ?? "");
  const numero = String(formData.get("numero") ?? "").trim();
  const itemsRaw = String(formData.get("items") ?? "[]");

  if (!vendedor_id || !numero) return { ok: false, error: "Vendedor y número son obligatorios." };

  let items: { variante_id: string; calidad_id: string; cantidad: number }[] = [];
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    return { ok: false, error: "Ítems inválidos." };
  }
  items = items.filter((i) => i.cantidad > 0);
  if (items.length === 0) return { ok: false, error: "Agrega al menos una unidad a enviar." };

  // Ubicaciones: CENTRAL (origen) y la del vendedor (destino)
  const { data: central } = await supabase
    .from("ubicaciones").select("id").eq("tenant_id", tenantId).eq("tipo", "CENTRAL").single();
  const { data: vendedor } = await supabase
    .from("vendedores").select("ubicacion_id").eq("id", vendedor_id).single();

  if (!central?.id || !vendedor?.ubicacion_id) {
    return { ok: false, error: "No se encontró la ubicación central o del vendedor." };
  }

  // 1. Cabecera de transferencia (ENVIO)
  const { data: tr, error } = await supabase
    .from("transferencias")
    .insert({
      tenant_id: tenantId,
      numero,
      ubicacion_origen_id: central.id,
      ubicacion_destino_id: vendedor.ubicacion_id,
      tipo: "ENVIO",
      estado: "BORRADOR",
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  // 2. Detalle
  const detalle = items.map((i) => ({
    transferencia_id: tr.id,
    variante_id: i.variante_id,
    calidad_id: i.calidad_id,
    cantidad: i.cantidad,
  }));
  const { error: errDet } = await supabase.from("transferencias_detalle").insert(detalle);
  if (errDet) return { ok: false, error: errDet.message };

  // 3. Confirmar (mueve el inventario) -> RPC
  const { error: errConf } = await supabase.rpc("sp_transferir_inventario", {
    p_transferencia_id: tr.id,
  });
  if (errConf) {
    const msg = errConf.message.includes("SALDO_INSUFICIENTE")
      ? "No hay suficiente inventario LISTO en el central para enviar."
      : errConf.message;
    return { ok: false, error: msg };
  }

  revalidatePath("/distribucion");
  return { ok: true };
}
