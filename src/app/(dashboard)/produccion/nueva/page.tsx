// "Nueva orden de producción": procesos + inventario CRUDO (con descripción larga).
import { createClient } from "@/lib/supabase/server";
import NuevaOrdenForm from "./NuevaOrdenForm";

export const dynamic = "force-dynamic";

export default async function NuevaOrdenPage() {
  const supabase = createClient();

  const { data: procesos } = await supabase
    .from("procesos_produccion")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");

  const { data: inv } = await supabase
    .from("inventario")
    .select(
      "variante_id, cantidad, " +
        "variantes(sku, productos(nombre), colores(nombre), tallas(nombre)), " +
        "estados_inventario!inner(codigo)"
    )
    .eq("estados_inventario.codigo", "CRUDO")
    .gt("cantidad", 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const crudos = (inv ?? []).map((r: any) => {
    const prod = r.variantes?.productos?.nombre ?? r.variantes?.sku ?? "Producto";
    const color = r.variantes?.colores?.nombre ?? "";
    const talla = r.variantes?.tallas?.nombre ?? "";
    return {
      variante_id: r.variante_id,
      descripcion: [prod, color, talla].filter(Boolean).join(" / "),
      disponible: r.cantidad,
    };
  });

  return (
    <main>
      <h1 style={{ marginBottom: 4 }}>Nueva orden de producción</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        <a href="/produccion">← Producción</a>
      </p>

      {(procesos ?? []).length === 0 || crudos.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">⚠️</span>
          <p>
            {crudos.length === 0
              ? "No hay inventario en estado CRUDO. Recibe una compra primero en Compras."
              : "No hay procesos de producción configurados."}
          </p>
        </div>
      ) : (
        <NuevaOrdenForm procesos={procesos ?? []} crudos={crudos} />
      )}
    </main>
  );
}
