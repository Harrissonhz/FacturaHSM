// ---------------------------------------------------------------------
// Pantalla de Inventario (Server Component).
// Muestra la DESCRIPCIÓN LARGA (Producto / Color / Talla) en vez del SKU.
// ---------------------------------------------------------------------
import { createClient } from "@/lib/supabase/server";
import EstadoBadge from "@/components/EstadoBadge";

export const dynamic = "force-dynamic";

export default async function InventarioPage() {
  const supabase = createClient();

  const { data } = await supabase
    .from("inventario")
    .select(
      "cantidad, " +
        "variantes(sku, productos(nombre), colores(nombre), tallas(nombre)), " +
        "ubicaciones(nombre, tipo), calidades(codigo), estados_inventario!inner(codigo)"
    )
    .gt("cantidad", 0)
    .order("cantidad", { ascending: false });

  type Fila = {
    descripcion: string;
    ubicacion: string;
    estado: string;
    calidad: string;
    cantidad: number;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filas: Fila[] = (data ?? []).map((r: any) => {
    const prod = r.variantes?.productos?.nombre ?? r.variantes?.sku ?? "Producto";
    const color = r.variantes?.colores?.nombre ?? "";
    const talla = r.variantes?.tallas?.nombre ?? "";
    return {
      descripcion: [prod, color, talla].filter(Boolean).join(" / "),
      ubicacion: r.ubicaciones?.nombre ?? "-",
      estado: r.estados_inventario?.codigo ?? "-",
      calidad: r.calidades?.codigo ?? "-",
      cantidad: r.cantidad,
    };
  });

  return (
    <main>
      <h1>Inventario</h1>
      <p className="muted">Existencias por producto, ubicación, estado y calidad.</p>

      {filas.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">📦</span>
          No hay inventario por ahora.
        </div>
      ) : (
        <div className="list-cards">
          {filas.map((f, i) => (
            <div className="list-item" key={i}>
              <div className="row">
                <div>
                  <div className="title">{f.descripcion}</div>
                  <div className="sub">
                    {f.ubicacion} · {f.estado}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="amount amount-lg">{f.cantidad}</div>
                  <EstadoBadge estado={f.calidad} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
