// ---------------------------------------------------------------------
// Reporte de Cartera (Server Component).
// Carga TODAS las cuentas por cobrar con cliente, vendedor, municipio,
// fechas y montos; delega el análisis (filtros, agrupación, aging, KPIs,
// export) al componente cliente ReporteCarteraClient.
// ---------------------------------------------------------------------
import { createClient } from "@/lib/supabase/server";
import ReporteCarteraClient from "./ReporteCarteraClient";

export const dynamic = "force-dynamic";

export type CuentaRep = {
  id: string;
  cliente_id: string;
  cliente: string;
  vendedor: string;
  municipio: string;
  factura: string;
  fecha_venta: string;
  fecha_vencimiento: string | null;
  valor_original: number;
  total_abonado: number;
  saldo_pendiente: number;
  estado: string;
};

export default async function ReporteCarteraPage() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("cuentas_por_cobrar")
    .select(
      "id, cliente_id, fecha_venta, fecha_vencimiento, valor_original, total_abonado, saldo_pendiente, estado, " +
        "facturas(numero), clientes(nombre, municipio), vendedores(nombre)"
    )
    .order("fecha_venta", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cuentas: CuentaRep[] = (data ?? []).map((r: any) => ({
    id: r.id,
    cliente_id: r.cliente_id,
    cliente: r.clientes?.nombre ?? "-",
    vendedor: r.vendedores?.nombre ?? "Sin vendedor",
    municipio: r.clientes?.municipio ?? "Sin municipio",
    factura: r.facturas?.numero ?? "-",
    fecha_venta: r.fecha_venta,
    fecha_vencimiento: r.fecha_vencimiento,
    valor_original: Number(r.valor_original),
    total_abonado: Number(r.total_abonado),
    saldo_pendiente: Number(r.saldo_pendiente),
    estado: r.estado,
  }));

  return (
    <main>
      <h1 style={{ marginBottom: 4 }}>Reporte de cartera</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        <a href="/reportes">← Reportes</a>
      </p>

      {error && <div className="alert alert-danger">Error: {error.message}</div>}

      <ReporteCarteraClient cuentas={cuentas} />
    </main>
  );
}
