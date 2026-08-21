// ---------------------------------------------------------------------
// Pantalla de Inventario (Server Component) - Fase 1.
// Muestra el inventario disponible (LISTO) por ubicacion/calidad.
// ---------------------------------------------------------------------
import { createClient } from "@/lib/supabase/server";
import EstadoBadge from "@/components/EstadoBadge";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InventarioPage() {
  const supabase = createClient();

  const { data } = await supabase
    .from("inventario")
    .select(
      "cantidad, " +
        "variantes(sku, referencia, precio_base), " +
        "ubicaciones(nombre, tipo), " +
        "calidades(codigo), " +
        "estados_inventario!inner(codigo)"
    )
    .eq("estados_inventario.codigo", "LISTO")
    .gt("cantidad", 0);

  type Fila = {
    sku: string;
    ubicacion: string;
    tipo: string;
    calidad: string;
    cantidad: number;
    precio: number;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filas: Fila[] = (data ?? []).map((r: any) => ({
    sku: r.variantes?.sku ?? "-",
    ubicacion: r.ubicaciones?.nombre ?? "-",
    tipo: r.ubicaciones?.tipo ?? "-",
    calidad: r.calidades?.codigo ?? "-",
    cantidad: r.cantidad,
    precio: Number(r.variantes?.precio_base ?? 0),
  }));

  return (
    <>
      <h1>Inventario disponible</h1>
      <p className="muted">Productos listos para la venta por ubicación y calidad.</p>

      {filas.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">📦</span>
          No hay inventario disponible por ahora.
        </div>
      ) : (
        <div className="list-cards">
          {filas.map((f, i) => (
            <div className="list-item" key={i}>
              <div className="row">
                <div>
                  <div className="title">{f.sku}</div>
                  <div className="sub">
                    {f.ubicacion} · {f.tipo}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="amount amount-lg">{f.cantidad}</div>
                  <EstadoBadge estado={f.calidad} />
                </div>
              </div>
              <div className="sub" style={{ marginTop: 8 }}>
                Precio base: {money(f.precio)}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
