// Pantalla de Producción: lista de órdenes + acceso a crear.
import { createClient } from "@/lib/supabase/server";
import { fecha } from "@/lib/format";

export const dynamic = "force-dynamic";

const estadoBadge: Record<string, string> = {
  ABIERTA: "badge-warning",
  EN_PROCESO: "badge-info",
  CERRADA: "badge-success",
  CANCELADA: "badge-muted",
};

export default async function ProduccionPage() {
  const supabase = createClient();

  const { data: ordenes } = await supabase
    .from("ordenes_produccion")
    .select("id, numero, fecha_inicio, fecha_fin, estado, procesos_produccion(nombre)")
    .order("fecha_inicio", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lista = (ordenes ?? []) as any[];

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Producción</h1>
          <p className="muted" style={{ margin: 0 }}>Transforma CRUDO en producto LISTO para venta.</p>
        </div>
        <a href="/produccion/nueva" className="btn">+ Nueva orden</a>
      </div>

      {lista.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">🏭</span>
          Aún no hay órdenes de producción. Crea la primera con “+ Nueva orden”.
        </div>
      ) : (
        <div className="list-cards" style={{ marginTop: 16 }}>
          {lista.map((o) => (
            <a key={o.id} href={`/produccion/${o.id}`} className="list-item" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="row">
                <div>
                  <div className="title">{o.numero}</div>
                  <div className="sub">
                    {o.procesos_produccion?.nombre ?? "-"} · {fecha(o.fecha_inicio)}
                  </div>
                </div>
                <span className={`badge ${estadoBadge[o.estado] ?? "badge-muted"}`}>{o.estado}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
