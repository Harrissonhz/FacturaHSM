// Ajuste de inventario: corrige saldos con un movimiento auditable.
import { createClient } from "@/lib/supabase/server";
import AjusteClient from "./AjusteClient";

export const dynamic = "force-dynamic";

export default async function AjustePage() {
  const supabase = createClient();

  // Saldos actuales (todas las combinaciones con cantidad > 0)
  const { data: inv } = await supabase
    .from("inventario")
    .select("variante_id, ubicacion_id, estado_id, calidad_id, cantidad, variantes(sku), ubicaciones(nombre), estados_inventario(codigo), calidades(codigo)")
    .gt("cantidad", 0)
    .limit(300);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filas = (inv ?? []).map((r: any) => ({
    variante_id: r.variante_id,
    ubicacion_id: r.ubicacion_id,
    estado_id: r.estado_id,
    calidad_id: r.calidad_id,
    cantidad: r.cantidad,
    sku: r.variantes?.sku ?? "-",
    ubicacion: r.ubicaciones?.nombre ?? "-",
    estado: r.estados_inventario?.codigo ?? "-",
    calidad: r.calidades?.codigo ?? "-",
  }));

  return (
    <main>
      <h1 style={{ marginBottom: 4 }}>Ajuste de inventario</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Corrige un saldo (+/−) con un motivo. Queda registrado como movimiento auditable.
      </p>

      {filas.length === 0 ? (
        <div className="empty-state"><span className="emoji">⚖️</span>No hay saldos de inventario para ajustar.</div>
      ) : (
        <AjusteClient filas={filas} />
      )}
    </main>
  );
}
