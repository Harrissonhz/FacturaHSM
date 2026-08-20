// Tipo de resultado estandar para servicios y endpoints.
// Formato de respuesta acordado en 06-api-endpoints.md.
export type Ok<T> = { ok: true; data: T };
export type Err = { ok: false; error: { code: string; message: string } };
export type Result<T> = Ok<T> | Err;

export function ok<T>(data: T): Ok<T> {
  return { ok: true, data };
}

export function err(code: string, message: string): Err {
  return { ok: false, error: { code, message } };
}

// Mapea codigos de error de las funciones RPC de Postgres a mensajes
// legibles y un HTTP status apropiado.
export const RPC_ERROR_MAP: Record<string, { status: number; message: string }> = {
  SALDO_INSUFICIENTE: { status: 409, message: "Inventario insuficiente para la operacion." },
  SIN_ITEMS: { status: 400, message: "La venta no tiene items." },
  VENDEDOR_INVALIDO: { status: 400, message: "El vendedor no es valido o no tiene ubicacion asignada." },
  CLIENTE_INVALIDO: { status: 400, message: "El cliente no es valido." },
  RECIBO_EXCEDE_PENDIENTE: { status: 409, message: "La cantidad recibida supera lo pendiente." },
  BALANCE_NO_CUADRA: { status: 409, message: "El balance de produccion no cuadra (entradas != resultados)." },
  ABONO_EXCEDE_SALDO: { status: 409, message: "El abono supera el saldo pendiente." },
  CUENTA_YA_PAGADA: { status: 409, message: "La cuenta ya esta pagada." },
  TRANSFERENCIA_YA_CONFIRMADA: { status: 409, message: "La transferencia ya fue confirmada." },
};

export function mapRpcError(pgMessage: string): { status: number; code: string; message: string } {
  // Postgres RAISE EXCEPTION 'CODIGO' llega en el mensaje del error.
  const code = Object.keys(RPC_ERROR_MAP).find((c) => pgMessage.includes(c));
  if (code) {
    const m = RPC_ERROR_MAP[code];
    return { status: m.status, code, message: m.message };
  }
  return { status: 500, code: "ERROR_INTERNO", message: "Ocurrio un error al procesar la operacion." };
}
