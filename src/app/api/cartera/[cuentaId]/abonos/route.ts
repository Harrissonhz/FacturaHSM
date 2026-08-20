// Route Handler: POST /api/cartera/:cuentaId/abonos
import { NextResponse } from "next/server";
import { registrarAbono } from "@/services/cartera.service";
import { RPC_ERROR_MAP } from "@/lib/result";

export async function POST(
  request: Request,
  { params }: { params: { cuentaId: string } }
) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // permite body vacio si se envian solo query/path params
  }

  const result = await registrarAbono({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(body as any),
    cuenta_id: params.cuentaId,
  });

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
