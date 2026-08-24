// Reporte: Inventario por vendedor (usa v_inventario_por_vendedor).
import { createClient } from "@/lib/supabase/server";
import EstadoBadge from "@/components/EstadoBadge";

export const dynamic = "force-dynamic";

export default async function ReporteInventarioPage() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("v_inventario_por_vendedor")
    .select("vendedor, municipio, sku, referencia, color, talla, estado, calidad, cantidad")
    .order("vendedor");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filas = (data ?? []) as any[];

  // Agrupar por vendedor
  const porVendedor = new Map<string, { municipio: string | null; items: typeof filas }>();
  for (const f of filas) {
    if (!porVendedor.has(f.vendedor)) porVendedor.set(f.vendedor, { municipio: f.municipio, items: [] });
    porVendedor.get(f.vendedor)!.items.push(f);
  }

  return (
    <main>
      <h1 style={{ marginBottom: 4 }}>Inventario por vendedor</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        <a href="/reportes">← Reportes</a>
      </p>

      {error && <div className="alert alert-danger">Error: {error.message}</div>}

      {porVendedor.size === 0 ? (
        <div className="empty-state">
          <span className="emoji">📦</span>
          Ningún vendedor tiene inventario asignado por ahora.
        </div>
      ) : (
        [...porVendedor.entries()].map(([vendedor, info]) => {
          const total = info.items.reduce((s: number, i: { cantidad: number }) => s + i.cantidad, 0);
          return (
            <div className="card" key={vendedor}>
              <div className="row">
                <div>
                  <div className="title">{vendedor}</div>
                  <div className="sub">{info.municipio ?? "Sin municipio"}</div>
                </div>
                <div className="amount amount-lg">{total}</div>
              </div>

              <div className="list-cards" style={{ marginTop: 12 }}>
                {info.items.map((it: { sku: string; color: string; talla: string; calidad: string; cantidad: number }, i: number) => (
                  <div className="list-item" key={i} style={{ boxShadow: "none" }}>
                    <div className="row">
                      <div>
                        <div className="title" style={{ fontSize: ".95rem" }}>{it.sku}</div>
                        <div className="sub">{it.color} · {it.talla}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="amount">{it.cantidad}</div>
                        <EstadoBadge estado={it.calidad} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </main>
  );
}
