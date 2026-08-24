"use server";

// ---------------------------------------------------------------------
// Server Actions · Proveedores (editar + inactivar/reactivar).
// Se añade a lo ya existente en compras.actions.ts (crearProveedor).
// Este archivo se puede fusionar dentro de compras.actions.ts o dejarse
// aparte importándolo. Para simplicidad, se entrega como archivo aparte:
//   src/services/proveedores.acciones.ts
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

export async function editarProveedor(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };

  const id = String(formData.get("id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!id || !nombre) return { ok: false, error: "El nombre es obligatorio." };

  const { error } = await supabase
    .from("proveedores")
    .update({
      nombre,
      nit: String(formData.get("nit") ?? "") || null,
      telefono: String(formData.get("telefono") ?? "") || null,
      direccion: String(formData.get("direccion") ?? "") || null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/compras/proveedores");
  return { ok: true };
}

export async function toggleProveedor(formData: FormData): Promise<ActionResult> {
  const { supabase, tenantId } = await getTenant();
  if (!tenantId) return { ok: false, error: "No autenticado." };
  const id = String(formData.get("id") ?? "");
  const activo = String(formData.get("activo") ?? "true") === "true";
  const { error } = await supabase.from("proveedores").update({ activo: !activo }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/compras/proveedores");
  return { ok: true };
}
