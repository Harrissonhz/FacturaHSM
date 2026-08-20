// ---------------------------------------------------------------------
// Servicio de Cartera (capa de aplicacion)
// Caso de uso "Registrar abono parcial" sobre la RPC sp_registrar_abono.
// ---------------------------------------------------------------------
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ok, err, mapRpcError, type Result } from "@/lib/result";

export const registrarAbonoSchema = z.object({
  cuenta_id: z.string().uuid(),
  monto: z.number().positive("El monto debe ser mayor a 0"),
  forma_pago: z.enum(["EFECTIVO", "CONSIGNACION", "TRANSFERENCIA", "OTRO"]),
  comprobante_url: z.string().url().optional().nullable(),
  observacion: z.string().max(500).optional().nullable(),
});

export type RegistrarAbonoInput = z.infer<typeof registrarAbonoSchema>;

export type AbonoRegistrado = {
  cuenta_id: string;
  saldo_pendiente: number;
  estado: "PARCIAL" | "PAGADA";
};

export async function registrarAbono(
  input: RegistrarAbonoInput
): Promise<Result<AbonoRegistrado>> {
  const parsed = registrarAbonoSchema.safeParse(input);
  if (!parsed.success) {
    return err("VALIDACION", parsed.error.issues[0]?.message ?? "Abono invalido.");
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return err("NO_AUTENTICADO", "Debe iniciar sesion para registrar un abono.");
  }

  const { data, error } = await supabase.rpc("sp_registrar_abono", {
    p_cuenta_id: parsed.data.cuenta_id,
    p_monto: parsed.data.monto,
    p_forma_pago: parsed.data.forma_pago,
    p_comprobante_url: parsed.data.comprobante_url ?? null,
    p_observacion: parsed.data.observacion ?? null,
  });

  if (error) {
    const mapped = mapRpcError(error.message);
    return err(mapped.code, mapped.message);
  }

  return ok(data as unknown as AbonoRegistrado);
}
