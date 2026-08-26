// ---------------------------------------------------------------------
// Pantalla de Cartera (Server Component).
// Lista cuentas por cobrar; delega en CarteraTabla el resumen, la
// búsqueda (cliente/factura), filtros, tarjetas y el bottom sheet de abonos.
// ---------------------------------------------------------------------
import { createClient } from "@/lib/supabase/server";
import CarteraTabla from "./CarteraTabla";

export const dynamic = "force-dynamic";

export type CuentaCxC = {
  id: string;
  cliente_id: string;
  factura: string;
  cliente: string;
  vendedor: string;
  fecha_venta: string;
  fecha_vencimiento: string | null;
  valor_original: number;
  total_abonado: number;
  saldo_pendiente: number;
  estado: string;
};

export default async function CarteraPage() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("cuentas_por_cobrar")
    .select(
      "id, cliente_id, fecha_venta, fecha_vencimiento, valor_original, total_abonado, saldo_pendiente, estado, " +
        "facturas(numero), clientes(nombre), vendedores(nombre)"
    )
    .order("fecha_venta", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cuentas: CuentaCxC[] = (data ?? []).map((r: any) => ({
    id: r.id,
    cliente_id: r.cliente_id,
    factura: r.facturas?.numero ?? "-",
    cliente: r.clientes?.nombre ?? "-",
    vendedor: r.vendedores?.nombre ?? "-",
    fecha_venta: r.fecha_venta,
    fecha_vencimiento: r.fecha_vencimiento,
    valor_original: Number(r.valor_original),
    total_abonado: Number(r.total_abonado),
    saldo_pendiente: Number(r.saldo_pendiente),
    estado: r.estado,
  }));

  return (
    <main>
      <h1>Cartera</h1>
      <p className="muted">Consulta saldos, registra abonos y genera estados de cuenta.</p>

      {error && (
        <div className="alert alert-danger">Error al cargar la cartera: {error.message}</div>
      )}

      {cuentas.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">💰</span>
          <p>
            No hay cuentas por cobrar. Registra una venta a crédito desde{" "}
            <a href="/ventas">Ventas</a>.
          </p>
        </div>
      ) : (
        <CarteraTabla cuentas={cuentas} />
      )}
    </main>
  );
}
