// ---------------------------------------------------------------------
// Helpers de sesion (lado servidor).
// Resuelven el usuario autenticado y su perfil (rol + tenant) desde
// la tabla public.usuarios. Se usan en Server Components y guardas.
// ---------------------------------------------------------------------
import { createClient } from "@/lib/supabase/server";

export type PerfilUsuario = {
  id: string;
  nombre: string;
  rol: "admin" | "produccion" | "vendedor";
  tenant_id: string;
  vendedor_id: string | null;
  activo: boolean;
  email: string | null;
};

/**
 * Devuelve el perfil del usuario autenticado, o null si no hay sesion
 * o si el perfil no existe / esta inactivo.
 */
export async function getPerfil(): Promise<PerfilUsuario | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil, error } = await supabase
    .from("usuarios")
    .select("id, nombre, rol, tenant_id, vendedor_id, activo")
    .eq("id", user.id)
    .single();

  if (error || !perfil || !(perfil as { activo: boolean }).activo) {
    return null;
  }

  return {
    ...(perfil as Omit<PerfilUsuario, "email">),
    email: user.email ?? null,
  };
}
