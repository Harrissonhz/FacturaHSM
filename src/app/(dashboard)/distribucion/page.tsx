// Distribución: enviar inventario LISTO del central a un vendedor.
import { createClient } from "@/lib/supabase/server";
import DistribucionForm from "./DistribucionForm";

export const dynamic = "force-dynamic";

export default async function DistribucionPage() {
  const supabase = createClient();

  const { data: vendedores } = await supabase
    .from("vendedores")
    .select("id, nombre, municipio")
    .eq("activo", true)
    .not("ubicacion_id", "is", null)
    .order("nombre");

  // Inventario LISTO en CENTRAL (disponible para distribuir)
  const { data: central } = await supabase
    .from("ubicaciones").select("id").eq("tipo", "CENTRAL").single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let items: any[] = [];
  if (central?.id) {
    const { data: inv } = await supabase
      .from("inventario")
      .select("variante_id, calidad_id, cantidad, variantes(sku), calidades(codigo), estados_inventario!inner(codigo)")
      .eq("ubicacion_id", central.id)
      .eq("estados_inventario.codigo", "LISTO")
      .gt("cantidad", 0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items = (inv ?? []).map((r: any) => ({
      variante_id: r.variante_id,
      calidad_id: r.calidad_id,
      sku: r.variantes?.sku ?? "SKU",
      calidad: r.calidades?.codigo ?? "-",
      disponible: r.cantidad,
    }));
  }

  return (
    <main>
      <h1 style={{ marginBottom: 4 }}>Distribución</h1>
      <p className="muted" style={{ marginTop: 0 }}>Envía inventario LISTO del central a un vendedor.</p>

      {(vendedores ?? []).length === 0 || items.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">🚚</span>
          <p>
            {items.length === 0
              ? "No hay inventario LISTO en el central. Produce y empaca primero en Producción."
              : "No hay vendedores con ubicación. Crea un vendedor en Catálogos."}
          </p>
        </div>
      ) : (
        <DistribucionForm vendedores={vendedores ?? []} items={items} />
      )}
    </main>
  );
}
