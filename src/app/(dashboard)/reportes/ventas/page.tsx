// Reporte: Ventas por municipio (usa v_ventas_por_municipio).
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReporteVentasPage() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("v_ventas_por_municipio")
    .select("municipio, vendedor, num_ventas, total_vendido")
    .order("total_vendido", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filas = (data ?? []) as any[];

  const totalGeneral = filas.reduce((s, f) => s + Number(f.total_vendido ?? 0), 0);
  const totalVentas = filas.reduce((s, f) => s + Number(f.num_ventas ?? 0), 0);

  return (
    <main>
      <h1 style={{ marginBottom: 4 }}>Ventas por municipio</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        <a href="/reportes">← Reportes</a>
      </p>

      {error && <div className="alert alert-danger">Error: {error.message}</div>}

      {/* Resumen */}
      <div className="summary-row">
        <div className="summary-chip">
          <div className="label">Total vendido</div>
          <div className="value">{money(totalGeneral)}</div>
        </div>
        <div className="summary-chip">
          <div className="label">N.º de ventas</div>
          <div className="value">{totalVentas}</div>
        </div>
      </div>

      {filas.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">🗺️</span>
          Aún no hay ventas registradas.
        </div>
      ) : (
        <div className="list-cards">
          {filas.map((f, i) => (
            <div className="list-item" key={i}>
              <div className="row">
                <div>
                  <div className="title">{f.municipio ?? "Sin municipio"}</div>
                  <div className="sub">{f.vendedor} · {f.num_ventas} venta(s)</div>
                </div>
                <div className="amount amount-lg">{money(Number(f.total_vendido))}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
