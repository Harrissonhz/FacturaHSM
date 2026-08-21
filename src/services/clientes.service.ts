// ---------------------------------------------------------------------
// Servicio de Clientes (capa de aplicacion).
// Crear cliente nuevo asociado a un vendedor. La lectura se hace en el
// Server Component de la pagina de ventas.
// ---------------------------------------------------------------------
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ok, err, type Result } from "@/lib/result";

export const nuevoClienteSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  telefono: z.string().max(30).optional().nullable(),
  municipio: z.string().max(80).optional().nullable(),
  documento: z.string().max(30).optional().nullable(),
  vendedor_id: z.string().uuid(),
});

export type NuevoClienteInput = z.infer<typeof nuevoClienteSchema>;

export type ClienteCreado = {
  id: string;
  nombre: string;
  municipio: string | null;
};

export async function crearCliente(
  input: NuevoClienteInput
): Promise<Result<ClienteCreado>> {
  const parsed = nuevoClienteSchema.safeParse(input);
  if (!parsed.success) {
    return err("VALIDACION", parsed.error.issues[0]?.message ?? "Datos de cliente invalidos.");
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return err("NO_AUTENTICADO", "Debe iniciar sesion para crear un cliente.");
  }

  // tenant del usuario (para cumplir RLS)
  const { data: perfil } = await supabase
    .from("usuarios")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!perfil?.tenant_id) {
    return err("SIN_TENANT", "No se pudo resolver el tenant del usuario.");
  }

  const { data, error } = await supabase
    .from("clientes")
    .insert({
      tenant_id: perfil.tenant_id,
      nombre: parsed.data.nombre,
      telefono: parsed.data.telefono ?? null,
      municipio: parsed.data.municipio ?? null,
      documento: parsed.data.documento ?? null,
      vendedor_id: parsed.data.vendedor_id,
      activo: true,
    })
    .select("id, nombre, municipio")
    .single();

  if (error) {
    return err("ERROR_INTERNO", error.message);
  }

  return ok(data as ClienteCreado);
}
