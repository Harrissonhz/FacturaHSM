// Historial de ventas con opción de anular (usa sp_anular_venta).
import { createClient } from "@/lib/supabase/server";
import { money, fecha } from "@/lib/format";
import HistorialClient from "./HistorialClient";

export const dynamic = "force-dynamic";

export default async function HistorialVentasPage() {
  const supabase = createClient();

  const { data: ventas } = await supabase
    .from("ventas")
    .select("id, fecha, total, estado, tipo_pago, clientes(nombre), vendedores(nombre), facturas(numero)")
    .order("fecha", { ascending: false })
    .limit(100);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lista = (ventas ?? []).map((v: any) => ({
    id: v.id,
    fecha: fecha(v.fecha),
    total: money(Number(v.total)),
    estado: v.estado,
    tipo_pago: v.tipo_pago,
    cliente: v.clientes?.nombre ?? "-",
    vendedor: v.vendedores?.nombre ?? "-",
    factura: v.facturas?.numero ?? "-",
  }));

  return (
    <main>
      <h1 style={{ marginBottom: 4 }}>Historial de ventas</h1>
      <p className="muted" style={{ marginTop: 0 }}>Consulta y anula ventas (reversa inventario y cartera).</p>
      <HistorialClient ventas={lista} />
    </main>
  );
}
