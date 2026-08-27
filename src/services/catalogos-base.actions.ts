"use server";

// ---------------------------------------------------------------------
// Server Actions · Catálogos base (Colores, Tallas, Tipos, Procesos)
// CRUD completo: crear / editar / inactivar-reactivar.
// Todas resuelven el tenant y respetan RLS.
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

// Helper genérico de crear/editar/toggle para catálogos simples con
// (tenant_id, codigo, nombre, activo). Tallas añade "orden".
async function crearGenerico(
  tabla: string, path: string, formData: FormData, extra?: Record<string, unknown>
): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };

  const codigo = String(formData.get("codigo") ?? "").trim().toUpperCase();
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!codigo || !nombre) return { ok: false, error: "Código y nombre son obligatorios." };

  const { error } = await supabase.from(tabla).insert({
    tenant_id: tenantId, codigo, nombre, activo: true, ...(extra ?? {}),
  });
  if (error) {
    const msg = error.message.includes("duplicate") || error.message.includes("unique")
      ? `Ya existe un registro con el código "${codigo}".`
      : error.message;
    return { ok: false, error: msg };
  }
  revalidatePath(path);
  return { ok: true };
}

async function editarGenerico(
  tabla: string, path: string, formData: FormData, extra?: Record<string, unknown>
): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };

  const id = String(formData.get("id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!id || !nombre) return { ok: false, error: "El nombre es obligatorio." };

  // El código no se edita (afecta SKUs y consistencia); solo nombre (+ extra).
  const { error } = await supabase.from(tabla).update({ nombre, ...(extra ?? {}) }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(path);
  return { ok: true };
}

async function toggleGenerico(tabla: string, path: string, formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };
  const id = String(formData.get("id") ?? "");
  const activo = String(formData.get("activo") ?? "true") === "true";
  const { error } = await supabase.from(tabla).update({ activo: !activo }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(path);
  return { ok: true };
}

// =====================================================================
// COLORES
// =====================================================================
export const crearColor = (fd: FormData) => crearGenerico("colores", "/catalogos/colores", fd);
export const editarColor = (fd: FormData) => editarGenerico("colores", "/catalogos/colores", fd);
export const toggleColor = (fd: FormData) => toggleGenerico("colores", "/catalogos/colores", fd);

// =====================================================================
// TALLAS (incluye "orden")
// =====================================================================
export const crearTalla = (fd: FormData) =>
  crearGenerico("tallas", "/catalogos/tallas", fd, { orden: Number(fd.get("orden") ?? 0) });
export const editarTalla = (fd: FormData) =>
  editarGenerico("tallas", "/catalogos/tallas", fd, { orden: Number(fd.get("orden") ?? 0) });
export const toggleTalla = (fd: FormData) => toggleGenerico("tallas", "/catalogos/tallas", fd);

// =====================================================================
// TIPOS DE PRODUCTO
// =====================================================================
export const crearTipo = (fd: FormData) => crearGenerico("tipos_producto", "/catalogos/tipos", fd);
export const editarTipo = (fd: FormData) => editarGenerico("tipos_producto", "/catalogos/tipos", fd);
export const toggleTipo = (fd: FormData) => toggleGenerico("tipos_producto", "/catalogos/tipos", fd);

// =====================================================================
// PROCESOS DE PRODUCCIÓN
// =====================================================================
export const crearProceso = (fd: FormData) => crearGenerico("procesos_produccion", "/catalogos/procesos", fd);
export const editarProceso = (fd: FormData) => editarGenerico("procesos_produccion", "/catalogos/procesos", fd);
export const toggleProceso = (fd: FormData) => toggleGenerico("procesos_produccion", "/catalogos/procesos", fd);
