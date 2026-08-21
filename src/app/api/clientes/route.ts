// Route Handler: POST /api/clientes  (crear cliente nuevo)
import { NextResponse } from "next/server";
import { crearCliente, type NuevoClienteInput } from "@/services/clientes.service";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "JSON_INVALIDO", message: "Cuerpo no valido." } },
      { status: 400 }
    );
  }

  const result = await crearCliente(body as NuevoClienteInput);

  if (!result.ok) {
    const status =
      result.error.code === "NO_AUTENTICADO"
        ? 401
        : result.error.code === "VALIDACION"
        ? 400
        : 500;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, { status: 201 });
}
