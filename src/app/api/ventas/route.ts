// Route Handler: POST /api/ventas
// Expone el caso de uso "Registrar venta" sobre el servicio de aplicacion.
import { NextResponse } from "next/server";
import { registrarVenta } from "@/services/ventas.service";
import { RPC_ERROR_MAP } from "@/lib/result";
import type { RegistrarVentaInput } from "@/lib/validation/venta.schema";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "JSON_INVALIDO", message: "El cuerpo no es JSON valido." } },
      { status: 400 }
    );
  }

  const result = await registrarVenta(body as RegistrarVentaInput);

  if (!result.ok) {
    const status =
      result.error.code === "NO_AUTENTICADO"
        ? 401
        : result.error.code === "VALIDACION"
        ? 400
        : RPC_ERROR_MAP[result.error.code]?.status ?? 500;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, { status: 201 });
}
