// "Nueva orden de producción": carga procesos e inventario CRUDO disponible.
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

  // Inventario disponible en CRUDO (para elegir qué producir)
  const { data: inv } = await supabase
    .from("inventario")
    .select("variante_id, cantidad, variantes(sku), estados_inventario!inner(codigo)")
    .eq("estados_inventario.codigo", "CRUDO")
    .gt("cantidad", 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const crudos = (inv ?? []).map((r: any) => ({
    variante_id: r.variante_id,
    sku: r.variantes?.sku ?? "SKU",
    disponible: r.cantidad,
  }));

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
