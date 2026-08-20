// ---------------------------------------------------------------------
// Servicio de Ventas (capa de aplicacion)
// Encapsula el caso de uso "Registrar venta a credito".
// Valida la entrada con zod y delega la logica atomica a la RPC
// sp_registrar_venta (Postgres). El frontend NUNCA descuenta inventario.
// ---------------------------------------------------------------------
import { createClient } from "@/lib/supabase/server";
import {
  registrarVentaSchema,
  type RegistrarVentaInput,
} from "@/lib/validation/venta.schema";
import { ok, err, mapRpcError, type Result } from "@/lib/result";

export type VentaRegistrada = {
  venta_id: string;
  factura_id: string;
  numero_factura: string;
  cuenta_id: string | null;
  total: number;
};

/**
 * Registra una venta (a credito o contado) de forma atomica.
 * - Valida la entrada.
 * - Verifica que haya usuario autenticado.
 * - Invoca la RPC transaccional sp_registrar_venta.
 */
export async function registrarVenta(
  input: RegistrarVentaInput
): Promise<Result<VentaRegistrada>> {
  // 1. Validacion de entrada (zod)
  const parsed = registrarVentaSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return err("VALIDACION", first?.message ?? "Datos de venta invalidos.");
  }

  const supabase = createClient();

  // 2. Autenticacion: debe haber sesion (RLS + created_by dependen de esto)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return err("NO_AUTENTICADO", "Debe iniciar sesion para registrar una venta.");
  }

  // 3. Llamada a la RPC transaccional (inventario + factura + cartera)
  const { data, error } = await supabase.rpc("sp_registrar_venta", {
    p_payload: parsed.data,
  });

  if (error) {
    const mapped = mapRpcError(error.message);
    return err(mapped.code, mapped.message);
  }

  // La RPC devuelve jsonb; Supabase lo entrega como objeto.
  const result = data as unknown as VentaRegistrada;
  return ok(result);
}
