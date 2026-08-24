// Reporte: Trazabilidad de una variante (usa v_trazabilidad_variante).
// Server component: recibe ?v=<variante_id> y muestra sus movimientos.
import { createClient } from "@/lib/supabase/server";
import { fecha } from "@/lib/format";
import TrazabilidadSelector from "./TrazabilidadSelector";

export const dynamic = "force-dynamic";

const tipoBadge: Record<string, string> = {
  ENTRADA: "badge-success",
  SALIDA: "badge-danger",
  TRANSFERENCIA: "badge-info",
  TRANSFORMACION: "badge-warning",
  AJUSTE: "badge-muted",
  REVERSO: "badge-muted",
};

export default async function TrazabilidadPage({
  searchParams,
}: {
  searchParams: { v?: string };
}) {
  const supabase = createClient();

  // Lista de variantes para el selector
  const { data: variantes } = await supabase
    .from("variantes")
    .select("id, sku")
    .eq("activo", true)
    .order("sku");

  const varianteId = searchParams.v ?? "";

  // Movimientos de la variante seleccionada
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let movimientos: any[] = [];
  if (varianteId) {
    const { data } = await supabase
      .from("v_trazabilidad_variante")
      .select("fecha, tipo, origen, estado_origen, calidad_origen, destino, estado_destino, calidad_destino, cantidad, doc_tipo")
      .eq("variante_id", varianteId)
      .order("fecha");
    movimientos = data ?? [];
  }

  return (
    <main>
      <h1 style={{ marginBottom: 4 }}>Trazabilidad</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        <a href="/reportes">← Reportes</a>
      </p>

      <div className="card">
        <TrazabilidadSelector variantes={variantes ?? []} seleccion={varianteId} />
      </div>

      {varianteId && (
        movimientos.length === 0 ? (
          <div className="empty-state">
            <span className="emoji">🔎</span>
            Esta variante aún no tiene movimientos.
          </div>
        ) : (
          <div className="list-cards">
            {movimientos.map((m, i) => (
              <div className="list-item" key={i}>
                <div className="row">
                  <div>
                    <span className={`badge ${tipoBadge[m.tipo] ?? "badge-muted"}`}>{m.tipo}</span>
                    <span className="sub" style={{ marginLeft: 8 }}>{fecha(m.fecha)} · {m.doc_tipo}</span>
                  </div>
                  <div className="amount">{m.cantidad}</div>
                </div>
                <div className="sub" style={{ marginTop: 8 }}>
                  {m.origen
                    ? `Desde: ${m.origen} (${m.estado_origen ?? "-"}/${m.calidad_origen ?? "-"})`
                    : "Entrada nueva"}
                </div>
                <div className="sub">
                  {m.destino
                    ? `Hacia: ${m.destino} (${m.estado_destino ?? "-"}/${m.calidad_destino ?? "-"})`
                    : "Salida"}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </main>
  );
}
