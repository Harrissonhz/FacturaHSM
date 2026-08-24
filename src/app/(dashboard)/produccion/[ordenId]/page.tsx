// Detalle de orden de producción: ejecutar (resultados por calidad) + empacar.
import { createClient } from "@/lib/supabase/server";
import { fecha } from "@/lib/format";
import EjecutarForm from "./EjecutarForm";
import EmpacarForm from "./EmpacarForm";

export const dynamic = "force-dynamic";

const estadoBadge: Record<string, string> = {
  ABIERTA: "badge-warning",
  EN_PROCESO: "badge-info",
  CERRADA: "badge-success",
  CANCELADA: "badge-muted",
};

export default async function OrdenDetallePage({
  params,
}: {
  params: { ordenId: string };
}) {
  const supabase = createClient();

  const { data: orden } = await supabase
    .from("ordenes_produccion")
    .select("id, numero, fecha_inicio, estado, procesos_produccion(nombre)")
    .eq("id", params.ordenId)
    .single();

  if (!orden) {
    return (
      <main>
        <div className="empty-state"><span className="emoji">🏭</span>No se encontró la orden.</div>
      </main>
    );
  }

  // Entradas de la orden
  const { data: entradas } = await supabase
    .from("ordenes_produccion_detalle")
    .select("variante_id, cantidad, variantes(sku)")
    .eq("orden_id", params.ordenId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o: any = orden;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listaEntradas = (entradas ?? []).map((e: any) => ({
    variante_id: e.variante_id,
    sku: e.variantes?.sku ?? "-",
    cantidad: e.cantidad,
  }));

  // Ubicacion CENTRAL (para empacar)
  const { data: central } = await supabase
    .from("ubicaciones").select("id").eq("tipo", "CENTRAL").single();

  // Inventario TERMINADO por empacar (para la seccion de empaque)
  const { data: term } = await supabase
    .from("inventario")
    .select("variante_id, calidad_id, cantidad, variantes(sku), calidades(codigo), estados_inventario!inner(codigo)")
    .eq("estados_inventario.codigo", "TERMINADO")
    .gt("cantidad", 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const terminados = (term ?? []).map((r: any) => ({
    variante_id: r.variante_id,
    calidad_id: r.calidad_id,
    sku: r.variantes?.sku ?? "-",
    calidad: r.calidades?.codigo ?? "-",
    disponible: r.cantidad,
  }));

  const abierta = o.estado === "ABIERTA" || o.estado === "EN_PROCESO";
  const totalEntradas = listaEntradas.reduce((s: number, e: { cantidad: number }) => s + e.cantidad, 0);

  return (
    <main>
      <h1 style={{ marginBottom: 4 }}>Orden {o.numero}</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        <a href="/produccion">← Producción</a>
      </p>

      <div className="card">
        <div className="row">
          <div>
            <div className="sub">Proceso</div>
            <div className="title">{o.procesos_produccion?.nombre ?? "-"}</div>
            <div className="sub">{fecha(o.fecha_inicio)}</div>
          </div>
          <span className={`badge ${estadoBadge[o.estado] ?? "badge-muted"}`}>{o.estado}</span>
        </div>
      </div>

      {/* Entradas */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Entradas (a producir)</h3>
        <div className="list-cards">
          {listaEntradas.map((e: { variante_id: string; sku: string; cantidad: number }) => (
            <div className="list-item" key={e.variante_id}>
              <div className="row">
                <div className="title">{e.sku}</div>
                <div className="amount">{e.cantidad}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="sub" style={{ marginTop: 8 }}>Total a producir: <strong>{totalEntradas}</strong></p>
      </div>

      {/* Ejecutar (resultados por calidad) */}
      {abierta ? (
        <EjecutarForm ordenId={o.id} entradas={listaEntradas} totalEntradas={totalEntradas} />
      ) : (
        <div className="alert alert-success">Orden cerrada. Los productos están en TERMINADO. ✅</div>
      )}

      {/* Empacar (TERMINADO -> LISTO) */}
      {terminados.length > 0 && central?.id && (
        <EmpacarForm ubicacionId={central.id} terminados={terminados} />
      )}
    </main>
  );
}
