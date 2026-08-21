// ---------------------------------------------------------------------
// Pantalla de Cartera (Server Component).
// Lista las cuentas por cobrar con su saldo y estado, y permite
// registrar abonos parciales (vía CarteraTabla / AbonoForm cliente).
// ---------------------------------------------------------------------
import { createClient } from "@/lib/supabase/server";
import CarteraTabla from "./CarteraTabla";

export const dynamic = "force-dynamic";

export type CuentaCxC = {
  id: string;
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
      "id, fecha_venta, fecha_vencimiento, valor_original, total_abonado, saldo_pendiente, estado, " +
        "facturas(numero), clientes(nombre), vendedores(nombre)"
    )
    .order("fecha_venta", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cuentas: CuentaCxC[] = (data ?? []).map((r: any) => ({
    id: r.id,
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
      <h1>Cartera / Cuentas por cobrar</h1>
      <p className="muted">
        Consulta el saldo de cada cuenta y registra abonos parciales. Al
        llegar el saldo a cero, la cuenta pasa a PAGADA.
      </p>

      {error && (
        <div className="card" style={{ borderColor: "#fecaca", background: "#fef2f2" }}>
          <strong style={{ color: "#b91c1c" }}>Error al cargar la cartera:</strong>{" "}
          {error.message}
        </div>
      )}

      {cuentas.length === 0 ? (
        <div className="card">
          <h3>No hay cuentas por cobrar</h3>
          <p className="muted">
            Registra una venta a credito desde <a href="/ventas">Ventas</a> para
            generar una cuenta por cobrar.
          </p>
        </div>
      ) : (
        <CarteraTabla cuentas={cuentas} />
      )}
    </main>
  );
}
